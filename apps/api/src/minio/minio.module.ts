import { Global, Module } from '@nestjs/common';
import { MinioService } from './minio.service';

@Global() // Make MinioModule global so it's only instantiated once
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}

