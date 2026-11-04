/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import { isSeq, parseDocument } from "yaml";
import {
  type CoordinateExtractionIdentity,
  type SymbolCoordinatesRecord,
  coarseCoordinateSpan,
  coordinateIdentityHash,
  coordinateSourceHash,
  parseCoordinateArtifact,
  writeCoordinateArtifact,
} from "../../extractors/symbol-coordinates.js";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinates,
} from "../../extractors/symbols-coordinator.js";
import {
  COARSE_GRANULARITY_REASONS,
  COARSE_GRANULARITY_REASONS_PARENTHESIZED,
  isCoarseGranularityReason,
} from "../../public/symbol-granularity.js";
import { resolveSymbolsManifestPaths } from "../../utils/manifest-paths.js";
import { resolveWorkspaceSourceAbsolute } from "../../utils/repo-relative-path.js";
import { blockifySymbolManifest } from "../../utils/symbol-manifest-layout.js";
import { SyncError } from "./errors.js";

interface ManifestDeps {
  dumpYAML: typeof dumpYAML;
  enrichSymbolCoordinates: typeof enrichSymbolCoordinates;
  existsSync: typeof existsSync;
  parseYAML: typeof parseYAML;
  readFileSync: typeof readFileSync;
  renameSync: typeof renameSync;
  unlinkSync: typeof unlinkSync;
  writeFileSync: typeof writeFileSync;
  writeCoordinateArtifact: typeof writeCoordinateArtifact;
  resolveSymbolsManifestPaths: typeof resolveSymbolsManifestPaths;
}

function resolveDeps(overrides?: Partial<ManifestDeps>): ManifestDeps {
  return {
    dumpYAML,
    enrichSymbolCoordinates,
    existsSync,
    parseYAML,
    readFileSync,
    renameSync,
    unlinkSync,
    writeFileSync,
    writeCoordinateArtifact,
    resolveSymbolsManifestPaths,
    ...overrides,
  };
}

