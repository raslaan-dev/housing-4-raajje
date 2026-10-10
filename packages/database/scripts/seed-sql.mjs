// Builds seed.sql for D1: runs the Prisma seed against a throwaway SQLite file, then
// writes its rows as INSERT statements. Load it with `wrangler d1 execute --file`.
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const out = resolve(process.argv[2] ?? 'seed.sql');
const dir = mkdtempSync(join(tmpdir(), 'housing-seed-'));
const file = join(dir, 'seed.db');
const env = { ...process.env, DATABASE_URL: `file:${file}` };

try {
  execSync('npx prisma db push --skip-generate', { env, stdio: 'inherit' });
  execSync('npx tsx prisma/seed.ts', { env, stdio: 'inherit' });

  const db = new DatabaseSync(file);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'")
    .all()
    .map((t) => t.name);

  const literal = (v) => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number' || typeof v === 'bigint') return String(v);
    if (v instanceof Uint8Array) return `X'${Buffer.from(v).toString('hex')}'`;
    return `'${String(v).replaceAll("'", "''")}'`;
  };

  const lines = ['PRAGMA defer_foreign_keys = true;'];
  for (const table of tables) lines.push(`DELETE FROM "${table}";`);
  for (const table of tables) {
    // The Prisma SQLite engine stores DateTime as epoch ms; the D1 adapter uses ISO text with +00:00.
    const dates = new Set(
      db.prepare(`PRAGMA table_info("${table}")`).all().filter((c) => c.type === 'DATETIME').map((c) => c.name)
    );
    for (const row of db.prepare(`SELECT * FROM "${table}"`).all()) {
      const cols = Object.keys(row).map((c) => `"${c}"`).join(', ');
      const vals = Object.entries(row)
        .map(([c, v]) => literal(dates.has(c) && typeof v === 'number' ? new Date(v).toISOString().replace('Z', '+00:00') : v))
        .join(', ');
      lines.push(`INSERT INTO "${table}" (${cols}) VALUES (${vals});`);
    }
  }
  db.close();
  writeFileSync(out, lines.join('\n') + '\n');
  console.log(`Wrote ${lines.length - 1 - tables.length} rows from ${tables.length} tables to ${out}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
