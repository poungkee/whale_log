/**
 * @file firebase-auth.guard.ts
 * @description JWT 인증 가드 - 모든 API 요청에 대해 JWT 토큰을 검증하는 글로벌 가드
 *
 * 동작 흐름:
 * 1. 요청이 들어오면 @Public() 데코레이터가 있는지 확인
 * 2. @Public()이면 인증 없이 통과 (회원가입, 로그인 등)
 * 3. @Public()이 아니면 Authorization 헤더에서 Bearer 토큰을 추출
 * 4. JWT 토큰을 검증하고, 유효하면 request.user에 페이로드 저장
 * 5. 토큰이 없거나 유효하지 않으면 401 Unauthorized 에러 반환
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
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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
  ) {}

  /**
   * 요청 인증 검증 메서드 - NestJS가 모든 요청마다 자동 호출
   *
   * @param context - 현재 실행 컨텍스트 (요청 정보, 핸들러 정보 등 포함)
   * @returns true면 요청 허용, false면 요청 거부
   * @throws UnauthorizedException - 토큰이 없거나 유효하지 않을 때
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
        secret: this.configService.get<string>('JWT_SECRET', 'surfwave-jwt-secret-dev-2026'),
      });

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
      this.logger.error(`JWT 토큰 검증 실패: ${(error as Error).message}`);
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다');
    }
  }
}
