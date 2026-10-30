import { createHash } from "node:crypto";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runtimeDirectory } from "./engine.js";

/**
 * Entity tokens kept between searches. Every kb_search ranks nearly the whole
 * KB, and each CLI call is a new process, so tokenizing every candidate again
 * was most of a warm search. Each entry is keyed by entity and carries a hash
 * of the text it was computed from, so an edited entity or body is
 * tokenized again; the file also names the tokenizer it was built with, so a
 * changed tokenizer starts an empty cache.
 */
// implements REQ-kibi-intent-aware-source-discovery

export type CachedEntityTokens = Readonly<{
  title: readonly string[];
  metadata: readonly string[];
  bodyTokens: readonly string[];
  document: readonly string[];
}>;

type Entry = CachedEntityTokens & { readonly hash: string };

type CacheFile = Readonly<{
  version: 1;
  tokenizer: string;
  entries: Record<string, Entry>;
}>;

/** Entries a cache file keeps; enough for a few branches of a large KB. */
const MAX_ENTRIES = 50_000;

/** Set to 0 to tokenize every search from scratch. */
export const KIBI_SEARCH_TOKEN_CACHE_ENV = "KIBI_SEARCH_TOKEN_CACHE";

export type SearchTokenCache = {
  get(key: string, hash: string): CachedEntityTokens | undefined;
  set(key: string, hash: string, tokens: CachedEntityTokens): void;
  save(): void;
};

/** The hash an entry is checked against: every text its tokens come from. */
export function tokenSourceHash(parts: readonly string[]): string {
  return createHash("sha1").update(JSON.stringify(parts)).digest("base64");
}

function cacheFile(workspaceRoot: string): string {
  const workspace = createHash("sha256")
    .update(path.resolve(workspaceRoot))
    .digest("hex")
    .slice(0, 24);
  return path.join(runtimeDirectory(), `search-tokens-${workspace}.json`);
}

function readCache(file: string, tokenizer: string): Map<string, Entry> {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as CacheFile;
    if (parsed.version !== 1 || parsed.tokenizer !== tokenizer)
      return new Map();
    return new Map(Object.entries(parsed.entries));
  } catch {
    return new Map();
  }
}

const NO_CACHE: SearchTokenCache = {
  get: () => undefined,
  set: () => {},
  save: () => {},
};

/**
 * The token cache for `workspaceRoot`, built by `tokenizer` (a fingerprint
 * of the tokenizing code). A cache that cannot be read starts empty and one
 * that cannot be written is skipped: the cache only saves time.
 */
export function openSearchTokenCache(
  workspaceRoot: string,
  tokenizer: string,
): SearchTokenCache {
  if (process.env[KIBI_SEARCH_TOKEN_CACHE_ENV] === "0") return NO_CACHE;
  let file: string;
  try {
    file = cacheFile(workspaceRoot);
  } catch {
    return NO_CACHE;
  }
  const entries = readCache(file, tokenizer);
  let dirty = false;
  return {
    get(key, hash) {
      const entry = entries.get(key);
      return entry !== undefined && entry.hash === hash ? entry : undefined;
    },
    set(key, hash, tokens) {
      entries.delete(key);
      entries.set(key, { hash, ...tokens });
      dirty = true;
    },
    save() {
      if (!dirty) return;
      dirty = false;
      // Map order is insertion order and set() re-inserts, so the oldest
      // entries are the ones dropped.
      const kept = [...entries].slice(-MAX_ENTRIES);
      const body: CacheFile = {
        version: 1,
        tokenizer,
        entries: Object.fromEntries(kept),
      };
      const temporary = `${file}.${process.pid}.tmp`;
      try {
        writeFileSync(temporary, JSON.stringify(body), { mode: 0o600 });
        renameSync(temporary, file);
      } catch {
        // A runtime directory that is full or read-only only costs speed.
        rmSync(temporary, { force: true });
      }
    },
  };
}
