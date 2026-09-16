/**
 * sync-agent-skills.ts
 *
 * Canonical agent skill bundle generator.
 *
 * Reads the canonical skill source from `packages/runtime/src/skills/`,
 * generates committed mirrors under `packages/cursor/skills/`,
 * `packages/codex/skills/`, and `packages/zcode/skills/`, and emits a SHA-256
 * hash manifest at `<target>/.canon-hash.json` so drift can be detected
 * deterministically.
 *
 * The cursor and codex mirrors are byte-identical copies. The zcode mirror
 * rewrites each SKILL.md frontmatter for the ZCode skill loader, which marks a
 * skill `safeToAutoLoad` only when every top-level frontmatter key belongs to
 * its recognized set (`name`, `description`, `when_to_use`, `license`,
 * `metadata`). Canonical kibi keys (`id`, `version`, `kibiCompatibility`,
 * `tags`, `resources`) are preserved verbatim, nested under `metadata:`.
 * Skill bodies and resource files stay byte-identical.
 *
 * Modes:
 *   --write (default)  Rewrite mirror directories and hash manifest.
 *   --check            Non-mutating: exit 0 if mirrors match canonical
 *                      source; exit 1 with a diff summary on drift.
 *   --target <name>    Limit to a single mirror ("cursor", "codex", or
 *                      "zcode"). When omitted, all mirrors are processed.
 *
 * The generator must fail loudly when any expected canonical skill ID is
 * missing.
 */
// allow: SIZE_OK — mirror planning, drift reporting, and writes stay atomic.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  withExclusiveMirrorWriterLock,
  withSharedAdoptionLock,
} from "./skillopt-eval/adoption-lock";

const EXPECTED_SKILL_IDS = [
  "kibi-bootstrap",
  "kibi-freshness",
  "kibi-traceability",
  "kibi-usage",
] as const;

const HASH_MANIFEST_NAME = ".canon-hash.json";

type Target = "cursor" | "codex" | "zcode";

const ALL_TARGETS: readonly Target[] = ["cursor", "codex", "zcode"];

const ZCODE_SKILL_LICENSE = "AGPL-3.0-or-later";

/**
 * Frontmatter keys the ZCode skill loader recognizes; a skill is marked
 * `safeToAutoLoad` only when every top-level key is in this set.
 */
const ZCODE_RECOGNIZED_FRONTMATTER_KEYS = new Set([
  "name",
  "description",
  "when_to_use",
  "license",
  "metadata",
]);

interface ParsedFrontmatter {
  /** Top-level keys in canonical order. */
  order: readonly string[];
  /** Raw single-line values keyed by frontmatter key. */
  values: Readonly<Record<string, string>>;
  /** Raw list-item texts keyed by frontmatter key. */
  lists: Readonly<Record<string, readonly string[]>>;
}

function parseSimpleFrontmatter(content: string): ParsedFrontmatter {
  // Git checkouts on Windows can provide CRLF files, and editors may preserve
  // a UTF-8 BOM. Normalize only the parser view: transformed skill bodies and
  // resource files must continue to use their original bytes.
  const lines = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  if (lines[0] !== "---") {
    throw new Error("Skill frontmatter must start with a `---` line");
  }
  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1) {
    throw new Error("Skill frontmatter is missing its closing `---` line");
  }

  const order: string[] = [];
  const values: Record<string, string> = {};
  const lists: Record<string, string[]> = {};

  for (const line of lines.slice(1, closingIndex)) {
    const listItem = line.match(/^\s+-\s?(.*)$/);
    if (listItem) {
      const current = order.at(-1);
      if (current === undefined) {
        throw new Error(`List item outside a frontmatter key: ${line}`);
      }
      lists[current] ??= [];
      lists[current].push(listItem[1] ?? "");
      continue;
    }

    if (/^\s/.test(line)) {
      throw new Error(`Unsupported nested frontmatter line: ${line}`);
    }

    const entry = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!entry) {
      if (line.trim().length === 0) continue;
      throw new Error(`Invalid frontmatter line: ${line}`);
    }

    const key = entry[1] ?? "";
    if (order.includes(key)) {
      throw new Error(`Duplicate frontmatter key: ${key}`);
    }
    order.push(key);
    values[key] = (entry[2] ?? "").trim();
    lists[key] = [];
  }

  return { order, values, lists };
}

/**
 * Rewrite canonical skill frontmatter into the ZCode-recognized shape:
 * `name`/`description` stay top-level, `license` is added, and every other
 * canonical key is preserved verbatim under `metadata:` (indented lines are
 * retained for human readers; the ZCode loader keys off the top level only).
 */
export function transformZcodeSkillFrontmatter(content: Buffer): Buffer {
  const text = content.toString("utf8");
  const frontmatter = parseSimpleFrontmatter(text);
  const normalizedLines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const closingIndex = normalizedLines.indexOf("---", 1);
  const lines = text.split("\n");
  const body = lines.slice(closingIndex + 1).join("\n");

  const metadataKeys = frontmatter.order.filter(
    (key) => key !== "name" && key !== "description",
  );

  const out: string[] = ["---", `name: ${frontmatter.values.name ?? ""}`];
  if (frontmatter.values.description !== undefined) {
    out.push(`description: ${frontmatter.values.description}`);
  }
  out.push(`license: ${ZCODE_SKILL_LICENSE}`);
  out.push("metadata:");
  for (const key of metadataKeys) {
    const list = frontmatter.lists[key] ?? [];
    if (list.length === 0) {
      out.push(`  ${key}: ${frontmatter.values[key] ?? ""}`);
      continue;
    }
    out.push(`  ${key}:`);
    for (const item of list) {
      out.push(`    - ${item}`);
    }
  }
  out.push("---");

  return Buffer.from(`${out.join("\n")}\n${body}`, "utf8");
}

