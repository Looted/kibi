import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { load as parseYaml } from "js-yaml";
import {
  CoordinateArtifactError,
  type SymbolCoordinateWriteEntry,
  type SymbolCoordinatesRecord,
  coarseCoordinateSpan,
  coordinateIdentityHash,
  coordinateSourceHash,
  isValidCoordinateSpan,
  parseCoordinateArtifact,
  writeCoordinateArtifact,
  writeLegacyCoordinateArtifact,
} from "../../extractors/symbol-coordinates.js";
import { enrichSymbolCoordinates } from "../../public/extractors/symbols-coordinator.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { isCoarseGranularityReason } from "../../public/symbol-granularity.js";
import { CANONICAL_ENTITY_PATHS } from "../../utils/kb-paths.js";
import { withSymbolCompilerLock } from "./symbol-compiler-lock.js";

type CoordinateRecord = {
  readonly sourceFile: string;
  readonly sourceLine: number;
  readonly sourceColumn: number;
  readonly sourceEndLine: number;
  readonly sourceEndColumn: number;
};

type ArtifactFormat = "legacy" | "v2";

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
  readonly publication?: ArtifactPublicationReceipt;
};

// implements REQ-generated-coordinate-persistence
export type ArtifactPublicationReceipt = {
  readonly path: string;
  readonly beforeHash: string | null;
  readonly afterHash: string;
  rollback(): void;
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

function sourceTextFor(
  sourceFile: string,
  workspaceRoot: string,
): string | null {
  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  try {
    return readFileSync(absolute, "utf8");
  } catch {
    return null;
  }
}

/**
 * Publish artifact bytes atomically; rename failures clean their temp file and
 * propagate so callers never advance state on a partial publication.
 */
function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function replaceArtifactAtomically(targetPath: string, content: string): void {
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

function publishArtifact(
  targetPath: string,
  content: string,
): ArtifactPublicationReceipt {
  const before = existsSync(targetPath)
    ? readFileSync(targetPath, "utf8")
    : null;
  const beforeHash = before === null ? null : contentHash(before);
  const afterHash = contentHash(content);
  replaceArtifactAtomically(targetPath, content);
  return {
    path: targetPath,
    beforeHash,
    afterHash,
    rollback: () => {
      if (!existsSync(targetPath)) {
        throw new CoordinateArtifactError(
          `coordinate artifact disappeared before rollback: ${targetPath}`,
        );
      }
      const current = readFileSync(targetPath, "utf8");
      if (contentHash(current) !== afterHash) {
        throw new CoordinateArtifactError(
          `coordinate artifact changed after publication; refusing rollback: ${targetPath}`,
        );
      }
      if (before === null) {
        unlinkSync(targetPath);
      } else {
        replaceArtifactAtomically(targetPath, before);
      }
    },
  };
}

function writeTargetedArtifact(
  records: Record<string, SymbolCoordinateWriteEntry>,
  format: ArtifactFormat,
): string {
  if (format === "v2") {
    return writeCoordinateArtifact(records);
  }

  const legacyRecords: Record<string, SymbolCoordinatesRecord> = {};
  for (const [id, entry] of Object.entries(records)) {
    if (!isValidCoordinateSpan(entry)) {
      throw new CoordinateArtifactError(
        `refusing to preserve invalid legacy coordinate span for ${id}`,
      );
    }
    legacyRecords[id] = {
      sourceColumn: entry.sourceColumn,
      sourceEndColumn: entry.sourceEndColumn,
      sourceEndLine: entry.sourceEndLine,
      sourceFile: entry.sourceFile,
      sourceLine: entry.sourceLine,
    };
  }
  return writeLegacyCoordinateArtifact(legacyRecords);
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
  let artifactFormat: ArtifactFormat = "v2";
  if (existsSync(artifactPath)) {
    const parsedArtifact = parseCoordinateArtifact(
      await fs.readFile(artifactPath),
    );
    if (parsedArtifact.status === "invalid") {
      throw new CoordinateArtifactError(parsedArtifact.reason);
    }
    artifactFormat = parsedArtifact.status === "legacy" ? "legacy" : "v2";
    existingRecords = { ...parsedArtifact.coordinates };
  }

  if (!record(entry)) {
    // The symbol no longer exists in the authored manifest. A standalone
    // refresh removes its stale generated record so proof fails closed.
    if (existingRecords[symbolId] === undefined) {
      return { refreshed: false, found: false, outcome: "not_found" };
    }
    delete existingRecords[symbolId];
    const publication = publishArtifact(
      artifactPath,
      writeTargetedArtifact(existingRecords, artifactFormat),
    );
    return {
      refreshed: true,
      found: false,
      outcome: "removed",
      publication,
    };
  }

  const sourceFile =
    typeof entry.sourceFile === "string" ? entry.sourceFile : "";
  const title = typeof entry.title === "string" ? entry.title : "";
  const [enriched] = await enrichSymbolCoordinates(
    [{ ...entry, id: symbolId, title, sourceFile }],
    context.workspaceRoot,
  );
  let next = coordinate(enriched);
  let sourceText =
    next === null ? sourceTextFor(sourceFile, context.workspaceRoot) : null;
  if (
    next === null &&
    isCoarseGranularityReason(entry.granularity_reason) &&
    sourceText !== null
  ) {
    next = coarseCoordinateSpan(sourceFile, title, sourceText);
  }
  if (next !== null && sourceText === null) {
    sourceText = sourceTextFor(next.sourceFile, context.workspaceRoot);
  }
  if (next === null || !isValidCoordinateSpan(next)) {
    // No extractable coordinates: remove stale generated state so proof keeps
    // failing closed instead of rebinding an old span to current source bytes.
    if (existingRecords[symbolId] === undefined) {
      return { refreshed: false, found: true };
    }
    delete existingRecords[symbolId];
    const publication = publishArtifact(
      artifactPath,
      writeTargetedArtifact(existingRecords, artifactFormat),
    );
    return {
      refreshed: true,
      found: true,
      outcome: "removed",
      publication,
    };
  }
  if (sourceText === null) {
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
    sourceHash: coordinateSourceHash(sourceText),
  };

  const previousRecord = existingRecords[symbolId];
  const sameSpan =
    previousRecord !== undefined &&
    isValidCoordinateSpan(previousRecord) &&
    previousRecord.sourceFile === next.sourceFile &&
    previousRecord.sourceLine === next.sourceLine &&
    previousRecord.sourceColumn === next.sourceColumn &&
    previousRecord.sourceEndLine === next.sourceEndLine &&
    previousRecord.sourceEndColumn === next.sourceEndColumn;
  const unchangedBytes =
    sameSpan &&
    (artifactFormat === "legacy" ||
      ((previousRecord as { identityHash?: string }).identityHash ===
        identityHash &&
        (previousRecord as { sourceHash?: string }).sourceHash ===
          bound.sourceHash));
  if (unchangedBytes) {
    return { refreshed: false, found: true, outcome: "unchanged" };
  }

  existingRecords[symbolId] = artifactFormat === "legacy" ? next : bound;
  const sortedEntries = Object.fromEntries(
    Object.entries(existingRecords).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  const publication = publishArtifact(
    artifactPath,
    writeTargetedArtifact(sortedEntries, artifactFormat),
  );
  return {
    refreshed: true,
    found: true,
    outcome: "updated",
    publication,
  };
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
  return refreshUnlocked(symbolId, context, {
    manifestPath: manifestAbsolutePath,
  });
}

// implements REQ-kibi-operation-interface-parity
export function setSymbolRefreshForTests(
  refresh: RefreshImplementation | undefined,
): void {
  implementation = refresh ?? null;
}
