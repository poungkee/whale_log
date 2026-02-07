/**
 * @file comments.service.ts
 * @description 댓글 서비스 - 댓글 CRUD 및 대댓글 중첩 비즈니스 로직
 *
 * @methods
 * - create: 댓글/대댓글 작성
 * - findByPost: 게시글별 댓글 목록 조회
 * - update: 댓글 수정
 * - remove: 댓글 삭제
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { PostsService } from '../posts/posts.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly postsService: PostsService,
  ) {}

  async findByPost(postId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;

    // Get top-level comments
    const [comments, total] = await this.commentRepository.findAndCount({
      where: { postId, parentId: IsNull() },
      relations: ['author', 'replies', 'replies.author'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedComments = comments.map((comment) => ({
      ...comment,
      author: {
        id: comment.author.id,
        nickname: comment.author.nickname,
        avatarUrl: comment.author.avatarUrl,
      },
      replies: comment.replies?.map((reply) => ({
        ...reply,
        author: {
          id: reply.author.id,
          nickname: reply.author.nickname,
          avatarUrl: reply.author.avatarUrl,
        },
      })),
    }));

    return {
      data: formattedComments,
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

  async create(postId: string, userId: string, dto: CreateCommentDto) {
    let depth = 0;

    if (dto.parentId) {
      const parent = await this.commentRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
      if (parent.depth >= 1) {
        throw new BadRequestException('Maximum reply depth exceeded');
      }
      depth = parent.depth + 1;
    }

    const comment = this.commentRepository.create({
      postId,
      authorId: userId,
      parentId: dto.parentId,
      content: dto.content,
      depth,
    });

    const saved = await this.commentRepository.save(comment);
    await this.postsService.incrementCommentCount(postId, 1);

    return this.findById(saved.id);
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = dto.content;
    await this.commentRepository.save(comment);

    return this.findById(commentId);
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.softDelete(commentId);
    await this.postsService.incrementCommentCount(comment.postId, -1);

    return { message: 'Comment deleted successfully' };
  }

  private async findById(commentId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return {
      ...comment,
      author: {
        id: comment.author.id,
        nickname: comment.author.nickname,
        avatarUrl: comment.author.avatarUrl,
      },
    };
  }
}
