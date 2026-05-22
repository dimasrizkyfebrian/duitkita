import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorCode } from '../constants/error-codes';
import {
  getOrCreateRequestId,
  REQUEST_ID_HEADER,
  type RequestWithId,
} from '../interceptors/request-id.interceptor';

type ErrorEnvelope = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown[];
  };
  requestId: string;
  timestamp: string;
  path: string;
};

type ExceptionPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

type PostgresDriverError = {
  code?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const mapped = this.mapException(exception);
    const requestId = getOrCreateRequestId(request);

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.status(mapped.status).json({
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details ? { details: mapped.details } : {}),
      },
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    } satisfies ErrorEnvelope);
  }

  private mapException(exception: unknown): {
    status: number;
    code: ErrorCode;
    message: string;
    details?: unknown[];
  } {
    if (exception instanceof HttpException) {
      return this.mapHttpException(exception);
    }

    if (exception instanceof QueryFailedError) {
      return this.mapQueryFailedError(exception);
    }

    this.logger.error(exception, 'Unhandled exception');
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private mapHttpException(exception: HttpException): {
    status: number;
    code: ErrorCode;
    message: string;
    details?: unknown[];
  } {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const payload =
      typeof response === 'object' ? (response as ExceptionPayload) : {};
    const rawMessage =
      typeof response === 'string' ? response : payload.message;
    const details = Array.isArray(rawMessage) ? rawMessage : undefined;

    return {
      status,
      code: details ? ErrorCode.VALIDATION_ERROR : this.codeFromStatus(status),
      message: details
        ? 'Validation failed'
        : this.messageFromPayload(rawMessage, payload.error, exception.message),
      ...(details ? { details } : {}),
    };
  }

  private mapQueryFailedError(exception: QueryFailedError): {
    status: number;
    code: ErrorCode;
    message: string;
  } {
    const driverError = exception.driverError as
      | PostgresDriverError
      | undefined;

    if (driverError?.code === '23505') {
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        message: 'Resource already exists',
      };
    }

    if (driverError?.code === '23503') {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCode.DATABASE_CONSTRAINT,
        message: 'Referenced resource is invalid',
      };
    }

    if (driverError?.code === '23502' || driverError?.code === '22P02') {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCode.DATABASE_CONSTRAINT,
        message: 'Invalid database value',
      };
    }

    this.logger.error(exception, 'Unhandled database exception');
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private codeFromStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      default:
        return status >= 500
          ? ErrorCode.INTERNAL_SERVER_ERROR
          : ErrorCode.BAD_REQUEST;
    }
  }

  private messageFromPayload(
    message: string | string[] | undefined,
    fallbackError: string | undefined,
    exceptionMessage: string,
  ): string {
    if (typeof message === 'string' && message.length > 0) return message;
    if (fallbackError && fallbackError.length > 0) return fallbackError;
    return exceptionMessage;
  }
}
