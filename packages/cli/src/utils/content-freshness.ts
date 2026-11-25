/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk
*/

import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { load as parseYAML } from "js-yaml";
import { hashManifestWithCoordinates } from "../commands/sync/cache.js";
import { KB_PATHS, isSymbolsManifestPath } from "./kb-paths.js";

/** Stale-reason codes that compare file times only. */
export const MTIME_SOURCE_REASON_CODES: ReadonlySet<string> = new Set([
  "indexed_source_newer",
  "knowledge_source_newer",
  "relationship_source_newer",
  "documentation_source_newer",
]);

/** Diagnostic and reason code for a read answered from a stale compiled store. */
export const BRANCH_STORE_STALE = "branch_store_stale";

/** Human-readable warning appended to read results answered from a stale store. */
export function staleStoreWarningNote(
  staleReasonCount: number,
  paths: readonly string[] = [],
): string {
  const uniquePaths = [...new Set(paths.filter(Boolean))].slice(0, 3);
  const more =
    staleReasonCount > uniquePaths.length && uniquePaths.length > 0
      ? ` (+${staleReasonCount - uniquePaths.length} more)`
      : "";
  const where =
    uniquePaths.length > 0 ? ` (${uniquePaths.join(", ")}${more})` : "";
  return `Note: KB store is stale (${staleReasonCount} uncompiled change${staleReasonCount === 1 ? "" : "s"}${where}). Run \`kibi sync\` before relying on these results.`;
}

type Reason = Readonly<Record<string, unknown>>;

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** A JSON object, or null; `typeof null` is "object" and returns null too. */
function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown> | null)
    : null;
}

