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

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import {
  type SymbolCoordinatesRecord,
  writeCoordinateArtifact,
} from "../../extractors/symbol-coordinates.js";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinates,
} from "../../extractors/symbols-coordinator.js";
import { resolveSymbolsManifestPaths } from "../../utils/manifest-paths.js";

interface ManifestDeps {
  dumpYAML: typeof dumpYAML;
  enrichSymbolCoordinates: typeof enrichSymbolCoordinates;
  existsSync: typeof existsSync;
  parseYAML: typeof parseYAML;
  readFileSync: typeof readFileSync;
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
 * Coarse symbol anchors for which per-symbol coordinates are not expected.
 *
 * Test-suite, module-level-behavior, and config-artifact symbols represent a
 * whole file or configuration unit, and `extractor-miss` explicitly documents
 * that the extractor cannot locate a declaration. These entries legitimately
 * carry no generated coordinates, so coordinate refresh counts them as
 * unchanged instead of flagging them as failures.
 */
export const COARSE_GRANULARITY_REASONS = new Set<string>([
  "config-artifact",
  "extractor-miss",
  "module-level-behavior",
  "test-suite",
]);

export function isCoarseGranularityAnchor(entry: ManifestSymbolEntry): boolean {
  const reason = entry.granularity_reason;
  return typeof reason === "string" && COARSE_GRANULARITY_REASONS.has(reason);
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
    console.warn(
      `Warning: symbols manifest ${manifestPath} is not a YAML object; skipping coordinate refresh`,
    );
    return;
  }

  const rawSymbols = parsed.symbols;
  if (!Array.isArray(rawSymbols)) {
    console.warn(
      `Warning: symbols manifest ${manifestPath} has no symbols array; skipping coordinate refresh`,
    );
    return;
  }

  const before = rawSymbols.map((entry) =>
    isRecord(entry)
      ? ({ ...entry } as ManifestSymbolEntry)
      : ({} as ManifestSymbolEntry),
  );

  const enriched = await resolved.enrichSymbolCoordinates(
    before,
    workspaceRoot,
  );

  // Build coordinates map keyed by symbol id
  const coordinatesMap: Record<string, SymbolCoordinatesRecord> = {};
  for (const entry of enriched) {
    const id = typeof entry?.id === "string" ? entry.id : undefined;
    if (!id) continue;
    if (
      typeof entry.sourceFile === "string" &&
      typeof entry.sourceLine === "number" &&
      typeof entry.sourceColumn === "number" &&
      typeof entry.sourceEndLine === "number" &&
      typeof entry.sourceEndColumn === "number"
    ) {
      coordinatesMap[id] = {
        sourceFile: entry.sourceFile,
        sourceLine: entry.sourceLine,
        sourceColumn: entry.sourceColumn,
        sourceEndLine: entry.sourceEndLine,
        sourceEndColumn: entry.sourceEndColumn,
      };
    }
  }

  // Optionally write the coordinate artifact to the coordinates path when explicitly requested
  if (shouldRefreshCoordinates) {
    try {
      const coordinatesPath =
        resolved.resolveSymbolsManifestPaths(workspaceRoot).coordinatesPath;
      const artifactContent = resolved.writeCoordinateArtifact(coordinatesMap);
      resolved.writeFileSync(coordinatesPath, artifactContent, "utf8");
    } catch (err) {
      console.warn(
        `Warning: Failed to write symbol-coordinates artifact: ${String(err)}`,
      );
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

  if (rawContent !== nextContent) {
    resolved.writeFileSync(manifestPath, nextContent, "utf8");
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
