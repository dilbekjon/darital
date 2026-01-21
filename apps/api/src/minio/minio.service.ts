import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { Client as MinioClient } from 'minio';

export interface UploadedObjectInfo {
  bucket: string;
  objectName: string;
  url: string;
}

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private client: MinioClient;
  private bucket: string;
  private endpoint: string;
  private port: number;
  private readonly enabled: boolean;

  constructor() {
    const {
      MINIO_ENDPOINT,
      MINIO_PORT,
      MINIO_ACCESS_KEY,
      MINIO_SECRET_KEY,
      MINIO_ROOT_USER,
      MINIO_ROOT_PASSWORD,
      MINIO_BUCKET,
    } = process.env;

    const nodeEnv = process.env.NODE_ENV;
    const isProd = nodeEnv === 'production';

    const strictConfig = () => {
      if (!MINIO_ENDPOINT) throw new InternalServerErrorException('MINIO_ENDPOINT is not set');
      if (!MINIO_PORT) throw new InternalServerErrorException('MINIO_PORT is not set');
      const accessKeyStrict = MINIO_ACCESS_KEY || MINIO_ROOT_USER;
      const secretKeyStrict = MINIO_SECRET_KEY || MINIO_ROOT_PASSWORD;
      if (!accessKeyStrict) throw new InternalServerErrorException('MINIO_ACCESS_KEY (or MINIO_ROOT_USER) is not set');
      if (!secretKeyStrict) throw new InternalServerErrorException('MINIO_SECRET_KEY (or MINIO_ROOT_PASSWORD) is not set');
      if (!MINIO_BUCKET) throw new InternalServerErrorException('MINIO_BUCKET is not set');
      return {
        endpoint: MINIO_ENDPOINT,
        port: parseInt(MINIO_PORT, 10),
        accessKey: accessKeyStrict,
        secretKey: secretKeyStrict,
        bucket: MINIO_BUCKET,
      };
    };

    const devDefaults = {
      endpoint: 'localhost',
      port: 9000,
      accessKey: 'minioadmin', // Match Docker Compose default
      secretKey: 'minioadmin', // Match Docker Compose default
      bucket: 'contracts',
    };

    if (isProd) {
      const cfg = strictConfig();
      this.endpoint = cfg.endpoint;
      this.port = cfg.port;
      this.bucket = cfg.bucket;
      this.client = new MinioClient({
        endPoint: this.endpoint,
        port: this.port,
        useSSL: false,
        accessKey: cfg.accessKey,
        secretKey: cfg.secretKey,
      });
      this.enabled = true;
    } else {
      const endpoint = MINIO_ENDPOINT || devDefaults.endpoint;
      const port = parseInt(MINIO_PORT || `${devDefaults.port}`, 10);
      const accessKey = MINIO_ACCESS_KEY || MINIO_ROOT_USER || devDefaults.accessKey;
      const secretKey = MINIO_SECRET_KEY || MINIO_ROOT_PASSWORD || devDefaults.secretKey;
      const bucket = MINIO_BUCKET || devDefaults.bucket;

      if (!endpoint || !port || !accessKey || !secretKey || !bucket) {
        this.logger.warn('MinIO env not set and defaults unavailable; MinIO is disabled for dev. Uploads will fail.');
        this.enabled = false;
        return;
      }

      if (!MINIO_ENDPOINT || !MINIO_PORT || (!MINIO_ACCESS_KEY && !MINIO_ROOT_USER) || (!MINIO_SECRET_KEY && !MINIO_ROOT_PASSWORD) || !MINIO_BUCKET) {
        this.logger.warn(`MinIO env not fully set. Using dev defaults endpoint=${endpoint}:${port}, bucket=${bucket}. Set real MINIO_* to override.`);
      }

      this.endpoint = endpoint;
      this.port = port;
      this.bucket = bucket;
      this.client = new MinioClient({
        endPoint: this.endpoint,
        port: this.port,
        useSSL: false,
        accessKey,
        secretKey,
      });
      this.enabled = true;
    }
  }

  async ensureBucket(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('MinIO is disabled; ensureBucket skipped.');
      return;
    }
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      this.logger.log(`Creating MinIO bucket: ${this.bucket}`);
      await this.client.makeBucket(this.bucket, 'us-east-1');
      await this.ensurePublicRead(this.bucket).catch((err) => {
        this.logger.warn(`Could not set public read policy for bucket ${this.bucket}: ${err}`);
      });
    }
  }

  /**
   * Optional startup check to validate connectivity and bucket existence.
   * Call this during application bootstrap if you want a fail-fast health check.
   */
  async verifyConfiguration(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('MinIO is disabled; verifyConfiguration skipped.');
      return;
    }
    await this.ensureBucket();
  }

  private async ensurePublicRead(bucket: string): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: ['s3:GetObject'],
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    } as any;
    // setBucketPolicy may not exist in some SDK versions; guard and ignore errors
    const anyClient: any = this.client as any;
    if (typeof anyClient.setBucketPolicy === 'function') {
      await anyClient.setBucketPolicy(bucket, JSON.stringify(policy));
    }
  }

  async upload(buffer: Buffer, objectName: string, contentType?: string): Promise<UploadedObjectInfo> {
    if (!this.enabled) {
      throw new InternalServerErrorException('MinIO is disabled in this environment; uploads are not available.');
    }
    await this.ensureBucket();
    const meta = { 'Content-Type': contentType || 'application/octet-stream' } as any;
    await this.client.putObject(this.bucket, objectName, buffer, undefined, meta);
    const url = `http://${this.endpoint}:${this.port}/${this.bucket}/${encodeURIComponent(objectName)}`;
    return { bucket: this.bucket, objectName, url };
  }

  async uploadFile(file: Express.Multer.File, bucket?: string): Promise<string> {
    try {
      if (!this.enabled) {
        throw new InternalServerErrorException('MinIO is disabled in this environment; uploads are not available.');
      }
      const useBucket = bucket || this.bucket;
      // Ensure target bucket exists and is public
      if (useBucket !== this.bucket) {
        const exists = await this.client.bucketExists(useBucket).catch(() => false);
        if (!exists) {
          await this.client.makeBucket(useBucket, 'us-east-1');
          await this.ensurePublicRead(useBucket).catch(() => undefined);
        }
      } else {
        await this.ensureBucket();
      }

      const safeName = (file.originalname || 'file.pdf').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const objectName = `${Date.now()}-${safeName}`;
      const meta = { 'Content-Type': file.mimetype || 'application/pdf' } as any;
      await this.client.putObject(useBucket, objectName, file.buffer, undefined, meta);
      return `http://${this.endpoint}:${this.port}/${useBucket}/${encodeURIComponent(objectName)}`;
    } catch (err: any) {
      this.logger.error(`MinIO upload failed: ${err?.message || err}`);
      throw err;
    }
  }

  /**
   * Download a file from MinIO by URL and return as Buffer
   * Extracts bucket and object name from the URL
   */
  async downloadFileFromUrl(url: string): Promise<Buffer> {
    try {
      // Parse URL: http://localhost:9000/bucket/objectName
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length < 2) {
        throw new Error(`Invalid MinIO URL format: ${url}`);
      }
      
      const bucket = pathParts[0];
      const objectName = decodeURIComponent(pathParts.slice(1).join('/'));
      
      // Download the file as a stream and convert to buffer
      const dataStream = await this.client.getObject(bucket, objectName);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        dataStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        dataStream.on('end', () => resolve(Buffer.concat(chunks)));
        dataStream.on('error', (err: any) => reject(err));
      });
    } catch (err: any) {
      this.logger.error(`MinIO download failed for URL ${url}: ${err?.message || err}`);
      throw err;
    }
  }

  /**
   * Check if a URL is a MinIO URL (local/internal)
   */
  isMinioUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      // Check if it's localhost or the MinIO endpoint
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === this.endpoint;
    } catch {
      return false;
    }
  }
}