export function stringHashMap(value: unknown): Record<string, string> {
  const rec = record(value);
  if (rec === null) return {};
  return Object.fromEntries(
    Object.entries(rec).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export function readSyncCacheRecord(
  storePath: string,
): Record<string, unknown> | null {
  try {
    return record(
      JSON.parse(readFileSync(path.join(storePath, "sync-cache.json"), "utf8")),
    );
  } catch {
    return null;
  }
}

const FRESHNESS_MEMO_FILENAME = "freshness-memo.json";
const FRESHNESS_MEMO_VERSION = 1;
const MAX_MEMO_ENTRIES = 50_000;

type MemoFileEntry = {
  mtimeMs: number;
  ctimeMs: number;
  size: number;
  ino: number;
  sha256: string;
};

type MemoStoreData = {
  version: number;
  files: Record<string, MemoFileEntry>;
};

function isValidMemoEntry(value: unknown): value is MemoFileEntry {
  const row = record(value);
  return (
    row !== null &&
    typeof row.mtimeMs === "number" &&
    Number.isFinite(row.mtimeMs) &&
    typeof row.ctimeMs === "number" &&
    Number.isFinite(row.ctimeMs) &&
    typeof row.size === "number" &&
    Number.isFinite(row.size) &&
    typeof row.ino === "number" &&
    Number.isFinite(row.ino) &&
    typeof row.sha256 === "string"
  );
}

export type FreshnessMemo = Readonly<{
  fileSha256(workspaceRoot: string, relative: string): string | null;
  save(): void;
}>;

/**
 * Persisted stat-to-content-hash memo stored in a gitignored branch store.
 * Keyed by `(mtimeMs, ctimeMs, size, ino)` with Git's racy-tick guard
 * (`max(mtimeMs, ctimeMs) < memoMtimeMs`) so a cross-process `git checkout` or
 * repeated CLI discovery avoids re-hashing unchanged files while catching
 * same-tick overwrites that preserve size or backdate mtime.
 */
export function createFreshnessMemo(storePath: string): FreshnessMemo {
  const memoPath = path.join(storePath, FRESHNESS_MEMO_FILENAME);
  let data: MemoStoreData | null = null;
  let memoMtimeMs = -1;
  let dirty = false;
  const inMemory = new Map<string, string | null>();

  const load = (): MemoStoreData => {
    if (data !== null) return data;
    const files: Record<string, MemoFileEntry> = {};
    try {
      const memoStat = statSync(memoPath);
      const parsed = record(JSON.parse(readFileSync(memoPath, "utf8")));
      if (parsed?.version === FRESHNESS_MEMO_VERSION) {
        const rawFiles = record(parsed.files) ?? {};
        for (const [key, entry] of Object.entries(rawFiles)) {
          if (isValidMemoEntry(entry)) files[key] = entry;
        }
        memoMtimeMs = memoStat.mtimeMs;
      }
    } catch {
      // Missing, unreadable, or corrupt memo starts empty.
    }
    data = { version: FRESHNESS_MEMO_VERSION, files };
    return data;
  };

  return {
    fileSha256(workspaceRoot: string, relative: string): string | null {
      const key = relative.replaceAll("\\", "/");
      if (inMemory.has(key)) return inMemory.get(key) as string | null;
      const absolute = path.resolve(workspaceRoot, key);
      let st;
      try {
        st = statSync(absolute);
      } catch {
        inMemory.set(key, null);
        return null;
      }
      if (!st.isFile()) {
        inMemory.set(key, null);
        return null;
      }
      const loaded = load();
      const cached = loaded.files[key];
      if (
        cached !== undefined &&
        memoMtimeMs >= 0 &&
        Math.max(st.mtimeMs, st.ctimeMs) < memoMtimeMs &&
        cached.mtimeMs === st.mtimeMs &&
        cached.ctimeMs === st.ctimeMs &&
        cached.size === st.size &&
        cached.ino === st.ino
      ) {
        inMemory.set(key, cached.sha256);
        return cached.sha256;
      }
      try {
        const digest = sha256(readFileSync(absolute));
        loaded.files[key] = {
          mtimeMs: st.mtimeMs,
          ctimeMs: st.ctimeMs,
          size: st.size,
          ino: st.ino,
          sha256: digest,
        };
        dirty = true;
        inMemory.set(key, digest);
        return digest;
      } catch {
        inMemory.set(key, null);
        return null;
      }
    },

    save(): void {
      if (!dirty || data === null || !existsSync(storePath)) return;
      const keys = Object.keys(data.files);
      if (keys.length > MAX_MEMO_ENTRIES) {
        const trimmed: Record<string, MemoFileEntry> = {};
        for (const key of keys.slice(keys.length - MAX_MEMO_ENTRIES)) {
          trimmed[key] = data.files[key] as MemoFileEntry;
        }
        data = { version: FRESHNESS_MEMO_VERSION, files: trimmed };
      }
      const tmp = path.join(
        storePath,
        `${FRESHNESS_MEMO_FILENAME}.${process.pid}.${Date.now()}.tmp`,
      );
      try {
        writeFileSync(tmp, JSON.stringify(data));
        renameSync(tmp, memoPath);
        memoMtimeMs = statSync(memoPath).mtimeMs;
        dirty = false;
      } catch {
        try {
          rmSync(tmp, { force: true });
        } catch {
          // Best-effort cleanup on read-only or vanished stores.
        }
      }
    },
  };
}

type ManifestState = { matches: boolean; sources: Set<string> };

/** Every source path a parsed symbols manifest references, POSIX-slashed. */
function referencedSources(parsed: unknown): Set<string> {
  const sources = new Set<string>();
  const symbols = record(parsed)?.symbols;
  if (!Array.isArray(symbols)) return sources;
  for (const symbol of symbols) {
    const row = record(symbol);
    const source = row?.sourceFile ?? row?.source;
    // An empty path is harmless: it names the workspace root, never a file.
    if (typeof source === "string") sources.add(source.replaceAll("\\", "/"));
  }
  return sources;
}

/**
 * Content evidence recorded by the last compilation: the store's sync-cache
 * source hashes, and the per-symbol `sourceHash` of the generated coordinate
 * artifact. A file whose bytes match that evidence has not changed since it
 * was compiled, however new its mtime (a fresh clone, a checkout, a touch).
 * Without either kind of evidence a reason is kept.
 */
class CompiledContentEvidence {
  private readonly hashes: Record<string, string>;
  private readonly relationshipHashes: Record<string, string>;
  private readonly memo: FreshnessMemo;
  private coordinateHashesCache: Map<unknown, Set<string>> | null = null;
  private readonly manifestState = new Map<string, ManifestState>();

  constructor(
    private readonly workspaceRoot: string,
    storePath: string,
    syncCache?: Record<string, unknown> | null,
  ) {
    const cache =
      syncCache === undefined ? readSyncCacheRecord(storePath) : syncCache;
    this.hashes = stringHashMap(cache?.hashes);
    this.relationshipHashes = stringHashMap(cache?.relationshipHashes);
    this.memo = createFreshnessMemo(storePath);
  }

  private getCoordinateHashes(): Map<unknown, Set<string>> {
    this.coordinateHashesCache ??= this.readCoordinates();
    return this.coordinateHashesCache;
  }

  private fileHash(relative: string): string | null {
    return this.memo.fileSha256(this.workspaceRoot, relative);
  }

  saveMemo(): void {
    this.memo.save();
  }

  private manifest(key: string): ManifestState {
    // rationale: memoization only; reading the manifest again gives the same
    // answer, just more slowly.
    // Stryker disable next-line ConditionalExpression
    if (!this.manifestState.has(key))
      this.manifestState.set(key, this.readManifest(key));
    return this.manifestState.get(key) as ManifestState;
  }

  private readManifest(key: string): ManifestState {
    const absolute = path.resolve(this.workspaceRoot, key);
    try {
      return {
        matches:
          hashManifestWithCoordinates(
            this.workspaceRoot,
            absolute,
            path.join(path.dirname(absolute), "symbol-coordinates.yaml"),
          ) === this.hashes[key],
        sources: referencedSources(
          parseYAML(readFileSync(absolute).toString()),
        ),
      };
    } catch {
      // An unreadable manifest proves nothing; keep the reason.
      return { matches: false, sources: new Set() };
    }
  }

  /**
   * The coordinate artifact is content evidence in its own right: kb_upsert
   * and sync record each symbol's source hash there. Consult the canonical
   * artifact even when its manifest was never hashed (an untracked,
   * upsert-only `.kb/symbols.yaml` that sync could not see). It is the only
   * symbols manifest's artifact: isSymbolsManifestPath names that one file.
   */
  private readCoordinates(): Map<unknown, Set<string>> {
    // Keyed by the recorded sourceFile as is: a non-string one never equals
    // the string path it is looked up by.
    const byFile = new Map<unknown, Set<string>>();
    try {
      // An empty artifact parses to undefined, and reading its coordinates
      // throws into the catch below.
      const parsed = parseYAML(
        readFileSync(
          path.resolve(this.workspaceRoot, KB_PATHS.symbolCoordinates),
        ).toString(),
      ) as { coordinates?: unknown };
      for (const value of Object.values(record(parsed.coordinates) ?? {})) {
        const row = record(value);
        if (typeof row?.sourceHash !== "string") continue;
        const hashes = byFile.get(row.sourceFile) ?? new Set<string>();
        hashes.add(row.sourceHash);
        byFile.set(row.sourceFile, hashes);
      }
    } catch {
      // A missing or malformed artifact proves nothing.
    }
    return byFile;
  }

  /** True only when recorded evidence proves the file's bytes are unchanged. */
  unchanged(relative: string): boolean {
    const key = relative.replaceAll("\\", "/");
    if (isSymbolsManifestPath(key) && this.hashes[key] !== undefined)
      return this.manifest(key).matches;
    const current = this.fileHash(key);
    if (current === null) return false;
    const cached = this.hashes[key] ?? this.relationshipHashes[key];
    if (cached !== undefined) return cached === current;
    // A recorded file always has at least one hash.
    const coordinate = this.getCoordinateHashes().get(key);
    if (coordinate !== undefined)
      return [...coordinate].every((hash) => hash === current);
    // A code file that is only referenced from a symbol manifest is covered
    // by that manifest's composite hash, which includes every referenced
    // source's bytes.
    return Object.keys(this.hashes).some((manifestKey) => {
      if (!isSymbolsManifestPath(manifestKey)) return false;
      const manifest = this.manifest(manifestKey);
      return manifest.sources.has(key) && manifest.matches;
    });
  }
}

/**
 * Detect cached relationship shards that were deleted from disk after the
 * store compiled. Prolog `kb_indexed_sources` already tracks missing entity
 * and manifest files, whereas relationship shards do not emit indexed sources.
 */
export function missingCachedKbSourceReasons(
  workspaceRoot: string,
  storePath: string,
  existingPaths: ReadonlySet<string> = new Set(),
  syncCache?: Record<string, unknown> | null,
): Reason[] {
  const cache =
    syncCache === undefined ? readSyncCacheRecord(storePath) : syncCache;
  if (cache === null) return [];
  const relationshipHashes = stringHashMap(cache.relationshipHashes);
  const reasons: Reason[] = [];

  for (const key of Object.keys(relationshipHashes)) {
    const posix = key.replaceAll("\\", "/");
    if (existingPaths.has(posix)) continue;
    if (existsSync(path.resolve(workspaceRoot, posix))) continue;
    reasons.push({
      code: "relationship_source_missing",
      path: posix,
      entityIds: [],
    });
  }

  return reasons.sort((a, b) =>
    String(a.path).localeCompare(String(b.path)),
  );
}

/**
 * Drop mtime-only stale reasons whose file content provably matches what the
 * store compiled. Reasons without such evidence are kept.
 */
export function confirmSourceNewerReasons(
  workspaceRoot: string,
  storePath: string,
  reasons: readonly Reason[],
  syncCache?: Record<string, unknown> | null,
): { kept: Reason[]; dropped: Reason[] } {
  const kept: Reason[] = [];
  const dropped: Reason[] = [];
  let evidence: CompiledContentEvidence | null = null;
  for (const reason of reasons) {
    if (
      !MTIME_SOURCE_REASON_CODES.has(reason.code as string) ||
      typeof reason.path !== "string"
    ) {
      kept.push(reason);
      continue;
    }
    evidence ??= new CompiledContentEvidence(
      workspaceRoot,
      storePath,
      syncCache,
    );
    if (evidence.unchanged(reason.path)) dropped.push(reason);
    else kept.push(reason);
  }
  evidence?.saveMemo();
  return { kept, dropped };
}

/**
 * The `meta` freshness block reporting operations return (kb_graph,
 * kb_find_gaps, kb_coverage) comes straight from Prolog, which compares file
 * times only. Apply the same content confirmation kb_status does, so a
 * checkout or `touch` that changed no byte is not reported as stale.
 */
export function confirmMetaFreshness<
  T extends { readonly meta?: Readonly<Record<string, unknown>> },
>(payload: T, workspaceRoot: string): T {
  const meta = payload.meta;
  if (
    meta === undefined ||
    typeof meta.kbPath !== "string" ||
    !Array.isArray(meta.staleReasons)
  )
    return payload;
  const reasons = (meta.staleReasons as unknown[]).filter(
    (reason): reason is Reason => record(reason) !== null,
  );
  const { kept, dropped } = confirmSourceNewerReasons(
    workspaceRoot,
    meta.kbPath,
    reasons,
  );
  if (dropped.length === 0) return payload;
  const allConfirmed =
    kept.length === 0 &&
    meta.staleReasonsTruncated !== true &&
    meta.syncState === "stale";
  return {
    ...payload,
    meta: {
      ...meta,
      staleReasons: kept,
      // A truncated list counts more reasons than it carries.
      staleReasonCount: Math.max(
        kept.length,
        (typeof meta.staleReasonCount === "number"
          ? meta.staleReasonCount
          : reasons.length) - dropped.length,
      ),
      ...(allConfirmed ? { syncState: "fresh", dirty: false } : {}),
    },
  };
}
