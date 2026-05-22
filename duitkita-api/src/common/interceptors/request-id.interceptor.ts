import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';

export const REQUEST_ID_HEADER = 'x-request-id';

export type RequestWithId = Request & {
  requestId?: string;
};

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const requestId = getOrCreateRequestId(request);

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    return next.handle();
  }
}

export function getOrCreateRequestId(request: RequestWithId): string {
  const rawRequestId = request.headers[REQUEST_ID_HEADER];
  const headerRequestId = Array.isArray(rawRequestId)
    ? rawRequestId[0]
    : rawRequestId;
  return request.requestId ?? headerRequestId ?? randomUUID();
}
