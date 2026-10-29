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

import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fingerprintMaintenanceSourceSet } from "../../plugins/maintenance-source-analysis.js";
import { readProjectKibiConfig } from "../../plugins/project-config.js";
import type { HostSourceAnalysisResultV2 } from "../../plugins/source-analysis-service.js";

/**
 * Parser-backed source analyses kept across `kibi check` runs. Parsing every
 * symbol's source file was the largest client cost of a warm check, and an
 * analysis is a pure function of the file's path and bytes under one
 * analyzer set, so an entry is keyed by both and the whole cache by the
 * analyzer set. The file lives in the branch store, which is never tracked.
 */
// implements REQ-cli-check
export const SOURCE_ANALYSIS_CACHE_FILE = "source-analysis-cache.json";
const SOURCE_ANALYSIS_CACHE_VERSION = 1;

type CacheFile = {
  version: number;
  analyzers: string;
  entries: Record<string, HostSourceAnalysisResultV2>;
};

export type SourceAnalysisCache = {
  get(file: string, content: string): HostSourceAnalysisResultV2 | undefined;
  set(
    file: string,
    content: string,
    analysis: HostSourceAnalysisResultV2,
  ): void;
  /** Write the entries this run read or added, dropping the rest. */
  save(): void;
};

function entryKey(file: string, content: string): string {
  return createHash("sha256")
    .update(file)
    .update("\0")
    .update(content)
    .digest("hex");
}

/**
 * The builtin analyzer is identified by its package version, which a local
 * build does not bump; its built files' sizes and times stand in for its
 * code so a rebuilt analyzer starts a fresh cache.
 */
function builtinBuildStamp(): string {
  const hash = createHash("sha256");
  try {
    const manifest = createRequire(import.meta.url).resolve(
      "kibi-plugin-builtin/package.json",
    );
    const symbolsDir = path.join(path.dirname(manifest), "dist", "symbols");
    for (const name of readdirSync(symbolsDir).sort()) {
      const stat = statSync(path.join(symbolsDir, name));
      hash.update(`${name}\0${stat.size}\0${stat.mtimeMs}\n`);
    }
  } catch {
    hash.update("unavailable");
  }
  return hash.digest("hex");
}

function analyzerSetKey(workspaceRoot: string): string | null {
  try {
    const sourceSet = fingerprintMaintenanceSourceSet(
      workspaceRoot,
      readProjectKibiConfig(workspaceRoot),
    );
    return createHash("sha256")
      .update(
        JSON.stringify({
          version: SOURCE_ANALYSIS_CACHE_VERSION,
          sourceSet,
          builtin: builtinBuildStamp(),
        }),
      )
      .digest("hex");
  } catch {
    // An analyzer set Kibi cannot fingerprint is never cached.
    return null;
  }
}

function readCacheFile(cachePath: string, analyzers: string): CacheFile {
  const empty: CacheFile = {
    version: SOURCE_ANALYSIS_CACHE_VERSION,
    analyzers,
    entries: {},
  };
  if (!existsSync(cachePath)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(cachePath, "utf8")) as CacheFile;
    if (
      parsed?.version !== SOURCE_ANALYSIS_CACHE_VERSION ||
      parsed.analyzers !== analyzers ||
      parsed.entries === null ||
      typeof parsed.entries !== "object"
    ) {
      return empty;
    }
    return parsed;
  } catch {
    return empty;
  }
}

/**
 * The cache in `storeDir`, or null when the analyzer set cannot be
 * fingerprinted or the store does not exist. Only complete (`ok`) analyses
 * are kept; anything else is computed again.
 */
// implements REQ-cli-check
export function openSourceAnalysisCache(
  storeDir: string,
  workspaceRoot: string,
): SourceAnalysisCache | null {
  if (!existsSync(storeDir)) return null;
  const analyzers = analyzerSetKey(workspaceRoot);
  if (analyzers === null) return null;
  const cachePath = path.join(storeDir, SOURCE_ANALYSIS_CACHE_FILE);
  const stored = readCacheFile(cachePath, analyzers);
  const used: Record<string, HostSourceAnalysisResultV2> = {};
  let changed = false;
  return {
    get(file, content) {
      const key = entryKey(file, content);
      const entry = stored.entries[key];
      if (entry === undefined || entry.status !== "ok") return undefined;
      used[key] = entry;
      return entry;
    },
    set(file, content, analysis) {
      if (analysis.status !== "ok") return;
      used[entryKey(file, content)] = analysis;
      changed = true;
    },
    save() {
      const kept = Object.keys(used).length;
      if (!changed && kept === Object.keys(stored.entries).length) return;
      const temporary = `${cachePath}.${process.pid}.tmp`;
      try {
        writeFileSync(
          temporary,
          JSON.stringify({
            version: SOURCE_ANALYSIS_CACHE_VERSION,
            analyzers,
            entries: used,
          } satisfies CacheFile),
        );
        renameSync(temporary, cachePath);
      } catch {
        // The cache is an optimization; a failed write only costs a reparse.
        rmSync(temporary, { force: true });
      }
    },
  };
}
