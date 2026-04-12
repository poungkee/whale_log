/**
 * @file firebase-auth.guard.ts
 * @description JWT 인증 가드 - 모든 API 요청에 대해 JWT 토큰을 검증하는 글로벌 가드
 *
 * 동작 흐름:
 * 1. 요청이 들어오면 @Public() 데코레이터가 있는지 확인
 * 2. @Public()이면 인증 없이 통과 (회원가입, 로그인 등)
 * 3. @Public()이 아니면 Authorization 헤더에서 Bearer 토큰을 추출
 * 4. JWT 토큰을 검증하고 페이로드 추출
 * 5. DB에서 사용자 정지 여부 및 정지 만료 시각을 실시간 확인 (SEC-3 수정)
 *    - isSuspended=true + suspendedUntil이 미래 → 401 차단
 *    - isSuspended=true + suspendedUntil이 과거 → 자동 해제 처리 (P1-4 수정)
 * 6. 통과 시 request.user에 페이로드 저장
 *
 * request.user에 저장되는 페이로드 구조:
 * - sub: 사용자 UUID (user.id)
 * - email: 사용자 이메일
 * - role: 사용자 역할 (USER | ADMIN)
 *
 * 등록 위치: app.module.ts의 APP_GUARD로 글로벌 등록
 * JwtService 의존성: AuthModule에서 export한 JwtModule을 통해 주입
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { DEFAULT_JWT_SECRET } from '../../config/defaults';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    /** NestJS 리플렉터 - @Public() 등 커스텀 데코레이터 메타데이터 조회용 */
    private reflector: Reflector,
    /** JWT 서비스 - 토큰 검증 (AuthModule에서 export된 JwtModule 통해 주입) */
    private jwtService: JwtService,
    /** 환경 변수 서비스 - JWT_SECRET 값 조회 (ConfigModule isGlobal:true로 전역 사용 가능) */
    private configService: ConfigService,
    /**
     * 사용자 레포지토리 - 매 요청마다 정지 여부를 실시간 조회 (SEC-3 수정)
     * JWT 페이로드만으로는 정지 상태 변경을 감지할 수 없어 DB를 직접 확인
     */
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 요청 인증 검증 메서드 - NestJS가 모든 요청마다 자동 호출
   *
   * @param context - 현재 실행 컨텍스트 (요청 정보, 핸들러 정보 등 포함)
   * @returns true면 요청 허용, false면 요청 거부
   * @throws UnauthorizedException - 토큰이 없거나 유효하지 않을 때, 정지된 계정일 때
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    /**
     * @Public() 데코레이터 확인
     * 컨트롤러 메서드 또는 클래스에 @Public()이 붙어있으면 인증 건너뜀
     * 예: 회원가입(POST /auth/register), 로그인(POST /auth/login) 등
     */
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),  // 메서드 레벨 데코레이터 확인
      context.getClass(),    // 클래스 레벨 데코레이터 확인
    ]);

    if (isPublic) {
      return true; // 인증 없이 통과
    }

    /** HTTP 요청 객체에서 Authorization 헤더 추출 */
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    /** Authorization 헤더가 없거나 'Bearer ' 형식이 아니면 거부 */
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 헤더가 없거나 형식이 올바르지 않습니다');
    }

    /** 'Bearer ' 이후의 실제 JWT 토큰 문자열 추출 */
    const token = authHeader.split('Bearer ')[1];

    try {
      /**
       * JWT 토큰 검증
       * - secret: 환경변수 JWT_SECRET 또는 개발용 기본값 사용
       * - 검증 성공 시 payload 반환: { sub, email, role, iat, exp }
       * - 만료되었거나 시그니처가 잘못되면 에러 발생
       */
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET', DEFAULT_JWT_SECRET),
      });

      /**
       * [SEC-3 수정] DB에서 사용자 정지 여부 실시간 확인
       *
       * 문제: JWT는 한번 발급되면 만료(7일)까지 유효 → 관리자가 계정을 정지해도
       *       기존 토큰으로 계속 API 호출이 가능했음
       * 해결: 매 요청마다 DB에서 isSuspended + suspendedUntil을 직접 조회
       *
       * 성능 고려:
       * - 매 요청 DB 조회는 오버헤드가 있지만, Refresh Token 미구현 상태에서
       *   정지 우회를 막기 위한 최소한의 안전장치
       * - 추후 Redis 캐시(TTL 60초)로 대체 가능
       *
       * select 옵션: 정지 관련 필드만 선택적으로 조회하여 쿼리 부하 최소화
       */
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: ['id', 'isSuspended', 'suspendedUntil'],
      });

      if (!user) {
        /** 토큰은 유효하지만 DB에 사용자가 없는 경우 (탈퇴된 계정) */
        throw new UnauthorizedException('존재하지 않는 계정입니다');
      }

      if (user.isSuspended) {
        const now = new Date();

        if (user.suspendedUntil && user.suspendedUntil <= now) {
          /**
           * [P1-4 수정] 정지 기간이 만료된 경우 → 자동 해제
           *
           * 관리자가 기간 정지를 설정했고 그 시간이 지난 경우,
           * 별도의 크론 없이 로그인 시점에 자동으로 정지를 해제합니다.
           */
          await this.userRepository.update(user.id, {
            isSuspended: false,
            suspendedUntil: null,
          });
          this.logger.log(`사용자 ${user.id} 정지 기간 만료 → 자동 해제`);
          /** 해제 후 정상 통과 처리 */
        } else {
          /**
           * 현재 유효한 정지 상태
           * - suspendedUntil=null: 영구 정지
           * - suspendedUntil이 미래: 기간 정지 진행 중
           */
          const until = user.suspendedUntil
            ? `${user.suspendedUntil.toISOString()} 까지`
            : '영구';
          throw new UnauthorizedException(`정지된 계정입니다 (${until})`);
        }
      }

      /**
       * 검증된 사용자 정보를 request.user에 저장
       * 이후 컨트롤러에서 @Request() req로 접근 가능
       * 예: req.user.sub → 사용자 UUID
       *     req.user.email → 사용자 이메일
       *     req.user.role → 사용자 역할
       */
      request.user = payload;
      return true;
    } catch (error) {
      /** 이미 처리된 비즈니스 에러는 그대로 전달 */
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`JWT 토큰 검증 실패: ${(error as Error).message}`);
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다');
    }
  }
}
