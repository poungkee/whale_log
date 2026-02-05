import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { ReportPostDto } from '../posts/dto/report-post.dto';
import { ReportStatus } from '../../../common/enums/report-status.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async createPostReport(postId: string, userId: string, dto: ReportPostDto) {
    // Check for duplicate report
    const existing = await this.reportRepository.findOne({
      where: { postId, reporterId: userId, status: ReportStatus.PENDING },
    });

    if (existing) {
      throw new ConflictException('You have already reported this post');
    }

    const report = this.reportRepository.create({
      reporterId: userId,
      postId,
      reason: dto.reason,
      description: dto.description,
      status: ReportStatus.PENDING,
    });

    await this.reportRepository.save(report);
    return { message: 'Report submitted successfully' };
  }

  async createCommentReport(
    commentId: string,
    userId: string,
    dto: ReportPostDto,
  ) {
    const existing = await this.reportRepository.findOne({
      where: { commentId, reporterId: userId, status: ReportStatus.PENDING },
    });

    if (existing) {
      throw new ConflictException('You have already reported this comment');
    }

    const report = this.reportRepository.create({
      reporterId: userId,
      commentId,
      reason: dto.reason,
      description: dto.description,
      status: ReportStatus.PENDING,
    });

    await this.reportRepository.save(report);
    return { message: 'Report submitted successfully' };
  }
}
