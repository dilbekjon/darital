import { Module } from '@nestjs/common';
import { TenantPortalController } from './tenant-portal.controller';
import { TenantPortalService } from './tenant-portal.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [TenantPortalController],
  providers: [TenantPortalService, PrismaService],
})
export class TenantPortalModule {}
