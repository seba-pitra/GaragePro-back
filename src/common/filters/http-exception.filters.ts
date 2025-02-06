import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getResponse<Request>();
    const status = exception.getStatus();

    const responseBody = {
      ok: false,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: exception.getResponse(),
      data: null,
      stracktrace: null,
    };

    if (process.env.NODE_ENV !== 'production') {
      responseBody.stracktrace = exception.stack;
    }

    response.status(status).json(responseBody);
  }
}
