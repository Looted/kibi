/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { load as parseYaml } from "js-yaml";
import { writePendingSourceReceipt } from "../operations/mutation/source-authoring.js";
import {
  type LegacyKbConfig,
  type LegacyKbConfigPaths,
  readLegacyKbConfig,
  resolveLegacyEntityPaths,
} from "../utils/config.js";
import {
  type SemanticAdvisorBackfill,
  defaultKbManifest,
  readKbManifest,
  writeKbManifest,
} from "../utils/kb-manifest.js";
import {
  CANONICAL_ENTITY_PATHS,
  ENTITY_LANES,
  type EntityLane,
  KB_PATHS,
  LEGACY_DEFAULT_ENTITY_PATHS,
} from "../utils/kb-paths.js";
import { LATEST_KB_SCHEMA_VERSION } from "../utils/schema-version.js";
import { updateGitIgnore } from "./init-helpers.js";

/**
 * One-way migration from the legacy configurable layout (entity documents
 * under `documentation/` or custom configured paths, `.kb/config.json`)
 * to the canonical `.kb/` knowledge namespace.
 *
 * The migration is deterministic and idempotent:
 * - legacy `.kb/config.json` is read (never trusted blindly);
 * - configured or default legacy paths are discovered on disk;
 * - files move into `.kb/<lane>/` without content changes;
 * - a legacy copy identical to its destination is removed instead of moved;
 * - other destination conflicts abort before any file moves, each with the
 *   resolution Kibi can tell (a stale subset of the symbols manifest, a
 *   generated coordinates file, or a real conflict);
 * - partial migrations resume safely (already-moved files are no-ops);
 * - on success the legacy config is retired.
 */

export interface StorageMigrationPlan {
  /** Files that would move from a legacy location into `.kb/`. */
  moves: StorageMigrationMove[];
  /** Legacy `.kb/config.json` disposition. */
  legacyConfig: "absent" | "present" | "malformed";
  legacyConfigError?: string;
  /** Lifecycle state preserved into the canonical manifest. */
  schemaVersion: number | null;
  semanticAdvisorBackfill: SemanticAdvisorBackfill | null;
  /**
   * Legacy copies byte-identical to their `.kb/` destination: the migration
   * removes them instead of moving them.
   */
  removals: StorageMigrationRemoval[];
  /** Existing destinations that block a move, with how to resolve each. */
  conflicts: StorageMigrationConflict[];
  /** Why the migration cannot proceed automatically, if blocked. */
  blockers: string[];
}

export interface StorageMigrationRemoval {
  /** The legacy copy to remove. */
  path: string;
  /** The `.kb/` file it duplicates. */
  duplicateOf: string;
}

export interface StorageMigrationConflict {
  from: string;
  to: string;
  /**
   * `stale_subset`: every symbol of the legacy manifest is already in the
   * `.kb/` one. `generated`: a symbol-coordinates file, which sync
   * regenerates. `ambiguous`: Kibi cannot tell which legacy file is meant.
   * `conflict`: different content Kibi cannot classify.
   */
  kind: "stale_subset" | "generated" | "ambiguous" | "conflict";
  resolution: string;
}

export interface StorageMigrationMove {
  from: string;
  to: string;
  lane: EntityLane | "symbols";
}

const LANE_BY_CONFIG_KEY: Record<string, EntityLane> = {
  requirements: "requirements",
  scenarios: "scenarios",
  tests: "tests",
  adr: "adr",
  flags: "flags",
  events: "events",
  facts: "facts",
};

// A glob's root is the text before its first wildcard; trailing slashes on
// it make no difference to the paths resolved from it.
function normalizeLegacySource(raw: string): { root: string; glob: string } {
  const normalized = raw.replaceAll("\\", "/");
  const wildcard = normalized.indexOf("*");
  if (wildcard === -1) {
    return { root: normalized, glob: `${normalized}/**/*.md` };
  }
  return { root: normalized.slice(0, wildcard), glob: normalized };
}

