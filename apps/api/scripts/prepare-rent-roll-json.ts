import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

type AnyRecord = Record<string, unknown>;

type RentRollRow = {
  bino: string;
  qavat: number;
  magazin_tartib_raqami: number | string | null;
  ijarachi_nomi: string;
  izoh: string | null;
  ijara_maydoni_kv_m: number | null;
  ijara_stavkasi_1_kv_m: number | null;
  jami_ijara_summasi: number | null;
  naqd: number | null;
  perechislenie: number | null;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (isFiniteNumber(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function toMagazin(value: unknown): number | string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = String(value).trim();
  if (!str) return null;
  const asNum = Number(str);
  if (Number.isFinite(asNum) && String(asNum) === str) return asNum;
  return str;
}

function normalizeRow(raw: AnyRecord): RentRollRow | null {
  const bino = typeof raw.bino === 'string' ? raw.bino.trim() : '';
  const qavat = raw.qavat;
  const ijarachi = typeof raw.ijarachi_nomi === 'string' ? raw.ijarachi_nomi.trim() : '';

  if (!bino) return null;
  if (!isFiniteNumber(qavat)) return null;
  if (!ijarachi) return null;

  return {
    bino,
    qavat,
    magazin_tartib_raqami: toMagazin(raw.magazin_tartib_raqami),
    ijarachi_nomi: ijarachi,
    izoh: toNullableString(raw.izoh),
    ijara_maydoni_kv_m: toNullableNumber(raw.ijara_maydoni_kv_m),
    ijara_stavkasi_1_kv_m: toNullableNumber(raw.ijara_stavkasi_1_kv_m),
    jami_ijara_summasi: toNullableNumber(raw.jami_ijara_summasi),
    naqd: toNullableNumber(raw.naqd),
    perechislenie: toNullableNumber(raw.perechislenie),
  };
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error('Usage: tsx scripts/prepare-rent-roll-json.ts <input.json> <output.json>');
    process.exit(1);
  }

  const absInput = resolve(process.cwd(), inputPath);
  const absOutput = resolve(process.cwd(), outputPath);
  const raw = await readFile(absInput, 'utf8');
  const parsed = JSON.parse(raw) as any;

  const recordsCandidate: unknown =
    parsed?.ijaradagi_objektlar?.records ??
    parsed?.records ??
    parsed;

  if (!Array.isArray(recordsCandidate)) {
    throw new Error('Unsupported JSON format: expected an array or { ijaradagi_objektlar: { records: [] } }');
  }

  const cleaned: RentRollRow[] = [];
  for (const rec of recordsCandidate) {
    if (!rec || typeof rec !== 'object') continue;
    const normalized = normalizeRow(rec as AnyRecord);
    if (!normalized) continue;
    cleaned.push(normalized);
  }

  await writeFile(absOutput, JSON.stringify({ records: cleaned }, null, 2) + '\n', 'utf8');
  console.log(`Input records: ${recordsCandidate.length}`);
  console.log(`Cleaned records: ${cleaned.length}`);
  console.log(`Wrote: ${absOutput}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

