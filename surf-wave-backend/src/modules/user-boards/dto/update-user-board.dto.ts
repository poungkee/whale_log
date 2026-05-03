/**
 * @file update-user-board.dto.ts
 * @description 보드 수정 요청 DTO — 모든 필드 선택
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserBoardDto } from './create-user-board.dto';

export class UpdateUserBoardDto extends PartialType(CreateUserBoardDto) {}
