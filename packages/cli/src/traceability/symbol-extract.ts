import { createHash } from "node:crypto";
import { Project, ScriptKind, type SourceFile } from "ts-morph";
import { extractFromManifest } from "../extractors/manifest.js";
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
  kind: "function" | "class" | "variable" | "enum" | "unknown";
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
      const ents = extractFromManifest(manifestPath);
      for (const e of ents) {
        if (e.entity.title === name) {
          return {
            id: e.entity.id,
            relationships: filterTraceabilityRelationships(
              e.relationships.map((relationship) => ({
                type: relationship.type,
                to: relationship.to,
              })),
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
const sourceFileCache = new Map<
  string,
  { tsf: SourceFile | null; ts: number }
>();

const CACHE_TTL_MS = 30 * 1000;

const project = new Project({ skipAddingFilesFromTsConfig: true });

function computeContentSha(content: string): string {
  const h = createHash("sha256");
  h.update(content);
  return h.digest("hex");
}

function chooseScriptKind(path: string): ScriptKind {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return ScriptKind.TSX;
  if (lower.endsWith(".ts") || lower.endsWith(".mts") || lower.endsWith(".cts"))
    return ScriptKind.TS;
  if (lower.endsWith(".jsx")) return ScriptKind.JSX;
  return ScriptKind.JS;
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
  let cached = sourceFileCache.get(sha);
  if (!cached || now - cached.ts > CACHE_TTL_MS) {
    // create or recreate SourceFile in project (in-memory)
    try {
      const scriptKind = chooseScriptKind(stagedFile.path);
      const sf = project.createSourceFile(
        `${stagedFile.path}::staged`,
        content,
        {
          overwrite: true,
          scriptKind,
        },
      );
      cached = { tsf: sf, ts: now };
      sourceFileCache.set(sha, cached);
    } catch (err) {
      // on parse error, cache null to avoid retry storms briefly
      cached = { tsf: null, ts: now };
      sourceFileCache.set(sha, cached);
    }
  }

  const sf = cached.tsf;
  if (!sf) return [];

  const results: ExtractedSymbol[] = [];

  // helpers to compute line spans
  const getSpan = (startPos: number, endPos: number) => {
    const start = sf.getLineAndColumnAtPos(startPos);
    const end = sf.getLineAndColumnAtPos(endPos);
    return { startLine: start.line, endLine: end.line };
  };

  // Functions
  for (const fn of sf.getFunctions()) {
    if (!fn.isExported()) continue;
    try {
      const name = fn.getName() ?? "<anonymous>";
      const nameNode = fn.getNameNode();
      const start = nameNode ? nameNode.getStart() : fn.getStart();
      const end = fn.getEnd();
      const span = getSpan(start, end);
      const reqLinks = parseReqDirectives(
        `${fn.getFullText()}\n${fn
          .getJsDocs()
          .map((d) => d.getFullText())
          .join("\n")}`,
      );
      results.push(
        buildSymbolResult(
          stagedFile,
          name,
          "function",
          span,
          reqLinks,
          manifestLookup,
        ),
      );
    } catch {
      // skip: individual declaration extraction may fail on malformed AST nodes
    }
  }

  // Classes
  for (const cls of sf.getClasses()) {
    if (!cls.isExported()) continue;
    try {
      const name = cls.getName() ?? "<anonymous>";
      const start = cls.getNameNode()?.getStart() ?? cls.getStart();
      const end = cls.getEnd();
      const span = getSpan(start, end);
      const reqLinks = parseReqDirectives(
        `${cls.getText()}\n${cls
          .getJsDocs()
          .map((d) => d.getFullText())
          .join("\n")}`,
      );
      results.push(
        buildSymbolResult(
          stagedFile,
          name,
          "class",
          span,
          reqLinks,
          manifestLookup,
        ),
      );
    } catch {
      // skip: individual declaration extraction may fail on malformed AST nodes
    }
  }

  // Enums
  for (const en of sf.getEnums()) {
    if (!en.isExported()) continue;
    try {
      const name = en.getName() ?? "<anonymous>";
      const start = en.getNameNode()?.getStart() ?? en.getStart();
      const end = en.getEnd();
      const span = getSpan(start, end);
      const reqLinks = parseReqDirectives(en.getText());
      results.push(
        buildSymbolResult(
          stagedFile,
          name,
          "enum",
          span,
          reqLinks,
          manifestLookup,
        ),
      );
    } catch {
      // skip: individual declaration extraction may fail on malformed AST nodes
    }
  }

  // Variable statements (exported)
  for (const vs of sf.getVariableStatements()) {
    if (!vs.isExported()) continue;
    for (const decl of vs.getDeclarations()) {
      try {
        const name = decl.getName();
        const start = decl.getNameNode()?.getStart() ?? decl.getStart();
        const end = decl.getEnd();
        const span = getSpan(start, end);
        const reqLinks = parseReqDirectives(decl.getText());
        results.push(
          buildSymbolResult(
            stagedFile,
            name,
            "variable",
            span,
            reqLinks,
            manifestLookup,
          ),
        );
      } catch {
        // skip: individual declaration extraction may fail on malformed AST nodes
      }
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
