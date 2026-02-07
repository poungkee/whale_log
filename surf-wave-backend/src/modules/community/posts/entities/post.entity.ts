/**
 * @file post.entity.ts
 * @description 게시글 엔티티 - posts 테이블
 */
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { User } from '../../../users/entities/user.entity';
import { Spot } from '../../../spots/entities/spot.entity';
import { PostImage } from './post-image.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Like } from '../../likes/like.entity';
import { Bookmark } from '../../bookmarks/bookmark.entity';

@Entity('posts')
@Index('IDX_post_author', ['authorId'])
export class Post extends BaseEntity {
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ name: 'spot_id', type: 'uuid', nullable: true })
  spotId: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count', type: 'int', default: 0 })
  commentCount: number;

  @Column({ name: 'bookmark_count', type: 'int', default: 0 })
  bookmarkCount: number;

  @Column({ name: 'is_hidden', type: 'boolean', default: false })
  isHidden: boolean;

  // ---- Relations ----

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToOne(() => Spot, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'spot_id' })
  spot: Spot | null;

  @OneToMany(() => PostImage, (image) => image.post)
  images: PostImage[];

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => Like, (like) => like.post)
  likes: Like[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.post)
  bookmarks: Bookmark[];
}
