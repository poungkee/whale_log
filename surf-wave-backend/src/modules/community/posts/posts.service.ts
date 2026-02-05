import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostImage } from './entities/post-image.entity';
import { Like } from '../likes/like.entity';
import { Bookmark } from '../bookmarks/bookmark.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostImage)
    private readonly imageRepository: Repository<PostImage>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
  ) {}

  async findAll(query: PostQueryDto, userId: string) {
    const { spotId, tag, sort = 'latest', search, page = 1, limit = 20 } = query;

    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.images', 'images')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.spot', 'spot')
      .where('post.isHidden = :isHidden', { isHidden: false });

    if (spotId) {
      qb.andWhere('post.spotId = :spotId', { spotId });
    }
    if (tag) {
      qb.andWhere(':tag = ANY(post.tags)', { tag });
    }
    if (search) {
      qb.andWhere('post.content ILIKE :search', { search: `%${search}%` });
    }

    if (sort === 'popular') {
      qb.orderBy('post.likeCount', 'DESC');
    } else {
      qb.orderBy('post.createdAt', 'DESC');
    }

    const [posts, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Check user's likes and bookmarks
    const postIds = posts.map((p) => p.id);
    const [likedIds, bookmarkedIds] = await Promise.all([
      this.getUserLikedIds(userId, postIds),
      this.getUserBookmarkedIds(userId, postIds),
    ]);

    const postsWithStatus = posts.map((post) => ({
      ...post,
      author: {
        id: post.author.id,
        nickname: post.author.nickname,
        avatarUrl: post.author.avatarUrl,
      },
      isLiked: likedIds.includes(post.id),
      isBookmarked: bookmarkedIds.includes(post.id),
    }));

    return {
      data: postsWithStatus,
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

  async findById(postId: string, userId: string) {
    const post = await this.postRepository.findOne({
      where: { id: postId, isHidden: false },
      relations: ['images', 'author', 'spot'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const [isLiked, isBookmarked] = await Promise.all([
      this.likeRepository.findOne({ where: { postId, userId } }),
      this.bookmarkRepository.findOne({ where: { postId, userId } }),
    ]);

    return {
      ...post,
      author: {
        id: post.author.id,
        nickname: post.author.nickname,
        avatarUrl: post.author.avatarUrl,
      },
      isLiked: !!isLiked,
      isBookmarked: !!isBookmarked,
    };
  }

  async create(userId: string, dto: CreatePostDto) {
    const post = this.postRepository.create({
      authorId: userId,
      spotId: dto.spotId,
      content: dto.content,
      tags: dto.tags,
    });

    const savedPost = await this.postRepository.save(post);

    if (dto.imageUrls?.length) {
      const images = dto.imageUrls.map((url, index) =>
        this.imageRepository.create({
          postId: savedPost.id,
          imageUrl: url,
          sortOrder: index,
        }),
      );
      await this.imageRepository.save(images);
    }

    return this.findById(savedPost.id, userId);
  }

  async update(postId: string, userId: string, dto: UpdatePostDto) {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    Object.assign(post, dto);
    await this.postRepository.save(post);

    if (dto.imageUrls !== undefined) {
      await this.imageRepository.delete({ postId });
      if (dto.imageUrls.length) {
        const images = dto.imageUrls.map((url, index) =>
          this.imageRepository.create({
            postId,
            imageUrl: url,
            sortOrder: index,
          }),
        );
        await this.imageRepository.save(images);
      }
    }

    return this.findById(postId, userId);
  }

  async delete(postId: string, userId: string) {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postRepository.softDelete(postId);
    return { message: 'Post deleted successfully' };
  }

  async incrementCommentCount(postId: string, delta: number = 1) {
    await this.postRepository.increment({ id: postId }, 'commentCount', delta);
  }

  private async getUserLikedIds(userId: string, postIds: string[]): Promise<string[]> {
    if (!postIds.length) return [];
    const likes = await this.likeRepository
      .createQueryBuilder('like')
      .where('like.userId = :userId', { userId })
      .andWhere('like.postId IN (:...postIds)', { postIds })
      .getMany();
    return likes.map((l) => l.postId);
  }

  private async getUserBookmarkedIds(userId: string, postIds: string[]): Promise<string[]> {
    if (!postIds.length) return [];
    const bookmarks = await this.bookmarkRepository
      .createQueryBuilder('bookmark')
      .where('bookmark.userId = :userId', { userId })
      .andWhere('bookmark.postId IN (:...postIds)', { postIds })
      .getMany();
    return bookmarks.map((b) => b.postId);
  }
}