/** Discover the concrete migration moves for a workspace. */
export function planLegacyStorageMigration(cwd: string): StorageMigrationPlan {
  const legacyConfigResult = readLegacyKbConfig(cwd);
  if (legacyConfigResult.kind === "malformed") {
    return {
      moves: [],
      legacyConfig: "malformed",
      legacyConfigError: legacyConfigResult.error,
      schemaVersion: null,
      semanticAdvisorBackfill: null,
      removals: [],
      conflicts: [],
      blockers: [
        `Legacy .kb/config.json is malformed (${legacyConfigResult.error}). Repair the JSON or provide an explicit recovery/migration override; Kibi will not infer default legacy paths.`,
      ],
    };
  }

  const { config } = legacyConfigResult as { config?: LegacyKbConfig };
  const legacyPaths = resolveLegacyEntityPaths(config);

  const moves: StorageMigrationMove[] = [];
  const blockers: string[] = [];

  for (const [key, lane] of Object.entries(LANE_BY_CONFIG_KEY)) {
    // Resolved legacy paths are always non-empty, trimmed strings.
    const legacy = legacyPaths[key as keyof typeof legacyPaths];
    const { root, glob } = normalizeLegacySource(legacy);
    const legacyRoot = path.resolve(cwd, root);
    // Skip lanes whose legacy root is already the canonical location; a
    // missing root simply globs to nothing.
    if (legacyRoot === path.resolve(cwd, KB_PATHS.lanes[lane])) continue;

    const files = fg.sync([glob], {
      cwd,
      absolute: true,
      ignore: ["**/README.md", "**/e2e/**", "**/benchmarks/**"],
      onlyFiles: true,
    });
    for (const file of files.sort()) {
      const relativeUnderRoot = path.relative(legacyRoot, file);
      const destination = path.join(
        cwd,
        KB_PATHS.lanes[lane],
        relativeUnderRoot,
      );
      moves.push({
        from: path.relative(cwd, file).replaceAll(path.sep, "/"),
        to: path.relative(cwd, destination).replaceAll(path.sep, "/"),
        lane,
      });
    }
  }

  // Symbols manifest + coordinates.
  const conflicts: StorageMigrationConflict[] = [];
  const symbolsSource = resolveLegacySymbolsSource(
    cwd,
    config,
    legacyPaths.symbols,
  );
  if (symbolsSource.conflict !== undefined)
    conflicts.push(symbolsSource.conflict);
  const legacySymbols = symbolsSource.path;
  if (legacySymbols !== null) {
    const legacyManifest = path.resolve(cwd, legacySymbols);
    if (
      existsSync(legacyManifest) &&
      legacyManifest !== path.resolve(cwd, CANONICAL_ENTITY_PATHS.symbols)
    ) {
      moves.push({
        from: path.relative(cwd, legacyManifest).replaceAll(path.sep, "/"),
        to: CANONICAL_ENTITY_PATHS.symbols,
        lane: "symbols",
      });
    }
    // Coordinates sit beside a manifest named symbols.yaml/.yml; a manifest
    // with any other name has no coordinates file to carry.
    const legacyCoordinates = legacySymbols.replace(
      /symbols\.ya?ml$/,
      "symbol-coordinates.yaml",
    );
    const legacyCoordinatesPath = path.resolve(cwd, legacyCoordinates);
    if (
      legacyCoordinates !== legacySymbols &&
      existsSync(legacyCoordinatesPath) &&
      legacyCoordinatesPath !== path.resolve(cwd, KB_PATHS.symbolCoordinates)
    ) {
      moves.push({
        from: path
          .relative(cwd, legacyCoordinatesPath)
          .replaceAll(path.sep, "/"),
        to: KB_PATHS.symbolCoordinates,
        lane: "symbols",
      });
    }
  }

  // Destination classification: an identical legacy copy is removed, an
  // empty seeded symbols manifest is replaced, and anything else is an
  // operator decision with the resolution Kibi can tell.
  const removals: StorageMigrationRemoval[] = [];
  const pending: StorageMigrationMove[] = [];
  for (const move of moves) {
    const destinationAbsolute = path.resolve(cwd, move.to);
    if (!existsSync(destinationAbsolute)) {
      pending.push(move);
      continue;
    }
    // 'kibi init' seeds an empty symbols manifest; the legacy one replaces it.
    if (move.lane === "symbols" && isEmptySymbolsStub(destinationAbsolute)) {
      pending.push(move);
      continue;
    }
    const conflict = classifyExistingDestination(cwd, move);
    if (conflict === null) {
      removals.push({ path: move.from, duplicateOf: move.to });
      continue;
    }
    pending.push(move);
    conflicts.push(conflict);
  }
  moves.splice(0, moves.length, ...pending);
  for (const conflict of conflicts) blockers.push(conflict.resolution);

  // Duplicate destinations (two legacy sources collapsing onto one target).
  const destinations = new Map<string, string>();
  for (const move of moves) {
    const existing = destinations.get(move.to);
    if (existing !== undefined && existing !== move.from) {
      blockers.push(
        `Both ${existing} and ${move.from} would migrate to ${move.to}.`,
      );
      continue;
    }
    destinations.set(move.to, move.from);
  }

  return {
    moves,
    legacyConfig: legacyConfigResult.kind === "none" ? "absent" : "present",
    schemaVersion:
      typeof config?.schemaVersion === "number" ? config.schemaVersion : null,
    semanticAdvisorBackfill: config?.semanticAdvisorBackfill ?? null,
    removals,
    conflicts,
    blockers,
  };
}

