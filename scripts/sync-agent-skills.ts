/**
 * sync-agent-skills.ts
 *
 * Canonical agent skill bundle generator.
 *
 * Reads the canonical skill source from `packages/cli/src/public/skills/`,
 * generates committed mirrors under `packages/cursor/skills/` and
 * `packages/codex/skills/`, and emits a SHA-256 hash manifest at
 * `<target>/.canon-hash.json` so drift can be detected deterministically.
 *
 * Modes:
 *   --write (default)  Rewrite mirror directories and hash manifest.
 *   --check            Non-mutating: exit 0 if mirrors match canonical
 *                      source; exit 1 with a diff summary on drift.
 *   --target <name>    Limit to a single mirror ("cursor" or "codex").
 *                      When omitted, both mirrors are processed.
 *
 * The generator only depends on Node.js built-ins. It must fail loudly when
 * any of the expected canonical skill IDs is missing.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_SKILL_IDS = [
  "init-kibi",
  "kibi-freshness",
  "kibi-traceability",
  "kibi-usage",
] as const;

const HASH_MANIFEST_NAME = ".canon-hash.json";

type Target = "cursor" | "codex";

interface SyncOptions {
  mode: "write" | "check";
  targets: readonly Target[];
}

interface ParsedArgs extends SyncOptions {}

function parseArgs(argv: string[]): ParsedArgs {
  const targets: Target[] = [];
  let mode: "write" | "check" = "write";
  let limitTargets: Target[] | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--write") {
      mode = "write";
    } else if (arg === "--check") {
      mode = "check";
    } else if (arg === "--target") {
      const next = argv[i + 1];
      if (next !== "cursor" && next !== "codex") {
        throw new UsageError(
          `--target requires one of: cursor, codex (got: ${String(next)})`,
        );
      }
      (limitTargets ??= []).push(next);
      i++;
    } else if (arg.startsWith("--")) {
      throw new UsageError(`Unknown flag: ${arg}`);
    } else {
      throw new UsageError(`Unexpected positional argument: ${arg}`);
    }
  }

  targets.push(...(limitTargets ?? (["cursor", "codex"] as const)));
  if (targets.length === 0) {
    throw new UsageError("No targets selected");
  }

  return { mode, targets };
}

class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

function repoRootFromScript(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..");
}

function canonicalSkillsDir(repoRoot: string): string {
  return resolve(repoRoot, "packages/cli/src/public/skills");
}

function mirrorSkillsDir(repoRoot: string, target: Target): string {
  return resolve(repoRoot, `packages/${target}/skills`);
}

function assertCanonicalSourceComplete(canonicalRoot: string): void {
  if (!existsSync(canonicalRoot)) {
    throw new Error(
      `Canonical skills source missing: ${canonicalRoot}. Run this script from the kibi repo root.`,
    );
  }

  const present = new Set(
    readdirSync(canonicalRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );

  const missing = EXPECTED_SKILL_IDS.filter((id) => !present.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Canonical skills source incomplete. Missing skill IDs: ${missing.join(", ")}`,
    );
  }

  for (const id of EXPECTED_SKILL_IDS) {
    const skillFile = join(canonicalRoot, id, "SKILL.md");
    if (!existsSync(skillFile)) {
      throw new Error(
        `Canonical skill ${id} is missing its SKILL.md at ${skillFile}`,
      );
    }
  }
}

function walkFiles(rootDir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

interface PlannedFile {
  /** Path relative to the mirror root (e.g. `init-kibi/SKILL.md`). */
  relPath: string;
  absoluteSource: string;
  content: Buffer;
}

function planSkillMirror(
  canonicalRoot: string,
  skillId: string,
): PlannedFile[] {
  const skillRoot = join(canonicalRoot, skillId);
  const files = walkFiles(skillRoot);
  return files.map((absoluteSource) => {
    const relPath = relative(skillRoot, absoluteSource).replaceAll("\\", "/");
    return {
      relPath: `${skillId}/${relPath}`,
      absoluteSource,
      content: readFileSync(absoluteSource),
    };
  });
}

function computeHashManifest(files: readonly PlannedFile[]): {
  [relPath: string]: string;
} {
  const manifest: Record<string, string> = {};
  for (const file of files) {
    const hash = createHash("sha256").update(file.content).digest("hex");
    manifest[file.relPath] = hash;
  }
  return manifest;
}

