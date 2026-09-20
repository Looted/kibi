import { createHash } from "node:crypto";
import {
  createBuiltinTsMorphSymbolExtractor,
  isPrivateClassMember,
} from "kibi-plugin-builtin";
import type { SourceAnalysisResult } from "kibi-plugin-sdk";
import { readManifestWithCoordinateOverlay } from "../extractors/manifest.js";
import {
  type SymbolKind,
  type SymbolRole,
  inferSymbolRole,
} from "../public/symbol-granularity.js";
import type { HunkRange, StagedFile } from "./git-staged.js";

type TraceabilityRelationship = { type: string; to: string };
const TRACEABILITY_RELATIONSHIP_TYPES = new Set([
  "implements",
  "covered_by",
  "executable_for",
]);
const REQUIREMENT_ID_PATTERN = /^[A-Za-z][A-Za-z0-9\-_]*$/;
const LOCAL_MANIFEST_NAMES = ["symbols.yaml", "symbols.yml"];
const MANIFEST_SENTINEL_PREFIX = "__manifest__:";

export interface ExtractedSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
  role: SymbolRole;
  location: {
    file: string;
    startLine: number;
    endLine: number;
  };
  hunkRanges: HunkRange[]; // intersecting hunks from staged file
  reqLinks: string[]; // requirement IDs from directive comments
  relationships?: TraceabilityRelationship[];
}

export interface ManifestLookupEntry {
  id: string;
  relationships?: TraceabilityRelationship[];
}

export type ManifestLookup = Map<string, ManifestLookupEntry>;

export function createManifestLookupSentinelKey(manifestPath: string): string {
  // implements REQ-008
  return `${MANIFEST_SENTINEL_PREFIX}${manifestPath}`;
}

function getCandidateManifestPaths(filePath: string): string[] {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  if (!dir) {
    return [];
  }

  return LOCAL_MANIFEST_NAMES.map((manifestName) => `${dir}/${manifestName}`);
}

function createHashFallbackId(filePath: string, name: string): string {
  const h = createHash("sha256");
  h.update(`${filePath}:${name}`);
  return h.digest("hex").slice(0, 16);
}

function filterTraceabilityRelationships(
  relationships: TraceabilityRelationship[] | undefined,
): TraceabilityRelationship[] {
  if (!relationships?.length) {
    return [];
  }

  return relationships.filter((relationship) =>
    TRACEABILITY_RELATIONSHIP_TYPES.has(relationship.type),
  );
}

function getRequirementLinks(
  relationships: TraceabilityRelationship[] | undefined,
): string[] {
  return filterTraceabilityRelationships(relationships)
    .filter(
      (relationship) =>
        relationship.type === "implements" &&
        REQUIREMENT_ID_PATTERN.test(relationship.to),
    )
    .map((relationship) => relationship.to);
}

function resolveSymbolTraceability(
  filePath: string,
  name: string,
  manifestLookup?: ManifestLookup,
): { id: string; relationships?: TraceabilityRelationship[] } {
  if (manifestLookup) {
    const lookupKey = `${filePath}:${name}`;
    const entry = manifestLookup.get(lookupKey);
    if (entry) {
      return {
        id: entry.id,
        relationships: filterTraceabilityRelationships(entry.relationships),
      };
    }
  }

  const candidateManifestPaths = getCandidateManifestPaths(filePath);
  if (
    manifestLookup &&
    candidateManifestPaths.some((manifestPath) =>
      manifestLookup.has(createManifestLookupSentinelKey(manifestPath)),
    )
  ) {
    return { id: createHashFallbackId(filePath, name) };
  }

  for (const manifestPath of candidateManifestPaths) {
    try {
      const records = readManifestWithCoordinateOverlay(manifestPath);
      for (const record of records) {
        if (record.title === name && typeof record.id === "string") {
          return {
            id: record.id,
            relationships: filterTraceabilityRelationships(
              extractRelationshipsFromManifestRecord(record),
            ),
          };
        }
      }
    } catch {
      // ignore - no local manifest or parse error
    }
  }

  return { id: createHashFallbackId(filePath, name) };
}

function extractRelationshipsFromManifestRecord(record: {
  links?: Array<string | { type?: unknown; target?: unknown }>;
  relationships?: Array<{ type?: unknown; target?: unknown }>;
}): TraceabilityRelationship[] {
  const relationships: TraceabilityRelationship[] = [];

  if (Array.isArray(record.links)) {
    for (const link of record.links) {
      if (typeof link === "string") {
        relationships.push({ type: "implements", to: link });
        continue;
      }

      if (
        link &&
        typeof link === "object" &&
        typeof link.type === "string" &&
        typeof link.target === "string"
      ) {
        relationships.push({ type: link.type, to: link.target });
      }
    }
  }

  if (Array.isArray(record.relationships)) {
    for (const relationship of record.relationships) {
      if (
        relationship &&
        typeof relationship.type === "string" &&
        typeof relationship.target === "string"
      ) {
        relationships.push({
          type: relationship.type,
          to: relationship.target,
        });
      }
    }
  }

  return relationships;
}

