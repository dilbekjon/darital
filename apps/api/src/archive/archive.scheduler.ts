import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArchiveService } from './archive.service';

@Injectable()
export class ArchiveScheduler {
  private readonly logger = new Logger(ArchiveScheduler.name);

  constructor(private readonly archiveService: ArchiveService) {}

  /**
   * Run automatic archiving every Sunday at 2 AM
   * This will archive old operational data according to retention policies
   */
  @Cron(CronExpression.EVERY_WEEK)
  async handleAutoArchive() {
    try {
      this.logger.log('Starting scheduled auto-archive process...');

      const result = await this.archiveService.runAutoArchive();

      this.logger.log('Scheduled auto-archive completed:', result);
    } catch (error) {
      this.logger.error('Scheduled auto-archive failed:', error);
    }
  }

  /**
   * Clean up very old archived data every 6 months (twice a year)
   * This permanently deletes archived data older than 5 years
   */
  @Cron('0 2 1 */6 *') // Every 6 months on the 1st day at 2 AM
  async handleArchiveCleanup() {
    try {
      this.logger.log('Starting scheduled archive cleanup (5+ years old)...');

      const result = await this.archiveService.cleanupOldArchives(365 * 5); // 5 years

      this.logger.log('Scheduled archive cleanup completed:', result);
    } catch (error) {
      this.logger.error('Scheduled archive cleanup failed:', error);
    }
  }
}