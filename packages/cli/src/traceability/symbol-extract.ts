import { createHash } from "node:crypto";
import { Project, ScriptKind, type SourceFile } from "ts-morph";
import { extractFromManifest } from "../extractors/manifest.js";
import type { HunkRange, StagedFile } from "./git-staged.js";

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
}

export interface ManifestLookupEntry {
  id: string;
  links?: string[];
}

export type ManifestLookup = Map<string, ManifestLookupEntry>;

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
  const REQ_ID = "[A-Z][A-Z0-9\\-_]*";
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
      const { id, reqLinks: manifestLinks } = resolveSymbolId(
        stagedFile.path,
        name,
        manifestLookup,
      );
      // Merge manifest links with inline directive links (manifest links as fallback)
      const mergedReqLinks =
        reqLinks.length > 0 ? reqLinks : (manifestLinks ?? []);
      results.push({
        id,
        name,
        kind: "function",
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
      });
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
      const { id, reqLinks: manifestLinks } = resolveSymbolId(
        stagedFile.path,
        name,
        manifestLookup,
      );
      // Merge manifest links with inline directive links (manifest links as fallback)
      const mergedReqLinks =
        reqLinks.length > 0 ? reqLinks : (manifestLinks ?? []);
      results.push({
        id,
        name,
        kind: "class",
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
      });
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
      const { id, reqLinks: manifestLinks } = resolveSymbolId(
        stagedFile.path,
        name,
        manifestLookup,
      );
      // Merge manifest links with inline directive links (manifest links as fallback)
      const mergedReqLinks =
        reqLinks.length > 0 ? reqLinks : (manifestLinks ?? []);
      results.push({
        id,
        name,
        kind: "enum",
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
      });
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
        const { id, reqLinks: manifestLinks } = resolveSymbolId(
          stagedFile.path,
          name,
          manifestLookup,
        );
        // Merge manifest links with inline directive links (manifest links as fallback)
        const mergedReqLinks =
          reqLinks.length > 0 ? reqLinks : (manifestLinks ?? []);
        results.push({
          id,
          name,
          kind: "variable",
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
        });
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

function resolveSymbolId(
  filePath: string,
  name: string,
  manifestLookup?: ManifestLookup,
): { id: string; reqLinks?: string[] } {
  // First, check the provided manifest lookup if available
  if (manifestLookup) {
    // Normalize the source file path for consistent lookup
    const normalizedSource = filePath;
    const lookupKey = `${normalizedSource}:${name}`;
    const entry = manifestLookup.get(lookupKey);
    if (entry) {
      return { id: entry.id, reqLinks: entry.links };
    }
  }

  // Fallback: attempt to read manifest entries from a local symbols.yaml (best-effort)
  try {
    // Try to find a symbols.yaml in the same directory as the file
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (dir) {
      const manifestPath = `${dir}/symbols.yaml`;
      const ents = extractFromManifest(manifestPath);
      for (const e of ents) {
        if (e.entity.title === name) {
          // Extract requirement links from relationships
          const reqLinks = e.relationships
            .filter(
              (r) =>
                r.type === "implements" && r.to.match(/^[A-Z][A-Z0-9\-_]*$/),
            )
            .map((r) => r.to);
          return { id: e.entity.id, reqLinks };
        }
      }
    }
  } catch {
    // ignore - no local manifest or parse error
  }

  // Final fallback: deterministic id: sha(file:path:name)
  const h = createHash("sha256");
  h.update(`${filePath}:${name}`);
  return { id: h.digest("hex").slice(0, 16) };
}
