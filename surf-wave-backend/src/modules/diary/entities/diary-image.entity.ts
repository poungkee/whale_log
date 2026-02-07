/**
 * @file diary-image.entity.ts
 * @description 다이어리 이미지 엔티티 - diary_images 테이블, 다이어리 첨부 사진
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SurfDiary } from './surf-diary.entity';

@Entity('diary_images')
export class DiaryImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'diary_id', type: 'uuid' })
  diaryId: string;

  @Column({ name: 'image_url', type: 'varchar' })
  imageUrl: string;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ---- Relations ----

  @ManyToOne(() => SurfDiary, (diary) => diary.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'diary_id' })
  diary: SurfDiary;
}
