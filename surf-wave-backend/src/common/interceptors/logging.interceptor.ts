/**
 * @file logging.interceptor.ts
 * @description HTTP 요청/응답 로깅 인터셉터
 *
 * 모든 API 요청의 처리 시간, HTTP 메서드, URL, 상태 코드, 클라이언트 IP,
 * User-Agent 등을 로그로 기록합니다.
 *
 * 로그 형식: "GET /api/v1/spots 200 - 45ms - 192.168.1.1 - Mozilla/5.0..."
 * 에러 발생 시에도 요청 정보와 에러 메시지를 로그에 기록합니다.
 *
 * 성능 모니터링, 디버깅, 접근 기록 추적에 활용됩니다.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * @class LoggingInterceptor
 * @description 모든 HTTP 요청의 메서드, URL, 응답 시간, 상태 코드를 자동 로깅하는 인터셉터
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          this.logger.log(
            `${method} ${url} ${statusCode} - ${duration}ms - ${ip} - ${userAgent}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} - ${duration}ms - ${ip} - ${error.message}`,
          );
        },
      }),
    );
  }
}
