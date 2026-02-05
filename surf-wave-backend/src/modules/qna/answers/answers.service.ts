import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from './entities/answer.entity';
import { QuestionsService } from '../questions/questions.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';

@Injectable()
export class AnswersService {
  constructor(
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    @Inject(forwardRef(() => QuestionsService))
    private readonly questionsService: QuestionsService,
  ) {}

  async create(questionId: string, userId: string, dto: CreateAnswerDto) {
    const answer = this.answerRepository.create({
      questionId,
      authorId: userId,
      content: dto.content,
    });

    const saved = await this.answerRepository.save(answer);
    await this.questionsService.incrementAnswerCount(questionId, 1);

    return this.findById(saved.id);
  }

  async update(answerId: string, userId: string, dto: UpdateAnswerDto) {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }
    if (answer.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own answers');
    }

    answer.content = dto.content;
    await this.answerRepository.save(answer);
    return this.findById(answerId);
  }

  async delete(answerId: string, userId: string) {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }
    if (answer.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own answers');
    }

    await this.answerRepository.softDelete(answerId);
    await this.questionsService.incrementAnswerCount(answer.questionId, -1);

    return { message: 'Answer deleted successfully' };
  }

  private async findById(answerId: string) {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
      relations: ['author'],
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    return {
      ...answer,
      author: {
        id: answer.author.id,
        nickname: answer.author.nickname,
        avatarUrl: answer.author.avatarUrl,
      },
    };
  }
}