function hashFile(filePath: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(filePath)).digest("hex");
  } catch {
    return null;
  }
}

/** Symbol ids a manifest declares, or null when it does not parse. */
function manifestSymbolIds(filePath: string): Set<string> | null {
  let parsed: unknown;
  try {
    parsed = parseYaml(readFileSync(filePath).toString());
  } catch {
    // An unparsable manifest declares no symbols list.
  }
  const symbols = (parsed as { symbols?: unknown } | null | undefined)?.symbols;
  if (!Array.isArray(symbols)) return null;
  return new Set(
    symbols.flatMap((symbol: { id?: unknown } | null) =>
      typeof symbol?.id === "string" ? [symbol.id] : [],
    ),
  );
}

/**
 * How a move whose destination already exists is resolved: null when the
 * legacy copy is identical (it is removed), otherwise the conflict and the
 * resolution Kibi can tell.
 */
// implements REQ-cli-schema-migration
function classifyExistingDestination(
  cwd: string,
  move: StorageMigrationMove,
): StorageMigrationConflict | null {
  const from = path.resolve(cwd, move.from);
  const to = path.resolve(cwd, move.to);
  const legacyHash = hashFile(from);
  if (legacyHash !== null && legacyHash === hashFile(to)) return null;
  if (move.to === CANONICAL_ENTITY_PATHS.symbols) {
    const legacyIds = manifestSymbolIds(from);
    const currentIds = manifestSymbolIds(to);
    if (
      legacyIds !== null &&
      currentIds !== null &&
      [...legacyIds].every((id) => currentIds.has(id))
    ) {
      return {
        from: move.from,
        to: move.to,
        kind: "stale_subset",
        resolution: `The legacy copy ${move.from} is a stale subset of ${move.to}: every symbol it declares (${legacyIds.size}) is already there. Remove it (git rm ${move.from}); Kibi removes only a copy identical to its destination.`,
      };
    }
  }
  if (move.to === KB_PATHS.symbolCoordinates) {
    return {
      from: move.from,
      to: move.to,
      kind: "generated",
      resolution: `${move.from} is a generated coordinates file and ${move.to} already exists. Keep ${move.to} and remove the legacy copy (git rm ${move.from}); kibi sync --refresh-symbol-coordinates regenerates coordinates.`,
    };
  }
  return {
    from: move.from,
    to: move.to,
    kind: "conflict",
    resolution: `Destination ${move.to} already exists with different content than ${move.from}. Compare them and keep the current one: replace ${move.to} when the legacy copy is newer, or remove (git rm) ${move.from} when it is a stale duplicate.`,
  };
}

