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
