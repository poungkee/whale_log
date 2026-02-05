import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Terms } from './terms.entity';

@Entity('terms_agreements')
@Unique('UQ_terms_agreement_user_terms', ['userId', 'termsId'])
export class TermsAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'terms_id', type: 'uuid' })
  termsId: string;

  @Column({ type: 'boolean' })
  agreed: boolean;

  @Column({ name: 'agreed_at', type: 'timestamp' })
  agreedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ---- Relations ----

  @ManyToOne(() => User, (user) => user.termsAgreements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Terms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'terms_id' })
  terms: Terms;
}
