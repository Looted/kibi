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
import { load as parseYAML } from "js-yaml";

interface SyncCacheDeps {
  createHash: typeof createHash;
  existsSync: typeof existsSync;
  mkdirSync: typeof mkdirSync;
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
}

function resolveDeps(overrides?: Partial<SyncCacheDeps>): SyncCacheDeps {
  return {
    createHash,
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    ...overrides,
  };
}

export type SyncCache = {
  version: number;
  hashes: Record<string, string>;
  /** Content hashes for relationship shards; optional for v1 caches. */
  relationshipHashes?: Record<string, string>;
  /** Normalized entity payload hashes, keyed by canonical entity ID. */
  entityHashes?: Record<string, string>;
  /** Entity IDs last compiled from each normalized source path. */
  sourceEntityIds?: Record<string, string[]>;
  /** Normalized relationship keys last compiled from each shard. */
  shardRelationships?: Record<string, string[]>;
  seenAt: Record<string, string>;
  semanticHashes: Record<string, string>;
  semanticContracts: Record<string, boolean>;
};

/**
 * v2: cache identities are workspace-root relative instead of process-cwd
 * relative, and symbol manifests are fingerprinted together with their
 * generated coordinate artifact so artifact-only changes are never mistaken
 * for no-ops.
 */
export const SYNC_CACHE_VERSION = 2;
export const SYNC_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function toCacheKey(workspaceRoot: string, filePath: string): string {
  const root = path.resolve(workspaceRoot);
  const target = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(root, filePath);
  return path.relative(root, target).split(path.sep).join("/");
}

export function hashFile(
  // implements REQ-003
  workspaceRoot: string,
  filePath: string,
  deps?: Partial<SyncCacheDeps>,
): string {
  const resolved = resolveDeps(deps);
  const content = resolved.readFileSync(filePath);
  return resolved.createHash("sha256").update(content).digest("hex");
}

/** Deterministically hash a JSON-compatible compiler payload. */
export function hashNormalized(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input !== null && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, normalize(child)]),
      );
    }
    return input;
  };
  return createHash("sha256")
    .update(JSON.stringify(normalize(value)))
    .digest("hex");
}

/**
 * Composite fingerprint for a symbol manifest and its generated coordinate
 * artifact. The artifact is a compiler dependency of the manifest, so its
 * existence, emptiness, content, and deletion must all change the effective
 * source hash even though the authored YAML bytes stay identical.
 */
// implements REQ-generated-coordinate-persistence
export function hashManifestWithCoordinates(
  workspaceRoot: string,
  manifestPath: string,
  coordinatesPath: string | null,
  deps?: Partial<SyncCacheDeps>,
): string {
  const resolved = resolveDeps(deps);
  const manifestContent = resolved.readFileSync(manifestPath);
  const manifestHash = resolved
    .createHash("sha256")
    .update(manifestContent)
    .digest("hex");
  let artifactState = "missing";
  let artifactHash = "";
  if (coordinatesPath !== null && resolved.existsSync(coordinatesPath)) {
    const content = resolved.readFileSync(coordinatesPath);
    artifactState = content.length > 0 ? "present" : "empty";
    artifactHash = resolved.createHash("sha256").update(content).digest("hex");
  }
  const referencedSources: Array<{
    path: string;
    state: "missing" | "outside-workspace" | "unreadable" | "present";
    sha256?: string;
  }> = [];
  let symbols: unknown[] = [];
  try {
    const parsed = parseYAML(manifestContent.toString()) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Array.isArray((parsed as { symbols?: unknown }).symbols)
    ) {
      symbols = (parsed as { symbols: unknown[] }).symbols;
    }
  } catch {
    // Extraction owns the user-facing YAML diagnostic. Fingerprinting must
    // still complete so malformed manifests cannot look cache-current.
  }
  const sourcePaths = new Set<string>();
  for (const value of symbols) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const symbol = value as { sourceFile?: unknown; source?: unknown };
    const sourceFile =
      typeof symbol.sourceFile === "string"
        ? symbol.sourceFile
        : typeof symbol.source === "string"
          ? symbol.source
          : undefined;
    if (sourceFile !== undefined && sourceFile.length > 0) {
      sourcePaths.add(sourceFile);
    }
  }
  const root = path.resolve(workspaceRoot);
  for (const sourceFile of [...sourcePaths].sort()) {
    try {
      const absolute = path.isAbsolute(sourceFile)
        ? path.resolve(sourceFile)
        : path.resolve(root, sourceFile);
      const relative = path.relative(root, absolute);
      if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
        referencedSources.push({
          path: sourceFile,
          state: "outside-workspace",
        });
      } else if (!resolved.existsSync(absolute)) {
        referencedSources.push({ path: sourceFile, state: "missing" });
      } else {
        try {
          referencedSources.push({
            path: sourceFile,
            state: "present",
            sha256: resolved
              .createHash("sha256")
              .update(resolved.readFileSync(absolute))
              .digest("hex"),
          });
        } catch {
          referencedSources.push({ path: sourceFile, state: "unreadable" });
        }
      }
    } catch {
      referencedSources.push({ path: sourceFile, state: "unreadable" });
    }
  }
  return resolved
    .createHash("sha256")
    .update(
      JSON.stringify({
        manifest: manifestHash,
        coordinates: { state: artifactState, sha256: artifactHash },
        referencedSources,
      }),
    )
    .digest("hex");
}

