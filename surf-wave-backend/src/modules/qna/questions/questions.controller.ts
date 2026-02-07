/**
 * @file questions.controller.ts
 * @description 질문 컨트롤러 - Q&A 질문 CRUD API
 *
 * @endpoints
 * - POST   /questions          - 질문 작성
 * - GET    /questions          - 질문 목록 조회
 * - GET    /questions/:id      - 질문 상세 조회
 * - PATCH  /questions/:id      - 질문 수정
 * - DELETE /questions/:id      - 질문 삭제
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { AnswersService } from '../answers/answers.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionQueryDto } from './dto/question-query.dto';
import { CreateAnswerDto } from '../answers/dto/create-answer.dto';

@ApiTags('qna')
@ApiBearerAuth()
@Controller('qna/questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly answersService: AnswersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get questions list' })
  async getQuestions(@Query() query: QuestionQueryDto) {
    return this.questionsService.findAll(query);
  }

  @Get(':questionId')
  @ApiOperation({ summary: 'Get question detail with answers' })
  async getQuestion(@Param('questionId', ParseUUIDPipe) questionId: string) {
    return this.questionsService.findById(questionId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new question' })
  async createQuestion(
    @CurrentUser() user: User,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionsService.create(user.id, dto);
  }

  @Patch(':questionId')
  @ApiOperation({ summary: 'Update question' })
  async updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(questionId, user.id, dto);
  }

  @Delete(':questionId')
  @ApiOperation({ summary: 'Delete question' })
  async deleteQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: User,
  ) {
    return this.questionsService.delete(questionId, user.id);
  }

  @Post(':questionId/answers')
  @ApiOperation({ summary: 'Create answer for question' })
  async createAnswer(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.answersService.create(questionId, user.id, dto);
  }

  @Post(':questionId/accept/:answerId')
  @ApiOperation({ summary: 'Accept answer' })
  async acceptAnswer(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @CurrentUser() user: User,
  ) {
    return this.questionsService.acceptAnswer(questionId, answerId, user.id);
  }
}
