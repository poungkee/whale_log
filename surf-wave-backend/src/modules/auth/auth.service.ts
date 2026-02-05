import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { FIREBASE_ADMIN } from '../../config/firebase.config';
import * as admin from 'firebase-admin';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    @Inject(FIREBASE_ADMIN) private firebaseAdmin: admin.app.App | null,
  ) {}

  async register(registerDto: RegisterDto) {
    const { firebaseToken, nickname, provider } = registerDto;

    // Verify Firebase token
    const decodedToken = await this.verifyToken(firebaseToken);

    // Check if user already exists
    const existingUser = await this.usersService.findByFirebaseUid(decodedToken.uid);
    if (existingUser) {
      throw new ConflictException('User already registered');
    }

    // Check nickname availability
    const nicknameExists = await this.usersService.findByNickname(nickname);
    if (nicknameExists) {
      throw new ConflictException('Nickname already taken');
    }

    // Create user
    const user = await this.usersService.create({
      firebaseUid: decodedToken.uid,
      email: decodedToken.email || '',
      nickname,
      provider,
    });

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async login(loginDto: LoginDto) {
    const { firebaseToken } = loginDto;

    const decodedToken = await this.verifyToken(firebaseToken);

    const user = await this.usersService.findByFirebaseUid(decodedToken.uid);
    if (!user) {
      throw new UnauthorizedException('User not registered');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      surfLevel: user.surfLevel,
      notificationsEnabled: user.notificationsEnabled,
    };
  }

  async withdraw(userId: string) {
    await this.usersService.softDelete(userId);
    return { message: 'Account deleted successfully' };
  }

  private async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.firebaseAdmin) {
      // Dev mode mock
      this.logger.warn('Firebase not configured, using mock token');
      return {
        uid: 'mock-uid-' + Date.now(),
        email: 'mock@example.com',
      } as admin.auth.DecodedIdToken;
    }

    try {
      return await this.firebaseAdmin.auth().verifyIdToken(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}
