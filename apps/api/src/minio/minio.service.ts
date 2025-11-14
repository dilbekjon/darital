import { Injectable, Logger } from '@nestjs/common';
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

  constructor() {
    this.endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    this.port = parseInt(process.env.MINIO_PORT || '9000', 10);
    const accessKey = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
    this.bucket = process.env.MINIO_BUCKET || 'contracts';

    this.client = new MinioClient({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: false,
      accessKey,
      secretKey,
    });
  }

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      this.logger.log(`Creating MinIO bucket: ${this.bucket}`);
      await this.client.makeBucket(this.bucket, 'us-east-1');
      await this.ensurePublicRead(this.bucket).catch((err) => {
        this.logger.warn(`Could not set public read policy for bucket ${this.bucket}: ${err}`);
      });
    }
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
    await this.ensureBucket();
    const meta = { 'Content-Type': contentType || 'application/octet-stream' } as any;
    await this.client.putObject(this.bucket, objectName, buffer, undefined, meta);
    const url = `http://${this.endpoint}:${this.port}/${this.bucket}/${encodeURIComponent(objectName)}`;
    return { bucket: this.bucket, objectName, url };
  }

  async uploadFile(file: Express.Multer.File, bucket?: string): Promise<string> {
    try {
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