/** The parent folders of the lane roots a legacy config names explicitly. */
function configuredLaneParents(config: LegacyKbConfig | undefined): string[] {
  const parents = new Set<string>();
  for (const key of Object.keys(LANE_BY_CONFIG_KEY)) {
    const value = config?.paths?.[key as keyof LegacyKbConfigPaths];
    // The legacy config loader keeps only string paths; a blank one
    // resolves to "." and names no parent.
    if (value === undefined) continue;
    const { root } = normalizeLegacySource(value.trim());
    const parent = path.posix.dirname(path.posix.normalize(root));
    if (parent !== ".") parents.add(parent);
  }
  return [...parents].sort();
}

/**
 * The legacy symbols manifest to move. A configured path wins. Without one,
 * the historical `documentation/symbols.yaml` default applies only when the
 * config does not place its lanes under another folder: there the manifest
 * sits beside the lanes, and a `documentation/` copy may be a stale leftover.
 * When Kibi cannot tell which file is meant, it moves none and reports the
 * ambiguity instead.
 */
// implements REQ-cli-schema-migration
function resolveLegacySymbolsSource(
  cwd: string,
  config: LegacyKbConfig | undefined,
  resolved: string,
): { path: string | null; conflict?: StorageMigrationConflict } {
  const configured = config?.paths?.symbols ?? config?.symbolsManifest;
  if (typeof configured === "string" && configured.trim().length > 0)
    return { path: resolved };
  const parents = configuredLaneParents(config).filter(
    (parent) =>
      parent !== path.posix.dirname(LEGACY_DEFAULT_ENTITY_PATHS.symbols),
  );
  if (parents.length === 0) return { path: resolved };
  const candidates = parents
    .map((parent) => `${parent}/symbols.yaml`)
    .filter((candidate) => existsSync(path.resolve(cwd, candidate)));
  const fallback = LEGACY_DEFAULT_ENTITY_PATHS.symbols;
  const fallbackExists = existsSync(path.resolve(cwd, fallback));
  if (candidates.length === 1 && !fallbackExists)
    return { path: candidates[0] ?? null };
  if (candidates.length === 0 && !fallbackExists) return { path: null };
  const all = fallbackExists ? [...candidates, fallback] : candidates;
  return {
    path: null,
    conflict: {
      from: all.join(", "),
      to: CANONICAL_ENTITY_PATHS.symbols,
      kind: "ambiguous",
      resolution: `The legacy .kb/config.json places its lanes under ${parents.join(", ")} but names no symbols manifest, and ${all.length === 1 ? `${all[0]} exists outside that folder` : `${all.join(" and ")} all exist`}; Kibi will not guess which one is current. Set paths.symbols in .kb/config.json to the current manifest, or remove (git rm) the stale one, then run kibi migrate --yes.`,
    },
  };
}

export interface StorageMigrationResult {
  movedFiles: string[];
  /** Legacy copies removed because they were identical to their destination. */
  removedFiles: string[];
  /**
   * Moved files Git does not track yet. Each got a pending-source receipt, so
   * `kibi sync` compiles them before they are staged; empty outside Git.
   */
  untrackedMovedFiles: string[];
  retiredLegacyConfig: boolean;
  manifestPath: string;
  schemaVersion: number;
  semanticAdvisorBackfill: SemanticAdvisorBackfill;
}

/**
 * Apply the legacy storage migration. Moves every planned file, writes the
 * canonical lifecycle manifest, retires the legacy config, and prunes empty
 * legacy directories. Fails closed on any blocker.
 */
