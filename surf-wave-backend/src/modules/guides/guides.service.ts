/**
 * @file guides.service.ts
 * @description 가이드 서비스 - 교육 콘텐츠 조회 및 학습 진행도 관리
 *
 * @methods
 * - findAll: 가이드 목록 조회
 * - findOne: 가이드 상세 조회
 * - markProgress: 학습 진행도 업데이트
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guide } from './entities/guide.entity';
import { GuideProgress } from './entities/guide-progress.entity';
import { GuideQueryDto } from './dto/guide-query.dto';
import { GuideCategory } from '../../common/enums/guide-category.enum';

@Injectable()
export class GuidesService {
  constructor(
    @InjectRepository(Guide)
    private readonly guideRepository: Repository<Guide>,
    @InjectRepository(GuideProgress)
    private readonly progressRepository: Repository<GuideProgress>,
  ) {}

  async findAll(query: GuideQueryDto, userId: string) {
    const { category } = query;

    const qb = this.guideRepository
      .createQueryBuilder('guide')
      .where('guide.isPublished = :isPublished', { isPublished: true });

    if (category) {
      qb.andWhere('guide.category = :category', { category });
    }

    const guides = await qb.orderBy('guide.sortOrder', 'ASC').getMany();

    // Get user's progress
    const progress = await this.progressRepository.find({
      where: { userId },
    });
    const completedGuideIds = progress
      .filter((p) => p.isCompleted)
      .map((p) => p.guideId);

    return guides.map((guide) => ({
      ...guide,
      isCompleted: completedGuideIds.includes(guide.id),
    }));
  }

  async findById(guideId: string, userId: string) {
    const guide = await this.guideRepository.findOne({
      where: { id: guideId, isPublished: true },
    });

    if (!guide) {
      throw new NotFoundException('Guide not found');
    }

    const progress = await this.progressRepository.findOne({
      where: { guideId, userId },
    });

    return {
      ...guide,
      isCompleted: progress?.isCompleted || false,
      completedAt: progress?.completedAt || null,
    };
  }

  async markComplete(guideId: string, userId: string) {
    const guide = await this.guideRepository.findOne({
      where: { id: guideId },
    });

    if (!guide) {
      throw new NotFoundException('Guide not found');
    }

    let progress = await this.progressRepository.findOne({
      where: { guideId, userId },
    });

    if (progress) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    } else {
      progress = this.progressRepository.create({
        guideId,
        userId,
        isCompleted: true,
        completedAt: new Date(),
      });
    }

    await this.progressRepository.save(progress);
    return { message: 'Guide marked as complete' };
  }

  async getProgress(userId: string) {
    const allGuides = await this.guideRepository.find({
      where: { isPublished: true },
    });

    const completedProgress = await this.progressRepository.find({
      where: { userId, isCompleted: true },
    });

    const completedGuideIds = completedProgress.map((p) => p.guideId);

    // Group by category
    const categories = Object.values(GuideCategory);
    const categoryProgress = categories.map((category) => {
      const categoryGuides = allGuides.filter((g) => g.category === category);
      const completed = categoryGuides.filter((g) =>
        completedGuideIds.includes(g.id),
      );
      return {
        category,
        total: categoryGuides.length,
        completed: completed.length,
      };
    });

    return {
      totalGuides: allGuides.length,
      completedGuides: completedGuideIds.length,
      progressPercentage:
        allGuides.length > 0
          ? Math.round((completedGuideIds.length / allGuides.length) * 100)
          : 0,
      categories: categoryProgress,
    };
  }
}
