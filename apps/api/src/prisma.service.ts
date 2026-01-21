import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Explicitly expose PrismaClient methods and models for TypeScript
  // This ensures all Prisma models (payment, invoice, etc.) are accessible
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    this.logger.log(`Attempting to connect to database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing database connection...');
    try {
      // Add timeout to prevent hanging indefinitely
      const connectPromise = this.$connect();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout after 5 seconds. Please check if the database is running.')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      this.logger.log('✅ Successfully connected to database');
    } catch (error: any) {
      this.logger.error('');
      this.logger.error('═══════════════════════════════════════════════════════════');
      this.logger.error('❌ DATABASE CONNECTION FAILED');
      this.logger.error('═══════════════════════════════════════════════════════════');
      this.logger.error(`Error: ${error?.message || 'Unknown error'}`);
      this.logger.error('');
      this.logger.error('📋 To fix this, follow these steps:');
      this.logger.error('   1. Make sure Docker Desktop is running');
      this.logger.error('   2. Start the database: docker compose up -d postgres');
      this.logger.error('   3. Wait 10-15 seconds for the database to be ready');
      this.logger.error('   4. Verify: docker compose ps (should show postgres as healthy)');
      this.logger.error('   5. Check DATABASE_URL in your .env file');
      this.logger.error('');
      this.logger.error('Current DATABASE_URL: ' + (process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'NOT SET'));
      this.logger.error('═══════════════════════════════════════════════════════════');
      this.logger.error('');
      throw error; // Re-throw to prevent app from starting without database
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}