function transformMirrorFile(
  target: Target,
  relPath: string,
  content: Buffer,
): Buffer {
  if (target !== "zcode" || relPath !== "SKILL.md") {
    return content;
  }
  return transformZcodeSkillFrontmatter(content);
}

interface SyncOptions {
  mode: "write" | "check";
  targets: readonly Target[];
}

interface ParsedArgs extends SyncOptions {}

interface SyncResult {
  driftedTargets: readonly Target[];
}

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
      if (next !== "cursor" && next !== "codex" && next !== "zcode") {
        throw new UsageError(
          `--target requires one of: cursor, codex, zcode (got: ${String(next)})`,
        );
      }
      limitTargets ??= [];
      limitTargets.push(next);
      i++;
    } else if (arg.startsWith("--")) {
      throw new UsageError(`Unknown flag: ${arg}`);
    } else {
      throw new UsageError(`Unexpected positional argument: ${arg}`);
    }
  }

  targets.push(...(limitTargets ?? ALL_TARGETS));
  return { mode, targets: requireSelectedTargets(targets) };
}

export function requireSelectedTargets<T>(targets: readonly T[]): T[] {
  if (targets.length === 0) {
    throw new UsageError("No targets selected");
  }
  return [...targets];
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
  return resolve(repoRoot, "packages/runtime/src/skills");
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
  /** Path relative to the mirror root (e.g. `kibi-bootstrap/SKILL.md`). */
  relPath: string;
  absoluteSource: string;
  content: Buffer;
}

function planSkillMirror(
  canonicalRoot: string,
  skillId: string,
  target: Target,
): PlannedFile[] {
  const skillRoot = join(canonicalRoot, skillId);
  const files = walkFiles(skillRoot);
  return files.map((absoluteSource) => {
    const relPath = relative(skillRoot, absoluteSource).split("\\").join("/");
    return {
      relPath: `${skillId}/${relPath}`,
      absoluteSource,
      content: transformMirrorFile(
        target,
        relPath,
        readFileSync(absoluteSource),
      ),
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
    relative(mirrorRoot, abs).split("\\").join("/"),
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
    lines.push("  added (canonical, missing in mirror):");
    for (const rel of report.added) lines.push(`    + ${rel}`);
  }
  if (report.removed.length > 0) {
    lines.push("  removed (mirror, not in canonical):");
    for (const rel of report.removed) lines.push(`    - ${rel}`);
  }
  if (report.modified.length > 0) {
    lines.push("  modified:");
    for (const rel of report.modified) lines.push(`    ~ ${rel}`);
  }
  if (report.hashManifestMissing) {
    lines.push(`  hash manifest missing: ${HASH_MANIFEST_NAME}`);
  }
  if (report.hashManifestDrifted.length > 0) {
    lines.push("  hash manifest drifted:");
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
    planned.push(...planSkillMirror(canonicalRoot, id, target));
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

export function syncAgentSkillsUnlocked(
  repoRoot: string,
  options: SyncOptions,
): SyncResult {
  const canonicalRoot = canonicalSkillsDir(repoRoot);
  assertCanonicalSourceComplete(canonicalRoot);
  const driftedTargets: Target[] = [];
  for (const target of options.targets) {
    const result = processTarget(repoRoot, canonicalRoot, target, options.mode);
    if (result.drifted) {
      driftedTargets.push(target);
      if (result.summary) {
        process.stderr.write(`${result.summary}\n`);
      }
    }
  }
  return { driftedTargets };
}

export function syncAgentSkills(
  repoRoot: string,
  options: SyncOptions,
): Promise<SyncResult> {
  return withSharedAdoptionLock(repoRoot, async () => {
    if (options.mode === "check") {
      return syncAgentSkillsUnlocked(repoRoot, options);
    }
    return withExclusiveMirrorWriterLock(repoRoot, async () =>
      syncAgentSkillsUnlocked(repoRoot, options),
    );
  });
}

export async function main(argv: string[]): Promise<void> {
  let options: ParsedArgs;
  try {
    options = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`sync-agent-skills: ${message}\n`);
    process.stderr.write(
      "Usage: sync-agent-skills.ts [--write|--check] [--target cursor|codex|zcode]\n",
    );
    process.exit(2);
  }

  const repoRoot = repoRootFromScript();
  let result: SyncResult;
  try {
    result = await syncAgentSkills(repoRoot, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`sync-agent-skills: ${message}\n`);
    process.exit(1);
  }

  if (result.driftedTargets.length > 0) {
    process.stderr.write(
      `sync-agent-skills: drift detected in: ${result.driftedTargets.join(", ")} (run with --write to regenerate)\n`,
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

export async function runSyncAgentSkillsIfMain(
  isMain = invokedDirectly,
  argv = args,
  start = main,
): Promise<void> {
  if (!isMain) return;
  await start(argv);
}

await runSyncAgentSkillsIfMain();

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
