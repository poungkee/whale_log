import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './like.entity';
import { Post } from '../posts/entities/post.entity';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async toggle(postId: string, userId: string) {
    const existing = await this.likeRepository.findOne({
      where: { postId, userId },
    });

    if (existing) {
      await this.likeRepository.delete({ postId, userId });
      await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
      return { liked: false };
    } else {
      const like = this.likeRepository.create({ postId, userId });
      await this.likeRepository.save(like);
      await this.postRepository.increment({ id: postId }, 'likeCount', 1);
      return { liked: true };
    }
  }
}
