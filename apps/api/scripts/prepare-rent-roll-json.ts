import { readFile, writeFile } from 'fs/promises';

type CleanRow = {
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

function cleanNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function cleanNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanMagazinId(value: unknown): number | string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

function extractRecords(parsed: any): any[] {
  const records =
    parsed?.ijaradagi_objektlar?.records ??
    parsed?.records ??
    (Array.isArray(parsed) ? parsed : null);

  if (!Array.isArray(records)) {
    throw new Error('Unsupported JSON format: expected { ijaradagi_objektlar: { records: [] } } or records: []');
  }
  return records;
}

function normalize(records: any[]): CleanRow[] {
  const out: CleanRow[] = [];
  for (const r of records) {
    const bino = cleanNullableString(r?.bino);
    const qavat = r?.qavat;
    const ijarachi = cleanNullableString(r?.ijarachi_nomi);
    if (!bino) continue;
    if (!isFiniteNumber(qavat)) continue;
    if (!ijarachi) continue;

    out.push({
      bino,
      qavat,
      magazin_tartib_raqami: cleanMagazinId(r?.magazin_tartib_raqami),
      ijarachi_nomi: ijarachi,
      izoh: cleanNullableString(r?.izoh),
      ijara_maydoni_kv_m: cleanNullableNumber(r?.ijara_maydoni_kv_m),
      ijara_stavkasi_1_kv_m: cleanNullableNumber(r?.ijara_stavkasi_1_kv_m),
      jami_ijara_summasi: cleanNullableNumber(r?.jami_ijara_summasi),
      naqd: cleanNullableNumber(r?.naqd),
      perechislenie: cleanNullableNumber(r?.perechislenie),
    });
  }
  return out;
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath) {
    throw new Error('Usage: tsx scripts/prepare-rent-roll-json.ts <input.json> [output.json]');
  }

  const raw = await readFile(inputPath, 'utf8');
  const parsed = JSON.parse(raw);
  const records = extractRecords(parsed);
  const cleaned = normalize(records);

  const outJson = JSON.stringify({ records: cleaned }, null, 2);
  if (outputPath) {
    await writeFile(outputPath, outJson, 'utf8');
  } else {
    process.stdout.write(outJson);
  }

  // eslint-disable-next-line no-console
  console.log(`\nPrepared records: ${cleaned.length}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