function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, Object.keys(value as object).sort(), 2)}\n`;
}

function readJsonIfExists(path: string): Record<string, unknown> | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function listMirrorFiles(mirrorRoot: string): string[] {
  if (!existsSync(mirrorRoot)) return [];
  return walkFiles(mirrorRoot).map((abs) =>
    relative(mirrorRoot, abs).replaceAll("\\", "/"),
  );
}

interface DriftReport {
  added: string[];
  removed: string[];
  modified: string[];
  hashManifestMissing: boolean;
  hashManifestDrifted: string[];
}

function diffMirror(
  mirrorRoot: string,
  planned: readonly PlannedFile[],
  plannedManifest: Record<string, string>,
): DriftReport {
  const plannedRel = new Set(planned.map((f) => f.relPath));
  const actualRel = new Set(
    listMirrorFiles(mirrorRoot).filter((rel) => rel !== HASH_MANIFEST_NAME),
  );

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const rel of plannedRel) {
    if (!actualRel.has(rel)) {
      added.push(rel);
      continue;
    }
    const onDisk = readFileSync(join(mirrorRoot, rel));
    const plannedFile = planned.find((f) => f.relPath === rel);
    if (plannedFile && !onDisk.equals(plannedFile.content)) {
      modified.push(rel);
    }
  }
  for (const rel of actualRel) {
    if (!plannedRel.has(rel)) {
      removed.push(rel);
    }
  }

  const hashPath = join(mirrorRoot, HASH_MANIFEST_NAME);
  const onDiskManifest = readJsonIfExists(hashPath);
  const hashManifestMissing = onDiskManifest === undefined;
  const hashManifestDrifted: string[] = [];
  if (onDiskManifest) {
    for (const [rel, hash] of Object.entries(plannedManifest)) {
      if (onDiskManifest[rel] !== hash) {
        hashManifestDrifted.push(rel);
      }
    }
    for (const rel of Object.keys(onDiskManifest)) {
      if (!(rel in plannedManifest)) {
        hashManifestDrifted.push(rel);
      }
    }
  }

  return {
    added: added.sort(),
    removed: removed.sort(),
    modified: modified.sort(),
    hashManifestMissing,
    hashManifestDrifted: hashManifestDrifted.sort(),
  };
}

function writeMirror(
  mirrorRoot: string,
  planned: readonly PlannedFile[],
  plannedManifest: Record<string, string>,
): void {
  rmSync(mirrorRoot, { recursive: true, force: true });
  mkdirSync(mirrorRoot, { recursive: true });
  for (const file of planned) {
    const target = join(mirrorRoot, file.relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
  writeFileSync(
    join(mirrorRoot, HASH_MANIFEST_NAME),
    stableStringify(plannedManifest),
  );
}

function summarizeDrift(target: Target, report: DriftReport): string {
  const lines: string[] = [];
  lines.push(`[${target}] skill mirror drift detected`);
  if (report.added.length > 0) {
    lines.push(`  added (canonical, missing in mirror):`);
    for (const rel of report.added) lines.push(`    + ${rel}`);
  }
  if (report.removed.length > 0) {
    lines.push(`  removed (mirror, not in canonical):`);
    for (const rel of report.removed) lines.push(`    - ${rel}`);
  }
  if (report.modified.length > 0) {
    lines.push(`  modified:`);
    for (const rel of report.modified) lines.push(`    ~ ${rel}`);
  }
  if (report.hashManifestMissing) {
    lines.push(`  hash manifest missing: ${HASH_MANIFEST_NAME}`);
  }
  if (report.hashManifestDrifted.length > 0) {
    lines.push(`  hash manifest drifted:`);
    for (const rel of report.hashManifestDrifted) lines.push(`    ~ ${rel}`);
  }
  return lines.join("\n");
}

function processTarget(
  repoRoot: string,
  canonicalRoot: string,
  target: Target,
  mode: "write" | "check",
): { drifted: boolean; summary?: string } {
  const mirrorRoot = mirrorSkillsDir(repoRoot, target);
  const planned: PlannedFile[] = [];
  for (const id of EXPECTED_SKILL_IDS) {
    planned.push(...planSkillMirror(canonicalRoot, id));
  }
  const plannedManifest = computeHashManifest(planned);

  if (mode === "write") {
    writeMirror(mirrorRoot, planned, plannedManifest);
    return { drifted: false };
  }

  const report = diffMirror(mirrorRoot, planned, plannedManifest);
  const drifted =
    report.added.length > 0 ||
    report.removed.length > 0 ||
    report.modified.length > 0 ||
    report.hashManifestMissing ||
    report.hashManifestDrifted.length > 0;
  return {
    drifted,
    summary: drifted ? summarizeDrift(target, report) : undefined,
  };
}

function main(argv: string[]): void {
  let options: ParsedArgs;
  try {
    options = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`sync-agent-skills: ${message}\n`);
    process.stderr.write(
      `Usage: sync-agent-skills.ts [--write|--check] [--target cursor|codex]\n`,
    );
    process.exit(2);
  }

  const repoRoot = repoRootFromScript();
  const canonicalRoot = canonicalSkillsDir(repoRoot);

  try {
    assertCanonicalSourceComplete(canonicalRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`sync-agent-skills: ${message}\n`);
    process.exit(1);
  }

  const driftedTargets: string[] = [];
  for (const target of options.targets) {
    const result = processTarget(repoRoot, canonicalRoot, target, options.mode);
    if (result.drifted) {
      driftedTargets.push(target);
      if (result.summary) {
        process.stderr.write(`${result.summary}\n`);
      }
    }
  }

  if (driftedTargets.length > 0) {
    process.stderr.write(
      `sync-agent-skills: drift detected in: ${driftedTargets.join(", ")} (run with --write to regenerate)\n`,
    );
    process.exit(1);
  }

  const verb =
    options.mode === "write"
      ? `wrote ${options.targets.length} mirror(s)`
      : `checked ${options.targets.length} mirror(s)`;
  process.stdout.write(
    `sync-agent-skills: ${verb} (${options.targets.join(", ")})\n`,
  );
}

const args = process.argv.slice(2);
// Defensive: never run main during import-time in test contexts.
const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main(args);
}

export {
  assertCanonicalSourceComplete,
  canonicalSkillsDir,
  computeHashManifest,
  diffMirror,
  mirrorSkillsDir,
  parseArgs,
  planSkillMirror,
  processTarget,
  repoRootFromScript,
  type PlannedFile,
  type SyncOptions,
  type Target,
  EXPECTED_SKILL_IDS,
  HASH_MANIFEST_NAME,
};
