import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { map, Observable } from 'rxjs';
import { getOrCreateRequestId, type RequestWithId } from './request-id.interceptor';

type SuccessEnvelope<T> = {
  success: true;
  data: T | null;
  requestId: string;
  timestamp: string;
  path: string;
};

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (response.statusCode === 204) {
          return undefined;
        }

        return {
          success: true,
          data: data ?? null,
          requestId: getOrCreateRequestId(request),
          timestamp: new Date().toISOString(),
          path: (request as Request).originalUrl ?? request.url,
        } satisfies SuccessEnvelope<unknown>;
      }),
    );
  }
}
