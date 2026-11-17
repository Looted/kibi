/**
 * Store integrity diagnostics (diagnostic branch only). Compares the live
 * engine's in-memory store with a fresh replay of the branch store's snapshot
 * and journal, lists in-memory properties with more than one value, and
 * exits 1 when the two disagree.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EngineClient } from "../packages/cli/src/engine.js";

const root = process.cwd();
const branch = process.env.KIBI_BRANCH ?? "develop";
const out = process.argv[2];

function files(dir: string, suffix: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...files(full, suffix));
    else if (full.endsWith(suffix)) found.push(full);
  }
  return found;
}

const engine = new EngineClient({
  workspaceRoot: root,
  branch,
  timeout: 300_000,
});
await engine.start();
// Keys an entity holds exactly once; a second value is the corruption the
// strict-fact-shape rule reports.
const singleKeys =
  "[id, title, status, source, created_at, updated_at, fact_kind, subject_key, property_key, operator, value_type, value_string, value_int, value_number, value_bool, value_set, claim_key, claim_text, text_ref, symbol_role, sourceFile]";
const dupGoal = (props: string, suffix: string) =>
  `findall(K${suffix}, (member(K${suffix}=_, ${props}), memberchk(K${suffix}, ${singleKeys})), Ks${suffix}), msort(Ks${suffix}, S${suffix}), clumped(S${suffix}, Cl${suffix})`;
const live = await engine.query(
  [
    "aggregate_all(count, rdf(_, _, _), Triples)",
    "aggregate_all(count, (rdf(S0, _, O0), atom(O0), sub_atom(S0, 0, _, _, 'kb:entity/'), sub_atom(O0, 0, _, _, 'kb:entity/')), Relationships)",
    "aggregate_all(count, kb_entity(_, _, _), Entities)",
    `aggregate_all(count, (kb_entity(_, _, Props1), ${dupGoal("Props1", "1")}, member(_-N1, Cl1), N1 > 1), DupCount)`,
    `findall(Id2-K2-N2, limit(50, (kb_entity(Id2, _, Props2), ${dupGoal("Props2", "2")}, member(K2-N2, Cl2), N2 > 1)), Dups)`,
    "findall(T, thread_property(T, status(running)), Threads)",
  ].join(", "),
);
if (!live.success) console.error("live query failed:", live.error);
const bindings = live.bindings ?? {};
const memory = {
  triples: Number(bindings.Triples),
  relationships: Number(bindings.Relationships),
  entities: Number(bindings.Entities),
  duplicates: Number(bindings.DupCount),
  duplicateExamples: String(bindings.Dups ?? ""),
  threads: bindings.Threads,
};

const store = path.join(root, ".kb", "branches");
const snapshot = files(store, ".trp")[0] ?? "-";
const journal = files(store, ".jrn")[0] ?? "-";
const replayText = execFileSync(
  "swipl",
  [
    "-q",
    "-g",
    "main",
    "-t",
    "halt",
    path.join(root, "scripts/store-diag-replay.pl"),
    snapshot,
    journal,
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
).trim();
const replay = JSON.parse(
  replayText.replace(/^json\(\[|\]\)$/g, "").length > 0
    ? toJson(replayText)
    : "{}",
) as { triples: number; relationships: number; duplicates: number };

function toJson(dict: string): string {
  // json{a:1,b:2} -> {"a":1,"b":2}
  return dict.replace(/^json\{/, "{").replace(/([a-z_]+):/g, '"$1":');
}

const report = { branch, snapshot, journal, memory, replay };
const text = JSON.stringify(report, null, 2);
console.log(text);
if (out) writeFileSync(out, `${text}\n`);
const mismatch =
  memory.triples !== replay.triples ||
  memory.relationships !== replay.relationships ||
  memory.duplicates > 0 ||
  replay.duplicates > 0;
if (mismatch) {
  console.error(
    "::error::Store integrity: the engine's in-memory store differs from a replay of its snapshot and journal (see the report above).",
  );
  process.exit(1);
}
process.exit(0);
