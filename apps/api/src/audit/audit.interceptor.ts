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
          const resource = pathSegments[0] || 'unknown';
          const resourceId = pathSegments[1] && pathSegments[1] !== '' ? pathSegments[1] : null;

          // Generate more descriptive action names
          let actionName = method;
          if (resource && method) {
            actionName = `${method.toLowerCase()}.${resource}`;
            if (resourceId) {
              actionName += resourceId.startsWith('cl') ? '.update' : '.create';
            }
          }

          // Create audit log entry
          await this.prisma.adminAuditLog.create({
            data: {
              actorId: user?.id || null,
              action: actionName,
              subject: resourceId,
              meta: {
                method,
                resource,
                resourceId,
                url,
                body: body || null,
              },
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