function buildSymbolResult(
  stagedFile: StagedFile,
  name: string,
  kind: ExtractedSymbol["kind"],
  span: { startLine: number; endLine: number },
  inlineReqLinks: string[],
  manifestLookup?: ManifestLookup,
): ExtractedSymbol {
  const { id, relationships } = resolveSymbolTraceability(
    stagedFile.path,
    name,
    manifestLookup,
  );
  const manifestReqLinks = getRequirementLinks(relationships);
  const mergedReqLinks =
    inlineReqLinks.length > 0 ? inlineReqLinks : manifestReqLinks;

  return {
    id,
    name,
    kind,
    role: inferSymbolRole(kind),
    location: {
      file: stagedFile.path,
      startLine: span.startLine,
      endLine: span.endLine,
    },
    hunkRanges: intersectingHunks(
      span.startLine,
      span.endLine,
      stagedFile.hunkRanges,
    ),
    reqLinks: mergedReqLinks,
    ...(relationships !== undefined ? { relationships } : {}),
  };
}

// Simple in-memory cache keyed by blob sha with 30s TTL
const analysisCache = new Map<
  string,
  { result: SourceAnalysisResult | null; ts: number }
>();

const CACHE_TTL_MS = 30 * 1000;

const extractor = createBuiltinTsMorphSymbolExtractor();

function computeContentSha(content: string): string {
  const h = createHash("sha256");
  h.update(content);
  return h.digest("hex");
}

function parseReqDirectives(text: string): string[] {
  // look for lines containing implements REQ-123 or implements: REQ-1, REQ-2
  // Stop at end-of-line and only accept IDs starting with an uppercase letter
  // to avoid capturing tokens like `export`, `function`, etc.
  const REQ_ID = "[A-Za-z][A-Za-z0-9\\-_]*";
  const regex = new RegExp(
    `implements\\s*:?\\s*(${REQ_ID}(?:\\s*,\\s*${REQ_ID})*)\\s*$`,
    "gim",
  );
  const reqs = new Set<string>();
  let m: RegExpExecArray | null;
  while (true) {
    m = regex.exec(text);
    if (!m) break;
    const list = m[1];
    if (!list) continue;

    for (const part of list.split(/[,\s]+/)) {
      const p = part.trim();
      if (!p) continue;
      reqs.add(p);
    }
  }
  return Array.from(reqs);
}

function rangesIntersect(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function extractSymbolsFromStagedFile(
  // implements REQ-008
  stagedFile: StagedFile,
  manifestLookup?: ManifestLookup,
): ExtractedSymbol[] {
  const content = stagedFile.content ?? "";
  const sha = computeContentSha(`${content}|${stagedFile.path}`);

  // TTL cache lookup
  const now = Date.now();
  let cached = analysisCache.get(sha);
  if (!cached || now - cached.ts > CACHE_TTL_MS) {
    try {
      if (!extractor.supports({ path: stagedFile.path })) {
        cached = { result: null, ts: now };
      } else {
        cached = {
          result: extractor.analyze({
            // Preserve the real path so script-kind / language inference stay correct.
            path: stagedFile.path,
            content,
          }),
          ts: now,
        };
      }
      analysisCache.set(sha, cached);
    } catch {
      // on parse error, cache null to avoid retry storms briefly
      cached = { result: null, ts: now };
      analysisCache.set(sha, cached);
    }
  }

  const analysis = cached.result;
  if (!analysis) return [];

  const results: ExtractedSymbol[] = [];

  for (const symbol of analysis.symbols) {
    try {
      results.push(
        buildSymbolResult(
          stagedFile,
          symbol.name,
          symbol.kind as ExtractedSymbol["kind"],
          { startLine: symbol.startLine, endLine: symbol.endLine },
          parseReqDirectives(symbol.directiveText ?? ""),
          manifestLookup,
        ),
      );
    } catch {
      void stagedFile.path;
    }
  }

  // Filter to only include symbols that intersect with at least one hunk
  // (unless it's a new file or rename, in which case we include all)
  const shouldFilterByHunks =
    stagedFile.status === "M" && stagedFile.hunkRanges.length > 0;

  if (shouldFilterByHunks) {
    return results.filter((r) => r.hunkRanges.length > 0);
  }

  return results;
}

export { isPrivateClassMember };

function intersectingHunks(
  startLine: number,
  endLine: number,
  hunks: HunkRange[],
): HunkRange[] {
  const out: HunkRange[] = [];
  for (const h of hunks) {
    if (rangesIntersect(startLine, endLine, h.start, h.end)) out.push(h);
  }
  return out;
}
