import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service'; // Corrected import path
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionCode } from './permissions.catalog';
import { AdminRole } from '@prisma/client';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip permissions check for Telegram bot updates (they don't have HTTP requests)
    const request = context.switchToHttp().getRequest();
    if (!request || !request.headers) {
      // This is likely a Telegram message, not an HTTP request
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions specified, allow access
    }

    const user = request.user; // Assuming user is attached to request by JwtAuthGuard

    if (!user || !user.role) {
      return false; // No user or role, deny access
    }

    // SUPER_ADMIN has all permissions
    if (user.role === AdminRole.SUPER_ADMIN) {
      return true;
    }

    // TENANT_USER can access chat-related permissions (chat.read, chat.write, etc.)
    // The service layer ensures tenants can only access their own conversations
    if (user.role === AdminRole.TENANT_USER) {
      const chatPermissions = ['chat.read', 'chat.write', 'chat.reply', 'chat.manage'];
      const isChatPermission = requiredPermissions.every(permission => 
        chatPermissions.includes(permission)
      );
      if (isChatPermission) {
        return true; // Allow tenant users to access chat endpoints
      }
      // For non-chat permissions, tenants don't have access
      return false;
    }

    // Get permissions for the user's role from the database
    // Cache this in a real app for performance
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true },
    });

    const userPermissionCodes = new Set(rolePermissions.map(rp => rp.permission.code));

    // Check if the user has all required permissions
    return requiredPermissions.every(permission => userPermissionCodes.has(permission));
  }
}
