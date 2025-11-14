import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { SentryService } from '../sentry/sentry.service';

interface ErrorResponse {
  code: string;
  message: string;
  details: any | null;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    @Optional() @Inject(SentryService) private readonly sentryService?: SentryService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    // Check if this is an HTTP context (not Telegram or other contexts)
    if (host.getType() !== 'http') {
      // For non-HTTP contexts (like Telegram), just log the error
      this.logger.error(
        `Non-HTTP error: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse: ErrorResponse = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: null,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Map status codes to error codes
      const codeMap: Record<number, string> = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'UNPROCESSABLE_ENTITY',
        429: 'TOO_MANY_REQUESTS',
        500: 'INTERNAL_SERVER_ERROR',
      };

      errorResponse.code = codeMap[status] || 'ERROR';

      // Special handling for ThrottlerException
      if (exception instanceof ThrottlerException) {
        errorResponse.code = 'TOO_MANY_REQUESTS';
        errorResponse.message = 'Rate limit exceeded';
        errorResponse.details = null;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        
        // Handle custom error format (e.g., from auth or validation)
        if (responseObj.code) {
          errorResponse.code = responseObj.code;
        }
        
        errorResponse.message = responseObj.message || exception.message;
        
        // Handle validation errors - preserve the validation details
        if (Array.isArray(responseObj.message)) {
          errorResponse.message = 'Validation failed';
          errorResponse.details = responseObj.message;
        } else {
          errorResponse.details = responseObj.details || responseObj.error || null;
        }
      } else {
        errorResponse.message = String(exceptionResponse);
        errorResponse.details = null;
      }
    } else if (exception instanceof Error) {
      // Log unexpected errors for debugging
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
      
      // Capture unexpected errors in Sentry
      if (this.sentryService) {
        try {
          this.sentryService.captureException(exception, {
            method: request.method,
            url: request.url,
            userAgent: request.headers?.['user-agent'],
            userId: (request as any).user?.id,
          });
        } catch (sentryError) {
          this.logger.error('Failed to send exception to Sentry', sentryError);
        }
      }
      
      errorResponse.message = exception.message;
      errorResponse.details = process.env.NODE_ENV === 'development' ? exception.stack : null;
    } else {
      // Log completely unknown errors
      this.logger.error(
        `Unknown error occurred`,
        JSON.stringify(exception),
        `${request.method} ${request.url}`,
      );
      
      // Capture unknown errors in Sentry
      if (this.sentryService) {
        try {
          this.sentryService.captureException(exception, {
            method: request.method,
            url: request.url,
            userAgent: request.headers?.['user-agent'],
          });
        } catch (sentryError) {
          this.logger.error('Failed to send exception to Sentry', sentryError);
        }
      }
      
      errorResponse.message = 'An unexpected error occurred';
      errorResponse.details = null;
    }

    response.status(status).json(errorResponse);
  }
}

