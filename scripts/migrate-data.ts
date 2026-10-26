/**
 * Applies pending data migrations to the configured store.
 *   npx tsx scripts/migrate-data.ts            # dry run: prints the planned changes
 *   npx tsx scripts/migrate-data.ts --apply    # applies them
 * Uses Supabase when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 * (run the SQL schema migrations first), otherwise the local DATA_FILE. The local
 * file store also migrates automatically on first load, with a backup.
 */
import path from "node:path";
import { dataVersionOf, migrationOps } from "../src/lib/migrations";
import { summarizeOps } from "../src/lib/migrations/diff";
import { buildSeedDatabase, DATA_VERSION } from "../src/lib/seed/build";
import { MemoryStore, normalize } from "../src/lib/server/store/memory";
import { SupabaseStore } from "../src/lib/server/store/supabase";
import { promises as fs } from "node:fs";

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let snapshot;
  let write: (ops: Parameters<SupabaseStore["apply"]>[0]) => Promise<void>;
  let target: string;
  if (url && key) {
    const store = new SupabaseStore(url, key);
    snapshot = await store.snapshot();
    write = (ops) => store.apply(ops);
    target = "Supabase";
  } else {
    const file = path.resolve(process.env.DATA_FILE ?? ".data/db.json");
    const raw = JSON.parse(await fs.readFile(file, "utf8"));
    snapshot = normalize(raw.db);
    const mem = new MemoryStore(() => snapshot!);
    write = async (ops) => {
      await mem.apply(ops);
      await fs.copyFile(file, `${file}.v${dataVersionOf(snapshot!)}-backup-${Date.now()}.json`);
      await fs.writeFile(file, JSON.stringify({ version: (raw.version ?? 0) + 1, db: await mem.snapshot() }));
    };
    target = file;
  }
  if (!snapshot.settings.length) {
    console.log(`${target} is empty — seed it first (supabase/seed.sql or start the app). Seed version: ${buildSeedDatabase().settings[0].dataVersion}.`);
    return;
  }
  const { ops, applied } = migrationOps(snapshot);
  console.log(`${target}: data version ${dataVersionOf(snapshot)} → ${DATA_VERSION}`);
  if (!applied.length) return console.log("Nothing to migrate.");
  console.log(`Pending: ${applied.join(", ")} — ${ops.length} row operations`);
  console.table(summarizeOps(ops));
  if (!apply) return console.log("Dry run. Re-run with --apply to write these changes.");
  await write(ops);
  console.log("Applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