export const SYMBOLS_MANIFEST_COMMENT_BLOCK = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# Coordinates are derived from source by every \`kibi sync\` into the
# gitignored symbol-coordinates.yaml; they are never authored or committed.
#
# Coordinate refresh granularity gate:
#   The AST extractor locates per-declaration spans for code files. When it
#   cannot find a declaration, a title-match or whole-file coarse span is
#   published ONLY for symbols that declare a coarse granularity_reason
#   (${COARSE_GRANULARITY_REASONS.join(", ")}).
#   A symbol without granularity_reason whose extraction misses gets no
#   coordinate entry at all and is reported as failed; add symbol_role and
#   granularity_reason to opt it into the coarse fallback.
`;

function sameCoordinateSpan(
  stored: SymbolCoordinatesRecord | undefined,
  next: SymbolCoordinatesRecord,
): boolean {
  return (
    stored !== undefined &&
    stored.sourceFile === next.sourceFile &&
    GENERATED_COORD_FIELDS.every((field) => stored[field] === next[field])
  );
}

type BoundCoordinates = SymbolCoordinatesRecord & {
  identityHash: string;
  sourceHash: string;
};

const GENERATED_COORD_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
] as const;
const INACTIVE_SYMBOL_STATUSES = new Set([
  "deprecated",
  "removed",
  "retired",
  "superseded",
]);
const GENERATED_MANIFEST_FIELDS = new Set<string>([
  ...GENERATED_COORD_FIELDS,
  "coordinatesGeneratedAt",
  // Transient refresh outcome from the coordinate enricher; never authored.
  "coordinateRefreshFailure",
]);

/**
 * Coarse symbol anchors for which AST per-declaration coordinates are not
 * expected.
 *
 * Test-suite, module-level-behavior, and config-artifact symbols represent a
 * whole file or configuration unit, and `extractor-miss` explicitly documents
 * that the extractor cannot locate a declaration. Refresh still counts those
 * entries as unchanged instead of failures, but it persists title-match or
 * whole-file coordinates so proof-bearing executable symbols can resolve.
 */
export { COARSE_GRANULARITY_REASONS };

export function isCoarseGranularityAnchor(entry: ManifestSymbolEntry): boolean {
  const reason = entry.granularity_reason;
  return isCoarseGranularityReason(reason);
}

function extractedCoordinates(
  entry: ManifestSymbolEntry,
): SymbolCoordinatesRecord | null {
  const {
    sourceFile,
    sourceLine,
    sourceColumn,
    sourceEndLine,
    sourceEndColumn,
  } = entry;
  return typeof sourceFile === "string" &&
    typeof sourceLine === "number" &&
    typeof sourceColumn === "number" &&
    typeof sourceEndLine === "number" &&
    typeof sourceEndColumn === "number"
    ? {
        sourceFile,
        sourceLine,
        sourceColumn,
        sourceEndLine,
        sourceEndColumn,
      }
    : null;
}

function readSourceText(
  sourceFile: string,
  workspaceRoot: string,
  deps: ManifestDeps,
): string | null {
  const absolute = resolveWorkspaceSourceAbsolute(workspaceRoot, sourceFile);
  if (absolute === null || !deps.existsSync(absolute)) return null;
  try {
    return String(deps.readFileSync(absolute));
  } catch {
    return null;
  }
}

function fallbackCoarseCoordinates(
  entry: ManifestSymbolEntry,
  workspaceRoot: string,
  deps: ManifestDeps,
): SymbolCoordinatesRecord | null {
  const { sourceFile, title } = entry;
  if (!isCoarseGranularityAnchor(entry) || typeof sourceFile !== "string") {
    return null;
  }
  const content = readSourceText(sourceFile, workspaceRoot, deps);
  if (content === null) return null;
  return coarseCoordinateSpan(
    sourceFile,
    typeof title === "string" ? title : "",
    content,
  );
}

/** Atomically replace `targetPath` with `content` via temp file + rename. */
function publishAtomically(
  targetPath: string,
  content: string,
  deps: ManifestDeps,
): void {
  const temporary = `${targetPath}.kibi-tmp-${process.pid}`;
  try {
    deps.writeFileSync(temporary, content, "utf8");
    deps.renameSync(temporary, targetPath);
  } catch (error) {
    try {
      deps.unlinkSync(temporary);
    } catch {
      // Temp cleanup is best effort; the original failure propagates.
    }
    throw error;
  }
}

// The identity key reads any non-string field as empty, so manifest values
// are passed through unchecked.
function manifestEntryIdentity(
  entry: ManifestSymbolEntry,
): CoordinateExtractionIdentity {
  return {
    id: String(entry.id),
    title: entry.title,
    sourceFile: entry.sourceFile,
    granularity_reason: entry.granularity_reason,
  } as CoordinateExtractionIdentity;
}

/**
 * Typed reason an eligible (code-file) symbol still has no coordinates after
 * enrichment: the AST extractor missed and the symbol lacks a coarse
 * granularity_reason, so the whole-file fallback is gated off.
 */
// implements REQ-generated-coordinate-persistence
function coarseAnchorFailureReason(entry: ManifestSymbolEntry): string {
  // The enricher names the cause when the title is a declaration the symbol
  // extractor never produces (a private class member): no refresh can bind
  // it, so the remedy is to re-point or remove the symbol.
  if (typeof entry.coordinateRefreshFailure === "string") {
    return entry.coordinateRefreshFailure;
  }
  // A symbol with a coarse granularity_reason is anchored to its whole file
  // and never reported here.
  return `no unique declaration titled '${String(entry.title ?? "")}' was found in ${String(entry.sourceFile ?? "its source file")}; use the name the extractor gives the declaration`;
}

// implements REQ-symbol-coordinates-derived-locally
export async function refreshManifestCoordinates(
  // implements REQ-003
  manifestPath: string,
  workspaceRoot: string,
  deps?: Partial<ManifestDeps> & {
    refreshSymbolCoordinates?: boolean;
    quiet?: boolean;
    /**
     * Reuse every stored record still bound to the symbol's identity and its
     * current source bytes, extract only the rest, and write the coordinate
     * artifact alone (never the authored manifest). Plain `kibi sync` keeps
     * the gitignored artifact current this way.
     */
    incremental?: boolean;
  },
): Promise<{ artifactChanged: boolean }> {
  const resolved = resolveDeps(deps);

  const incremental = deps?.incremental === true;
  const shouldRefreshCoordinates =
    incremental || (deps?.refreshSymbolCoordinates ?? false);

  const rawContent = String(resolved.readFileSync(manifestPath));
  const parsed = resolved.parseYAML(rawContent);

  if (!isRecord(parsed)) {
    throw new SyncError(
      `symbols manifest ${manifestPath} is not a YAML object; refusing coordinate refresh`,
      "SYMBOLS_MANIFEST_INVALID",
    );
  }

  const rawSymbols = parsed.symbols;
  if (!Array.isArray(rawSymbols)) {
    throw new SyncError(
      `symbols manifest ${manifestPath} has no symbols array; refusing coordinate refresh`,
      "SYMBOLS_MANIFEST_INVALID",
    );
  }

  const before = rawSymbols.map((entry) =>
    isRecord(entry)
      ? ({ ...entry } as ManifestSymbolEntry)
      : ({} as ManifestSymbolEntry),
  );

  let coordinatesPath: string | null = null;
  // The stored artifact is the baseline a refresh is counted against: the
  // authored manifest never holds coordinates, so comparing against it would
  // report every symbol as refreshed.
  let storedCoordinates: Record<string, SymbolCoordinatesRecord> | null = null;
  let storedArtifactBytes: string | null = null;
  if (shouldRefreshCoordinates) {
    coordinatesPath =
      resolved.resolveSymbolsManifestPaths(workspaceRoot).coordinatesPath;
    storedCoordinates = {};
    if (resolved.existsSync(coordinatesPath)) {
      storedArtifactBytes = String(resolved.readFileSync(coordinatesPath));
      const existing = parseCoordinateArtifact(storedArtifactBytes);
      if (existing.status === "invalid") {
        // The artifact is a local cache: an incremental refresh rebuilds a
        // damaged one instead of refusing.
        if (!incremental) {
          throw new SyncError(
            `Failed to parse coordinate artifact ${coordinatesPath}: ${existing.reason}`,
            "COORDINATE_ARTIFACT_INVALID",
          );
        }
      } else {
        storedCoordinates = existing.coordinates;
      }
    }
  }

  // Records still bound to the symbol's identity and its current source
  // bytes are exactly what a fresh extraction would produce, so an
  // incremental refresh keeps them and extracts only the remaining symbols.
  const reused = new Map<number, BoundCoordinates>();
  if (incremental) {
    // An incremental refresh always loads the stored artifact above.
    const baseline = storedCoordinates ?? {};
    const sourceHashes = new Map<string, string | null>();
    const currentSourceHash = (sourceFile: string): string | null => {
      if (!sourceHashes.has(sourceFile)) {
        const text = readSourceText(sourceFile, workspaceRoot, resolved);
        sourceHashes.set(
          sourceFile,
          text === null ? null : coordinateSourceHash(text),
        );
      }
      return sourceHashes.get(sourceFile) ?? null;
    };
    for (const [index, entry] of before.entries()) {
      const id = typeof entry.id === "string" ? entry.id : undefined;
      if (!id) continue;
      // Legacy artifact records carry no bindings, so they never match.
      const stored = baseline[id] as
        | (SymbolCoordinatesRecord & Partial<BoundCoordinates>)
        | undefined;
      if (
        stored === undefined ||
        stored.identityHash !==
          coordinateIdentityHash(manifestEntryIdentity(entry)) ||
        stored.sourceHash !== currentSourceHash(stored.sourceFile)
      ) {
        continue;
      }
      reused.set(index, stored as BoundCoordinates);
    }
  }

  const pendingIndices = before
    .map((_, index) => index)
    .filter((index) => !reused.has(index));
  const enriched: ManifestSymbolEntry[] = before.map((entry, index) => {
    const kept = reused.get(index);
    if (kept === undefined) return entry;
    const { identityHash: _identity, sourceHash: _source, ...span } = kept;
    return { ...entry, ...span };
  });
  // An incremental refresh that reuses every record extracts nothing.
  if (!incremental || pendingIndices.length > 0) {
    const extracted = await resolved.enrichSymbolCoordinates(
      pendingIndices.map((index) => before[index] as ManifestSymbolEntry),
      workspaceRoot,
      shouldRefreshCoordinates
        ? { allowPythonDecoratorCoordinates: true }
        : undefined,
    );
    pendingIndices.forEach((index, position) => {
      const entry = extracted[position];
      if (entry !== undefined) enriched[index] = entry;
    });
  }

  // Publish the generated coordinate artifact when explicitly requested.
  // Parse and I/O failures are fatal so sync never advances cache state on a
  // partially published compiler dependency. Symbols without extractable
  // coordinates stay absent from the artifact; coverage keeps their gap visible.
  let artifactPublication: { path: string; bytes: string } | null = null;
  const boundEntries: Record<string, BoundCoordinates> = {};
  const boundIds = new Map<number, string>();
  if (coordinatesPath !== null) {
    for (const [index, entry] of enriched.entries()) {
      const id = typeof entry.id === "string" ? entry.id : undefined;
      if (!id) continue;
      const kept = reused.get(index);
      // A reused record is the stored one, so it never counts as changed.
      if (kept !== undefined) {
        boundEntries[id] = kept;
        continue;
      }
      const span =
        extractedCoordinates(entry) ??
        fallbackCoarseCoordinates(entry, workspaceRoot, resolved);
      if (span === null) continue;
      const sourceText = readSourceText(
        span.sourceFile,
        workspaceRoot,
        resolved,
      );
      if (sourceText === null) continue;
      boundEntries[id] = {
        ...span,
        identityHash: coordinateIdentityHash(manifestEntryIdentity(entry)),
        sourceHash: coordinateSourceHash(sourceText),
      };
      boundIds.set(index, id);
    }
    const bytes = resolved.writeCoordinateArtifact(boundEntries);
    if (bytes !== storedArtifactBytes) {
      artifactPublication = { path: coordinatesPath, bytes };
    }
  }

  // Coordinates belong exclusively to the generated artifact. Always strip
  // them from the authored manifest so consecutive refreshes are idempotent.
  const strippedEnriched = enriched.map((current) =>
    Object.fromEntries(
      Object.entries(current).filter(
        ([field]) => !GENERATED_MANIFEST_FIELDS.has(field),
      ),
    ),
  );

  parsed.symbols = strippedEnriched;

  let refreshed = 0;
  let unchanged = 0;
  const failures: { id: string; reason: string }[] = [];

  for (let i = 0; i < before.length; i++) {
    const previous = before[i] ?? ({} as ManifestSymbolEntry);
    const current = enriched[i] ?? previous;
    const boundId = boundIds.get(i);
    const changed =
      storedCoordinates === null
        ? GENERATED_COORD_FIELDS.some(
            (field) =>
              previous[field as keyof ManifestSymbolEntry] !==
              current[field as keyof ManifestSymbolEntry],
          )
        : boundId !== undefined &&
          !sameCoordinateSpan(
            storedCoordinates[boundId],
            boundEntries[boundId] as BoundCoordinates,
          );

    if (changed) {
      refreshed++;
      continue;
    }

    const coarseAnchor = isCoarseGranularityAnchor(current);

    const eligible =
      !coarseAnchor &&
      isEligibleForCoordinateRefresh(
        typeof current.sourceFile === "string"
          ? current.sourceFile
          : typeof previous.sourceFile === "string"
            ? previous.sourceFile
            : undefined,
        workspaceRoot,
        resolved,
      );

    // A missing source file is no refresh candidate, but an active symbol
    // that names one still gets no coordinates, so it is reported.
    const unreadable =
      !coarseAnchor &&
      !eligible &&
      typeof current.coordinateRefreshFailure === "string" &&
      !INACTIVE_SYMBOL_STATUSES.has(String(current.status));
    if ((eligible || unreadable) && !hasAllGeneratedCoordinates(current)) {
      failures.push({
        id: typeof current.id === "string" ? current.id : `#${i}`,
        reason: coarseAnchorFailureReason(current),
      });
      continue;
    }
    unchanged++;
  }

  const dumped = resolved.dumpYAML(parsed, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  const nextContent = `${SYMBOLS_MANIFEST_COMMENT_BLOCK}${dumped}`;

  let manifestPublished = false;
  const artifactChanged = artifactPublication !== null;
  try {
    if (!incremental && rawContent !== nextContent) {
      publishAtomically(manifestPath, nextContent, resolved);
      manifestPublished = true;
    }
    if (artifactPublication !== null) {
      publishAtomically(
        artifactPublication.path,
        artifactPublication.bytes,
        resolved,
      );
    }
  } catch (error) {
    if (manifestPublished) {
      try {
        const current = String(resolved.readFileSync(manifestPath));
        if (current !== nextContent) {
          throw new Error(
            `symbol manifest changed after publication; refusing rollback: ${manifestPath}`,
          );
        }
        publishAtomically(manifestPath, rawContent, resolved);
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          `Coordinate artifact publication failed and manifest rollback failed: ${manifestPath}`,
        );
      }
    }
    throw error;
  }

  // The generated coordinates live in the artifact beside the manifest, not
  // in the authored symbols.yaml this command also rewrites; naming the
  // artifact keeps diff audits pointed at the file that actually changed.
  // An incremental refresh that changed nothing stays silent: plain sync
  // runs it every time.
  const quiet =
    deps?.quiet === true ||
    (incremental && !artifactChanged && failures.length === 0);
  if (!quiet) {
    const counts = `(refreshed=${refreshed}, unchanged=${unchanged}, failed=${failures.length})`;
    if (coordinatesPath !== null) {
      console.log(
        `\u2713 Refreshed symbol coordinates in ${path.relative(workspaceRoot, coordinatesPath)} ${counts}`,
      );
    } else {
      console.log(
        `\u2713 Normalized symbol manifest ${path.relative(workspaceRoot, manifestPath)} ${counts}`,
      );
    }
    const maxReportedFailures = 10;
    for (const failure of failures.slice(0, maxReportedFailures)) {
      console.log(`  failed ${failure.id}: ${failure.reason}`);
    }
    if (failures.length > maxReportedFailures) {
      console.log(
        `  ... and ${failures.length - maxReportedFailures} more failed symbol(s)`,
      );
    }
    if (failures.length > 0) {
      console.log(
        `  Symbols without a published coordinate entry are dropped from coverage until they succeed. To link a whole file instead, add symbol_role and granularity_reason ${COARSE_GRANULARITY_REASONS_PARENTHESIZED} to the symbol.`,
      );
    }
  }
  return { artifactChanged };
}

