import { ConflictException, Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractStatus, UnitStatus } from '@prisma/client';
import { InvoicesService } from '../invoices/invoices.service';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly invoicesService: InvoicesService,
    private readonly minioService: MinioService,
  ) {}

  async findAll(includeArchived = false) {
    const contracts = await this.prisma.contract.findMany({
      where: includeArchived ? {} : { isArchived: false },
      include: {
        tenant: true,
        unit: {
          include: { building: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return contracts.map((contract) => ({
      id: contract.id,
      tenantId: contract.tenantId,
      unitId: contract.unitId,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate.toISOString(),
      amount: contract.amount.toNumber(),
      status: contract.status,
      pdfUrl: contract.pdfUrl ? this.minioService.transformToPublicUrl(contract.pdfUrl) : contract.pdfUrl,
      notes: contract.notes || null,
      createdAt: contract.createdAt.toISOString(),
      tenant: {
        fullName: contract.tenant.fullName,
        email: contract.tenant.email || '',
      },
      unit: {
        name: contract.unit.name,
      },
    }));
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { tenant: true, unit: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    
    // Transform PDF URL to use public URL if available
    if (contract.pdfUrl) {
      contract.pdfUrl = this.minioService.transformToPublicUrl(contract.pdfUrl);
    }
    
    return contract;
  }

  async findArchived() {
    const contracts = await this.prisma.contract.findMany({
      where: { isArchived: true },
      include: {
        tenant: true,
        unit: {
          include: { building: true }
        }
      },
      orderBy: { archivedAt: 'desc' },
    });

    return contracts.map((contract) => ({
      id: contract.id,
      tenantId: contract.tenantId,
      unitId: contract.unitId,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate.toISOString(),
      amount: contract.amount.toNumber(),
      status: contract.status,
      pdfUrl: contract.pdfUrl ? this.minioService.transformToPublicUrl(contract.pdfUrl) : contract.pdfUrl,
      notes: contract.notes || null,
      createdAt: contract.createdAt.toISOString(),
      isArchived: contract.isArchived,
      archivedAt: contract.archivedAt?.toISOString() || '',
      archivedBy: contract.archivedBy,
      archiveReason: contract.archiveReason,
      tenant: {
        fullName: contract.tenant.fullName,
        email: contract.tenant.email,
      },
      unit: {
        name: contract.unit.name,
        building: contract.unit.building,
      },
    }));
  }

  async create(dto: CreateContractDto, pdfUrl: string) {
    // Check if unit is already BUSY
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.status === UnitStatus.BUSY) {
      throw new BadRequestException({
        code: 'UNIT_ALREADY_BUSY',
        message: 'This unit is already occupied by another contract',
        details: { unitId: dto.unitId, unitName: unit.name },
      });
    }

    // Create contract and mark unit as BUSY in a transaction
    const contract = await this.prisma.$transaction(async (tx) => {
      // Create contract (status: DRAFT by default)
      const newContract = await tx.contract.create({
      data: {
        tenantId: dto.tenantId,
        unitId: dto.unitId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        pdfUrl,
        amount: new Decimal(dto.amount),
          notes: dto.notes || null,
      },
      include: { tenant: true, unit: true },
      });

      // Mark unit as BUSY when contract is created
      await tx.unit.update({
        where: { id: dto.unitId },
        data: { status: UnitStatus.BUSY },
      });

      return newContract;
    });

    // Send admin notification (Email + Telegram)
    await this.notifications.notifyAdminNewContract(
      contract.id,
      contract.tenant.fullName,
      contract.unit.name,
      contract.amount.toNumber(),
    );

    return contract;
  }

  async update(id: string, dto: UpdateContractDto, pdfUrl?: string) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.amount !== undefined) data.amount = new Decimal(dto.amount);
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (pdfUrl !== undefined) data.pdfUrl = pdfUrl;
    return this.prisma.contract.update({ where: { id }, data, include: { tenant: true, unit: true } });
  }

  async changeStatus(id: string, dto: UpdateContractStatusDto) {
    // Get current contract
    const contract = await this.findOne(id);
    const currentStatus = contract.status;
    const newStatus = dto.status;

    // Validate status transition
    const validTransitions: Record<ContractStatus, ContractStatus[]> = {
      DRAFT: [ContractStatus.ACTIVE, ContractStatus.CANCELLED], // Allow cancelling DRAFT contracts
      ACTIVE: [ContractStatus.COMPLETED, ContractStatus.CANCELLED],
      COMPLETED: [], // Cannot transition from COMPLETED
      CANCELLED: [], // Cannot transition from CANCELLED
    };

    const allowedNext = validTransitions[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
        details: {
          currentStatus,
          requestedStatus: newStatus,
          allowedTransitions: allowedNext,
        },
      });
    }

    // Execute status change with unit status update in a transaction
    const updatedContract = await this.prisma.$transaction(async (tx) => {
      // Update contract status
      const updated = await tx.contract.update({
        where: { id },
        data: { status: newStatus },
        include: { tenant: true, unit: true },
      });

      // Update unit status based on transition
      let newUnitStatus: UnitStatus | null = null;

      if (currentStatus === ContractStatus.DRAFT && newStatus === ContractStatus.ACTIVE) {
        // DRAFT → ACTIVE: Unit is already BUSY (set during creation), no change needed
        // But ensure it's BUSY in case it was somehow changed
        newUnitStatus = UnitStatus.BUSY;
      } else if (currentStatus === ContractStatus.DRAFT && newStatus === ContractStatus.CANCELLED) {
        // DRAFT → CANCELLED: Mark unit as FREE (contract cancelled before activation)
        newUnitStatus = UnitStatus.FREE;
      } else if (currentStatus === ContractStatus.ACTIVE && 
                 (newStatus === ContractStatus.COMPLETED || newStatus === ContractStatus.CANCELLED)) {
        // ACTIVE → COMPLETED or CANCELLED: Mark unit as FREE
        newUnitStatus = UnitStatus.FREE;
      }

      if (newUnitStatus) {
        await tx.unit.update({
          where: { id: contract.unitId },
          data: { status: newUnitStatus },
        });
      }

      return updated;
    });

    // Automatically create monthly invoices when contract is activated
    if (currentStatus === ContractStatus.DRAFT && newStatus === ContractStatus.ACTIVE) {
      try {
        // Check if invoices already exist for this contract
        const existingInvoices = await this.prisma.invoice.findMany({
          where: { contractId: id },
        });

        // Only create invoices if none exist
        if (existingInvoices.length === 0) {
          // Create monthly invoices for entire contract duration
          const createdInvoices = await this.invoicesService.createForContract(
            id,
            updatedContract.amount,
            updatedContract.startDate,
            updatedContract.endDate
          );

          this.logger.log(
            `✅ Auto-created ${createdInvoices.length} monthly invoice(s) for contract ${id} (tenant: ${updatedContract.tenant.fullName})`
          );
        } else {
          this.logger.log(
            `ℹ️ Contract ${id} already has ${existingInvoices.length} invoice(s), skipping auto-creation`
          );
        }
      } catch (error: any) {
        // Log error but don't fail contract activation
        this.logger.error(`Failed to auto-create invoices for contract ${id}:`, error?.message || error);
      }
    }

    return updatedContract;
  }

  async archive(id: string, adminId: string, reason?: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { tenant: true, unit: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.isArchived) {
      throw new ConflictException('Contract is already archived');
    }

    const archivedAt = new Date();
    
    // Archive contract and all related invoices in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Archive all invoices related to this contract
      const archivedInvoices = await tx.invoice.updateMany({
        where: { contractId: id },
        data: {
          isArchived: true,
          archivedAt,
          archivedBy: adminId,
          archiveReason: reason || 'Contract archived',
        },
      });
      
      this.logger.log(`📦 Archived ${archivedInvoices.count} invoice(s) for contract ${id}`);
      
      // Archive the contract
      const archivedContract = await tx.contract.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt,
          archivedBy: adminId,
          archiveReason: reason,
        },
      });
      
      return archivedContract;
    });
  }

  async unarchive(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (!contract.isArchived) {
      throw new ConflictException('Contract is not archived');
    }

    // Unarchive contract and all related invoices in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Unarchive all invoices related to this contract
      const unarchivedInvoices = await tx.invoice.updateMany({
        where: { contractId: id },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
        },
      });
      
      this.logger.log(`📤 Unarchived ${unarchivedInvoices.count} invoice(s) for contract ${id}`);
      
      // Unarchive the contract
      const unarchivedContract = await tx.contract.update({
        where: { id },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
        },
      });
      
      return unarchivedContract;
    });
  }

  async remove(id: string) {
    const contract = await this.findOne(id);

    // Check if contract is archived first
    if (!contract.isArchived) {
      throw new ConflictException('Cannot permanently delete non-archived contract. Archive it first.');
    }

    // Delete contract, all related invoices and their payments in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Get all invoices for this contract
      const invoices = await tx.invoice.findMany({
        where: { contractId: id },
        select: { id: true },
      });
      
      const invoiceIds = invoices.map(inv => inv.id);
      
      // Delete all payments related to these invoices
      if (invoiceIds.length > 0) {
        const deletedPayments = await tx.payment.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
        this.logger.log(`🗑️ Deleted ${deletedPayments.count} payment(s) for contract ${id}`);
      }
      
      // Delete all invoices related to this contract
      const deletedInvoices = await tx.invoice.deleteMany({
        where: { contractId: id },
      });
      this.logger.log(`🗑️ Deleted ${deletedInvoices.count} invoice(s) for contract ${id}`);

      // Delete the contract
      await tx.contract.delete({
        where: { id },
      });

      // If contract was ACTIVE, mark unit as FREE
      if (contract.status === ContractStatus.ACTIVE || contract.status === ContractStatus.DRAFT) {
        await tx.unit.update({
          where: { id: contract.unitId },
          data: { status: UnitStatus.FREE },
        });
      }

      return { message: 'Contract and all related invoices/payments permanently deleted successfully' };
    });
  }
}


