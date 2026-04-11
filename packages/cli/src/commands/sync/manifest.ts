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
  type ManifestSymbolEntry,
  enrichSymbolCoordinates,
} from "../../extractors/symbols-coordinator.js";

interface ManifestDeps {
  dumpYAML: typeof dumpYAML;
  enrichSymbolCoordinates: typeof enrichSymbolCoordinates;
  existsSync: typeof existsSync;
  parseYAML: typeof parseYAML;
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
}

function resolveDeps(overrides?: Partial<ManifestDeps>): ManifestDeps {
  return {
    dumpYAML,
    enrichSymbolCoordinates,
    existsSync,
    parseYAML,
    readFileSync,
    writeFileSync,
    ...overrides,
  };
}

const SYMBOLS_MANIFEST_COMMENT_BLOCK = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb.symbols.refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb.symbols.refresh\` MCP tool to refresh coordinates.
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
  "coordinatesGeneratedAt",
] as const;

export async function refreshManifestCoordinates(
  // implements REQ-003
  manifestPath: string,
  workspaceRoot: string,
  deps?: Partial<ManifestDeps>,
): Promise<void> {
  const resolved = resolveDeps(deps);
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
  parsed.symbols = enriched;

  let refreshed = 0;
  let failed = 0;
  let unchanged = 0;

  for (let i = 0; i < before.length; i++) {
    const previous = before[i] ?? ({} as ManifestSymbolEntry);
    const current = enriched[i] ?? previous;
    const changed = GENERATED_COORD_FIELDS.some(
      (field) => previous[field] !== current[field],
    );

    if (changed) {
      refreshed++;
      continue;
    }

    const eligible = isEligibleForCoordinateRefresh(
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
    `✓ Refreshed symbol coordinates in ${path.relative(workspaceRoot, manifestPath)} (refreshed=${refreshed}, unchanged=${unchanged}, failed=${failed})`,
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
    typeof entry.sourceEndColumn === "number" &&
    typeof entry.coordinatesGeneratedAt === "string" &&
    entry.coordinatesGeneratedAt.length > 0
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
