import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;

    // Only log POST, PATCH, DELETE requests
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => { // Removed 'response' parameter
        try {
          // Extract resource and resourceId from URL
          const pathSegments = url.split('?')[0].split('/').filter(Boolean);
          // const resource = pathSegments[0]; // Removed unused 'resource'
          const resourceId = pathSegments[1] && pathSegments[1] !== '' ? pathSegments[1] : null;

          // Create audit log entry
          await this.prisma.adminAuditLog.create({
            data: {
              actorId: user?.id || null, // Using actorId for AdminAuditLog
              action: method,
              subject: resourceId, // Using resourceId as subject
              meta: body || null, // Using payload as meta
            },
          });
        } catch (error) {
          // Log error but don't fail the request
          console.error('Failed to create audit log:', error);
        }
      }),
    );
  }
}

