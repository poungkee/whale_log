/**
 * @file user-boards.controller.ts
 * @description 내 보드 CRUD API
 *
 * - GET /user-boards/me — 내 보드 목록
 * - POST /user-boards — 보드 등록
 * - PATCH /user-boards/:id — 보드 수정
 * - DELETE /user-boards/:id — 보드 삭제 (소프트)
 *
 * 모든 엔드포인트는 JWT 인증 필요 (전역 가드 적용)
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserBoardsService } from './user-boards.service';
import { CreateUserBoardDto } from './dto/create-user-board.dto';
import { UpdateUserBoardDto } from './dto/update-user-board.dto';

@Controller('user-boards')
export class UserBoardsController {
  constructor(private readonly service: UserBoardsService) {}

  @Get('me')
  async findMyBoards(@CurrentUser() user: RequestUser) {
    return this.service.findAll(user.id);
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserBoardDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserBoardDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(user.id, id);
    return { ok: true };
  }
}
