/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk
*/

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { load as parseYAML } from "js-yaml";
import { hashManifestWithCoordinates } from "../commands/sync/cache.js";
import { KB_PATHS, isSymbolsManifestPath } from "./kb-paths.js";

/** Stale-reason codes that compare file times only. */
export const MTIME_SOURCE_REASON_CODES: ReadonlySet<string> = new Set([
  "indexed_source_newer",
  "knowledge_source_newer",
  "documentation_source_newer",
]);

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
  private readonly coordinateHashes: Map<unknown, Set<string>>;
  private readonly manifestState = new Map<string, ManifestState>();

  constructor(
    private readonly workspaceRoot: string,
    storePath: string,
  ) {
    let cache: Record<string, unknown> | null = null;
    try {
      cache = record(
        JSON.parse(
          readFileSync(path.join(storePath, "sync-cache.json")).toString(),
        ),
      );
    } catch {
      // No readable cache: no recorded hashes.
    }
    const hashes = record(cache?.hashes) ?? {};
    this.hashes = Object.fromEntries(
      Object.entries(hashes).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    this.coordinateHashes = this.readCoordinates();
  }

  private fileHash(relative: string): string | null {
    try {
      return sha256(readFileSync(path.resolve(this.workspaceRoot, relative)));
    } catch {
      return null;
    }
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
    const cached = this.hashes[key];
    if (cached !== undefined) return cached === current;
    // A recorded file always has at least one hash.
    const coordinate = this.coordinateHashes.get(key);
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
 * Drop mtime-only stale reasons whose file content provably matches what the
 * store compiled. Reasons without such evidence are kept.
 */
export function confirmSourceNewerReasons(
  workspaceRoot: string,
  storePath: string,
  reasons: readonly Reason[],
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
    evidence ??= new CompiledContentEvidence(workspaceRoot, storePath);
    if (evidence.unchanged(reason.path)) dropped.push(reason);
    else kept.push(reason);
  }
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
