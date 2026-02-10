/**
 * @file auth.service.ts
 * @description 인증 서비스 - 회원가입, 로그인, 소셜 로그인, 회원탈퇴의 핵심 비즈니스 로직
 *
 * 지원하는 인증 방식:
 * 1. 이메일/비밀번호 일반 회원가입 → bcrypt로 비밀번호 해싱 후 DB 저장
 * 2. 이메일/비밀번호 일반 로그인 → bcrypt로 비밀번호 비교 후 JWT 발급
 * 3. Google 소셜 로그인 → Google tokeninfo API로 ID 토큰 검증 후 JWT 발급
 * 4. Kakao 소셜 로그인 → Kakao user/me API로 액세스 토큰 검증 후 JWT 발급
 * 5. 회원탈퇴 → 소프트 삭제 (deletedAt 타임스탬프 기록)
 *
 * JWT 토큰 페이로드 구조:
 * { sub: 사용자UUID, email: 이메일, role: 역할(USER|ADMIN) }
 *
 * 소셜 로그인 ID 저장 형식:
 * - Google: "google_{sub}" → firebaseUid 컬럼에 저장
 * - Kakao: "kakao_{id}" → firebaseUid 컬럼에 저장
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import * as bcrypt from 'bcrypt';
import { firstValueFrom } from 'rxjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    /** 사용자 서비스 - DB에서 사용자 조회/생성/수정/삭제 */
    private readonly usersService: UsersService,
    /** JWT 서비스 - 토큰 생성 (sign) 및 검증 (verify) */
    private readonly jwtService: JwtService,
    /** HTTP 서비스 - Google/Kakao 외부 API 호출용 (axios 기반) */
    private readonly httpService: HttpService,
    /** 설정 서비스 - 환경변수 읽기 (KAKAO_REST_API_KEY 등) */
    private readonly configService: ConfigService,
  ) {}

  /**
   * 일반 회원가입 (이메일 + 비밀번호)
   *
   * 처리 순서:
   * 1. 이메일 중복 확인 → 이미 있으면 409 Conflict
   * 2. 닉네임 중복 확인 → 이미 있으면 409 Conflict
   * 3. 비밀번호를 bcrypt로 해싱 (salt rounds: 10)
   * 4. users 테이블에 새 사용자 레코드 생성
   * 5. JWT 액세스 토큰 생성
   * 6. 토큰 + 사용자 정보(민감정보 제외) 반환
   *
   * @param registerDto - { email, password, nickname }
   * @returns { accessToken: JWT문자열, user: 사용자정보 }
   * @throws ConflictException - 이메일 또는 닉네임 중복 시
   */
  async register(registerDto: RegisterDto) {
    const { email, password, nickname } = registerDto;

    /** 이메일 중복 확인 - users 테이블에서 email로 조회 */
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('이미 가입된 이메일입니다');
    }

    /** 닉네임 중복 확인 - users 테이블에서 nickname으로 조회 */
    const existingNickname = await this.usersService.findByNickname(nickname);
    if (existingNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다');
    }

    /** 비밀번호 해싱 - bcrypt salt rounds 10 (보안과 성능의 균형) */
    const passwordHash = await bcrypt.hash(password, 10);

    /** DB에 사용자 생성 - email, nickname, passwordHash 저장 */
    const user = await this.usersService.create({
      email,
      nickname,
      passwordHash,
    });

    /** JWT 토큰 생성 - { sub: userId, email, role } 페이로드 */
    const token = this.generateToken(user);

    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * 일반 로그인 (이메일 + 비밀번호)
   *
   * 처리 순서:
   * 1. 이메일로 사용자 조회 → 없으면 401 Unauthorized
   * 2. passwordHash 존재 확인 → null이면 소셜 로그인 계정이므로 401 반환
   * 3. bcrypt.compare로 입력 비밀번호와 해시 비교 → 불일치 시 401
   * 4. 계정 정지 여부 확인 → 정지됐으면 401
   * 5. 마지막 로그인 시각 갱신 (last_login_at)
   * 6. JWT 토큰 생성 후 반환
   *
   * @param loginDto - { email, password }
   * @returns { accessToken: JWT문자열, user: 사용자정보 }
   * @throws UnauthorizedException - 이메일 미존재, 비밀번호 불일치, 정지된 계정
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    /** 이메일로 사용자 조회 - users 테이블에서 email 일치하는 레코드 */
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('가입되지 않은 이메일입니다');
    }

    /** 소셜 로그인 계정인지 확인 - passwordHash가 null이면 소셜 전용 계정 */
    if (!user.passwordHash) {
      throw new UnauthorizedException('소셜 로그인으로 가입된 계정입니다. 소셜 로그인을 이용해주세요.');
    }

    /** bcrypt로 비밀번호 비교 - 입력값과 DB에 저장된 해시 비교 */
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다');
    }

    /** 계정 정지 여부 확인 - 관리자에 의해 정지된 계정은 로그인 불가 */
    if (user.isSuspended) {
      throw new UnauthorizedException('정지된 계정입니다');
    }

    /** 마지막 로그인 시각 갱신 - 활동 추적용 */
    await this.usersService.updateLastLogin(user.id);

    /** JWT 토큰 생성 및 반환 */
    const token = this.generateToken(user);

    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * 소셜 로그인/가입 공통 처리 (Google, Kakao 공용)
   *
   * 동작 흐름:
   * 1. socialId(예: "google_12345")로 기존 사용자 조회
   * 2-a. 사용자 있으면 → 바로 로그인 처리
   * 2-b. 사용자 없으면 → 이메일로 기존 계정 확인
   *   - 이메일 계정 있으면: 소셜 계정 연결 (firebaseUid, provider 업데이트)
   *   - 이메일 계정 없으면: 신규 사용자 생성
   * 3. 정지 여부 확인
   * 4. 로그인 시각 갱신 후 JWT 발급
   *
   * @param socialId - 소셜 플랫폼 고유 ID ("google_{sub}" 또는 "kakao_{id}")
   * @param email - 소셜 계정의 이메일
   * @param provider - 소셜 로그인 제공자 ('GOOGLE' | 'KAKAO')
   * @param nickname - (선택) 신규 가입 시 사용할 닉네임
   * @returns { accessToken, user }
   */
  async socialLogin(socialId: string, email: string, provider: 'GOOGLE' | 'KAKAO', nickname?: string) {
    /** socialId(firebaseUid 컬럼)로 기존 사용자 조회 */
    let user = await this.usersService.findByFirebaseUid(socialId);

    if (!user) {
      /** 소셜 ID로 사용자를 못 찾은 경우 → 이메일로 기존 계정 확인 */
      const existingEmail = await this.usersService.findByEmail(email);

      if (existingEmail) {
        /**
         * 이메일 계정이 이미 존재하는 경우 → 소셜 계정 연결
         * 예: 이메일로 가입 후 나중에 Google 로그인 시도 → 같은 계정에 Google ID 연결
         */
        await this.usersService.update(existingEmail.id, {
          firebaseUid: socialId,
          provider: provider as any,
        });
        user = await this.usersService.findById(existingEmail.id);
      } else {
        /**
         * 완전히 새로운 사용자 → 소셜 계정으로 신규 가입
         * 닉네임이 없으면 이메일 앞부분 + 랜덤 4자리로 자동 생성
         * 예: "surfuser@gmail.com" → "surfuser_a1b2"
         */
        const finalNickname = nickname || email.split('@')[0] + '_' + Date.now().toString(36).slice(-4);
        user = await this.usersService.create({
          firebaseUid: socialId,
          email,
          nickname: finalNickname,
          provider: provider as any,
        });
      }
    }

    /** 정지된 계정 확인 */
    if (user.isSuspended) {
      throw new UnauthorizedException('정지된 계정입니다');
    }

    /** 마지막 로그인 시각 갱신 */
    await this.usersService.updateLastLogin(user.id);

    /** JWT 토큰 생성 및 반환 */
    const token = this.generateToken(user);

    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Google 소셜 로그인 - Google ID 토큰을 검증하여 사용자 인증
   *
   * 처리 순서:
   * 1. Google tokeninfo API에 ID 토큰 전달하여 검증
   *    - API: GET https://oauth2.googleapis.com/tokeninfo?id_token={credential}
   *    - 응답 데이터: { sub: Google고유ID, email: 이메일, ... }
   * 2. 검증 성공 시 socialLogin() 공통 처리로 위임
   * 3. 검증 실패 시 401 Unauthorized 반환
   *
   * @param credential - 프론트엔드 Google Sign-In에서 받은 ID 토큰 문자열
   * @param nickname - (선택) 신규 가입 시 닉네임
   * @returns { accessToken, user }
   * @throws UnauthorizedException - 토큰 검증 실패 시
   */
  async googleLogin(credential: string, nickname?: string) {
    try {
      /** Google tokeninfo API 호출 - ID 토큰의 유효성 검증 및 사용자 정보 반환 */
      const { data } = await firstValueFrom(
        this.httpService.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`),
      );

      /** Google 고유 ID 생성 - "google_" 접두사 + Google sub 값 */
      const googleId = `google_${data.sub}`;
      /** Google 계정 이메일 추출 */
      const email = data.email;

      if (!email) {
        throw new UnauthorizedException('Google 계정에 이메일이 없습니다');
      }

      /** 공통 소셜 로그인 처리로 위임 */
      return this.socialLogin(googleId, email, 'GOOGLE', nickname);
    } catch (error) {
      /** 이미 처리된 비즈니스 에러는 그대로 전달 */
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Google 토큰 검증 실패: ${(error as Error).message}`);
      throw new UnauthorizedException('Google 인증에 실패했습니다');
    }
  }

  /**
   * Kakao 소셜 로그인 - Kakao 액세스 토큰으로 사용자 정보를 조회하여 인증
   *
   * 처리 순서:
   * 1. Kakao user/me API에 액세스 토큰 전달하여 사용자 정보 조회
   *    - API: GET https://kapi.kakao.com/v2/user/me
   *    - 헤더: Authorization: Bearer {accessToken}
   *    - 응답 데이터: { id: 카카오고유ID, kakao_account: { email: 이메일 } }
   * 2. 조회 성공 시 socialLogin() 공통 처리로 위임
   * 3. 이메일이 없으면 401 반환 (카카오 이메일 제공 동의 필요)
   *
   * @param accessToken - 프론트엔드 Kakao SDK에서 받은 액세스 토큰
   * @param nickname - (선택) 신규 가입 시 닉네임
   * @returns { accessToken, user }
   * @throws UnauthorizedException - 토큰 검증 실패 또는 이메일 미제공 시
   */
  async kakaoLogin(accessToken: string, nickname?: string) {
    try {
      /** Kakao user/me API 호출 - 액세스 토큰으로 사용자 프로필 조회 */
      const { data } = await firstValueFrom(
        this.httpService.get('https://kapi.kakao.com/v2/user/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      /** Kakao 고유 ID 생성 - "kakao_" 접두사 + Kakao 사용자 ID */
      const kakaoId = `kakao_${data.id}`;
      /** Kakao 계정 이메일 추출 (kakao_account 객체 내부) */
      const email = data.kakao_account?.email;

      /**
       * 이메일이 없는 경우 Kakao ID 기반으로 고유 이메일 자동 생성
       * 카카오 이메일 동의항목은 비즈앱 전환 후에만 필수 동의 가능하므로,
       * 이메일 미제공 시에도 로그인이 가능하도록 처리
       */
      const finalEmail = email || `kakao_${data.id}@kakao.user`;

      /** Kakao 프로필에서 닉네임 추출 (닉네임 미전달 시 사용) */
      const kakaoNickname = nickname || data.kakao_account?.profile?.nickname;

      /** 공통 소셜 로그인 처리로 위임 */
      return this.socialLogin(kakaoId, finalEmail, 'KAKAO', kakaoNickname);
    } catch (error) {
      /** 이미 처리된 비즈니스 에러는 그대로 전달 */
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Kakao 토큰 검증 실패: ${(error as Error).message}`);
      throw new UnauthorizedException('카카오 인증에 실패했습니다');
    }
  }

  /**
   * Kakao 인가코드로 소셜 로그인 - 인가코드를 액세스 토큰으로 교환 후 로그인 처리
   *
   * 처리 순서:
   * 1. Kakao token API에 인가코드 전달 → 액세스 토큰 발급
   *    - API: POST https://kauth.kakao.com/oauth/token
   *    - 파라미터: grant_type, client_id(REST API Key), redirect_uri, code
   * 2. 발급받은 액세스 토큰으로 기존 kakaoLogin() 메서드 호출
   *
   * @param code - Kakao 로그인 후 리다이렉트 URI에서 받은 인가 코드
   * @param redirectUri - 인가코드 요청 시 사용한 리다이렉트 URI (검증용)
   * @returns { accessToken, user }
   * @throws UnauthorizedException - 인가코드 교환 실패 시
   */
  async kakaoLoginWithCode(code: string, redirectUri: string) {
    try {
      /** Kakao REST API 키 - 환경변수에서 읽기 */
      const kakaoRestApiKey = this.configService.get<string>('KAKAO_REST_API_KEY');
      if (!kakaoRestApiKey) {
        this.logger.error('KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다');
        throw new UnauthorizedException('카카오 로그인 설정이 완료되지 않았습니다');
      }

      /** Kakao 클라이언트 시크릿 - 콘솔에서 활성화된 경우 필수 */
      const kakaoClientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET');

      /**
       * Kakao token API 호출 - 인가코드 → 액세스 토큰 교환
       * Content-Type: application/x-www-form-urlencoded 형식으로 전달
       * 클라이언트 시크릿이 활성화되어 있으면 client_secret 파라미터 포함 필수
       */
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: kakaoRestApiKey,
        redirect_uri: redirectUri,
        code,
      });

      /** 클라이언트 시크릿이 설정되어 있으면 파라미터에 추가 */
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

      /** 발급받은 액세스 토큰으로 기존 kakaoLogin 로직 실행 */
      return this.kakaoLogin(tokenData.access_token);
    } catch (error) {
      /** 이미 처리된 비즈니스 에러는 그대로 전달 */
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      /** 카카오 API 에러 응답 상세 로그 출력 (디버깅용) */
      const axiosError = error as any;
      if (axiosError.response) {
        this.logger.error(`Kakao API 응답 상태: ${axiosError.response.status}`);
        this.logger.error(`Kakao API 응답 내용: ${JSON.stringify(axiosError.response.data)}`);
      }
      this.logger.error(`Kakao 인가코드 교환 실패: ${(error as Error).message}`);
      throw new UnauthorizedException('카카오 인증에 실패했습니다');
    }
  }

  /**
   * 회원탈퇴 - 사용자 계정 소프트 삭제
   * DB에서 완전 삭제하지 않고 deletedAt 타임스탬프만 기록 (데이터 복구 가능)
   *
   * @param userId - 탈퇴할 사용자의 UUID (JWT 토큰의 sub 값)
   * @returns { message: 'Account deleted successfully' }
   */
  async withdraw(userId: string) {
    await this.usersService.softDelete(userId);
    return { message: '회원탈퇴가 완료되었습니다' };
  }

  /**
   * JWT 액세스 토큰 생성 (private)
   *
   * 토큰 페이로드:
   * - sub: 사용자 UUID → 이후 API 요청 시 사용자 식별에 사용
   * - email: 사용자 이메일 → 참고용
   * - role: 사용자 역할 (USER | ADMIN) → 권한 확인용
   *
   * 토큰 유효기간: 7일 (auth.module.ts의 JwtModule 설정)
   *
   * @param user - User 엔티티 객체
   * @returns JWT 토큰 문자열
   */
  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * 사용자 정보에서 민감 데이터 제거 (private)
   * 클라이언트에 반환할 때 비밀번호 해시 등 민감 정보를 제외
   *
   * 반환하는 필드:
   * - id: 사용자 UUID
   * - email: 이메일
   * - nickname: 닉네임
   * - avatarUrl: 프로필 사진 URL
   * - role: 역할 (USER | ADMIN)
   * - surfLevel: 서핑 레벨 (BEGINNER | INTERMEDIATE | ADVANCED | EXPERT)
   * - provider: 소셜 로그인 제공자 (GOOGLE | KAKAO | null)
   * - notificationsEnabled: 알림 수신 여부
   *
   * @param user - User 엔티티 객체 (DB에서 조회한 전체 데이터)
   * @returns 민감 정보가 제거된 사용자 객체
   */
  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      surfLevel: user.surfLevel,
      provider: user.provider,
      notificationsEnabled: user.notificationsEnabled,
    };
  }
}
