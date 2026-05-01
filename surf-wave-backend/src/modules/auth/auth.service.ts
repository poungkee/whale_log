/**
 * @file auth.service.ts
 * @description 인증 서비스 - 회원가입, 로그인(아이디), 소셜 로그인, 비밀번호 찾기, 회원탈퇴
 *
 * 지원하는 인증 방식:
 * 1. 아이디/비밀번호 일반 회원가입 → bcrypt로 비밀번호 해싱 후 DB 저장
 * 2. 아이디/비밀번호 일반 로그인 → bcrypt로 비밀번호 비교 후 JWT 발급
 * 3. Google/Kakao 소셜 로그인
 * 4. 비밀번호 찾기 → 이메일로 6자리 인증코드 발송 → Redis 5분 TTL 저장
 * 5. 아이디 중복 확인
 * 6. 회원탈퇴 → 소프트 삭제
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import * as bcrypt from 'bcrypt';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { Resend } from 'resend';
import { UsersService } from '../users/users.service';
import { BadgesService } from '../badges/badges.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { User } from '../users/entities/user.entity';
import { REDIS_CLIENT } from '../../config/redis.config';

/** Redis에 인증코드 저장할 때 사용하는 키 접두사 */
const PASSWORD_RESET_PREFIX = 'pw_reset:';
/** 인증코드 유효 시간: 5분 (초 단위) */
const RESET_CODE_TTL = 300;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Resend 이메일 클라이언트 - 비밀번호 찾기 인증코드 발송용 */
  private readonly resend: Resend;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    /** Redis 클라이언트 - 인증코드 임시 저장용 */
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly badgesService: BadgesService,
  ) {
    /** RESEND_API_KEY 환경변수로 Resend 클라이언트 초기화 */
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  /**
   * 아이디 중복 확인
   * - 이미 사용 중인 아이디면 { available: false }
   * - 사용 가능하면 { available: true }
   */
  async checkUsername(username: string) {
    const existing = await this.usersService.findByUsername(username);
    return { available: !existing };
  }

  /**
   * 일반 회원가입 (아이디 + 이메일 + 비밀번호)
   *
   * 처리 순서:
   * 1. 아이디 중복 확인
   * 2. 이메일 중복 확인
   * 3. 비밀번호 bcrypt 해싱
   * 4. DB에 사용자 생성
   * 5. JWT 발급 후 반환
   */
  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    /** 아이디 중복 확인 */
    const existingUsername = await this.usersService.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('이미 사용 중인 아이디입니다');
    }

    /** 이메일 중복 확인 */
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('이미 가입된 이메일입니다');
    }

    /** 비밀번호 해싱 */
    const passwordHash = await bcrypt.hash(password, 10);

    /** DB에 사용자 생성 */
    const user = await this.usersService.create({
      username,
      email,
      passwordHash,
    });

    const token = this.generateToken(user);
    return { accessToken: token, user: this.sanitizeUser(user) };
  }

  /**
   * 아이디/비밀번호 로그인
   *
   * 처리 순서:
   * 1. 아이디로 사용자 조회 → 없으면 401
   * 2. 소셜 전용 계정 확인 (passwordHash null이면 401)
   * 3. 비밀번호 bcrypt 비교
   * 4. 계정 정지 여부 확인
   * 5. 마지막 로그인 시각 갱신 후 JWT 발급
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    /** 아이디로 사용자 조회 (passwordHash 포함) */
    const user = await this.usersService.findByUsername(username, true);
    if (!user) {
      throw new UnauthorizedException('가입되지 않은 아이디입니다');
    }

    /** 소셜 로그인 전용 계정 확인 */
    if (!user.passwordHash) {
      throw new UnauthorizedException('소셜 로그인으로 가입된 계정입니다. 소셜 로그인을 이용해주세요.');
    }

    /** 비밀번호 비교 */
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다');
    }

    /** 계정 정지 여부 확인 */
    if (user.isSuspended) {
      throw new UnauthorizedException('정지된 계정입니다');
    }

    /** 마지막 로그인 시각 갱신 */
    await this.usersService.updateLastLogin(user.id);

    /** 뱃지 체크 — 로그인 시 개근상(기념일) 체크 */
    this.badgesService.checkAndAward({ userId: user.id, trigger: 'LOGIN' }).catch(() => {});

    const token = this.generateToken(user);
    return { accessToken: token, user: this.sanitizeUser(user) };
  }

  /**
   * 비밀번호 찾기 - 이메일로 6자리 인증코드 발송
   *
   * 처리 순서:
   * 1. 이메일로 사용자 조회 → 없어도 동일한 응답 반환 (보안: 이메일 존재 여부 노출 방지)
   * 2. 6자리 랜덤 인증코드 생성
   * 3. Redis에 5분 TTL로 저장 (키: pw_reset:{email})
   * 4. Gmail SMTP로 인증코드 이메일 발송
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    /** 이메일로 사용자 조회 (withPassword=true: passwordHash 포함 조회) */
    const user = await this.usersService.findByEmail(email, true);
    if (!user) {
      /** 보안: 실제로는 없는 이메일이어도 동일한 메시지 반환 */
      return { message: '인증코드가 이메일로 발송되었습니다. 5분 내로 입력해주세요.' };
    }

    /** 소셜 전용 계정은 비밀번호 찾기 불가 */
    if (!user.passwordHash) {
      throw new BadRequestException('소셜 로그인으로 가입된 계정은 비밀번호 찾기를 사용할 수 없습니다');
    }

    /** 6자리 랜덤 인증코드 생성 (000000 ~ 999999) */
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    /** Redis에 5분 TTL로 저장 */
    await this.redisClient.set(`${PASSWORD_RESET_PREFIX}${email}`, code, 'EX', RESET_CODE_TTL);

    /** Resend API로 인증코드 이메일 발송 */
    try {
      const { error } = await this.resend.emails.send({
        from: 'Whale Log <onboarding@resend.dev>',
        to: email,
        subject: '[Whale Log] 비밀번호 재설정 인증코드',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #0ea5e9;">🐋 Whale Log 비밀번호 재설정</h2>
            <p>안녕하세요, <strong>${user.username || user.email}</strong>님!</p>
            <p>비밀번호 재설정을 요청하셨습니다. 아래 인증코드를 입력해주세요.</p>
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">⏱ 이 인증코드는 <strong>5분간</strong> 유효합니다.</p>
            <p style="color: #64748b; font-size: 14px;">본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
          </div>
        `,
      });
      if (error) {
        this.logger.error(`Resend 이메일 발송 실패: ${error.message}`);
      } else {
        this.logger.log(`비밀번호 재설정 인증코드 발송 완료: ${email}`);
      }
    } catch (mailError) {
      this.logger.error(`이메일 발송 오류: ${(mailError as Error).message}`);
    }

    return { message: '인증코드가 이메일로 발송되었습니다. 5분 내로 입력해주세요.' };
  }

  /**
   * 비밀번호 재설정 - 인증코드 확인 후 새 비밀번호로 변경
   *
   * 처리 순서:
   * 1. Redis에서 인증코드 조회 → 없거나 만료됐으면 400
   * 2. 입력한 코드와 저장된 코드 비교
   * 3. 새 비밀번호 bcrypt 해싱 후 DB 업데이트
   * 4. Redis에서 인증코드 삭제 (1회성)
   */
  async resetPassword(dto: ResetPasswordDto) {
    const { email, code, newPassword } = dto;

    /** Redis에서 인증코드 조회 */
    const storedCode = await this.redisClient.get(`${PASSWORD_RESET_PREFIX}${email}`);
    if (!storedCode) {
      throw new BadRequestException('인증코드가 만료되었거나 존재하지 않습니다. 다시 요청해주세요.');
    }

    /** 인증코드 비교 */
    if (storedCode !== code) {
      throw new BadRequestException('인증코드가 올바르지 않습니다');
    }

    /** 이메일로 사용자 조회 */
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    /** 새 비밀번호 해싱 후 DB 업데이트 */
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(user.id, { passwordHash });

    /** 인증코드 즉시 삭제 (1회성 코드) */
    await this.redisClient.del(`${PASSWORD_RESET_PREFIX}${email}`);

    this.logger.log(`비밀번호 재설정 완료: ${email}`);
    return { message: '비밀번호가 성공적으로 변경되었습니다' };
  }

  /**
   * 소셜 로그인/가입 공통 처리 (Google, Kakao 공용)
   *
   * username 자동 부여 정책:
   * - 카카오: 받아온 닉네임을 username으로 자동 저장 (충돌 시 "포웅1" suffix)
   * - 구글: PostgreSQL 시퀀스로 "서퍼1", "서퍼2"... 자동 부여
   *
   * 응답에 isNewUser 포함:
   * - 신규 가입자(첫 소셜 로그인) → 프론트에서 아이디 설정 팝업 노출 (구글만)
   *
   * @param socialId - 소셜 ID (google_xxx, kakao_xxx)
   * @param email - 소셜 계정 이메일
   * @param provider - GOOGLE | KAKAO
   * @param kakaoNickname - 카카오에서 받아온 닉네임 (카카오 전용)
   */
  async socialLogin(
    socialId: string,
    email: string,
    provider: 'GOOGLE' | 'KAKAO',
    kakaoNickname?: string,
  ) {
    let user = await this.usersService.findByFirebaseUid(socialId);
    let isNewUser = false;

    if (!user) {
      const existingEmail = await this.usersService.findByEmail(email);

      if (existingEmail) {
        /** 기존 이메일 가입자 → 소셜 연동만 추가 */
        await this.usersService.update(existingEmail.id, {
          firebaseUid: socialId,
          provider: provider as any,
        });
        user = await this.usersService.findById(existingEmail.id);
      } else {
        /** 완전 신규 가입 — username 자동 부여 */
        isNewUser = true;
        const autoUsername = provider === 'KAKAO' && kakaoNickname
          ? await this.usersService.findAvailableUsername(kakaoNickname)
          : await this.usersService.nextGoogleTempUsername();

        user = await this.usersService.create({
          firebaseUid: socialId,
          email,
          provider: provider as any,
          username: autoUsername,
        });
      }
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('정지된 계정입니다');
    }

    await this.usersService.updateLastLogin(user.id);
    const token = this.generateToken(user);
    return { accessToken: token, user: this.sanitizeUser(user), isNewUser };
  }

  /** Google 소셜 로그인 */
  async googleLogin(credential: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          'https://oauth2.googleapis.com/tokeninfo',
          `id_token=${encodeURIComponent(credential)}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );

      const googleId = `google_${data.sub}`;
      const email = data.email;

      if (!email) {
        throw new UnauthorizedException('Google 계정에 이메일이 없습니다');
      }

      return this.socialLogin(googleId, email, 'GOOGLE');
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Google 토큰 검증 실패: ${(error as Error).message}`);
      throw new UnauthorizedException('Google 인증에 실패했습니다');
    }
  }

  /** Google 인가코드로 로그인 (모바일 앱용) */
  async googleLoginWithCode(code: string, redirectUri: string) {
    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new UnauthorizedException('Google 로그인 설정이 완료되지 않았습니다');
      }

      // 인가코드 → 토큰 교환
      const { data: tokenData } = await firstValueFrom(
        this.httpService.post(
          'https://oauth2.googleapis.com/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code,
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );

      if (!tokenData.id_token) {
        throw new UnauthorizedException('Google ID 토큰을 받지 못했습니다');
      }

      // ID 토큰으로 사용자 로그인 처리
      return this.googleLogin(tokenData.id_token);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      const axiosError = error as any;
      if (axiosError.response) {
        this.logger.error(`Google API 응답: ${axiosError.response.status} ${JSON.stringify(axiosError.response.data)}`);
      }
      this.logger.error(`Google 인가코드 교환 실패: ${(error as Error).message}`);
      throw new UnauthorizedException('Google 인증에 실패했습니다');
    }
  }

  /** Kakao 소셜 로그인 — 닉네임도 함께 가져와서 username 자동 저장에 활용 */
  async kakaoLogin(accessToken: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get('https://kapi.kakao.com/v2/user/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      const kakaoId = `kakao_${data.id}`;
      const email = data.kakao_account?.email;
      const finalEmail = email || `kakao_${data.id}@kakao.user`;

      /** 카카오 닉네임 추출 — kakao_account.profile.nickname 우선, 없으면 properties.nickname */
      const nickname =
        data.kakao_account?.profile?.nickname ||
        data.properties?.nickname ||
        undefined;

      return this.socialLogin(kakaoId, finalEmail, 'KAKAO', nickname);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Kakao 토큰 검증 실패: ${(error as Error).message}`);
      throw new UnauthorizedException('카카오 인증에 실패했습니다');
    }
  }

  /** Kakao 인가코드로 로그인 */
  async kakaoLoginWithCode(code: string, redirectUri: string) {
    try {
      const kakaoRestApiKey = this.configService.get<string>('KAKAO_REST_API_KEY');
      if (!kakaoRestApiKey) {
        throw new UnauthorizedException('카카오 로그인 설정이 완료되지 않았습니다');
      }

      const kakaoClientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET');
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: kakaoRestApiKey,
        redirect_uri: redirectUri,
        code,
      });

      if (kakaoClientSecret) {
        tokenParams.append('client_secret', kakaoClientSecret);
      }

      const { data: tokenData } = await firstValueFrom(
        this.httpService.post(
          'https://kauth.kakao.com/oauth/token',
          tokenParams.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );

      return this.kakaoLogin(tokenData.access_token);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      const axiosError = error as any;
      if (axiosError.response) {
        this.logger.error(`Kakao API 응답: ${axiosError.response.status} ${JSON.stringify(axiosError.response.data)}`);
      }
      this.logger.error(`Kakao 인가코드 교환 실패: ${(error as Error).message}`);
      throw new UnauthorizedException('카카오 인증에 실패했습니다');
    }
  }

  /** 회원탈퇴 - 소프트 삭제 */
  async withdraw(userId: string) {
    await this.usersService.softDelete(userId);
    return { message: '회원탈퇴가 완료되었습니다' };
  }

  /** JWT 토큰 생성 */
  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  /** 민감 정보 제거 후 사용자 정보 반환 */
  private sanitizeUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      surfLevel: user.surfLevel,
      boardType: user.boardType ?? 'UNSET',
      provider: user.provider,
      notificationsEnabled: user.notificationsEnabled,
    };
  }
}
