import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl } = request;
    const ip = request.ip ?? '-';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.log(method, originalUrl, ip, response.statusCode, start),
        error: (error: unknown) => {
          const statusCode =
            error instanceof HttpException
              ? error.getStatus()
              : (response.statusCode ?? 500);
          const message =
            error instanceof Error ? error.message : String(error);
          const stack = error instanceof Error ? error.stack : undefined;
          this.log(method, originalUrl, ip, statusCode, start, message, stack);
        },
      }),
    );
  }

  private log(
    method: string,
    url: string,
    ip: string,
    statusCode: number,
    start: number,
    errorMessage?: string,
    stack?: string,
  ) {
    const duration = Date.now() - start;
    const line = `${method} ${url} ${statusCode} - ${duration}ms - ${ip}`;

    if (statusCode >= 500) {
      this.logger.error(`${line} - ${errorMessage}`, stack);
    } else if (statusCode >= 400) {
      this.logger.warn(`${line} - ${errorMessage}`);
    } else {
      this.logger.log(line);
    }
  }
}
