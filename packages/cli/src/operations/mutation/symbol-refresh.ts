import { createHash, randomUUID } from "node:crypto";
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
import { resolveWorkspaceSourceAbsolute } from "../../utils/repo-relative-path.js";
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
  /** Why the symbol got no coordinates, when the refresh could not place it. */
  readonly unplaced?: string;
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

/** The valid span an analyzed entry carries, without its other fields. */
function coordinate(value: unknown): CoordinateRecord | null {
  if (!isValidCoordinateSpan(value)) return null;
  const {
    sourceFile,
    sourceLine,
    sourceColumn,
    sourceEndLine,
    sourceEndColumn,
  } = value;
  return {
    sourceFile,
    sourceLine,
    sourceColumn,
    sourceEndLine,
    sourceEndColumn,
  };
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
  // A path outside the workspace (null) fails the read like a missing file.
  const absolute = resolveWorkspaceSourceAbsolute(workspaceRoot, sourceFile);
  try {
    return readFileSync(absolute as string).toString();
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

export function restoreOrUnlinkCoordinateArtifact(
  targetPath: string,
  before: string | null,
): void {
  if (before === null) {
    unlinkSync(targetPath);
    return;
  }
  replaceArtifactAtomically(targetPath, before);
}

function replaceArtifactAtomically(targetPath: string, content: string): void {
  const temporary = `${targetPath}.kibi-tmp-${process.pid}-${randomUUID()}`;
  try {
    writeFileSync(temporary, content);
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
    ? readFileSync(targetPath).toString()
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
      const current = readFileSync(targetPath).toString();
      if (contentHash(current) !== afterHash) {
        throw new CoordinateArtifactError(
          `coordinate artifact changed after publication; refusing rollback: ${targetPath}`,
        );
      }
      restoreOrUnlinkCoordinateArtifact(targetPath, before);
    },
  };
}

function writeTargetedArtifact(
  records: Record<string, SymbolCoordinateWriteEntry>,
  format: ArtifactFormat,
): string {
  // Both writers validate every span; the legacy one keeps only the span.
  return format === "v2"
    ? writeCoordinateArtifact(records)
    : writeLegacyCoordinateArtifact(records);
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
  if (!Array.isArray(parsedManifest.symbols)) {
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
  // Targeted refresh publishes coordinates only, like
  // `kibi sync --refresh-symbol-coordinates`, so decorated Python may bind
  // explicit declarations while the analysis itself stays partial.
  const [enriched] = await enrichSymbolCoordinates(
    [{ ...entry, id: symbolId, title, sourceFile }],
    context.workspaceRoot,
    // rationale: only decorated Python reads this flag, and Python analysis
    // runs in a separately built worker the hermetic tests do not load.
    // Stryker disable next-line ObjectLiteral,BooleanLiteral
    { allowPythonDecoratorCoordinates: true },
  );
  let next = coordinate(enriched);
  // The analyzer places a symbol in the very file it was given.
  const sourceText = sourceTextFor(sourceFile, context.workspaceRoot);
  if (
    next === null &&
    isCoarseGranularityReason(entry.granularity_reason) &&
    sourceText !== null
  ) {
    // A coarse span is valid by construction.
    next = coarseCoordinateSpan(sourceFile, title, sourceText);
  }
  if (next === null) {
    // No extractable coordinates: remove stale generated state so proof keeps
    // failing closed instead of rebinding an old span to current source bytes.
    const refreshFailure = (
      enriched as { readonly coordinateRefreshFailure?: unknown }
    ).coordinateRefreshFailure;
    const failure =
      typeof refreshFailure === "string"
        ? refreshFailure
        : sourceText === null
          ? `${sourceFile || "its source file"} cannot be read`
          : `no declaration titled ${title} was found in ${sourceFile}`;
    if (existingRecords[symbolId] === undefined) {
      return { refreshed: false, found: true, unplaced: failure };
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
  // rationale: the analyzer placed the symbol by reading this file, so it is
  // unreadable here only if it vanished in between.
  // Stryker disable all
  if (sourceText === null)
    return { refreshed: false, found: true, outcome: "unchanged" };
  // Stryker restore all

  // The identity reads an absent or non-string field as empty.
  const identityHash = coordinateIdentityHash({
    id: symbolId,
    title,
    sourceFile,
    granularity_reason: entry.granularity_reason as string | undefined,
  });
  const bound: SymbolCoordinateWriteEntry & { identityHash: string } = {
    ...next,
    identityHash,
    sourceHash: coordinateSourceHash(sourceText),
  };

  const previousRecord = existingRecords[symbolId];
  const sameSpan =
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

  // The legacy writer keeps only the span of a bound record.
  existingRecords[symbolId] = bound;
  // Both artifact writers order the records by id themselves.
  const publication = publishArtifact(
    artifactPath,
    writeTargetedArtifact(existingRecords, artifactFormat),
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
  const substitute = implementation;
  // Test-substituted implementations run without the real filesystem lock.
  if (substitute !== null) return substitute(symbolId, context);
  return withSymbolCompilerLock(context.workspaceRoot, () =>
    refreshUnlocked(symbolId, context),
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
