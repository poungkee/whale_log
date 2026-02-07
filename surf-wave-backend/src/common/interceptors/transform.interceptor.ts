/**
 * @file transform.interceptor.ts
 * @description API 응답 변환 인터셉터 - 모든 성공 응답을 표준 형식으로 래핑
 *
 * 컨트롤러에서 반환하는 데이터를 다음과 같은 표준 응답 형식으로 자동 래핑합니다:
 * {
 *   "success": true,
 *   "data": { ... },  // 컨트롤러의 원래 반환값
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 *
 * 이를 통해 프론트엔드에서 일관된 응답 형식으로 데이터를 처리할 수 있습니다.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** 표준 API 응답 인터페이스 */
export interface ApiResponse<T> {
  success: boolean;   // 요청 성공 여부 (항상 true, 에러 시 ExceptionFilter가 처리)
  data: T;            // 실제 응답 데이터
  timestamp: string;  // 응답 생성 시각 (ISO 8601 형식)
}

/**
 * @class TransformInterceptor
 * @description 모든 성공 응답을 { success, data, timestamp } 형식으로 자동 래핑하는 인터셉터
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
