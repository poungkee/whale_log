/**
 * @file users.module.ts
 * @description 사용자(Users) 모듈
 *
 * 사용자 프로필 관리, 조회, 수정, FCM 토큰 관리 등을 담당합니다.
 * User 엔티티를 TypeORM에 등록하고, UsersService를 다른 모듈에서도 사용할 수 있도록 export합니다.
 * AuthModule에서 사용자 생성/조회를 위해 이 모듈을 import합니다.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
