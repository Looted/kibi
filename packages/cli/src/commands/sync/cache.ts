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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";

export type SyncCache = {
  version: number;
  hashes: Record<string, string>;
  seenAt: Record<string, string>;
};

export const SYNC_CACHE_VERSION = 1;
export const SYNC_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function toCacheKey(filePath: string): string {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

export function hashFile(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export function readSyncCache(cachePath: string): SyncCache {
  if (!existsSync(cachePath)) {
    return {
      version: SYNC_CACHE_VERSION,
      hashes: {},
      seenAt: {},
    };
  }

  try {
    const parsed = JSON.parse(
      readFileSync(cachePath, "utf8"),
    ) as Partial<SyncCache>;
    if (parsed.version !== SYNC_CACHE_VERSION) {
      return {
        version: SYNC_CACHE_VERSION,
        hashes: {},
        seenAt: {},
      };
    }

    return {
      version: SYNC_CACHE_VERSION,
      hashes: parsed.hashes ?? {},
      seenAt: parsed.seenAt ?? {},
    };
  } catch {
    return {
      version: SYNC_CACHE_VERSION,
      hashes: {},
      seenAt: {},
    };
  }
}

export function writeSyncCache(cachePath: string, cache: SyncCache): void {
  const cacheDir = path.dirname(cachePath);
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  writeFileSync(
    cachePath,
    `${JSON.stringify(cache, null, 2)}
`,
    "utf8",
  );
}

export function copySyncCache(livePath: string, stagingPath: string): void {
  const liveCachePath = path.join(livePath, "sync-cache.json");
  const stagingCachePath = path.join(stagingPath, "sync-cache.json");

  if (existsSync(liveCachePath)) {
    const cacheContent = readFileSync(liveCachePath, "utf8");
    writeFileSync(stagingCachePath, cacheContent, "utf8");
  }
}
