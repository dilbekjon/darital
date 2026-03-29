import 'dotenv/config';

import { PrismaClient, ContractStatus, InvoiceStatus, Prisma, UnitStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

import { MinioService } from '../src/minio/minio.service';
import { rentRollRows, type RentRollRow } from './data/darital-rent-roll.data';

const prisma = new PrismaClient();
const minio = new MinioService();

type PreparedRow = RentRollRow & {
  occupiedFloors: number[];
  xona_nomi: string;
  empty: boolean;
  hasRent: boolean;
};

function parseOccupiedFloors(qavat: number): number[] {
  const raw = String(qavat)
    .split('.')
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isInteger(part) && part >= 1);

  return [...new Set(raw)].sort((a, b) => a - b);
}

function buildUnitName(row: RentRollRow, duplicateIndex: number): string {
  const floors = parseOccupiedFloors(row.qavat);
  const suffix = row.magazin_tartib_raqami ?? 'X';
  const base = `${row.bino}-${floors.join(',')}-${suffix}`;
  return duplicateIndex > 1 ? `${base}-${duplicateIndex}` : base;
}

function generatePhone(fullName: string): string {
  const hash = createHash('sha256').update(fullName).digest('hex');
  const digits = (BigInt(`0x${hash.slice(0, 12)}`) % 100000000n).toString().padStart(8, '0');
  return `+9989${digits}`;
}

function isEmptyUnit(row: RentRollRow): boolean {
  const tenant = row.ijarachi_nomi.toLowerCase();
  const note = (row.izoh ?? '').toLowerCase();
  return tenant.includes('буш') || note.includes('буш');
}

function buildContractNotes(row: PreparedRow): string {
  const parts = [
    row.izoh ? `Izoh: ${row.izoh}` : null,
    row.ijara_stavkasi_1_kv_m !== null ? `Stavka: ${row.ijara_stavkasi_1_kv_m}` : null,
    `Import xona: ${row.xona_nomi}`,
    `Import floors: ${row.occupiedFloors.join(',')}`,
  ];

  return parts.filter(Boolean).join(' | ');
}

function prepareRows(rows: RentRollRow[]): PreparedRow[] {
  const counters = new Map<string, number>();

  return rows.map((row) => {
    const occupiedFloors = parseOccupiedFloors(row.qavat);
    const naturalKey = `${row.bino}::${occupiedFloors.join(',')}::${row.magazin_tartib_raqami ?? 'X'}`;
    const duplicateIndex = (counters.get(naturalKey) ?? 0) + 1;
    counters.set(naturalKey, duplicateIndex);

    return {
      ...row,
      occupiedFloors,
      xona_nomi: buildUnitName(row, duplicateIndex),
      empty: isEmptyUnit(row),
      hasRent: row.jami_ijara_summasi !== null,
    };
  });
}

async function uploadPlaceholderPdf(): Promise<string> {
  if (process.env.DARITAL_IMPORT_PDF_URL) {
    return process.env.DARITAL_IMPORT_PDF_URL;
  }

  const pdfPath = resolve(process.cwd(), 'scripts/assets/test-contract.pdf');
  const buffer = await readFile(pdfPath);
  try {
    const uploaded = await minio.upload(buffer, `imports/darital-test-contract.pdf`, 'application/pdf');
    return uploaded.url;
  } catch (error: any) {
    const fallbackUrl = 'https://example.com/darital-test-contract.pdf';
    console.warn(`MinIO upload failed, using fallback PDF URL: ${fallbackUrl}`);
    console.warn(error?.message || error);
    return fallbackUrl;
  }
}

async function ensureBuilding(name: string, floorsCount: number) {
  const existing = await prisma.building.findFirst({ where: { name } });
  if (existing) {
    return prisma.building.update({
      where: { id: existing.id },
      data: {
        floorsCount: Math.max(existing.floorsCount ?? 1, floorsCount),
      },
    });
  }

  return prisma.building.create({
    data: {
      name,
      floorsCount,
      areaType: 'BUILDING',
    },
  });
}

async function ensureTenant(fullName: string, hashedPassword: string) {
  const existing = await prisma.tenant.findFirst({ where: { fullName } });
  if (existing) {
    return existing;
  }

  const phone = generatePhone(fullName);
  return prisma.tenant.create({
    data: {
      fullName,
      phone,
      password: hashedPassword,
    },
  });
}

