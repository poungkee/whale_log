import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from './bookmark.entity';
import { Post } from '../posts/entities/post.entity';
import { PostQueryDto } from '../posts/dto/post-query.dto';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async toggle(postId: string, userId: string) {
    const existing = await this.bookmarkRepository.findOne({
      where: { postId, userId },
    });

    if (existing) {
      await this.bookmarkRepository.delete({ postId, userId });
      await this.postRepository.decrement({ id: postId }, 'bookmarkCount', 1);
      return { bookmarked: false };
    } else {
      const bookmark = this.bookmarkRepository.create({ postId, userId });
      await this.bookmarkRepository.save(bookmark);
      await this.postRepository.increment({ id: postId }, 'bookmarkCount', 1);
      return { bookmarked: true };
    }
  }

  async getMyBookmarks(userId: string, query: PostQueryDto) {
    const { page = 1, limit = 20 } = query;

    const [bookmarks, total] = await this.bookmarkRepository.findAndCount({
      where: { userId },
      relations: ['post', 'post.author', 'post.images', 'post.spot'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const posts = bookmarks
      .filter((b) => b.post && !b.post.isHidden)
      .map((b) => ({
        ...b.post,
        author: {
          id: b.post.author.id,
          nickname: b.post.author.nickname,
          avatarUrl: b.post.author.avatarUrl,
        },
        isLiked: false, // TODO: fetch actual like status
        isBookmarked: true,
      }));

    return {
      data: posts,
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
}