/**
 * Rewrite a symbol manifest whose `symbols` sequence is in YAML flow layout
 * (`symbols: [ { id: … }, … ]`) as block YAML, keeping comments and entry
 * order. kibi-cli before 2.18.0 appended to the `symbols: []` that
 * `kibi init` writes and kept every symbol on that one line; the hook
 * scanners of older adapters cannot read it and diffs of it are unreviewable,
 * so plain `kibi sync` normalises it once. Returns the number of symbols
 * when the file was rewritten, otherwise null.
 */
// implements REQ-kibi-hooks-flow-manifest
export function normalizeManifestLayout(
  manifestPath: string,
  deps?: Partial<ManifestDeps>,
): number | null {
  const resolved = resolveDeps(deps);
  const rawContent = String(resolved.readFileSync(manifestPath));
  const doc = parseDocument(rawContent);
  const symbols = doc.get("symbols");
  // A flow list always renders differently once it is block YAML.
  if (
    !isSeq(symbols) ||
    symbols.items.length === 0 ||
    !blockifySymbolManifest(doc)
  ) {
    return null;
  }
  publishAtomically(manifestPath, doc.toString({ lineWidth: 0 }), resolved);
  return symbols.items.length;
}

export function hasAllGeneratedCoordinates(
  // implements REQ-003
  entry: ManifestSymbolEntry,
): boolean {
  return (
    typeof entry.sourceLine === "number" &&
    typeof entry.sourceColumn === "number" &&
    typeof entry.sourceEndLine === "number" &&
    typeof entry.sourceEndColumn === "number"
  );
}

export function isEligibleForCoordinateRefresh(
  // implements REQ-003
  sourceFile: string | undefined,
  workspaceRoot: string,
  deps?: Partial<ManifestDeps>,
): boolean {
  const resolved = resolveDeps(deps);
  if (!sourceFile) return false;
  const absolute = resolveWorkspaceSourceAbsolute(workspaceRoot, sourceFile);
  if (absolute === null) return false;

  // Non-JS/TS files also undergo coordinate extraction through the text
  // heuristic. A miss there must be reported just like an AST extraction miss.
  return resolved.existsSync(absolute);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
