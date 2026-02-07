/**
 * @file spot-vote.entity.ts
 * @description 스팟 컨디션 투표 엔티티 - spot_votes 테이블 매핑
 *
 * 사용자가 특정 스팟의 오늘 파도 상태에 대해 투표한 기록을 저장합니다.
 * userId + spotId + votedDate 조합이 유니크하여 하루 1회만 투표 가능합니다.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { VoteType } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Spot } from './spot.entity';

@Entity('spot_votes')
@Unique('UQ_spot_vote_user_spot_date', ['userId', 'spotId', 'votedDate'])
export class SpotVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'spot_id', type: 'uuid' })
  spotId: string;

  @Column({
    name: 'vote_type',
    type: 'enum',
    enum: VoteType,
  })
  voteType: VoteType;

  @Column({ name: 'voted_date', type: 'date' })
  votedDate: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ---- Relations ----

  @ManyToOne(() => User, (user) => user.spotVotes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Spot, (spot) => spot.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spot_id' })
  spot: Spot;
}
