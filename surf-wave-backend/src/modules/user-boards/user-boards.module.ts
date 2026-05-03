/**
 * @file user-boards.module.ts
 * @description 내 보드 등록 기능 모듈
 *
 * OnModuleInit으로 user_boards 테이블 자동 생성 (synchronize=false 환경 대응).
 * 프로덕션은 synchronize=false라 신규 엔티티 추가 시 테이블이 자동 생성되지 않음.
 * → 모듈 부팅 시 CREATE TABLE IF NOT EXISTS로 안전하게 보장.
 */
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserBoard } from './entities/user-board.entity';
import { User } from '../users/entities/user.entity';
import { UserBoardsService } from './user-boards.service';
import { UserBoardsController } from './user-boards.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserBoard, User])],
  controllers: [UserBoardsController],
  providers: [UserBoardsService],
  exports: [UserBoardsService],
})
export class UserBoardsModule implements OnModuleInit {
  private readonly logger = new Logger(UserBoardsModule.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 모듈 초기화 시 user_boards 테이블이 없으면 생성
   * (synchronize=false 프로덕션 환경에서도 안전하게 동작)
   */
  async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS user_boards (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          nickname varchar(30) NOT NULL,
          board_type varchar(20) NOT NULL,
          size_ft decimal(3,1),
          is_primary boolean DEFAULT false NOT NULL,
          notes varchar(200),
          created_at timestamptz DEFAULT now() NOT NULL,
          updated_at timestamptz DEFAULT now() NOT NULL,
          deleted_at timestamptz
        )
      `);
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS IDX_user_boards_user_id ON user_boards(user_id)`,
      );
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS IDX_user_boards_user_id_is_primary ON user_boards(user_id, is_primary)`,
      );
      this.logger.log('user_boards 테이블 확인 완료');
    } catch (err) {
      this.logger.error(`user_boards 테이블 생성 실패: ${(err as Error).message}`);
    }
  }
}
