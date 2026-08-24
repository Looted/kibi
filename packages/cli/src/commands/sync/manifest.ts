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
import {
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
  isCoarseGranularityReason,
} from "../../public/symbol-granularity.js";
import { resolveSymbolsManifestPaths } from "../../utils/manifest-paths.js";

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
# Generated coordinates are stored separately in symbol-coordinates.yaml.
# Run \`kibi sync --refresh-symbol-coordinates\` to refresh them.
`;

const SYMBOL_COORD_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

const GENERATED_COORD_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
] as const;
const GENERATED_MANIFEST_FIELDS = new Set<string>([
  ...GENERATED_COORD_FIELDS,
  "coordinatesGeneratedAt",
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
  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  if (!deps.existsSync(absolute)) return null;
  try {
    const content = deps.readFileSync(absolute, "utf8");
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}

function fallbackCoarseCoordinates(
  entry: ManifestSymbolEntry,
  workspaceRoot: string,
  deps: ManifestDeps,
): SymbolCoordinatesRecord | null {
  if (!isCoarseGranularityAnchor(entry)) return null;
  const sourceFile =
    typeof entry.sourceFile === "string" ? entry.sourceFile : undefined;
  const title = typeof entry.title === "string" ? entry.title : "";
  if (sourceFile === undefined) return null;
  const content = readSourceText(sourceFile, workspaceRoot, deps);
  if (content === null) return null;
  return coarseCoordinateSpan(sourceFile, title, content);
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

function manifestEntryIdentity(entry: ManifestSymbolEntry): {
  id: string;
  title?: string;
  sourceFile?: string;
  granularity_reason?: string;
} {
  const title = typeof entry.title === "string" ? entry.title : undefined;
  const sourceFile =
    typeof entry.sourceFile === "string" ? entry.sourceFile : undefined;
  const granularityReason =
    typeof entry.granularity_reason === "string"
      ? entry.granularity_reason
      : undefined;
  return {
    id: String(entry.id),
    ...(title === undefined ? {} : { title }),
    ...(sourceFile === undefined ? {} : { sourceFile }),
    ...(granularityReason === undefined
      ? {}
      : { granularity_reason: granularityReason }),
  };
}

export async function refreshManifestCoordinates(
  // implements REQ-003
  manifestPath: string,
  workspaceRoot: string,
  deps?: Partial<ManifestDeps> & { refreshSymbolCoordinates?: boolean },
): Promise<void> {
  const resolved = resolveDeps(deps);

  const shouldRefreshCoordinates = deps?.refreshSymbolCoordinates ?? false;

  const rawContent = resolved.readFileSync(manifestPath, "utf8");
  const parsed = resolved.parseYAML(rawContent);

  if (!isRecord(parsed)) {
    throw new Error(
      `symbols manifest ${manifestPath} is not a YAML object; refusing coordinate refresh`,
    );
  }

  const rawSymbols = parsed.symbols;
  if (!Array.isArray(rawSymbols)) {
    throw new Error(
      `symbols manifest ${manifestPath} has no symbols array; refusing coordinate refresh`,
    );
  }

  const before = rawSymbols.map((entry) =>
    isRecord(entry)
      ? ({ ...entry } as ManifestSymbolEntry)
      : ({} as ManifestSymbolEntry),
  );

  let coordinatesPath: string | null = null;
  if (shouldRefreshCoordinates) {
    coordinatesPath =
      resolved.resolveSymbolsManifestPaths(workspaceRoot).coordinatesPath;
    if (resolved.existsSync(coordinatesPath)) {
      const existing = parseCoordinateArtifact(
        String(resolved.readFileSync(coordinatesPath, "utf8")),
      );
      if (existing.status === "invalid") {
        throw new Error(
          `Failed to parse coordinate artifact ${coordinatesPath}: ${existing.reason}`,
        );
      }
    }
  }

  const enriched = await resolved.enrichSymbolCoordinates(
    before,
    workspaceRoot,
  );

  // Publish the generated coordinate artifact when explicitly requested.
  // Parse and I/O failures are fatal so sync never advances cache state on a
  // partially published compiler dependency. Symbols without extractable
  // coordinates stay absent from the artifact; coverage keeps their gap visible.
  let refreshedArtifactBytes: string | null = null;
  if (shouldRefreshCoordinates) {
    const boundEntries: Record<
      string,
      SymbolCoordinatesRecord & { identityHash: string; sourceHash: string }
    > = {};
    for (const entry of enriched) {
      const id = typeof entry?.id === "string" ? entry.id : undefined;
      if (!id) continue;
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
    }
    refreshedArtifactBytes = resolved.writeCoordinateArtifact(boundEntries);
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
  let failed = 0;
  let unchanged = 0;

  for (let i = 0; i < before.length; i++) {
    const previous = before[i] ?? ({} as ManifestSymbolEntry);
    const current = enriched[i] ?? previous;
    const changed = GENERATED_COORD_FIELDS.some(
      (field) =>
        previous[field as keyof ManifestSymbolEntry] !==
        current[field as keyof ManifestSymbolEntry],
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

    if (eligible && !hasAllGeneratedCoordinates(current)) {
      failed++;
    } else {
      unchanged++;
    }
  }

  const dumped = resolved.dumpYAML(parsed, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  const nextContent = `${SYMBOLS_MANIFEST_COMMENT_BLOCK}${dumped}`;

  let manifestPublished = false;
  try {
    if (rawContent !== nextContent) {
      publishAtomically(manifestPath, nextContent, resolved);
      manifestPublished = true;
    }
    if (refreshedArtifactBytes !== null && coordinatesPath !== null) {
      publishAtomically(coordinatesPath, refreshedArtifactBytes, resolved);
    }
  } catch (error) {
    if (manifestPublished) {
      try {
        const current = resolved.readFileSync(manifestPath, "utf8");
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

  console.log(
    `\u2713 Refreshed symbol coordinates in ${path.relative(workspaceRoot, manifestPath)} (refreshed=${refreshed}, unchanged=${unchanged}, failed=${failed})`,
  );
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
  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);

  if (!resolved.existsSync(absolute)) return false;
  const ext = path.extname(absolute).toLowerCase();
  return SYMBOL_COORD_EXTENSIONS.has(ext);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
