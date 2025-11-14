import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractStatus, UnitStatus } from '@prisma/client';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll() {
    const contracts = await this.prisma.contract.findMany({
      include: { tenant: true, unit: true },
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
      pdfUrl: contract.pdfUrl,
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
    return contract;
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
    return this.prisma.$transaction(async (tx) => {
      // Update contract status
      const updatedContract = await tx.contract.update({
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

      return updatedContract;
    });
  }

  async remove(id: string) {
    const contract = await this.findOne(id);

    // Check if contract has invoices
    const invoices = await this.prisma.invoice.findMany({
      where: { contractId: id },
    });

    if (invoices.length > 0) {
      throw new ConflictException('Cannot delete contract with existing invoices. Please delete invoices first.');
    }

    // Delete contract and update unit status in a transaction
    return this.prisma.$transaction(async (tx) => {
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

      return { message: 'Contract deleted successfully' };
    });
  }
}


