/**
 * @file typeorm-exception.filter.ts
 * @description TypeORM(데이터베이스) 예외 필터 - DB 에러를 사용자 친화적인 HTTP 응답으로 변환
 *
 * PostgreSQL 데이터베이스 작업 중 발생하는 에러를 잡아서 적절한 HTTP 상태 코드와 메시지로 변환합니다.
 *
 * 두 가지 필터가 정의되어 있습니다:
 * 1. TypeOrmExceptionFilter - SQL 쿼리 실패 에러 처리 (유니크 제약조건 위반, FK 위반 등)
 * 2. EntityNotFoundExceptionFilter - 엔티티 조회 실패 시 404 반환
 *
 * PostgreSQL 에러 코드 매핑:
 * - 23505 (unique_violation) → 409 Conflict (중복 데이터)
 * - 23503 (foreign_key_violation) → 400 Bad Request (참조 무결성 위반)
 * - 23502 (not_null_violation) → 400 Bad Request (필수 값 누락)
 * - 22P02 (invalid_text_representation) → 400 Bad Request (잘못된 UUID 형식 등)
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

/**
 * @class TypeOrmExceptionFilter
 * @description SQL 쿼리 실행 실패 시 PostgreSQL 에러 코드에 따라 적절한 HTTP 응답을 반환하는 필터
 */
@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const pgError = exception as any;
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'DATABASE_ERROR';
    let message = 'Database error occurred';

    // PostgreSQL error codes
    switch (pgError.code) {
      case '23505': // unique_violation
        status = HttpStatus.CONFLICT;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with this value already exists';
        break;
      case '23503': // foreign_key_violation
        status = HttpStatus.BAD_REQUEST;
        code = 'FOREIGN_KEY_VIOLATION';
        message = 'Referenced record does not exist';
        break;
      case '23502': // not_null_violation
        status = HttpStatus.BAD_REQUEST;
        code = 'NOT_NULL_VIOLATION';
        message = 'Required field is missing';
        break;
      case '22P02': // invalid_text_representation (e.g., invalid UUID)
        status = HttpStatus.BAD_REQUEST;
        code = 'INVALID_INPUT';
        message = 'Invalid input format';
        break;
    }

    this.logger.error(`TypeORM Error [${pgError.code}]: ${exception.message}`);

    response.status(status).json({
      success: false,
      error: { code, message },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * @class EntityNotFoundExceptionFilter
 * @description TypeORM의 findOneOrFail() 등에서 엔티티를 찾지 못했을 때 404 Not Found를 반환하는 필터
 */
@Catch(EntityNotFoundError)
export class EntityNotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: EntityNotFoundError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.NOT_FOUND).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Requested resource not found',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
