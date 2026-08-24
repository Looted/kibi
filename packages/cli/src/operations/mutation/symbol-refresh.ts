import { existsSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { load as parseYaml } from "js-yaml";
import {
  CoordinateArtifactError,
  type SymbolCoordinateWriteEntry,
  type SymbolCoordinatesRecord,
  coordinateIdentityHash,
  isValidCoordinateSpan,
  parseCoordinateArtifact,
  writeCoordinateArtifact,
} from "../../extractors/symbol-coordinates.js";
import { enrichSymbolCoordinates } from "../../public/extractors/symbols-coordinator.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { CANONICAL_ENTITY_PATHS } from "../../utils/kb-paths.js";
import { withSymbolCompilerLock } from "./symbol-compiler-lock.js";

type CoordinateRecord = {
  readonly sourceFile: string;
  readonly sourceLine: number;
  readonly sourceColumn: number;
  readonly sourceEndLine: number;
  readonly sourceEndColumn: number;
};

// implements REQ-generated-coordinate-persistence
export type TargetedRefreshOutcome =
  | "updated"
  | "unchanged"
  | "removed"
  | "not_found";

// implements REQ-generated-coordinate-persistence
export type RefreshResult = {
  readonly refreshed: boolean;
  readonly found: boolean;
  readonly outcome?: TargetedRefreshOutcome;
};

type RefreshImplementation = (
  symbolId: string,
  context: OperationContext,
) => Promise<RefreshResult>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coordinate(value: unknown): CoordinateRecord | null {
  if (!record(value)) return null;
  const {
    sourceFile,
    sourceLine,
    sourceColumn,
    sourceEndLine,
    sourceEndColumn,
  } = value;
  return typeof sourceFile === "string" &&
    typeof sourceLine === "number" &&
    typeof sourceColumn === "number" &&
    typeof sourceEndLine === "number" &&
    typeof sourceEndColumn === "number"
    ? { sourceFile, sourceLine, sourceColumn, sourceEndLine, sourceEndColumn }
    : null;
}

async function manifestPath(context: OperationContext): Promise<string> {
  return path.join(context.workspaceRoot, CANONICAL_ENTITY_PATHS.symbols);
}

function artifactPathFor(manifest: string): string {
  return path.join(path.dirname(manifest), "symbol-coordinates.yaml");
}

/**
 * Publish artifact bytes atomically; rename failures clean their temp file and
 * propagate so callers never advance state on a partial publication.
 */
function publishArtifact(targetPath: string, content: string): void {
  const temporary = `${targetPath}.kibi-tmp-${process.pid}`;
  try {
    writeFileSync(temporary, content, "utf8");
    renameSync(temporary, targetPath);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // Temp cleanup is best effort; the original failure propagates.
    }
    throw error;
  }
}

/**
 * Core targeted refresh. Callers must already hold the workspace symbol
 * compiler lock; the public wrapper acquires it.
 */
