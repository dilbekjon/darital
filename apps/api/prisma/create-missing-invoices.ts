import { PrismaClient, ContractStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

/**
 * Script to create invoices for existing tenants who have ACTIVE contracts but no invoices
 * Run with: npx ts-node apps/api/prisma/create-missing-invoices.ts
 */
async function main() {
  console.log('🔍 Finding contracts without invoices...');

  // Find all ACTIVE contracts
  const activeContracts = await prisma.contract.findMany({
    where: {
      status: ContractStatus.ACTIVE,
    },
    include: {
      tenant: true,
      invoices: true,
    },
  });

  console.log(`Found ${activeContracts.length} active contract(s)`);

  // Filter contracts that don't have invoices
  const contractsWithoutInvoices = activeContracts.filter(
    (contract) => contract.invoices.length === 0
  );

  console.log(`Found ${contractsWithoutInvoices.length} contract(s) without invoices`);

  if (contractsWithoutInvoices.length === 0) {
    console.log('✅ All contracts already have invoices!');
    return;
  }

  // Create invoices for each contract
  let createdCount = 0;
  for (const contract of contractsWithoutInvoices) {
    try {
      // Calculate due date: first of next month from start date
      const startDate = new Date(contract.startDate);
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(1); // Set to first day of month
      
      // If contract is less than a month, use contract end date
      if (dueDate > contract.endDate) {
        dueDate.setTime(contract.endDate.getTime());
      }

      await prisma.invoice.create({
        data: {
          contractId: contract.id,
          dueDate,
          amount: contract.amount,
        },
      });

      createdCount++;
      console.log(
        `✅ Created invoice for contract ${contract.id} (tenant: ${contract.tenant.fullName}, amount: ${contract.amount})`
      );
    } catch (error: any) {
      console.error(
        `❌ Failed to create invoice for contract ${contract.id}: ${error?.message || error}`
      );
    }
  }

  console.log(`\n✅ Created ${createdCount} invoice(s) for contracts without invoices`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
