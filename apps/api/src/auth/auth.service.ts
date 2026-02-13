import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    // Trim email and password to handle whitespace issues
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = password?.trim();
    
    if (!trimmedEmail || !trimmedPassword) {
      this.logger.warn(`Login attempt failed: Empty email or password`);
      return null;
    }
    
    // First, try to find in User table (for admins)
    const user = await this.usersService.findByEmail(trimmedEmail);
    
    // If not found in User table, try Tenant table
    if (!user) {
      this.logger.log(`User not found in User table, checking Tenant table for email: ${trimmedEmail}`);
      const tenant = await this.prisma.tenant.findUnique({ 
        where: { email: trimmedEmail } 
      });
      
      if (tenant) {
        // Check if password is already hashed
        if (!tenant.password.startsWith('$2')) {
          this.logger.error(`Tenant ${trimmedEmail} has unhashed password in database. Please update it manually.`);
          return null;
        }
        
        const isValid = await bcrypt.compare(trimmedPassword, tenant.password);
        if (!isValid) {
          this.logger.warn(`Login attempt failed: Invalid password for tenant email: ${trimmedEmail}`);
          return null;
        }
        
        // Return tenant as a user-like object
        this.logger.log(`Login successful for tenant email: ${trimmedEmail}`);
        return {
          id: tenant.id,
          email: tenant.email || trimmedEmail,
          fullName: tenant.fullName,
          role: AdminRole.TENANT_USER, // Use AdminRole.TENANT_USER for tenants
          password: tenant.password, // Include for consistency
        };
      } else {
        this.logger.warn(`Login attempt failed: User/Tenant not found for email: ${trimmedEmail}`);
        return null;
      }
    }
    
    // Handle admin user authentication
    if (!user.password) {
      this.logger.warn(`User ${trimmedEmail} has no password set`);
      return null;
    }
    // Check if password is already hashed (starts with $2a$ or $2b$)
    if (!user.password.startsWith('$2')) {
      this.logger.warn(`User ${trimmedEmail} has unhashed password. Hashing it now...`);
      this.logger.error(`User ${trimmedEmail} has unhashed password in database. Please update it manually.`);
      return null;
    }
    
    const isValid = await bcrypt.compare(trimmedPassword, user.password);
    if (!isValid) {
      this.logger.warn(`Login attempt failed: Invalid password for email: ${trimmedEmail}`);
      return null;
    }
    this.logger.log(`Login successful for admin email: ${trimmedEmail}`);
    return user;
  }

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      const err: any = new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
      throw err;
    }
    const payload = { sub: user.id, role: user.role, email: user.email, name: user.fullName };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}


