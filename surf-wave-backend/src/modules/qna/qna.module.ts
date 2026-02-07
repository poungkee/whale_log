/**
 * @file qna.module.ts
 * @description Q&A(질문/답변) 모듈 - 서핑 관련 질문과 답변
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsController } from './questions/questions.controller';
import { QuestionsService } from './questions/questions.service';
import { AnswersController } from './answers/answers.controller';
import { AnswersService } from './answers/answers.service';
import { Question } from './questions/entities/question.entity';
import { Answer } from './answers/entities/answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Answer])],
  controllers: [QuestionsController, AnswersController],
  providers: [QuestionsService, AnswersService],
  exports: [QuestionsService, AnswersService],
})
export class QnAModule {}
