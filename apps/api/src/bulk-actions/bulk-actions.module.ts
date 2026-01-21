import { Module } from '@nestjs/common';
import { BulkActionsController } from './bulk-actions.controller';
import { BulkActionsService } from './bulk-actions.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BulkActionsController],
  providers: [BulkActionsService],
  exports: [BulkActionsService],
})
export class BulkActionsModule {}
