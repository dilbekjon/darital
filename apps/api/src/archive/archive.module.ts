import { Module } from '@nestjs/common';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';
import { ArchiveScheduler } from './archive.scheduler';

@Module({
  controllers: [ArchiveController],
  providers: [ArchiveService, ArchiveScheduler],
  exports: [ArchiveService],
})
export class ArchiveModule {}