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

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import {
  type LegacyKbConfig,
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
 * - destination conflicts abort before any file moves;
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
  /** Why the migration cannot proceed automatically, if blocked. */
  blockers: string[];
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

function stripGlobToRoot(pattern: string): string {
  const normalized = pattern.replaceAll("\\", "/").replace(/\/+$/, "");
  if (!normalized.includes("*")) return normalized;
  const [root] = normalized.split("*");
  return (root ?? "").replace(/\/+$/, "");
}

function normalizeLegacySource(raw: string): { root: string; glob: string } {
  const normalized = raw.replaceAll("\\", "/");
  if (normalized.includes("*")) {
    return { root: stripGlobToRoot(normalized), glob: normalized };
  }
  return { root: normalized, glob: `${normalized}/**/*.md` };
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
      blockers: [
        `Legacy .kb/config.json is malformed (${legacyConfigResult.error}). Repair the JSON or provide an explicit recovery/migration override; Kibi will not infer default legacy paths.`,
      ],
    };
  }

  const config: LegacyKbConfig | undefined =
    legacyConfigResult.kind === "present"
      ? legacyConfigResult.config
      : undefined;
  const legacyPaths = resolveLegacyEntityPaths(config);

  const moves: StorageMigrationMove[] = [];
  const blockers: string[] = [];

  for (const [key, lane] of Object.entries(LANE_BY_CONFIG_KEY)) {
    const legacy = legacyPaths[key as keyof typeof legacyPaths];
    if (typeof legacy !== "string" || legacy.trim().length === 0) continue;
    const { root, glob } = normalizeLegacySource(legacy);
    const legacyRoot = path.resolve(cwd, root);
    // Skip lanes whose legacy root is already the canonical location.
    if (legacyRoot === path.resolve(cwd, KB_PATHS.lanes[lane])) continue;
    if (!existsSync(legacyRoot)) continue;

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
  const legacySymbols = legacyPaths.symbols;
  if (typeof legacySymbols === "string" && legacySymbols.trim().length > 0) {
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
    const legacyCoordinates = legacySymbols
      .replace(/\.ya?ml$/, ".yaml")
      .replace(/symbols\.yaml$/, "symbol-coordinates.yaml");
    const legacyCoordinatesPath = path.resolve(cwd, legacyCoordinates);
    if (
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

  // Destination-conflict detection: a move whose destination already exists
  // with different content requires an operator decision.
  for (const move of moves) {
    const destinationAbsolute = path.resolve(cwd, move.to);
    if (!existsSync(destinationAbsolute)) continue;
    blockers.push(
      `Destination ${move.to} already exists; resolve the conflict manually before migrating ${move.from}.`,
    );
  }

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
    blockers,
  };
}

export interface StorageMigrationResult {
  movedFiles: string[];
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
  const manifest = {
    ...(existing ?? defaultKbManifest()),
    manifestVersion: defaultKbManifest().manifestVersion,
    schemaVersion: LATEST_KB_SCHEMA_VERSION,
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
  updateGitIgnore(cwd);

  return {
    movedFiles,
    retiredLegacyConfig,
    manifestPath: path.relative(cwd, manifestPath).replaceAll(path.sep, "/"),
    schemaVersion: manifest.schemaVersion,
    semanticAdvisorBackfill: backfill,
  };
}

function pruneEmptyLegacyDirs(cwd: string, plan: StorageMigrationPlan): void {
  const roots = new Set<string>();
  for (const move of plan.moves) {
    const absolute = path.resolve(cwd, move.from);
    let dir = path.dirname(absolute);
    while (
      dir.startsWith(path.resolve(cwd)) &&
      dir !== path.resolve(cwd) &&
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
      if (statSync(dir).isDirectory() && readdirSync(dir).length === 0) {
        rmSync(dir, { recursive: true });
      }
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
      const raw = readFileSync(receiptPath, "utf8");
      const receipt = JSON.parse(raw) as {
        path?: unknown;
        afterHash?: unknown;
      };
      if (typeof receipt.path !== "string") continue;
      const normalized = receipt.path.replaceAll("\\", "/");
      const destination =
        moveByFrom.get(normalized) ??
        (normalized.startsWith("documentation/")
          ? normalized.replace(/^documentation\//, ".kb/")
          : undefined);
      if (destination === undefined || destination === normalized) continue;
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
        "utf8",
      );
      rewritten += 1;
    } catch {
      // Best-effort; malformed receipts remain for operator repair.
    }
  }
  return rewritten;
}

/** True when the workspace still needs the legacy storage migration. */
export function needsLegacyStorageMigration(cwd: string): boolean {
  const plan = planLegacyStorageMigration(cwd);
  return (
    plan.moves.length > 0 ||
    plan.legacyConfig === "present" ||
    plan.legacyConfig === "malformed"
  );
}

/** Entity lanes that must exist for the canonical layout to be complete. */
export function missingCanonicalLanes(cwd: string): EntityLane[] {
  return ENTITY_LANES.filter(
    (lane) => !existsSync(path.resolve(cwd, KB_PATHS.lanes[lane])),
  );
}
