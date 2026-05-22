import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

export type ConfigureAppOptions = {
  enableCors?: boolean;
  enableSecurityHeaders?: boolean;
};

export function configureApp(
  app: INestApplication,
  options: ConfigureAppOptions = {},
): void {
  const { enableCors = true, enableSecurityHeaders = true } = options;

  // Disable Express ETags and prevent browser caching of API responses.
  // Without this, browsers can reuse cached GET responses across different users.
  app.getHttpAdapter().getInstance().set('etag', false);
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  if (enableSecurityHeaders) {
    app.use(helmet());
  }

  if (enableCors) {
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
        'http://localhost:3000',
      ],
      credentials: true,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new ResponseEnvelopeInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
}
