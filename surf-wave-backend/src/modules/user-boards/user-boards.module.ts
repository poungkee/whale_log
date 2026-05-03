/**
 * @file user-boards.module.ts
 * @description 내 보드 등록 기능 모듈
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
export class UserBoardsModule {}
