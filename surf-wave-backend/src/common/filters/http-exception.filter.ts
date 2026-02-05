import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

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