export function applyLegacyStorageMigration(
  cwd: string,
  plan: StorageMigrationPlan,
): StorageMigrationResult {
  if (plan.blockers.length > 0) {
    throw new Error(
      `Legacy storage migration is blocked: ${plan.blockers.join(" ")}`,
    );
  }

  // A legacy copy identical to its destination carries nothing the
  // destination lacks; it is removed rather than left to block a later run.
  const removedFiles: string[] = [];
  for (const removal of plan.removals) {
    const absolute = path.resolve(cwd, removal.path);
    if (!existsSync(absolute)) continue;
    if (hashFile(absolute) !== hashFile(path.resolve(cwd, removal.duplicateOf)))
      throw new Error(
        `Legacy storage migration is blocked: ${removal.path} changed since planning and no longer matches ${removal.duplicateOf}.`,
      );
    rmSync(absolute);
    removedFiles.push(removal.path);
  }

  const movedFiles: string[] = [];
  for (const move of plan.moves) {
    const sourceAbsolute = path.resolve(cwd, move.from);
    const destinationAbsolute = path.resolve(cwd, move.to);
    if (!existsSync(sourceAbsolute)) {
      // Already moved by a previous (possibly interrupted) run.
      continue;
    }
    mkdirSync(path.dirname(destinationAbsolute), { recursive: true });
    renameSync(sourceAbsolute, destinationAbsolute);
    movedFiles.push(move.to);
  }

  // Preserve lifecycle metadata into the canonical manifest.
  const existing = readKbManifest(cwd);
  const backfill: SemanticAdvisorBackfill =
    plan.semanticAdvisorBackfill ??
    existing?.semanticAdvisorBackfill ??
    "pending";
  // Record the generation the knowledge was written for, not the latest
  // one: 'kibi migrate' raises it after the schema steps, so a run
  // interrupted between the move and those steps still replays them.
  const manifest = {
    ...(existing ?? defaultKbManifest()),
    manifestVersion: defaultKbManifest().manifestVersion,
    schemaVersion: sourceSchemaVersion(plan.schemaVersion, existing),
    semanticAdvisorBackfill: backfill,
  };
  const manifestPath = writeKbManifest(cwd, manifest);

  // Retire the legacy configuration only after all moves succeeded.
  let retiredLegacyConfig = false;
  const legacyConfigPath = path.join(cwd, ".kb", "config.json");
  if (existsSync(legacyConfigPath)) {
    rmSync(legacyConfigPath);
    retiredLegacyConfig = true;
  }

  pruneEmptyLegacyDirs(cwd, plan);
  rewritePendingSourceReceiptPaths(cwd, plan.moves);
  const untrackedMovedFiles = writeMovedSourceReceipts(cwd, plan.moves);
  updateGitIgnore(cwd);

  return {
    movedFiles,
    removedFiles,
    untrackedMovedFiles,
    retiredLegacyConfig,
    manifestPath: path.relative(cwd, manifestPath).replaceAll(path.sep, "/"),
    schemaVersion: manifest.schemaVersion,
    semanticAdvisorBackfill: backfill,
  };
}

