import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

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
  private useSSL: boolean;
  private publicUrl?: string; // Cloudflare R2 Public Development URL for public file access
  private readonly enabled: boolean;
  private useR2 = false;
  private r2S3Client: S3Client | null = null;
  private r2AccessKey = '';
  private r2SecretKey = '';
  private clientOrNull: MinioClient | null = null;

  private get client(): MinioClient {
    if (!this.clientOrNull) throw new InternalServerErrorException('MinIO client not available (R2 mode)');
    return this.clientOrNull;
  }

  constructor() {
    const {
      MINIO_ENDPOINT,
      MINIO_PORT,
      MINIO_ACCESS_KEY,
      MINIO_SECRET_KEY,
      MINIO_ROOT_USER,
      MINIO_ROOT_PASSWORD,
      MINIO_BUCKET,
      MINIO_PUBLIC_URL, // Optional: Cloudflare R2 Public Development URL (e.g., https://pub-xxx.r2.dev)
    } = process.env;

    const nodeEnv = process.env.NODE_ENV;
    const isProd = nodeEnv === 'production';

    // Helper to parse endpoint URL (handles full URLs like https://host.com/path)
    const parseEndpoint = (endpoint: string): { host: string; port: number; useSSL: boolean; bucketFromPath?: string } => {
      try {
        // If endpoint is a full URL, parse it
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
          const url = new URL(endpoint);
          const host = url.hostname;
          const protocol = url.protocol;
          const pathname = url.pathname;
          
          // Extract bucket from path if present (e.g., /darital)
          const bucketFromPath = pathname && pathname !== '/' ? pathname.replace(/^\//, '') : undefined;
          
          // Determine port from URL or use provided MINIO_PORT
          let port = MINIO_PORT ? parseInt(MINIO_PORT, 10) : (url.port ? parseInt(url.port, 10) : undefined);
          
          // Default ports based on protocol
          if (!port) {
            port = protocol === 'https:' ? 443 : 80;
          }
          
          const useSSL = protocol === 'https:' || process.env.MINIO_USE_SSL === 'true';
          
          return { host, port, useSSL, bucketFromPath };
        } else {
          // Plain hostname, use provided port or default
          const port = MINIO_PORT ? parseInt(MINIO_PORT, 10) : 9000;
          const useSSL = process.env.MINIO_USE_SSL === 'true' || endpoint.includes('play.min.io') || endpoint.includes('r2.cloudflarestorage.com');
          return { host: endpoint, port, useSSL };
        }
      } catch (error) {
        // If parsing fails, treat as plain hostname
        const port = MINIO_PORT ? parseInt(MINIO_PORT, 10) : 9000;
        const useSSL = process.env.MINIO_USE_SSL === 'true';
        return { host: endpoint, port, useSSL };
      }
    };

    const strictConfig = () => {
      if (!MINIO_ENDPOINT) throw new InternalServerErrorException('MINIO_ENDPOINT is not set');
      
      const parsed = parseEndpoint(MINIO_ENDPOINT);
      const accessKeyStrict = MINIO_ACCESS_KEY || MINIO_ROOT_USER;
      const secretKeyStrict = MINIO_SECRET_KEY || MINIO_ROOT_PASSWORD;
      
      if (!accessKeyStrict) throw new InternalServerErrorException('MINIO_ACCESS_KEY (or MINIO_ROOT_USER) is not set');
      if (!secretKeyStrict) throw new InternalServerErrorException('MINIO_SECRET_KEY (or MINIO_ROOT_PASSWORD) is not set');
      
      // Use bucket from env, or from URL path, or throw error
      const bucket = MINIO_BUCKET || parsed.bucketFromPath;
      if (!bucket) throw new InternalServerErrorException('MINIO_BUCKET is not set and could not be extracted from endpoint URL');
      
      return {
        endpoint: parsed.host,
        port: parsed.port,
        useSSL: parsed.useSSL,
        accessKey: accessKeyStrict,
        secretKey: secretKeyStrict,
        bucket: bucket,
      };
    };

    const devDefaults = {
      endpoint: 'localhost',
      port: 9000,
      accessKey: 'minioadmin', // Match Docker Compose default
      secretKey: 'minioadmin', // Match Docker Compose default
      bucket: 'contracts',
    };

    const isR2Endpoint = (host: string) => host.includes('r2.cloudflarestorage.com');

    if (isProd) {
      const cfg = strictConfig();
      this.endpoint = cfg.endpoint;
      this.port = cfg.port;
      this.bucket = cfg.bucket;
      this.useSSL = cfg.useSSL;
      // Use public URL if provided (Cloudflare R2 Public Development URL)
      this.publicUrl = MINIO_PUBLIC_URL;
      if (this.publicUrl) {
        // Remove trailing slash if present
        this.publicUrl = this.publicUrl.replace(/\/$/, '');
        this.logger.log(`✅ Using public URL for file access: ${this.publicUrl}`);
      }
      if (isR2Endpoint(this.endpoint)) {
        this.useR2 = true;
        this.r2AccessKey = String(cfg.accessKey).trim();
        this.r2SecretKey = String(cfg.secretKey).trim();
        const r2Endpoint = `https://${this.endpoint}`;
        this.r2S3Client = new S3Client({
          region: 'auto',
          endpoint: r2Endpoint,
          credentials: {
            accessKeyId: this.r2AccessKey,
            secretAccessKey: this.r2SecretKey,
          },
          forcePathStyle: true,
        });
        this.clientOrNull = null;
        this.logger.log('✅ Cloudflare R2: using AWS SDK S3 client for uploads (signature-compatible)');
      } else {
        const clientOpts: ConstructorParameters<typeof MinioClient>[0] = {
          endPoint: this.endpoint,
          port: this.port,
          useSSL: cfg.useSSL,
          accessKey: String(cfg.accessKey).trim(),
          secretKey: String(cfg.secretKey).trim(),
        };
        this.clientOrNull = new MinioClient(clientOpts);
      }
      this.enabled = true;
    } else {
      const endpointRaw = MINIO_ENDPOINT || devDefaults.endpoint;
      const parsed = parseEndpoint(endpointRaw);
      const endpoint = parsed.host;
      const port = parsed.port;
      const accessKey = MINIO_ACCESS_KEY || MINIO_ROOT_USER || devDefaults.accessKey;
      const secretKey = MINIO_SECRET_KEY || MINIO_ROOT_PASSWORD || devDefaults.secretKey;
      const bucket = MINIO_BUCKET || parsed.bucketFromPath || devDefaults.bucket;

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
      this.useSSL = parsed.useSSL;
      // Use public URL if provided (Cloudflare R2 Public Development URL)
      this.publicUrl = MINIO_PUBLIC_URL;
      if (this.publicUrl) {
        this.publicUrl = this.publicUrl.replace(/\/$/, '');
        this.logger.log(`✅ Using public URL for file access: ${this.publicUrl}`);
      }
      if (isR2Endpoint(this.endpoint)) {
        this.useR2 = true;
        this.r2AccessKey = String(accessKey).trim();
        this.r2SecretKey = String(secretKey).trim();
        const r2Endpoint = `https://${this.endpoint}`;
        this.r2S3Client = new S3Client({
          region: 'auto',
          endpoint: r2Endpoint,
          credentials: { accessKeyId: this.r2AccessKey, secretAccessKey: this.r2SecretKey },
          forcePathStyle: true,
        });
        this.clientOrNull = null;
        this.logger.log('✅ Cloudflare R2: using AWS SDK S3 client for uploads');
      } else {
        const clientOpts: ConstructorParameters<typeof MinioClient>[0] = {
          endPoint: this.endpoint,
          port: this.port,
          useSSL: parsed.useSSL,
          accessKey: String(accessKey).trim(),
          secretKey: String(secretKey).trim(),
        };
        this.clientOrNull = new MinioClient(clientOpts);
      }
      this.enabled = true;
    }
  }

  private async ensureBucketR2(bucket?: string): Promise<void> {
    const useBucket = bucket || this.bucket;
    if (!this.r2S3Client) return;
    try {
      await this.r2S3Client.send(new HeadBucketCommand({ Bucket: useBucket }));
    } catch (e: any) {
      const is404 = e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound' || e?.Code === 'NoSuchBucket';
      if (is404) {
        await this.r2S3Client.send(new CreateBucketCommand({ Bucket: useBucket }));
        this.logger.log(`Created R2 bucket: ${useBucket}`);
      } else {
        throw e;
      }
    }
  }

  async ensureBucket(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('MinIO is disabled; ensureBucket skipped.');
      return;
    }
    if (this.useR2 && this.r2S3Client) {
      await this.ensureBucketR2(this.bucket);
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
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };
      
      // Try to set bucket policy
      const anyClient: any = this.client as any;
      if (typeof anyClient.setBucketPolicy === 'function') {
        try {
          await anyClient.setBucketPolicy(bucket, JSON.stringify(policy));
          this.logger.log(`✅ Set public read policy for bucket: ${bucket}`);
        } catch (policyError: any) {
          // Cloudflare R2 might not support setBucketPolicy, or bucket needs to be public in dashboard
          this.logger.warn(`⚠️ Could not set bucket policy via API: ${policyError?.message || policyError}`);
          this.logger.warn(`   For Cloudflare R2, ensure bucket "${bucket}" is set to "Public" in Cloudflare dashboard`);
          this.logger.warn(`   Go to: R2 → Buckets → ${bucket} → Settings → Public Access`);
        }
      } else {
        this.logger.warn('⚠️ setBucketPolicy method not available. Ensure bucket is public in Cloudflare dashboard.');
      }
    } catch (err: any) {
      this.logger.warn(`⚠️ Error setting public read policy: ${err?.message || err}`);
      this.logger.warn(`   Ensure bucket "${bucket}" is configured as Public in Cloudflare R2 dashboard`);
    }
  }

  async upload(buffer: Buffer, objectName: string, contentType?: string): Promise<UploadedObjectInfo> {
    if (!this.enabled) {
      throw new InternalServerErrorException('MinIO is disabled in this environment; uploads are not available.');
    }
    await this.ensureBucket();
    if (this.useR2 && this.r2S3Client) {
      await this.r2S3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectName,
          Body: buffer,
          ContentType: contentType || 'application/octet-stream',
        }),
      );
      const url = this.publicUrl
        ? `${this.publicUrl}/${encodeURIComponent(objectName)}`
        : `https://${this.endpoint}/${this.bucket}/${encodeURIComponent(objectName)}`;
      this.logger.log(`📤 Uploaded object (R2): ${objectName} to bucket: ${this.bucket}`);
      this.logger.log(`🔗 Public URL: ${url}`);
      return { bucket: this.bucket, objectName, url };
    }
    const meta = { 'Content-Type': contentType || 'application/octet-stream' } as any;
    await this.client.putObject(this.bucket, objectName, buffer, undefined, meta);
    let url: string;
    if (this.publicUrl) {
      url = `${this.publicUrl}/${encodeURIComponent(objectName)}`;
    } else {
      const protocol = this.useSSL ? 'https' : 'http';
      const portPart = (this.useSSL && this.port === 443) || (!this.useSSL && this.port === 80) ? '' : `:${this.port}`;
      url = `${protocol}://${this.endpoint}${portPart}/${this.bucket}/${encodeURIComponent(objectName)}`;
    }
    this.logger.log(`📤 Uploaded object: ${objectName} to bucket: ${this.bucket}`);
    this.logger.log(`🔗 Public URL: ${url}`);
    return { bucket: this.bucket, objectName, url };
  }

  async uploadFile(file: Express.Multer.File, bucket?: string): Promise<string> {
    try {
      if (!this.enabled) {
        throw new InternalServerErrorException('MinIO is disabled in this environment; uploads are not available.');
      }
      const useBucket = bucket || this.bucket;
      if (this.useR2 && this.r2S3Client) {
        await this.ensureBucketR2(useBucket);
        const safeName = (file.originalname || 'file.pdf').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const objectName = `${Date.now()}-${safeName}`;
        await this.r2S3Client.send(
          new PutObjectCommand({
            Bucket: useBucket,
            Key: objectName,
            Body: file.buffer,
            ContentType: file.mimetype || 'application/pdf',
          }),
        );
        const url = this.publicUrl
          ? `${this.publicUrl}/${encodeURIComponent(objectName)}`
          : `https://${this.endpoint}/${useBucket}/${encodeURIComponent(objectName)}`;
        this.logger.log(`📤 Uploaded file (R2): ${objectName} to bucket: ${useBucket}`);
        this.logger.log(`🔗 Public URL: ${url}`);
        return url;
      }
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
      let url: string;
      if (this.publicUrl) {
        url = `${this.publicUrl}/${encodeURIComponent(objectName)}`;
      } else {
        const protocol = this.useSSL ? 'https' : 'http';
        const portPart = (this.useSSL && this.port === 443) || (!this.useSSL && this.port === 80) ? '' : `:${this.port}`;
        url = `${protocol}://${this.endpoint}${portPart}/${useBucket}/${encodeURIComponent(objectName)}`;
      }
      this.logger.log(`📤 Uploaded file: ${objectName} to bucket: ${useBucket}`);
      this.logger.log(`🔗 Public URL: ${url}`);
      return url;
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

  /**
   * Transform a MinIO URL to use the public URL if available
   * This is useful for converting old endpoint URLs to public development URLs
   */
  transformToPublicUrl(url: string): string {
    if (!url || !this.publicUrl) {
      return url; // Return as-is if no public URL is configured
    }

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Check if URL uses the endpoint (needs transformation)
      if (urlObj.hostname === this.endpoint || urlObj.hostname.includes('r2.cloudflarestorage.com')) {
        // Extract bucket and object from path: /bucket/object.pdf
        const pathParts = pathname.split('/').filter(p => p);
        if (pathParts.length >= 2) {
          // Skip bucket (first part), get object name (rest)
          const objectName = pathParts.slice(1).join('/');
          // Return public URL format without bucket: https://pub-xxx.r2.dev/object.pdf
          return `${this.publicUrl}/${objectName}`;
        } else if (pathParts.length === 1) {
          // If only one part, it's already the object name
          return `${this.publicUrl}/${pathParts[0]}`;
        }
      }
      
      // If already using public URL or doesn't match endpoint, return as-is
      return url;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }
}