async function ensureUnit(row: PreparedRow, buildingId: string) {
  const existing = await prisma.unit.findFirst({
    where: {
      buildingId,
      name: row.xona_nomi,
    },
  });

  const data = {
    name: row.xona_nomi,
    buildingId,
    area: row.ijara_maydoni_kv_m,
    price: new Prisma.Decimal(row.jami_ijara_summasi ?? 0),
    floor: row.occupiedFloors[0] ?? null,
    occupiedFloors: row.occupiedFloors,
    status: row.empty ? UnitStatus.FREE : UnitStatus.BUSY,
  };

  if (existing) {
    return prisma.unit.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.unit.create({ data });
}

async function ensureInvoices(
  contractId: string,
  amount: Prisma.Decimal,
  bankAmount: Prisma.Decimal,
  cashAmount: Prisma.Decimal,
  startDate: Date,
  endDate: Date,
) {
  let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (currentMonth < endDate) {
    const dueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (dueDate > endDate) {
      dueDate.setTime(endDate.getTime());
    }

    const existing = await prisma.invoice.findFirst({
      where: {
        contractId,
        dueDate,
      },
    });

    if (!existing) {
      await prisma.invoice.create({
        data: {
          contractId,
          dueDate,
          amount,
          bankAmount,
          cashAmount,
          status: InvoiceStatus.PENDING,
        },
      });
    }

    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }
}

async function ensureContract(
  row: PreparedRow,
  tenantId: string,
  unitId: string,
  pdfUrl: string,
  startDate: Date,
  endDate: Date,
) {
  const amount = new Prisma.Decimal(row.jami_ijara_summasi ?? 0);
  const bankAmount = new Prisma.Decimal(row.perechislenie ?? 0);
  const cashAmount = new Prisma.Decimal(row.naqd ?? 0);
  const notes = buildContractNotes(row);

  const existing = await prisma.contract.findFirst({
    where: {
      tenantId,
      unitId,
      status: ContractStatus.ACTIVE,
    },
  });

  const data = {
    tenantId,
    unitId,
    startDate,
    endDate,
    pdfUrl,
    amount,
    bankAmount,
    cashAmount,
    notes,
    status: ContractStatus.ACTIVE,
  };

  const contract = existing
    ? await prisma.contract.update({ where: { id: existing.id }, data })
    : await prisma.contract.create({ data });

  await prisma.unit.update({
    where: { id: unitId },
    data: { status: UnitStatus.BUSY },
  });

  await prisma.invoice.deleteMany({ where: { contractId: contract.id } });
  await ensureInvoices(contract.id, amount, bankAmount, cashAmount, startDate, endDate);

  return contract;
}

async function syncBuildingTotals() {
  const buildings = await prisma.building.findMany({
    select: {
      id: true,
      units: { select: { id: true } },
    },
  });

  await Promise.all(
    buildings.map((building) =>
      prisma.building.update({
        where: { id: building.id },
        data: { totalUnits: building.units.length },
      }),
    ),
  );
}

async function main() {
  const preparedRows = prepareRows(rentRollRows);
  const hashedPassword = await bcrypt.hash('imported-tenant-123', 10);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  const pdfUrl = await uploadPlaceholderPdf();

  const maxFloorsByBuilding = new Map<string, number>();
  for (const row of preparedRows) {
    const maxFloor = Math.max(...row.occupiedFloors);
    maxFloorsByBuilding.set(row.bino, Math.max(maxFloorsByBuilding.get(row.bino) ?? 1, maxFloor));
  }

  const buildings = new Map<string, string>();
  for (const [name, floorsCount] of maxFloorsByBuilding.entries()) {
    const building = await ensureBuilding(name, floorsCount);
    buildings.set(name, building.id);
  }

  let createdContracts = 0;
  let freeUnits = 0;

  for (const row of preparedRows) {
    const buildingId = buildings.get(row.bino);
    if (!buildingId) {
      throw new Error(`Building not found for ${row.bino}`);
    }

    const unit = await ensureUnit(row, buildingId);

    if (row.empty) {
      freeUnits += 1;
      continue;
    }

    const tenant = await ensureTenant(row.ijarachi_nomi.trim(), hashedPassword);
    await ensureContract(row, tenant.id, unit.id, pdfUrl, startDate, endDate);
    createdContracts += 1;
  }

  await syncBuildingTotals();

  console.log(`Imported buildings: ${buildings.size}`);
  console.log(`Imported units: ${preparedRows.length}`);
  console.log(`Active contracts synced: ${createdContracts}`);
  console.log(`Free units synced: ${freeUnits}`);
  console.log(`Shared PDF: ${pdfUrl}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
