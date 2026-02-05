import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Spot } from '../spots/entities/spot.entity';
import { Post } from '../community/posts/entities/post.entity';
import { Report } from '../community/reports/entities/report.entity';
import { Guide } from '../guides/entities/guide.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { ReportStatus } from '../../common/enums/report-status.enum';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { CreateSpotDto } from './dto/create-spot.dto';
import { UpdateSpotDto } from './dto/update-spot.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
import { BroadcastDto } from './dto/broadcast.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Spot)
    private readonly spotRepository: Repository<Spot>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Guide)
    private readonly guideRepository: Repository<Guide>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalSpots,
      totalPosts,
      pendingReports,
    ] = await Promise.all([
      this.userRepository.count(),
      this.spotRepository.count({ where: { isActive: true } }),
      this.postRepository.count({ where: { isHidden: false } }),
      this.reportRepository.count({ where: { status: ReportStatus.PENDING } }),
    ]);

    return {
      totalUsers,
      totalSpots,
      totalPosts,
      pendingReports,
      // TODO: Add more stats
      activeUsersToday: 0,
      totalDiaries: 0,
      newUsersThisWeek: 0,
    };
  }

  async getUsers(query: PaginationDto) {
    const { page = 1, limit = 20 } = query;

    const [users, total] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        role: u.role,
        isSuspended: u.isSuspended,
        createdAt: u.createdAt,
      })),
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async suspendUser(userId: string, dto: SuspendUserDto) {
    await this.userRepository.update(userId, {
      isSuspended: dto.isSuspended,
      suspendedUntil: dto.suspendedUntil ? new Date(dto.suspendedUntil) : null,
    });
    return { message: dto.isSuspended ? 'User suspended' : 'User unsuspended' };
  }

  async changeUserRole(userId: string, role: Role) {
    await this.userRepository.update(userId, { role });
    return { message: 'User role updated' };
  }

  async createSpot(dto: CreateSpotDto) {
    const spot = this.spotRepository.create(dto);
    return this.spotRepository.save(spot);
  }

  async updateSpot(spotId: string, dto: UpdateSpotDto) {
    const spot = await this.spotRepository.findOne({ where: { id: spotId } });
    if (!spot) {
      throw new NotFoundException('Spot not found');
    }
    Object.assign(spot, dto);
    return this.spotRepository.save(spot);
  }

  async deleteSpot(spotId: string) {
    await this.spotRepository.softDelete(spotId);
    return { message: 'Spot deleted' };
  }

  async getReports(query: PaginationDto) {
    const { page = 1, limit = 20 } = query;

    const [reports, total] = await this.reportRepository.findAndCount({
      relations: ['reporter', 'post', 'comment'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: reports,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resolveReport(reportId: string, dto: ResolveReportDto) {
    await this.reportRepository.update(reportId, {
      status: dto.status,
      adminNote: dto.adminNote,
      resolvedAt: new Date(),
    });
    return { message: 'Report resolved' };
  }

  async hidePost(postId: string, isHidden: boolean) {
    await this.postRepository.update(postId, { isHidden });
    return { message: isHidden ? 'Post hidden' : 'Post visible' };
  }

  async createGuide(dto: CreateGuideDto) {
    const guide = this.guideRepository.create(dto);
    return this.guideRepository.save(guide);
  }

  async updateGuide(guideId: string, dto: UpdateGuideDto) {
    const guide = await this.guideRepository.findOne({ where: { id: guideId } });
    if (!guide) {
      throw new NotFoundException('Guide not found');
    }
    Object.assign(guide, dto);
    return this.guideRepository.save(guide);
  }

  async broadcast(dto: BroadcastDto) {
    const users = await this.userRepository.find({
      where: { notificationsEnabled: true, fcmToken: Not(IsNull()) },
      select: ['id'],
    });

    // Create notifications for all users
    await Promise.all(
      users.map((user) =>
        this.notificationsService.createNotification(
          user.id,
          NotificationType.BROADCAST,
          dto.title,
          dto.body,
          dto.data,
        ),
      ),
    );

    return { message: `Broadcast sent to ${users.length} users` };
  }
}
