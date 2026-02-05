import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

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