async function refreshUnlocked(
  symbolId: string,
  context: OperationContext,
  options: { readonly manifestPath?: string } = {},
): Promise<RefreshResult> {
  const fs = context.fs;
  if (fs === undefined) return { refreshed: false, found: false };
  const manifest = options.manifestPath ?? (await manifestPath(context));
  const artifactPath = artifactPathFor(manifest);

  let parsedManifest: Record<string, unknown>;
  try {
    const loadedManifest: unknown = parseYaml(await fs.readFile(manifest));
    if (!record(loadedManifest)) {
      throw new Error("manifest root is not a mapping");
    }
    parsedManifest = loadedManifest;
  } catch (error) {
    throw new Error(
      `symbol manifest ${manifest} could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!record(parsedManifest) || !Array.isArray(parsedManifest.symbols)) {
    throw new Error(`symbol manifest ${manifest} has no symbols array`);
  }
  const entry = parsedManifest.symbols.find(
    (value) => record(value) && value.id === symbolId,
  );

  // Strictly parse the existing artifact so a malformed compiler dependency
  // aborts the refresh instead of being truncated to one symbol.
  let existingRecords: Record<string, SymbolCoordinateWriteEntry> = {};
  if (existsSync(artifactPath)) {
    const parsedArtifact = parseCoordinateArtifact(
      await fs.readFile(artifactPath),
    );
    if (parsedArtifact.status === "invalid") {
      throw new CoordinateArtifactError(parsedArtifact.reason);
    }
    existingRecords = { ...parsedArtifact.coordinates };
  }

  if (!record(entry)) {
    // The symbol no longer exists in the authored manifest. A standalone
    // refresh removes its stale generated record so proof fails closed.
    if (existingRecords[symbolId] === undefined) {
      return { refreshed: false, found: false, outcome: "not_found" };
    }
    delete existingRecords[symbolId];
    publishArtifact(artifactPath, writeCoordinateArtifact(existingRecords));
    return { refreshed: true, found: false, outcome: "removed" };
  }

  const sourceFile =
    typeof entry.sourceFile === "string" ? entry.sourceFile : "";
  const title = typeof entry.title === "string" ? entry.title : "";
  const [enriched] = await enrichSymbolCoordinates(
    [{ ...entry, id: symbolId, title, sourceFile }],
    context.workspaceRoot,
  );
  const next = coordinate(enriched);
  if (next === null || !isValidCoordinateSpan(next)) {
    // No extractable coordinates: keep the previous record untouched so proof
    // keeps failing closed instead of inventing a location.
    if (existingRecords[symbolId] === undefined) {
      return { refreshed: false, found: true };
    }
    return { refreshed: false, found: true, outcome: "unchanged" };
  }

  const identityHash = coordinateIdentityHash({
    id: symbolId,
    ...(title === "" ? {} : { title }),
    ...(sourceFile === "" ? {} : { sourceFile }),
    ...(typeof entry.granularity_reason === "string"
      ? { granularity_reason: entry.granularity_reason }
      : {}),
  });
  const bound: SymbolCoordinateWriteEntry & { identityHash: string } = {
    ...next,
    identityHash,
  };

  const previousRecord = existingRecords[symbolId];
  const unchangedBytes =
    previousRecord !== undefined &&
    isValidCoordinateSpan(previousRecord) &&
    (previousRecord as SymbolCoordinatesRecord).sourceFile ===
      next.sourceFile &&
    (previousRecord as SymbolCoordinatesRecord).sourceLine ===
      next.sourceLine &&
    (previousRecord as SymbolCoordinatesRecord).sourceColumn ===
      next.sourceColumn &&
    (previousRecord as SymbolCoordinatesRecord).sourceEndLine ===
      next.sourceEndLine &&
    (previousRecord as SymbolCoordinatesRecord).sourceEndColumn ===
      next.sourceEndColumn &&
    (previousRecord as { identityHash?: string }).identityHash === identityHash;
  if (unchangedBytes) {
    return { refreshed: false, found: true, outcome: "unchanged" };
  }

  existingRecords[symbolId] = bound;
  const sortedEntries = Object.fromEntries(
    Object.entries(existingRecords).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  publishArtifact(artifactPath, writeCoordinateArtifact(sortedEntries));
  return { refreshed: true, found: true, outcome: "updated" };
}

let implementation: RefreshImplementation | null = null;

/** Targeted coordinate refresh under the workspace symbol compiler lock. */
export async function refreshSymbolCoordinates(
  symbolId: string,
  context: OperationContext,
): Promise<RefreshResult> {
  const active = implementation ?? refreshUnlocked;
  if (implementation !== null && implementation !== undefined) {
    // Test-substituted implementations run without the real filesystem lock.
    return active(symbolId, context);
  }
  return withSymbolCompilerLock(context.workspaceRoot, () =>
    active(symbolId, context),
  );
}

/** Run one refresh step without acquiring the lock (caller holds it). */
// implements REQ-generated-coordinate-persistence
export async function refreshSymbolCoordinatesUnlocked(
  symbolId: string,
  context: OperationContext,
): Promise<RefreshResult> {
  const active = implementation ?? refreshUnlocked;
  return active(symbolId, context);
}

/**
 * Refresh against an explicitly authored manifest path (the source-first
 * write target), not just the canonical lane. Callers hold the compiler lock.
 */
// implements REQ-generated-coordinate-persistence
export async function refreshSymbolCoordinatesForManifest(
  symbolId: string,
  manifestAbsolutePath: string,
  context: OperationContext,
): Promise<RefreshResult> {
  if (implementation !== null) {
    return implementation(symbolId, context);
  }
  return refreshUnlocked(
    symbolId,
    context,
    { manifestPath: manifestAbsolutePath },
  );
}

// implements REQ-kibi-operation-interface-parity
export function setSymbolRefreshForTests(
  refresh: RefreshImplementation | undefined,
): void {
  implementation = refresh ?? null;
}