function pruneEmptyLegacyDirs(cwd: string, plan: StorageMigrationPlan): void {
  const roots = new Set<string>();
  for (const from of [
    ...plan.moves.map((move) => move.from),
    ...plan.removals.map((removal) => removal.path),
  ]) {
    const absolute = path.resolve(cwd, from);
    let dir = path.dirname(absolute);
    while (
      dir.startsWith(`${path.resolve(cwd)}${path.sep}`) &&
      !dir.startsWith(path.resolve(cwd, KB_ROOT))
    ) {
      roots.add(dir);
      dir = path.dirname(dir);
    }
  }
  // Deepest first.
  const ordered = [...roots].sort((a, b) => b.length - a.length);
  for (const dir of ordered) {
    try {
      if (readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
    } catch {
      // Best-effort pruning; leftover empty dirs are harmless.
    }
  }
}

const KB_ROOT = ".kb";

/** Rewrite recovery pending-source receipts after a storage cutover. */
export function rewritePendingSourceReceiptPaths(
  cwd: string,
  moves: readonly StorageMigrationMove[],
): number {
  const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
  if (!existsSync(pendingRoot)) return 0;
  const moveByFrom = new Map(moves.map((move) => [move.from, move.to]));
  let rewritten = 0;
  for (const name of readdirSync(pendingRoot)) {
    if (!name.endsWith(".json")) continue;
    const receiptPath = path.join(pendingRoot, name);
    try {
      const raw = readFileSync(receiptPath).toString();
      const receipt = JSON.parse(raw) as {
        path?: unknown;
        afterHash?: unknown;
      };
      const normalized = String(receipt.path).replaceAll("\\", "/");
      const destination =
        moveByFrom.get(normalized) ??
        normalized.replace(/^documentation\//, ".kb/");
      if (destination === normalized) continue;
      const absolute = path.resolve(cwd, destination);
      if (!existsSync(absolute)) continue;
      const afterHash =
        typeof receipt.afterHash === "string" &&
        /^[a-f0-9]{64}$/i.test(receipt.afterHash)
          ? receipt.afterHash
          : createHash("sha256").update(readFileSync(absolute)).digest("hex");
      writeFileSync(
        receiptPath,
        `${JSON.stringify({ ...receipt, path: destination, afterHash }, null, 2)}\n`,
      );
      rewritten += 1;
    } catch {
      // Best-effort; malformed receipts remain for operator repair.
    }
  }
  return rewritten;
}

/** Workspace-relative paths Git tracks, or null outside a repository. */
function gitTrackedFiles(cwd: string): Set<string> | null {
  // spawnSync captures stderr, so a non-repository stays quiet.
  const result = spawnSync("git", ["-C", cwd, "ls-files", "--cached", "-z"], {
    maxBuffer: 64 * 1024 * 1024,
    timeout: 30_000,
  });
  if (result.status !== 0) return null;
  // Git prints forward slashes on every platform; the empty name after the
  // final separator matches no move.
  return new Set(result.stdout.toString().split("\0"));
}

/**
 * Bind every moved file Git does not track to its bytes with a
 * pending-source receipt, the record kb_upsert writes for the files it
 * creates. `kibi sync` compiles tracked sources plus receipted ones, so the
 * moved knowledge compiles at once; Kibi never stages anything itself, and
 * each receipt retires when Git starts tracking its file. Later migration
 * rewrites rebind the receipt they find. Covers files a previous,
 * interrupted run moved too. Returns the untracked destinations.
 */
// implements REQ-cli-schema-migration, REQ-core-atomic-upsert-persistence
export function writeMovedSourceReceipts(
  cwd: string,
  moves: readonly StorageMigrationMove[],
): string[] {
  const tracked = gitTrackedFiles(cwd);
  if (tracked === null) return [];
  const untracked: string[] = [];
  for (const move of moves) {
    if (tracked.has(move.to)) continue;
    const absolute = path.resolve(cwd, move.to);
    let bytes: Buffer;
    try {
      bytes = readFileSync(absolute);
    } catch {
      continue;
    }
    writePendingSourceReceipt(
      cwd,
      move.to,
      createHash("sha256").update(bytes).digest("hex"),
    );
    untracked.push(move.to);
  }
  return untracked;
}

// implements REQ-cli-schema-migration
function isEmptySymbolsStub(filePath: string): boolean {
  let content: string;
  try {
    content = readFileSync(filePath).toString();
  } catch {
    return false;
  }
  const statements = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  return (
    statements.length === 1 &&
    /^symbols:\s*\[\s*\]$/.test(String(statements[0]))
  );
}

// implements REQ-cli-schema-migration
function sourceSchemaVersion(
  legacyVersion: number | null,
  existing: { schemaVersion: number } | null,
): number {
  const known = [legacyVersion, existing?.schemaVersion].filter(
    (version): version is number =>
      Number.isInteger(version) && (version as number) > 0,
  );
  return known.length > 0 ? Math.min(...known) : LATEST_KB_SCHEMA_VERSION;
}

/** True when the workspace still needs the legacy storage migration. */
export function needsLegacyStorageMigration(cwd: string): boolean {
  const plan = planLegacyStorageMigration(cwd);
  return (
    plan.moves.length > 0 ||
    plan.removals.length > 0 ||
    // A malformed config always carries a blocker.
    plan.blockers.length > 0 ||
    plan.legacyConfig === "present"
  );
}

/** Entity lanes that must exist for the canonical layout to be complete. */
export function missingCanonicalLanes(cwd: string): EntityLane[] {
  return ENTITY_LANES.filter(
    (lane) => !existsSync(path.resolve(cwd, KB_PATHS.lanes[lane])),
  );
}
