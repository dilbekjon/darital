import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
import { AdminRole } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_change_me',
    });
  }

  async validate(payload: any) {
    // JWT payload roles are serialized as strings, so we need to compare strings
    const role = payload.role;
    
    // Check if it's a tenant (role is 'TENANT_USER' string or AdminRole.TENANT_USER)
    if (role === AdminRole.TENANT_USER || role === 'TENANT_USER' || role === 'TENANT') {
      // Look up tenant
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: payload.sub },
      });

      if (!tenant) {
        throw new UnauthorizedException();
      }

      // Tenants don't have permissions, return empty array
      return { 
        id: tenant.id, 
        email: tenant.email || '', 
        role: AdminRole.TENANT_USER, 
        fullName: tenant.fullName, 
        permissions: [] 
      };
    } else {
      // Look up admin user (for all other roles: SUPER_ADMIN, ADMIN, CASHIER, etc.)
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          auditLogs: false, // Exclude large relations if not needed here
          conversations: false,
        }
      });

      if (!user) {
        throw new UnauthorizedException();
      }

      // Fetch permissions for the user's role
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: { role: user.role },
        include: { permission: true },
      });

      const permissions = rolePermissions.map(rp => rp.permission.code);

      return { id: user.id, email: user.email, role: user.role, fullName: user.fullName, permissions };
    }
  }
}


