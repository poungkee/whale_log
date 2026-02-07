/**
 * @file questions.service.ts
 * @description 질문 서비스 - 질문 CRUD 및 채택 비즈니스 로직
 *
 * @methods
 * - create: 질문 작성
 * - findAll: 질문 목록 조회 (검색, 태그 필터)
 * - findOne: 질문 상세 조회
 * - update: 질문 수정
 * - remove: 질문 삭제
 * - acceptAnswer: 답변 채택
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { Answer } from '../answers/entities/answer.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionQueryDto } from './dto/question-query.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
  ) {}

  async findAll(query: QuestionQueryDto) {
    const { tag, sort = 'latest', search, page = 1, limit = 20 } = query;

    const qb = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.author', 'author');

    if (tag) {
      qb.andWhere(':tag = ANY(question.tags)', { tag });
    }
    if (search) {
      qb.andWhere(
        '(question.title ILIKE :search OR question.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    switch (sort) {
      case 'popular':
        qb.orderBy('question.viewCount', 'DESC');
        break;
      case 'unanswered':
        qb.andWhere('question.answerCount = 0');
        qb.orderBy('question.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('question.createdAt', 'DESC');
    }

    const [questions, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: questions.map((q) => ({
        ...q,
        author: {
          id: q.author.id,
          nickname: q.author.nickname,
          avatarUrl: q.author.avatarUrl,
        },
      })),
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  async findById(questionId: string) {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['author', 'answers', 'answers.author'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Increment view count
    await this.questionRepository.increment({ id: questionId }, 'viewCount', 1);

    return {
      ...question,
      author: {
        id: question.author.id,
        nickname: question.author.nickname,
        avatarUrl: question.author.avatarUrl,
      },
      answers: question.answers.map((a) => ({
        ...a,
        author: {
          id: a.author.id,
          nickname: a.author.nickname,
          avatarUrl: a.author.avatarUrl,
        },
      })),
    };
  }

  async create(userId: string, dto: CreateQuestionDto) {
    const question = this.questionRepository.create({
      authorId: userId,
      title: dto.title,
      content: dto.content,
      tags: dto.tags,
    });

    const saved = await this.questionRepository.save(question);
    return this.findById(saved.id);
  }

  async update(questionId: string, userId: string, dto: UpdateQuestionDto) {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }
    if (question.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own questions');
    }

    Object.assign(question, dto);
    await this.questionRepository.save(question);
    return this.findById(questionId);
  }

  async delete(questionId: string, userId: string) {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }
    if (question.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own questions');
    }

    await this.questionRepository.softDelete(questionId);
    return { message: 'Question deleted successfully' };
  }

  async acceptAnswer(questionId: string, answerId: string, userId: string) {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }
    if (question.authorId !== userId) {
      throw new ForbiddenException('Only question author can accept answers');
    }
    if (question.isClosed) {
      throw new BadRequestException('Question is already closed');
    }

    const answer = await this.answerRepository.findOne({
      where: { id: answerId, questionId },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    // Mark answer as accepted
    await this.answerRepository.update(answerId, { isAccepted: true });
    await this.questionRepository.update(questionId, {
      acceptedAnswerId: answerId,
      isClosed: true,
    });

    return { message: 'Answer accepted successfully' };
  }

  async incrementAnswerCount(questionId: string, delta: number = 1) {
    await this.questionRepository.increment({ id: questionId }, 'answerCount', delta);
  }
}
