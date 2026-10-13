/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk
*/

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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
  private coordinateHashes: Map<string, Set<string>> | null = null;
  private manifestState = new Map<
    string,
    { matches: boolean; sources: Set<string> }
  >();

  constructor(
    private readonly workspaceRoot: string,
    storePath: string,
  ) {
    const cache = record(readJson(path.join(storePath, "sync-cache.json")));
    const hashes = record(cache?.hashes) ?? {};
    this.hashes = Object.fromEntries(
      Object.entries(hashes).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  }

  private fileHash(relative: string): string | null {
    try {
      return sha256(readFileSync(path.resolve(this.workspaceRoot, relative)));
    } catch {
      return null;
    }
  }

  private manifest(key: string): { matches: boolean; sources: Set<string> } {
    const cached = this.manifestState.get(key);
    if (cached) return cached;
    const absolute = path.resolve(this.workspaceRoot, key);
    let state = { matches: false, sources: new Set<string>() };
    try {
      const matches =
        hashManifestWithCoordinates(
          this.workspaceRoot,
          absolute,
          path.join(path.dirname(absolute), "symbol-coordinates.yaml"),
        ) === this.hashes[key];
      const parsed = record(parseYAML(readFileSync(absolute, "utf8")));
      const sources = new Set<string>();
      for (const symbol of Array.isArray(parsed?.symbols)
        ? parsed.symbols
        : []) {
        const row = record(symbol);
        const source = row?.sourceFile ?? row?.source;
        if (typeof source === "string" && source.length > 0)
          sources.add(source.replaceAll("\\", "/"));
      }
      state = { matches, sources };
    } catch {
      // An unreadable manifest proves nothing; keep the reason.
    }
    this.manifestState.set(key, state);
    return state;
  }

  private coordinates(): Map<string, Set<string>> {
    if (this.coordinateHashes) return this.coordinateHashes;
    const byFile = new Map<string, Set<string>>();
    // The coordinate artifact is content evidence in its own right: kb_upsert
    // and sync record each symbol's source hash there. Consult the canonical
    // artifact even when its manifest was never hashed (an untracked,
    // upsert-only `.kb/symbols.yaml` that sync could not see).
    const artifacts = new Set<string>([
      path.resolve(this.workspaceRoot, KB_PATHS.symbolCoordinates),
    ]);
    for (const key of Object.keys(this.hashes)) {
      if (!isSymbolsManifestPath(key) || !key.endsWith("symbols.yaml"))
        continue;
      artifacts.add(
        path.resolve(
          this.workspaceRoot,
          path.dirname(key),
          "symbol-coordinates.yaml",
        ),
      );
    }
    for (const artifact of artifacts) {
      if (!existsSync(artifact)) continue;
      try {
        const parsed = record(parseYAML(readFileSync(artifact, "utf8")));
        for (const value of Object.values(record(parsed?.coordinates) ?? {})) {
          const row = record(value);
          if (
            typeof row?.sourceFile !== "string" ||
            typeof row.sourceHash !== "string"
          )
            continue;
          const hashes = byFile.get(row.sourceFile) ?? new Set<string>();
          hashes.add(row.sourceHash);
          byFile.set(row.sourceFile, hashes);
        }
      } catch {
        // A malformed artifact proves nothing.
      }
    }
    this.coordinateHashes = byFile;
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
    const coordinate = this.coordinates().get(key);
    if (coordinate !== undefined && coordinate.size > 0)
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
// implements REQ-cli-status-pre-first-sync
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
      typeof reason.code !== "string" ||
      !MTIME_SOURCE_REASON_CODES.has(reason.code) ||
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
// implements REQ-cli-status-pre-first-sync
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
