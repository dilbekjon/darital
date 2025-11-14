import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';

export class UpdateContractStatusDto {
  @ApiProperty({
    enum: ContractStatus,
    description: `Contract status. Valid transitions:
    - DRAFT → ACTIVE (marks unit as BUSY)
    - ACTIVE → COMPLETED (marks unit as FREE)
    - ACTIVE → CANCELLED (marks unit as FREE)
    
    Business meanings:
    - DRAFT: Contract created but not signed yet
    - ACTIVE: Contract is signed, tenant is occupying and paying
    - COMPLETED: Contract finished successfully
    - CANCELLED: Contract ended early`,
    example: 'ACTIVE',
  })
  @IsEnum(ContractStatus)
  status: ContractStatus;
}

