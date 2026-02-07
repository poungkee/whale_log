/**
 * @file answers.controller.ts
 * @description 답변 컨트롤러 - Q&A 답변 CRUD 및 채택 API
 *
 * @endpoints
 * - PATCH  /answers/:id       - 답변 수정
 * - DELETE /answers/:id       - 답변 삭제
 * - POST   /answers/:id/accept - 답변 채택
 */
import {
  Controller,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnswersService } from './answers.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UpdateAnswerDto } from './dto/update-answer.dto';

@ApiTags('qna')
@ApiBearerAuth()
@Controller('qna/answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Patch(':answerId')
  @ApiOperation({ summary: 'Update answer' })
  async updateAnswer(
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateAnswerDto,
  ) {
    return this.answersService.update(answerId, user.id, dto);
  }

  @Delete(':answerId')
  @ApiOperation({ summary: 'Delete answer' })
  async deleteAnswer(
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @CurrentUser() user: User,
  ) {
    return this.answersService.delete(answerId, user.id);
  }
}
