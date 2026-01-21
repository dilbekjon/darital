import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MinioService } from '../minio/minio.service';

// DocumentType enum - matches Prisma schema
type DocumentType = 'LEASE_AGREEMENT' | 'ID_COPY' | 'PASSPORT' | 'PAYMENT_RECEIPT' | 'CONTRACT_ATTACHMENT' | 'OTHER';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async findAllForTenant(tenantId: string) {
    return this.prisma.document.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllForContract(contractId: string) {
    return this.prisma.document.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllForPayment(paymentId: string) {
    return this.prisma.document.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async upload(
    file: Express.Multer.File,
    data: {
      tenantId?: string;
      contractId?: string;
      paymentId?: string;
      type: DocumentType;
      name?: string;
      uploadedBy: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Upload to MinIO (uses default bucket)
    const fileUrl = await this.minio.uploadFile(file);

    // Create document record
    return this.prisma.document.create({
      data: {
        tenantId: data.tenantId,
        contractId: data.contractId,
        paymentId: data.paymentId,
        type: data.type,
        name: data.name || file.originalname,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: data.uploadedBy,
      },
    });
  }

  async remove(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Note: MinIO file deletion not implemented - file remains in storage
    // This is acceptable for now as storage is cheap and we keep audit trail
    this.logger.warn(`Document ${id} deleted from DB, file at ${document.fileUrl} remains in storage`);

    return this.prisma.document.delete({ where: { id } });
  }

  async getDocumentStats(tenantId: string) {
    const documents = await this.prisma.document.findMany({
      where: { tenantId },
      select: { type: true, fileSize: true },
    });

    const byType = documents.reduce(
      (acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: documents.length,
      totalSize: documents.reduce((sum, d) => sum + (d.fileSize || 0), 0),
      byType,
    };
  }
}
