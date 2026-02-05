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