export function readSyncCache(
  // implements REQ-003
  cachePath: string,
  deps?: Partial<SyncCacheDeps>,
): SyncCache {
  const resolved = resolveDeps(deps);
  if (!resolved.existsSync(cachePath)) {
    return {
      version: SYNC_CACHE_VERSION,
      hashes: {},
      seenAt: {},
      semanticHashes: {},
      semanticContracts: {},
    };
  }

  try {
    const parsed = JSON.parse(
      resolved.readFileSync(cachePath, "utf8"),
    ) as Partial<SyncCache>;
    if (parsed.version !== SYNC_CACHE_VERSION) {
      return {
        version: SYNC_CACHE_VERSION,
        hashes: {},
        seenAt: {},
        semanticHashes: {},
        semanticContracts: {},
      };
    }

    const cache: SyncCache = {
      version: SYNC_CACHE_VERSION,
      hashes: parsed.hashes ?? {},
      seenAt: parsed.seenAt ?? {},
      semanticHashes: parsed.semanticHashes ?? {},
      semanticContracts: parsed.semanticContracts ?? {},
    };
    if (parsed.relationshipHashes !== undefined) {
      cache.relationshipHashes = parsed.relationshipHashes;
    }
    if (parsed.entityHashes !== undefined) {
      cache.entityHashes = parsed.entityHashes;
    }
    if (parsed.sourceEntityIds !== undefined) {
      cache.sourceEntityIds = parsed.sourceEntityIds;
    }
    if (parsed.shardRelationships !== undefined) {
      cache.shardRelationships = parsed.shardRelationships;
    }
    return cache;
  } catch {
    return {
      version: SYNC_CACHE_VERSION,
      hashes: {},
      seenAt: {},
      semanticHashes: {},
      semanticContracts: {},
    };
  }
}

export function writeSyncCache(
  // implements REQ-003
  cachePath: string,
  cache: SyncCache,
  deps?: Partial<SyncCacheDeps>,
): void {
  const resolved = resolveDeps(deps);
  const cacheDir = path.dirname(cachePath);
  if (!resolved.existsSync(cacheDir)) {
    resolved.mkdirSync(cacheDir, { recursive: true });
  }

  resolved.writeFileSync(
    cachePath,
    `${JSON.stringify(cache, null, 2)}
`,
    "utf8",
  );
}

export function copySyncCache(
  // implements REQ-003
  livePath: string,
  stagingPath: string,
  deps?: Partial<SyncCacheDeps>,
): void {
  const resolved = resolveDeps(deps);
  const liveCachePath = path.join(livePath, "sync-cache.json");
  const stagingCachePath = path.join(stagingPath, "sync-cache.json");

  if (resolved.existsSync(liveCachePath)) {
    const cacheContent = resolved.readFileSync(liveCachePath, "utf8");
    resolved.writeFileSync(stagingCachePath, cacheContent, "utf8");
  }
}
