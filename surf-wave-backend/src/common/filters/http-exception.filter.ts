/**
 * @file http-exception.filter.ts
 * @description HTTP 예외 필터 - API 에러 응답을 표준 형식으로 변환
 *
 * NestJS의 글로벌 예외 필터로, 모든 HTTP 예외를 잡아서
 * 일관된 JSON 에러 응답 형식으로 변환합니다.
 *
 * 에러 응답 형식:
 * {
 *   "success": false,
 *   "error": { "code": "ERROR_CODE", "message": "에러 설명" },
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 *
 * 두 가지 필터가 정의되어 있습니다:
 * 1. HttpExceptionFilter - HttpException만 처리 (400, 401, 403, 404 등)
 * 2. AllExceptionsFilter - 모든 종류의 예외를 처리 (최종 안전망)
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * @class HttpExceptionFilter
 * @description HttpException 타입의 예외만 잡아서 표준 에러 응답으로 변환하는 필터
 * 컨트롤러/서비스에서 throw한 HttpException(BadRequest, NotFound 등)을 처리합니다.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const error =
      typeof exceptionResponse === 'string'
        ? { code: 'ERROR', message: exceptionResponse }
        : {
            code: (exceptionResponse as any).code || 'ERROR',
            message: (exceptionResponse as any).message || exception.message,
            details: (exceptionResponse as any).details,
          };

    this.logger.error(`HTTP ${status} - ${error.message}`);

    response.status(status).json({
      success: false,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * @class AllExceptionsFilter
 * @description 모든 종류의 예외를 처리하는 글로벌 안전망 필터
 * HttpException 외에도 예상치 못한 런타임 에러, TypeORM 에러 등을 잡아
 * 500 Internal Server Error로 일관되게 응답합니다.
 * 프로덕션 환경에서는 상세 에러 메시지를 노출하지 않고 "Internal server error"를 반환합니다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    this.logger.error(`Unhandled exception: ${message}`, exception instanceof Error ? exception.stack : '');

    response.status(status).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : message,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
