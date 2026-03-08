import { Module } from '@nestjs/common';
import { ErrorAlertService } from './error-alert.service';

@Module({
  providers: [ErrorAlertService],
  exports: [ErrorAlertService],
})
export class AlertsModule {}

