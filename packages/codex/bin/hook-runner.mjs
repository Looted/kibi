#!/usr/bin/env node

// src/hook-runner.ts
import path10 from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ../agent-core/dist/decision-guard.js
import { createHash as createHash3 } from "node:crypto";
import fs4 from "node:fs";
import path4 from "node:path";

// ../agent-core/dist/requirement-candidates.js
import fs from "node:fs";
import path from "node:path";
var REQUIREMENTS_DIR = path.join(".kb", "requirements");
var HEAD_BYTES = 4096;
var MAX_SCANNED = 2000;
var MAX_REQUIREMENT_CANDIDATES = 3;
var LAYOUT_WORDS = new Set([
  "src",
  "app",
  "apps",
  "lib",
  "libs",
  "source",
  "page",
  "pages",
  "component",
  "components",
  "view",
  "views",
  "screen",
  "screens",
  "package",
  "packages",
  "main",
  "index",
  "shared",
  "common",
  "core",
  "util",
  "utils",
  "helper",
  "helpers",
  "public",
  "static",
  "asset",
  "assets",
  "web",
  "client",
  "server",
  "frontend",
  "backend",
  "module",
  "modules",
  "feature",
  "features",
  "internal",
  "service",
  "services",
  "test",
  "tests",
  "spec",
  "specs",
  "dist",
  "build",
  "html",
  "htm",
  "tsx",
  "jsx",
  "mjs",
  "cjs",
  "vue",
  "svelte",
  "css",
  "scss",
  "less",
  "json",
  "yaml",
  "yml",
  "java",
  "swift",
  "php"
]);
var FILLER_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "must",
  "should",
  "shall",
  "may",
  "can",
  "are",
  "is",
  "its",
  "their",
  "that",
  "this",
  "from",
  "into",
  "when",
  "each",
  "every",
  "all",
  "not",
  "req",
  "auto"
]);
function words(text) {
  return text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !/\d/.test(word)).map((word) => word.length > 4 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word);
}
function pathTopicWords(relativePath) {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  const last = segments.pop() ?? "";
  const stem = last.includes(".") ? last.slice(0, last.indexOf(".")) : last;
  const roles = last.includes(".") ? last.slice(last.indexOf(".") + 1) : "";
  const found = [...segments, stem, roles].flatMap(words).filter((word) => !LAYOUT_WORDS.has(word) && !FILLER_WORDS.has(word));
  return [...new Set(found)];
}
function unquote(value) {
  const trimmed = value.trim();
  return /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}
function readHead(file) {
  let head;
  try {
    const descriptor = fs.openSync(file, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs.closeSync(descriptor);
    }
  } catch {
    return;
  }
  const lines = head.split(/\r?\n/);
  if (lines[0]?.trim() !== "---")
    return;
  const fields = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === "---")
      break;
    const match = /^(id|title|status):\s*(.+)$/.exec(line);
    if (match?.[1] && match[2])
      fields[match[1]] = unquote(match[2]);
  }
  if (!fields.id || !fields.title)
    return;
  return {
    id: fields.id,
    title: fields.title,
    ...fields.status ? { status: fields.status } : {}
  };
}
var RETIRED_STATUS = /supersed|deprecat|reject|obsolete|retired|archived|removed/i;
function requestTopicWords(text, limit = 40) {
  const found = words(text).filter((word) => !FILLER_WORDS.has(word) && !REQUEST_FILLER_WORDS.has(word));
  return [...new Set(found)].slice(0, limit);
}
var REQUEST_FILLER_WORDS = new Set([
  "please",
  "could",
  "would",
  "you",
  "your",
  "our",
  "have",
  "has",
  "make",
  "sure",
  "change",
  "update",
  "add",
  "fix",
  "now",
  "need",
  "want",
  "like",
  "also",
  "just",
  "then",
  "than",
  "there",
  "here",
  "what",
  "which",
  "why",
  "how",
  "will",
  "use",
  "using",
  "new",
  "file",
  "code",
  "never",
  "always",
  "only",
  "any",
  "but",
  "they",
  "them",
  "was",
  "were",
  "been",
  "being",
  "does",
  "don",
  "doesn",
  "let",
  "get",
  "set",
  "one",
  "out",
  "about",
  "over",
  "same",
  "still",
  "too",
  "very"
]);
function rankRequirementCandidates(relativePath, requirements, limit = MAX_REQUIREMENT_CANDIDATES, requestWords = []) {
  const topic = new Set(pathTopicWords(relativePath));
  const request = new Set(requestWords.filter((word) => !topic.has(word)));
  if (topic.size === 0 && request.size === 0)
    return [];
  const scored = [];
  for (const head of requirements) {
    if (head.status !== undefined && RETIRED_STATUS.test(head.status))
      continue;
    const titleWords = words(head.title);
    const pathHits = titleWords.filter((word) => topic.has(word));
    const requestHits = titleWords.filter((word) => request.has(word));
    const shared = new Set(pathHits).size;
    const asked = new Set(requestHits).size;
    if (shared > 0 || asked >= 2) {
      scored.push({
        head,
        shared,
        asked,
        uses: pathHits.length + requestHits.length
      });
    }
  }
  scored.sort((a, b) => b.shared - a.shared || b.asked - a.asked || b.uses - a.uses || a.head.id.localeCompare(b.head.id));
  return scored.slice(0, limit).map((entry) => entry.head);
}
function requirementCandidatesForPath(workspaceRoot, relativePath, limit = MAX_REQUIREMENT_CANDIDATES, requestWords = []) {
  if (pathTopicWords(relativePath).length === 0 && requestWords.length < 2)
    return [];
  const directory = path.join(workspaceRoot, REQUIREMENTS_DIR);
  let names;
  try {
    names = fs.readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return [];
  }
  if (names.length > MAX_SCANNED)
    return [];
  const heads = names.map((name) => readHead(path.join(directory, name))).filter((head) => head !== undefined);
  return rankRequirementCandidates(relativePath, heads, limit, requestWords);
}

// ../agent-core/dist/snippets.js
import { createHash as createHash2 } from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";

// ../agent-core/dist/knowledge-index.js
import { createHash, randomUUID } from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";
var SYMBOLS_MANIFEST = ".kb/symbols.yaml";
var SYMBOL_COORDINATES = ".kb/symbol-coordinates.yaml";
var INDEX_FORMAT = "kibi-agent-core.knowledge-index.v2";
var CACHE_FILE = "knowledge-index.json";
function unquote2(raw) {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  const comment = value.search(/\s#/);
  return comment >= 0 ? value.slice(0, comment).trimEnd() : value;
}
function parseFlow(text, start = 0) {
  let pos = start;
  const skip = () => {
    while (pos < text.length) {
      const char = text[pos];
      if (char === "#") {
        while (pos < text.length && text[pos] !== `
`)
          pos += 1;
      } else if (char === " " || char === "\t" || char === `
` || char === "\r") {
        pos += 1;
      } else {
        break;
      }
    }
  };
  const scalar = (stops) => {
    const quote = text[pos];
    if (quote === '"' || quote === "'") {
      let cursor = pos + 1;
      while (cursor < text.length) {
        if (quote === '"' && text[cursor] === "\\")
          cursor += 2;
        else if (text[cursor] === quote) {
          if (quote === "'" && text[cursor + 1] === "'")
            cursor += 2;
          else
            break;
        } else
          cursor += 1;
      }
      if (cursor >= text.length)
        return;
      const raw = text.slice(pos, cursor + 1);
      pos = cursor + 1;
      return unquote2(raw);
    }
    let cursor = pos;
    while (cursor < text.length) {
      const char = text[cursor] ?? "";
      if (stops.includes(char) && char !== ":" || char === `
` || char === "\r")
        break;
      if (stops.includes(":") && char === ":" && (cursor + 1 >= text.length || /[\s,\]}]/.test(text[cursor + 1] ?? "")))
        break;
      if (char === "#" && /\s/.test(text[cursor - 1] ?? ""))
        break;
      cursor += 1;
    }
    const raw = text.slice(pos, cursor).trim();
    pos = cursor;
    return raw;
  };
  const value = () => {
    skip();
    const open = text[pos];
    if (open === "[") {
      pos += 1;
      const items = [];
      for (;; ) {
        skip();
        if (text[pos] === "]") {
          pos += 1;
          return items;
        }
        if (pos >= text.length)
          throw new SyntaxError("unterminated flow sequence");
        const item = value();
        if (item !== undefined)
          items.push(item);
        skip();
        if (text[pos] === ",")
          pos += 1;
        else if (text[pos] !== "]")
          throw new SyntaxError("expected , or ]");
      }
    }
    if (open === "{") {
      pos += 1;
      const record = {};
      for (;; ) {
        skip();
        if (text[pos] === "}") {
          pos += 1;
          return record;
        }
        if (pos >= text.length)
          throw new SyntaxError("unterminated flow mapping");
        const key = scalar(":,}");
        if (key === undefined)
          throw new SyntaxError("unterminated key");
        skip();
        let entry;
        if (text[pos] === ":") {
          pos += 1;
          skip();
          entry = text[pos] === "," || text[pos] === "}" ? undefined : value();
        }
        if (key.length > 0)
          record[key] = entry;
        skip();
        if (text[pos] === ",")
          pos += 1;
        else if (text[pos] !== "}")
          throw new SyntaxError("expected , or }");
      }
    }
    const raw = scalar(",]}");
    if (raw === undefined)
      throw new SyntaxError("unterminated scalar");
    return raw;
  };
  try {
    const parsed = value();
    return { value: parsed, end: pos };
  } catch {
    return;
  }
}
function opensFlow(raw) {
  const value = raw.trim();
  return value.startsWith("[") || value.startsWith("{");
}
var keyValue = /^([A-Za-z0-9_"'-][^:]*?):(?:\s+(.*))?$/;
function completeFlowValue(raw) {
  if (!opensFlow(raw))
    return;
  const parsed = parseFlow(raw);
  if (parsed === undefined)
    return;
  const rest = raw.slice(parsed.end).trim();
  return rest.length === 0 || rest.startsWith("#") ? parsed : undefined;
}
function parseScalarOrFlow(raw) {
  if (raw === undefined || raw.trim().length === 0)
    return;
  return completeFlowValue(raw)?.value ?? unquote2(raw);
}
function scanSymbolsManifest(text) {
  return scanRecordSequence(text, "symbols");
}
function unbalancedFlow(raw) {
  return opensFlow(raw) && parseFlow(raw) === undefined;
}
function flowRecords(text, start) {
  const parsed = parseFlow(text, start);
  if (!Array.isArray(parsed?.value))
    return;
  return parsed.value.filter((item) => item !== null && typeof item === "object" && !Array.isArray(item));
}
function scanFlowSection(text, sectionKey) {
  const escapedKey = sectionKey.replaceAll(/[.*+?^$(){}|[\]\\]/g, "\\$&");
  const header = new RegExp(`^${escapedKey}:[ \\t]*(\\[)?`);
  let offset = 0;
  let first = true;
  let afterHeader = false;
  for (const piece of text.split(/(\r?\n)/)) {
    const content = piece.trim();
    const indent = piece.length - piece.trimStart().length;
    if (content.length > 0 && !content.startsWith("#")) {
      if (afterHeader) {
        return content.startsWith("[") ? flowRecords(text, offset + piece.indexOf("[")) : undefined;
      }
      if (first && content.startsWith("[")) {
        return flowRecords(text, offset + piece.indexOf("["));
      }
      first = false;
      if (indent === 0) {
        const match = header.exec(piece);
        if (match) {
          if (match[1] !== undefined)
            return flowRecords(text, offset + piece.indexOf("["));
          afterHeader = true;
        }
      }
    }
    offset += piece.length;
  }
  return;
}
function scanRecordSequence(text, sectionKey) {
  const flowSection = scanFlowSection(text, sectionKey);
  if (flowSection !== undefined)
    return flowSection;
  const records = [];
  let itemIndent;
  let keyIndent = 0;
  let current;
  let listKey;
  let listItem;
  let section = "root";
  let pendingFlow;
  for (const rawLine of text.split(/\r?\n/)) {
    const content = rawLine.trim();
    if (content.length === 0 || content.startsWith("#"))
      continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const dash = /^(\s*)-(\s+)(.*)$/.exec(rawLine);
    if (pendingFlow !== undefined && current !== undefined) {
      const target = pendingFlow.onListItem && listItem !== undefined ? listItem : current;
      if (indent > (itemIndent ?? 0) && !(dash && indent === itemIndent)) {
        pendingFlow.text += `
${content}`;
        const parsed = parseFlow(pendingFlow.text);
        if (parsed === undefined)
          continue;
        target[pendingFlow.key] = parsed.value;
        pendingFlow = undefined;
        continue;
      }
      target[pendingFlow.key] = unquote2(pendingFlow.first);
      pendingFlow = undefined;
    }
    if (indent === 0 && !dash) {
      const pair = keyValue.exec(content);
      section = pair?.[1] !== undefined && unquote2(pair[1]) === sectionKey ? "records" : "other";
      current = undefined;
      itemIndent = undefined;
      continue;
    }
    if (section === "other")
      continue;
    if (dash && (itemIndent === undefined || indent === itemIndent)) {
      itemIndent = indent;
      keyIndent = (dash[1]?.length ?? 0) + 1 + (dash[2]?.length ?? 1);
      current = {};
      records.push(current);
      listKey = undefined;
      listItem = undefined;
      const pair = keyValue.exec(dash[3] ?? "");
      if (pair?.[1] !== undefined) {
        const key = unquote2(pair[1]);
        if (pair[2] !== undefined && unbalancedFlow(pair[2])) {
          pendingFlow = {
            key,
            first: pair[2],
            text: pair[2],
            onListItem: false
          };
          continue;
        }
        const value = parseScalarOrFlow(pair[2]);
        if (value !== undefined)
          current[key] = value;
        else
          listKey = key;
      }
      continue;
    }
    if (current === undefined || itemIndent === undefined)
      continue;
    if (indent <= itemIndent)
      continue;
    if (dash) {
      if (listKey === undefined)
        continue;
      const list = Array.isArray(current[listKey]) ? current[listKey] : [];
      current[listKey] = list;
      const item = dash[3] ?? "";
      const flowItem = completeFlowValue(item);
      const pair = flowItem === undefined ? keyValue.exec(item) : null;
      if (flowItem !== undefined) {
        listItem = undefined;
        list.push(flowItem.value);
      } else if (pair?.[1] !== undefined && pair[2] !== undefined) {
        listItem = { [unquote2(pair[1])]: parseScalarOrFlow(pair[2]) };
        list.push(listItem);
      } else {
        listItem = undefined;
        list.push(unquote2(item));
      }
      continue;
    }
    const pair = keyValue.exec(content);
    if (pair?.[1] === undefined)
      continue;
    const key = unquote2(pair[1]);
    if (indent === keyIndent) {
      listItem = undefined;
      if (pair[2] !== undefined && unbalancedFlow(pair[2])) {
        pendingFlow = {
          key,
          first: pair[2],
          text: pair[2],
          onListItem: false
        };
        listKey = undefined;
        continue;
      }
      const value = parseScalarOrFlow(pair[2]);
      if (value === undefined) {
        listKey = key;
      } else {
        current[key] = value;
        listKey = undefined;
      }
    } else if (listItem !== undefined && pair[2] !== undefined) {
      if (unbalancedFlow(pair[2])) {
        pendingFlow = { key, first: pair[2], text: pair[2], onListItem: true };
        continue;
      }
      listItem[key] = parseScalarOrFlow(pair[2]);
    }
  }
  return records;
}
function scanSymbolCoordinates(text) {
  const coordinates = {};
  let inCoordinates = false;
  let idIndent;
  let currentId;
  for (const rawLine of text.split(/\r?\n/)) {
    const content = rawLine.trim();
    if (content.length === 0 || content.startsWith("#"))
      continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const pair = keyValue.exec(content);
    if (pair?.[1] === undefined)
      continue;
    const key = unquote2(pair[1]);
    if (indent === 0) {
      inCoordinates = key === "coordinates";
      idIndent = undefined;
      currentId = undefined;
      continue;
    }
    if (!inCoordinates)
      continue;
    if (idIndent === undefined || indent === idIndent) {
      idIndent = indent;
      currentId = key;
      coordinates[currentId] ??= {};
      continue;
    }
    if (currentId === undefined || indent < idIndent)
      continue;
    const entry = coordinates[currentId] ?? {};
    if (key === "sourceFile") {
      const sourceFile = normalizeSourceFile(unquote2(pair[2] ?? ""));
      if (sourceFile.length > 0)
        entry.sourceFile = sourceFile;
      coordinates[currentId] = entry;
      continue;
    }
    const numeric = Number.parseInt(unquote2(pair[2] ?? ""), 10);
    if (!Number.isFinite(numeric))
      continue;
    if (key === "sourceLine")
      entry.line = numeric;
    if (key === "sourceEndLine")
      entry.endLine = numeric;
    coordinates[currentId] = entry;
  }
  return coordinates;
}
function toPositiveInt(value) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
function pushUnique(list, value) {
  if (!list.includes(value))
    list.push(value);
}
function normalizeSourceFile(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}
function manifestStateOf(text, recordCount) {
  if (text === undefined)
    return "missing";
  if (recordCount > 0)
    return "indexed";
  const meaningful = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#")).filter((line) => !/^symbols:\s*(\[\s*\])?$/.test(line)).filter((line) => line !== "[]").filter((line) => !/^(?:---|\.\.\.|%\S.*|version:\s*\S+)$/.test(line));
  return meaningful.length === 0 ? "empty" : "unreadable";
}
function buildKnowledgeIndex(records, coordinates = {}, options = {}, manifest = records.length > 0 ? "indexed" : "empty") {
  const files = {};
  let symbolCount = 0;
  const recordedFiles = new Set;
  const coordinateFiles = [];
  for (const entry of Object.values(coordinates)) {
    if (entry.sourceFile !== undefined)
      pushUnique(coordinateFiles, entry.sourceFile);
  }
  coordinateFiles.sort();
  for (const record of records) {
    const id = typeof record.id === "string" ? record.id : undefined;
    const sourceFile = typeof record.sourceFile === "string" ? normalizeSourceFile(record.sourceFile) : undefined;
    if (!id || !sourceFile)
      continue;
    symbolCount += 1;
    recordedFiles.add(sourceFile);
    const symbol = {
      id,
      title: typeof record.title === "string" ? record.title : id,
      implements: [],
      coveredBy: [],
      executableFor: []
    };
    const relationships = [];
    if (options.legacyLinksAsImplements !== false) {
      let links = [];
      if (typeof record.links === "string")
        links = [record.links];
      else if (Array.isArray(record.links))
        links = record.links;
      for (const link of links) {
        if (typeof link === "string") {
          relationships.push({ type: "implements", target: link });
        } else if (link !== null && typeof link === "object") {
          const typed = link;
          if (typeof typed.type === "string" && typeof typed.target === "string") {
            relationships.push({ type: typed.type, target: typed.target });
          }
        }
      }
    }
    for (const relation of Array.isArray(record.relationships) ? record.relationships : []) {
      if (relation === null || typeof relation !== "object")
        continue;
      const typed = relation;
      if (typeof typed.type === "string" && typeof typed.target === "string")
        relationships.push({ type: typed.type, target: typed.target });
    }
    for (const { type, target } of relationships) {
      if (type === "implements")
        pushUnique(symbol.implements, target);
      else if (type === "covered_by")
        pushUnique(symbol.coveredBy, target);
      else if (type === "executable_for")
        pushUnique(symbol.executableFor, target);
    }
    if (symbol.implements.length + symbol.coveredBy.length + symbol.executableFor.length === 0) {
      continue;
    }
    const line = toPositiveInt(record.sourceLine) ?? coordinates[id]?.line ?? undefined;
    const endLine = toPositiveInt(record.sourceEndLine) ?? coordinates[id]?.endLine ?? undefined;
    if (line !== undefined)
      symbol.line = line;
    if (endLine !== undefined)
      symbol.endLine = endLine;
    const bucket = files[sourceFile] ?? [];
    bucket.push(symbol);
    files[sourceFile] = bucket;
  }
  const unlinkedFiles = [...recordedFiles].filter((file) => files[file] === undefined).sort();
  return { files, symbolCount, manifest, coordinateFiles, unlinkedFiles };
}
function fileSignature(filePath) {
  try {
    const stats = fs2.statSync(filePath);
    return `${stats.size}:${stats.mtimeMs}`;
  } catch {
    return "missing";
  }
}
function readText(filePath) {
  try {
    return fs2.readFileSync(filePath, "utf8");
  } catch {
    return;
  }
}
function writeCacheAtomically(cachePath, payload) {
  try {
    fs2.mkdirSync(path2.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
    fs2.writeFileSync(temporary, payload);
    fs2.renameSync(temporary, cachePath);
  } catch {}
}
function loadKnowledgeIndex(workspaceRoot, cacheDir, options = {}) {
  const symbolsPath = path2.join(workspaceRoot, SYMBOLS_MANIFEST);
  const coordinatesPath = path2.join(workspaceRoot, SYMBOL_COORDINATES);
  const legacyMode = options.legacyLinksAsImplements === false ? "typed" : "legacy";
  const signature = `${INDEX_FORMAT}|${legacyMode}|${fileSignature(symbolsPath)}|${fileSignature(coordinatesPath)}`;
  const cachePath = cacheDir ? path2.join(cacheDir, options.cacheFileName ?? CACHE_FILE) : undefined;
  if (cachePath) {
    const cached = readText(cachePath);
    if (cached !== undefined) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.signature === signature && parsed.index)
          return parsed.index;
      } catch {}
    }
  }
  const symbolsText = readText(symbolsPath);
  const records = symbolsText === undefined ? [] : scanSymbolsManifest(symbolsText);
  const index = buildKnowledgeIndex(records, scanSymbolCoordinates(readText(coordinatesPath) ?? ""), options, manifestStateOf(symbolsText, records.length));
  if (cachePath) {
    writeCacheAtomically(cachePath, JSON.stringify({ signature, index }));
  }
  return index;
}
var ENTITY_LANES = [
  ["REQ-", "requirements"],
  ["SCEN-", "scenarios"],
  ["TEST-", "tests"],
  ["ADR-", "adr"],
  ["FACT-", "facts"],
  ["FLAG-", "flags"],
  ["EVT-", "events"]
];
var SAFE_ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
var MAX_SUMMARY_LINKS = 24;
var RELATIONSHIPS_DIR = ".kb/relationships";
var shardCache = new Map;
function shardPathFor(workspaceRoot, entityId) {
  const shard = createHash("sha256").update(entityId).digest("hex");
  return path2.join(workspaceRoot, RELATIONSHIPS_DIR, `${shard.slice(0, 2)}.yaml`);
}
function shardLinksFrom(workspaceRoot, entityId) {
  const shardPath = shardPathFor(workspaceRoot, entityId);
  const signature = fileSignature(shardPath);
  if (signature === "missing") {
    shardCache.delete(shardPath);
    return [];
  }
  let cached = shardCache.get(shardPath);
  if (cached?.signature !== signature) {
    const byFrom = new Map;
    const records = scanRecordSequence(readText(shardPath) ?? "", "relationships");
    for (const { type, from, to } of records) {
      if (typeof type !== "string" || typeof from !== "string" || typeof to !== "string") {
        continue;
      }
      const list = byFrom.get(from) ?? [];
      list.push({ type, target: to });
      byFrom.set(from, list);
    }
    cached = { signature, byFrom };
    shardCache.set(shardPath, cached);
  }
  return cached.byFrom.get(entityId) ?? [];
}
function flushLink(links, pending) {
  if (pending?.target !== undefined) {
    links.push({ type: pending.type ?? "relates_to", target: pending.target });
  } else if (pending?.bare !== undefined) {
    links.push({ type: "relates_to", target: pending.bare });
  }
}
function readEntitySummary(workspaceRoot, entityId) {
  const lane = ENTITY_LANES.find(([prefix]) => entityId.startsWith(prefix));
  if (!lane || !SAFE_ENTITY_ID.test(entityId))
    return { id: entityId };
  let head;
  try {
    const descriptor = fs2.openSync(path2.join(workspaceRoot, ".kb", lane[1], `${entityId}.md`), "r");
    try {
      const buffer = Buffer.alloc(8192);
      const bytes = fs2.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs2.closeSync(descriptor);
    }
  } catch {
    return { id: entityId };
  }
  const lines = head.split(/\r?\n/);
  if (lines[0]?.trim() !== "---")
    return { id: entityId };
  const summary = { id: entityId };
  const authored = [];
  let inLinks = false;
  let inOrigin = false;
  let originKind;
  let closed = false;
  let pending;
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") {
      closed = true;
      break;
    }
    const flowOrigin = /^origin:\s*\{.*\bkind:\s*["']?([a-z]+)/.exec(line);
    if (flowOrigin)
      originKind = flowOrigin[1];
    const nestedKind = inOrigin ? /^\s+kind:\s*["']?([a-z]+)/.exec(line) : null;
    if (nestedKind)
      originKind = nestedKind[1];
    if (/^\S/.test(line))
      inOrigin = /^origin:\s*$/.test(line);
    const match = /^(title|status|firmness):\s*(.*)$/.exec(line);
    if (match?.[1] === "title" && match[2])
      summary.title = unquote2(match[2]);
    if (match?.[1] === "status" && match[2])
      summary.status = unquote2(match[2]);
    if (match?.[1] === "firmness" && match[2])
      summary.firmness = unquote2(match[2]);
    if (/^\S/.test(line)) {
      flushLink(authored, pending);
      pending = undefined;
      inLinks = /^links:\s*$/.test(line);
      continue;
    }
    if (!inLinks)
      continue;
    const entry = /^\s*-\s*(.*)$/.exec(line);
    if (entry) {
      flushLink(authored, pending);
      pending = {};
    }
    if (!pending)
      continue;
    const body = (entry ? entry[1] ?? "" : line).trim();
    const field = /^(type|target):\s*(.+)$/.exec(body);
    if (field?.[1] === "type")
      pending.type = unquote2(field[2] ?? "");
    else if (field?.[1] === "target")
      pending.target = unquote2(field[2] ?? "");
    else if (entry && SAFE_ENTITY_ID.test(unquote2(body)))
      pending.bare = unquote2(body);
  }
  flushLink(authored, pending);
  if (summary.firmness === undefined && closed && (lane[1] === "requirements" || lane[1] === "adr"))
    summary.firmness = originKind === "agent" ? "default" : "firm";
  const links = [];
  const seen = new Set;
  for (const link of [
    ...authored,
    ...shardLinksFrom(workspaceRoot, entityId)
  ]) {
    const key = `${link.type}\x00${link.target}`;
    if (link.target.length === 0 || seen.has(key))
      continue;
    seen.add(key);
    links.push(link);
    if (links.length >= MAX_SUMMARY_LINKS)
      break;
  }
  if (links.length > 0)
    summary.links = links;
  return summary;
}

// ../agent-core/dist/snippets.js
var MAX_REQUIREMENTS = 4;
var MAX_SYMBOLS_PER_REQUIREMENT = 3;
var MAX_TESTS = 3;
var MAX_TITLE = 80;
var MAX_GROUNDING = 2;
var MAX_FOCUS_SCAN_BYTES = 2 * 1024 * 1024;
var MAX_SNIPPET_CHARS = 1200;
function truncate(text, limit) {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}
function overlaps(symbol, range) {
  if (symbol.line === undefined)
    return false;
  const end = symbol.endLine ?? symbol.line;
  return symbol.line <= range.end && end >= range.start;
}
function focusedSymbols(symbols, focus) {
  if (!focus || focus.length === 0)
    return [];
  return symbols.filter((symbol) => focus.some((range) => overlaps(symbol, range))).sort((left, right) => (left.endLine ?? left.line ?? 0) - (left.line ?? 0) - ((right.endLine ?? right.line ?? 0) - (right.line ?? 0)));
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function editFocus(absolutePath, toolInput) {
  if (!isRecord(toolInput))
    return;
  const needles = [];
  const collect = (record) => {
    for (const key of ["old_string", "oldString"]) {
      const value = record[key];
      if (typeof value === "string")
        needles.push(value);
    }
  };
  collect(toolInput);
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (isRecord(edit))
        collect(edit);
    }
  }
  const usable = needles.filter((needle) => needle.length > 0);
  if (usable.length === 0)
    return;
  let content;
  try {
    if (fs3.statSync(absolutePath).size > MAX_FOCUS_SCAN_BYTES)
      return;
    content = fs3.readFileSync(absolutePath, "utf8");
  } catch {
    return;
  }
  const ranges = [];
  for (const needle of usable) {
    const offset = content.indexOf(needle);
    if (offset < 0)
      continue;
    const start = content.slice(0, offset).split(`
`).length;
    ranges.push({ start, end: start + needle.split(`
`).length - 1 });
  }
  return ranges.length > 0 ? ranges : undefined;
}
function formatList(items, limit) {
  const shown = items.slice(0, limit).join(", ");
  return items.length > limit ? `${shown} +${items.length - limit}` : shown;
}
var RETIRED_STATUS2 = /supersed|deprecat|reject|obsolete|retired/i;
function isRetiredStatus(status) {
  return status !== undefined && RETIRED_STATUS2.test(status);
}
function describeEntity(summary) {
  const retired = isRetiredStatus(summary.status) ? ` (${summary.status})` : "";
  const firmness = !retired && (summary.firmness === "firm" || summary.firmness === "exploratory") ? summary.firmness === "firm" ? " [firm: ask before changing]" : " [exploratory]" : "";
  const notable = `${retired}${firmness}`;
  return summary.title ? `${summary.id}${notable}: ${truncate(summary.title, MAX_TITLE)}` : `${summary.id}${notable}`;
}
function jsonString(value) {
  return JSON.stringify(value);
}
function unownedSourceNote(relativePath, candidates = []) {
  const head = `Kibi: no symbol in ${relativePath} is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.`;
  const search = `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) surfaces requirements that may already describe it; new behavior is recorded with kb_upsert (requirement + scenario + symbol implements link) as part of the change.`;
  for (let shown = candidates.length;shown > 0; shown--) {
    const named = candidates.slice(0, shown).map((candidate) => `${candidate.id}: ${truncate(candidate.title, MAX_TITLE)}`);
    const note = [
      head,
      `Requirements whose titles share words with this path or the request: ${named.join("; ")}. kb_query({id:${jsonString(candidates[0]?.id ?? "")}}) shows whether one describes the behavior being changed; one that does is traced by an implements link from the symbol that implements it (for markup, the component that renders it).`,
      search
    ].join(`
`);
    if (note.length <= MAX_SNIPPET_CHARS)
      return note;
  }
  if (candidates.length > 0)
    return [head, search].join(`
`);
  return [
    head,
    "No requirement title matches this file, so nothing recorded is known to cover it.",
    `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) finds a rule recorded under other words. A decision this change makes for this code (a rule the person states, a limit, who may do what) is recorded with kb_upsert (requirement + scenario + symbol implements link) before the work is reported done.`
  ].join(`
`);
}
function unreadableManifestNote(relativePath) {
  return [
    "Kibi: the hook could not read .kb/symbols.yaml, so requirement snippets are unavailable this session.",
    `kb_query({sourceFile:${jsonString(relativePath)}}) still lists what ${relativePath} implements; \`kibi sync\` rewrites the manifest in the canonical block layout.`
  ].join(`
`);
}
function impactCheckLine(relativePath) {
  return `Behavior changes here are traced to these requirements; kb_check({sourceFiles:[${jsonString(relativePath)}], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.`;
}
var GROUNDING_LINK_TYPES = [
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule"
];
function requirementGroundingLines(requirementId, summarize, options = {}) {
  const maxFacts = options.maxFacts ?? MAX_GROUNDING;
  const requirement = summarize(requirementId);
  if (isRetiredStatus(requirement.status))
    return [];
  const links = requirement.links ?? [];
  const facts = [
    ...new Set(links.filter((link) => GROUNDING_LINK_TYPES.includes(link.type)).map((link) => link.target))
  ];
  const adrs = [
    ...new Set(links.filter((link) => link.target.startsWith("ADR-")).map((link) => link.target))
  ];
  const lines = [];
  if (facts.length > 0) {
    const shown = facts.slice(0, maxFacts).map((id) => describeEntity(summarize(id)));
    const more = facts.length > maxFacts ? ` +${facts.length - maxFacts}` : "";
    lines.push(`${requirementId} must keep true: ${shown.join("; ")}${more}.`);
  }
  const adr = adrs[0];
  if (adr)
    lines.push(`Decision: ${describeEntity(summarize(adr))}.`);
  return lines;
}
function implementedRequirementIds(symbols) {
  return [...new Set(symbols.flatMap((symbol) => symbol.implements))];
}
function createEntitySummarizer(workspaceRoot) {
  const summaries = new Map;
  return (entityId) => {
    let summary = summaries.get(entityId);
    if (!summary) {
      summary = readEntitySummary(workspaceRoot, entityId);
      summaries.set(entityId, summary);
    }
    return summary;
  };
}
function requirementOwners(symbols, focus) {
  const owners = new Map;
  const ordered = [
    ...focus,
    ...symbols.filter((symbol) => !focus.includes(symbol))
  ];
  for (const symbol of ordered) {
    for (const requirement of symbol.implements) {
      const titles = owners.get(requirement) ?? [];
      if (!titles.includes(symbol.title))
        titles.push(symbol.title);
      owners.set(requirement, titles);
    }
  }
  const focusOwners = new Set(focus.flatMap((symbol) => symbol.implements));
  const requirementIds = [...owners.keys()].sort((left, right) => {
    const focusOrder = Number(focusOwners.has(right)) - Number(focusOwners.has(left));
    return focusOrder !== 0 ? focusOrder : (owners.get(right)?.length ?? 0) - (owners.get(left)?.length ?? 0);
  });
  return { owners, requirementIds };
}
function fileKnowledgeSnippet(input) {
  const { relativePath, symbols, surface, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);
  const { owners, requirementIds } = requirementOwners(symbols, focus);
  const tests = [
    ...new Set(symbols.flatMap((symbol) => symbol.coveredBy))
  ].sort();
  const executes = [
    ...new Set(symbols.flatMap((symbol) => symbol.executableFor))
  ].sort();
  if (owners.size === 0 && tests.length === 0 && executes.length === 0) {
    return;
  }
  const lines = [
    `Kibi knowledge for ${relativePath} (symbol manifest):`
  ];
  for (const requirementId of requirementIds.slice(0, MAX_REQUIREMENTS)) {
    const symbolTitles = owners.get(requirementId) ?? [];
    lines.push(`- ${describeEntity(summarize(requirementId))} — ${formatList(symbolTitles, MAX_SYMBOLS_PER_REQUIREMENT)}`);
  }
  if (requirementIds.length > MAX_REQUIREMENTS) {
    lines.push(`- +${requirementIds.length - MAX_REQUIREMENTS} more requirements: kb_query({sourceFile:${jsonString(relativePath)}})`);
  }
  const leadId = requirementIds[0];
  if (surface === "edit" && leadId) {
    lines.push(...requirementGroundingLines(leadId, summarize));
  }
  if (tests.length > 0) {
    lines.push(`Covered by: ${formatList(tests, MAX_TESTS)}.`);
  }
  if (executes.length > 0) {
    lines.push(`Test code for: ${formatList(executes, MAX_TESTS)}.`);
  }
  const primaryFocus = focus[0];
  if (primaryFocus) {
    const owner = primaryFocus.implements[0];
    const verb = surface === "edit" ? "The edit is inside" : "These lines are inside";
    lines.push(owner ? `${verb} ${primaryFocus.title}, which implements ${owner}.` : `${verb} ${primaryFocus.title}.`);
  }
  const location = primaryFocus ? `{path:${jsonString(relativePath)}, symbol:${jsonString(primaryFocus.title)}}` : `{path:${jsonString(relativePath)}}`;
  const next = [
    leadId ? `kb_query({id:${jsonString(leadId)}}) returns full requirement text` : undefined,
    `kb_search({query:"<topic>", sourceLocations:[${location}]}) answers with governing requirements, facts, decisions, and tests`
  ].filter((part) => part !== undefined);
  lines.push(`Next layer: ${next.join("; ")}.`);
  if (surface === "edit")
    lines.push(impactCheckLine(relativePath));
  return truncate(lines.join(`
`), input.maxChars ?? MAX_SNIPPET_CHARS);
}
function editKnowledgeContext(input) {
  const snippets = [];
  for (const relativePath of new Set(input.relativePaths)) {
    if (snippets.length >= (input.maxFiles ?? 3))
      break;
    const symbols = input.symbolsFor(relativePath);
    const snippet = symbols.length > 0 ? fileKnowledgeSnippet({
      relativePath,
      symbols,
      surface: "edit",
      focus: input.focusFor?.(relativePath),
      summarize: input.summarize,
      maxChars: input.maxChars
    }) : undefined;
    const text = snippet ?? input.noteFor?.(relativePath);
    if (!text)
      continue;
    const key = `${input.sessionId ?? ""}\x00edit\x00${relativePath}`;
    if (!claimSnippetSlot(input.stateDir, key))
      continue;
    snippets.push(text);
  }
  return snippets.length > 0 ? snippets.join(`

`) : undefined;
}
function claimSnippetSlot(stateDir, key) {
  if (!stateDir)
    return true;
  const marker = path3.join(stateDir, "shown-snippets", createHash2("sha256").update(key).digest("hex").slice(0, 32));
  try {
    fs3.mkdirSync(path3.dirname(marker), { recursive: true });
    fs3.writeFileSync(marker, "", { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

// ../agent-core/dist/decision-guard.js
var CONFIRM_FIRM_EDITS_ENV = "KIBI_CONFIRM_FIRM_EDITS";
function confirmFirmEdits(env) {
  const value = env[CONFIRM_FIRM_EDITS_ENV]?.trim().toLowerCase();
  return !(value === "0" || value === "false" || value === "off");
}
function firmRequirementsTouched(input) {
  const touched = input.wholeFile ? input.symbols : focusedSymbols(input.symbols, input.focus);
  const ids = implementedRequirementIds(touched).filter((id) => {
    if (input.confirmed?.has(id))
      return false;
    const summary = input.summarize(id);
    return summary.firmness === "firm" && !isRetiredStatus(summary.status);
  });
  return { ids, symbol: input.wholeFile ? undefined : touched[0] };
}
var RULE_PHRASES = /\b(?:from now on|going forward|must(?:n['’]t| not)?|should (?:always|never)|never|always|is not allowed|are not allowed|not be allowed|only (?:allow|admins?|owners?)|is required|are required|has to|have to)\b/i;
function statedRule(prompt) {
  const match = RULE_PHRASES.exec(prompt);
  return match ? match[0].toLowerCase() : undefined;
}
function rulePromptNote(phrase) {
  return [
    `Kibi: this request reads as a rule or decision (it says "${phrase}").`,
    "A rule the person states is project knowledge: kb_search shows whether a recorded requirement already says something about it (changing a firm one is a question for the person first), and a new or changed rule is recorded with kb_upsert (a requirement, firm because the person stated it, with the implements link from the code that enforces it) as part of this change, not after it."
  ].join(`
`);
}
function captureReminder(rulePrompt) {
  return [
    rulePrompt ? "Kibi: a request this session read as a rule or decision, the session changed source files, and nothing was recorded in the knowledge base." : "Kibi: this session changed source files and recorded nothing in the knowledge base.",
    "A decision the person stated or this change made (a rule, a limit, a default, who may do what) is recorded with kb_upsert as a requirement linked to the code that implements it before the work is reported done; when there was none, the final report says so in one line."
  ].join(`
`);
}
function firmEditNotice(where, requirements) {
  const shown = requirements.slice(0, 2).map((summary) => summary.title ? `${summary.id}: ${summary.title}` : summary.id);
  const more = requirements.length > shown.length ? ` (+${requirements.length - shown.length} more)` : "";
  const one = requirements.length === 1;
  return [
    `Kibi: this edit changes ${where}, which implements ${one ? "a firm requirement" : "firm requirements"}, a rule the person set: ${shown.join("; ")}${more}.`,
    `Unless the edit keeps ${one ? "that rule" : "those rules"}, ask the person before making it and name the rule; change the requirement with kb_upsert in this change only when they say so.`
  ].join(`
`);
}
function sessionPath(session, name) {
  if (!session.stateDir)
    return;
  const key = createHash3("sha256").update(session.sessionId?.trim() || "unattributed").digest("hex").slice(0, 32);
  return path4.join(session.stateDir, "decision-guard", key, name);
}
function writeMarker(file, content, flag) {
  fs4.mkdirSync(path4.dirname(file), { recursive: true });
  fs4.writeFileSync(file, content, { flag });
}
function markDecisionFlag(session, flag) {
  const file = sessionPath(session, flag);
  if (!file)
    return;
  try {
    writeMarker(file, "", "w");
  } catch {}
}
function hasDecisionFlag(session, flag) {
  const file = sessionPath(session, flag);
  return file !== undefined && fs4.existsSync(file);
}
function claimDecisionFlag(session, flag) {
  const file = sessionPath(session, flag);
  if (!file)
    return false;
  try {
    writeMarker(file, "", "wx");
    return true;
  } catch {
    return false;
  }
}
function recordRequest(session, prompt) {
  const rule = statedRule(prompt);
  const file = sessionPath(session, "request-words.json");
  if (file) {
    try {
      writeMarker(file, JSON.stringify(requestTopicWords(prompt)), "w");
    } catch {}
  }
  if (rule !== undefined)
    markDecisionFlag(session, "rule-prompt");
  return rule;
}
function requestWords(session) {
  const file = sessionPath(session, "request-words.json");
  if (!file)
    return [];
  try {
    const parsed = JSON.parse(fs4.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((word) => typeof word === "string") : [];
  } catch {
    return [];
  }
}
function claimCaptureReminder(session) {
  return hasDecisionFlag(session, "source-edited") && !hasDecisionFlag(session, "kb-recorded") && claimDecisionFlag(session, "capture-asked");
}
var SIGNOFF_LATEST_JSON = path4.join(".kb", "briefs", "signoff", "latest.json");
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}
function isRequirementUpsert(toolInput) {
  const input = record(toolInput);
  const args = record(input?.arguments) ?? record(input?.args) ?? input;
  return args?.type === "req" && args.dryRun !== true;
}
function mtimeMs(file) {
  if (!file)
    return;
  try {
    return fs4.statSync(file).mtimeMs;
  } catch {
    return;
  }
}
function claimSignoffReminder(session, workspaceRoot) {
  const recorded = mtimeMs(sessionPath(session, "requirement-recorded"));
  if (recorded === undefined)
    return false;
  const shown = mtimeMs(path4.join(workspaceRoot, SIGNOFF_LATEST_JSON));
  if (shown !== undefined && shown >= recorded)
    return false;
  return claimDecisionFlag(session, "signoff-asked");
}
function signoffReminder() {
  return [
    "Kibi: this session recorded or changed requirements, and the person has not seen them as a signoff view.",
    "Before reporting the work done, asking to commit, or opening or merging the pull request, run `kibi signoff` and put its output in the reply unchanged; a requirement the agent wrote waits for the person's approval, so ask for it with this view, never in your own words. When they answer, record their answer on the same branch and push it to the same pull request, never to a separate one. When replies go through a messaging tool, pass the output there as the message text, and share `.kb/briefs/signoff/latest.html` only as a rendered page (the Artifact tool in Claude apps), never as an attached file, which chat apps show as raw source (kibi-decisions, resources/signoff-views.md)."
  ].join(`
`);
}
function readSettled(file) {
  if (!file)
    return [];
  try {
    const parsed = JSON.parse(fs4.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}
function settledFirmRequirements(session) {
  return new Set(readSettled(sessionPath(session, "firm-settled.json")));
}
function settleFirmRequirements(session, ids) {
  const file = sessionPath(session, "firm-settled.json");
  if (!file)
    return;
  try {
    writeMarker(file, JSON.stringify([...new Set([...readSettled(file), ...ids])]), "w");
  } catch {}
}

// ../agent-core/dist/hook-usage-log.js
import { randomUUID as randomUUID3 } from "node:crypto";
import fs6 from "node:fs";
import path7 from "node:path";

// ../agent-core/dist/kb-mcp-tools.js
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return;
}
function readBoolean(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return;
}
function readStringArray(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) {
      continue;
    }
    return value.filter((item) => typeof item === "string" && item.length > 0);
  }
  return [];
}
function readRecord(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (isRecord2(value)) {
      return value;
    }
  }
  return;
}
function canonicalKbToolName(toolName) {
  const trimmed = toolName?.trim() ?? "";
  const lastSegment = trimmed.includes("__") ? trimmed.split("__").at(-1) ?? "" : trimmed.replace(/^MCP:/i, "");
  const operation = lastSegment.replace(/^kibi_/, "");
  return operation.startsWith("kb_") ? operation : undefined;
}
var KIBI_WORKSPACE_ARGUMENT = "workspaceRoot";
function isKibiMcpToolName(toolName) {
  const name = toolName?.trim() ?? "";
  if (/^MCP:kb_[a-z_]+$/i.test(name))
    return true;
  const segments = name.split("__");
  if (segments.length < 3 || segments[0] !== "mcp")
    return false;
  const server = segments.slice(1, -1).join("__");
  return /kibi/i.test(server) && /^kb_[a-z_]+$/.test(segments.at(-1) ?? "");
}
function stampKibiWorkspace(toolName, toolInput, workspaceRoot) {
  if (!workspaceRoot || !isKibiMcpToolName(toolName))
    return;
  const base = isRecord2(toolInput) ? toolInput : {};
  return { ...base, [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot };
}
function extractKbMcpToolCall(toolName, toolInput) {
  let normalizedToolName = canonicalKbToolName(toolName);
  if (isRecord2(toolInput)) {
    normalizedToolName ??= readString(toolInput, [
      "toolName",
      "tool_name",
      "name"
    ]);
    const args = readRecord(toolInput, ["arguments", "args"]);
    const payload = args ?? toolInput;
    const includeImpactDiagnostics = readBoolean(payload, [
      "includeImpactDiagnostics",
      "include_impact_diagnostics"
    ]);
    const includeWorkingTreeDiff = readBoolean(payload, [
      "includeWorkingTreeDiff",
      "include_working_tree_diff"
    ]);
    const sourceFiles = readStringArray(payload, [
      "sourceFiles",
      "source_files"
    ]);
    if (normalizedToolName === "kb_upsert" && readBoolean(payload, ["dryRun"]) === true) {
      normalizedToolName = "kb_validate_upsert";
    }
    if (normalizedToolName?.startsWith("kb_")) {
      return {
        toolName: normalizedToolName,
        impactCheckRun: normalizedToolName === "kb_check" && includeImpactDiagnostics === true && includeWorkingTreeDiff === true && sourceFiles.length > 0,
        sourceFiles
      };
    }
    const nestedArgs = toolInput.arguments ?? toolInput.args;
    if (isRecord2(nestedArgs)) {
      const nestedTool = readString(nestedArgs, [
        "toolName",
        "tool_name",
        "name"
      ]);
      if (nestedTool?.startsWith("kb_")) {
        return { toolName: nestedTool, impactCheckRun: false, sourceFiles: [] };
      }
    }
  }
  if (normalizedToolName?.startsWith("kb_")) {
    return {
      toolName: normalizedToolName,
      impactCheckRun: false,
      sourceFiles: []
    };
  }
  return;
}
var KIBI_CLI_ROUTES = {
  check: "kb_check",
  query: "kb_query",
  "kb-query": "kb_query",
  search: "kb_search",
  status: "kb_status",
  graph: "kb_graph",
  coverage: "kb_coverage",
  "find-gaps": "kb_find_gaps",
  gaps: "kb_find_gaps",
  upsert: "kb_upsert",
  sync: "kb_sync"
};
function kibiCliOperation(command) {
  if (typeof command !== "string")
    return;
  const route = /(?:^|[\s;&|(/])kibi\s+([a-z-]+)/.exec(command)?.[1];
  return route ? KIBI_CLI_ROUTES[route] : undefined;
}
var SHELL_TOOL_NAMES = new Set(["Bash", "bash", "Shell", "shell"]);
function hostKbOperation(toolName, toolInput) {
  const mcp = canonicalKbToolName(toolName);
  if (mcp !== undefined && /^kb_[a-z_]+$/.test(mcp))
    return mcp;
  if (!toolName || !SHELL_TOOL_NAMES.has(toolName) || !isRecord2(toolInput)) {
    return;
  }
  return kibiCliOperation(toolInput.command);
}

// ../agent-core/dist/path-policy.js
import path5 from "node:path";
var codeExtensions = new Set([
  ".c",
  ".cc",
  ".cjs",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".lua",
  ".mjs",
  ".mts",
  ".cts",
  ".php",
  ".pl",
  ".py",
  ".rb",
  ".rs",
  ".scala",
  ".sh",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte"
]);
var ignoredSegments = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "target",
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "__pycache__"
]);
var testSegments = new Set([
  "test",
  "tests",
  "__tests__",
  "spec",
  "specs",
  "e2e",
  "__mocks__",
  "fixtures"
]);
var testBasename = /(\.|_)(test|spec|e2e)\.[^.]+$|^test_[^/]+\.py$/;
var documentationExtensions = new Set([".md", ".mdx", ".rst", ".txt"]);
var documentationSegments = new Set(["docs", "documentation"]);
var canonicalKbKnowledgeLanes = new Set([
  "requirements",
  "scenarios",
  "tests",
  "facts",
  "adr",
  "flags",
  "events"
]);
var canonicalKbKnowledgeFiles = new Set([
  "symbols.yaml",
  "symbol-coordinates.yaml"
]);
var explicitPathKeys = new Set([
  "absolute_path",
  "file",
  "file_path",
  "filepath",
  "new_path",
  "old_path",
  "path",
  "paths",
  "relative_path",
  "target_path"
]);
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeWorkspacePath(candidate) {
  return candidate.trim().replaceAll("\\", "/");
}
function pathSegments(candidate) {
  return normalizeWorkspacePath(candidate).split("/").filter(Boolean);
}
function collectPathValues(value, output) {
  if (typeof value === "string") {
    const normalized = normalizeWorkspacePath(value);
    if (normalized.length > 0)
      output.push(normalized);
    return;
  }
  if (!Array.isArray(value))
    return;
  for (const item of value)
    collectPathValues(item, output);
}
function visitExplicitPathFields(value, output) {
  if (Array.isArray(value)) {
    for (const item of value)
      visitExplicitPathFields(item, output);
    return;
  }
  if (!isRecord3(value))
    return;
  for (const [key, child] of Object.entries(value)) {
    if (explicitPathKeys.has(key.toLowerCase()))
      collectPathValues(child, output);
    visitExplicitPathFields(child, output);
  }
}
function extractExplicitPathFields(input) {
  const paths = [];
  visitExplicitPathFields(input, paths);
  return [...new Set(paths)];
}
var patchFileHeader = /^\*\*\* (?:Update|Add|Delete) File: (.+)$/;
var patchTextKeys = ["command", "patch", "input", "patchText"];
function extractPatchFilePaths(patch) {
  const paths = [];
  for (const line of patch.split(/\r?\n/)) {
    const match = patchFileHeader.exec(line.trim());
    const candidate = match?.[1] ? normalizeWorkspacePath(match[1]) : "";
    if (candidate.length > 0)
      paths.push(candidate);
  }
  return [...new Set(paths)];
}
function extractEditedPaths(toolInput) {
  const paths = extractExplicitPathFields(toolInput);
  if (isRecord3(toolInput)) {
    for (const key of patchTextKeys) {
      const value = toolInput[key];
      if (typeof value === "string" && value.includes("*** ")) {
        paths.push(...extractPatchFilePaths(value));
      }
    }
  }
  return [...new Set(paths)];
}
function canonicalizeWorkspacePath(workspaceRoot, options) {
  const trimmed = normalizeWorkspacePath(options.rawPath);
  if (trimmed.length === 0)
    return;
  const base = options.base ?? options.eventCwd ?? workspaceRoot;
  const absolute = path5.isAbsolute(trimmed) ? path5.resolve(trimmed) : path5.resolve(base, trimmed);
  const workspaceRelative = path5.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  if (workspaceRelative.length === 0 || workspaceRelative === ".." || workspaceRelative.startsWith("../") || path5.isAbsolute(workspaceRelative)) {
    return;
  }
  return { workspaceRelative, absolute };
}
function classifyPath(relativePath) {
  const segments = pathSegments(relativePath);
  if (segments[0] === ".kb")
    return "kb";
  if (segments.some((segment) => ignoredSegments.has(segment)))
    return "other";
  if (segments.some((segment) => documentationSegments.has(segment))) {
    return "other";
  }
  const basename = segments.at(-1) ?? "";
  const extension = path5.extname(basename).toLowerCase();
  if (!codeExtensions.has(extension))
    return "other";
  if (testBasename.test(basename) || segments.slice(0, -1).some((segment) => testSegments.has(segment))) {
    return "test";
  }
  return "source";
}
function isKbPath(candidate) {
  return pathSegments(candidate).includes(".kb");
}
function isCanonicalKbKnowledgePath(segments) {
  const kbIndex = segments.indexOf(".kb");
  if (kbIndex < 0)
    return false;
  const lane = segments[kbIndex + 1];
  return lane !== undefined && (canonicalKbKnowledgeFiles.has(lane) || canonicalKbKnowledgeLanes.has(lane));
}
function isMeaningfulTrackedPath(candidate) {
  const segments = pathSegments(candidate);
  if (segments.some((segment) => ignoredSegments.has(segment)))
    return false;
  if (segments.includes(".kb"))
    return isCanonicalKbKnowledgePath(segments);
  const basename = segments.at(-1) ?? "";
  const extension = path5.extname(basename).toLowerCase();
  if (basename === "README.md")
    return true;
  if (segments.some((segment) => documentationSegments.has(segment))) {
    return documentationExtensions.has(extension);
  }
  if (testBasename.test(basename) || segments.slice(0, -1).some((segment) => testSegments.has(segment))) {
    return codeExtensions.has(extension) || documentationExtensions.has(extension);
  }
  return codeExtensions.has(extension);
}
function isSourceImpactRelevantPath(candidate) {
  return classifyPath(normalizeWorkspacePath(candidate)) === "source";
}

// ../agent-core/dist/usage-telemetry.js
import { createHash as createHash4, randomUUID as randomUUID2 } from "node:crypto";
import fs5 from "node:fs";
import os from "node:os";
import path6 from "node:path";
var DEFAULT_TELEMETRY_KEY = "phc_A5z8jRhD528abGJiTtPfgu4d4hpbEbfiJr9iUGn9TMsY";
var DEFAULT_TELEMETRY_HOST = "https://eu.i.posthog.com";
var QUEUE_FILE = "telemetry-queue.jsonl";
var SESSIONS_FILE = "telemetry-sessions.json";
var SESSION_MARKER_MAX_AGE_MS = 30 * 60 * 1000;
var MAX_SESSION_MARKERS = 200;
var CONFIG_FILE = "telemetry.json";
var SENDING_SUFFIX = ".sending";
var FLUSH_BATCH_EVENTS = 20;
var FLUSH_MAX_AGE_MS = 5 * 60 * 1000;
var STALE_CLAIM_MS = 10 * 60 * 1000;
var MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
var MAX_QUEUE_BYTES = 1024 * 1024;
var DEFAULT_FLUSH_TIMEOUT_MS = 1500;
function flagValue(value) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === undefined || normalized === "")
    return;
  if (["1", "true", "yes", "on"].includes(normalized))
    return true;
  if (["0", "false", "no", "off"].includes(normalized))
    return false;
  return;
}
var CI_ENV_KEYS = [
  "CI",
  "CONTINUOUS_INTEGRATION",
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "BUILDKITE",
  "CIRCLECI",
  "TRAVIS",
  "TF_BUILD",
  "JENKINS_URL",
  "TEAMCITY_VERSION",
  "BITBUCKET_BUILD_NUMBER",
  "CODEBUILD_BUILD_ID",
  "DRONE",
  "APPVEYOR",
  "SEMAPHORE",
  "BUILDKITE_BUILD_ID",
  "CF_BUILD_ID",
  "HEROKU_TEST_RUN_ID"
];
var TEST_ENV_KEYS = [
  "NODE_ENV=test",
  "JEST_WORKER_ID",
  "VITEST",
  "VITEST_WORKER_ID",
  "NODE_TEST_CONTEXT"
];
function automationName(env, keys) {
  for (const key of keys) {
    const [name, expected] = key.split("=");
    const value = env[name]?.trim();
    if (!value)
      continue;
    if (expected !== undefined) {
      if (value === expected)
        return key;
      continue;
    }
    if (flagValue(value) !== false)
      return name;
  }
  return;
}
var HOST_ENV_KEYS = [
  ["CLAUDECODE=1", "claude-code"],
  ["CURSOR_AGENT=1", "cursor"],
  ["CODEX_SANDBOX", "codex"],
  ["CODEX_THREAD_ID", "codex"],
  ["GEMINI_CLI=1", "gemini-cli"],
  ["OPENCODE=1", "opencode"]
];
var SESSION_ENV_KEYS = [
  "KIBI_SESSION_ID",
  "CLAUDE_CODE_SESSION_ID",
  "CODEX_THREAD_ID"
];
function hostKey(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function detectTelemetryHost(env = process.env) {
  const explicit = env.KIBI_HOST?.trim() || env.KIBI_MCP_HOST?.trim();
  if (explicit)
    return hostKey(explicit) || undefined;
  for (const [key, host] of HOST_ENV_KEYS) {
    if (automationName(env, [key]))
      return host;
  }
  const agent = env.AI_AGENT?.trim().split("_")[0];
  return agent ? hostKey(agent) || undefined : undefined;
}
function detectTelemetrySession(env = process.env) {
  for (const key of SESSION_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value)
      return value;
  }
  return;
}
function remoteEnvironment(env) {
  return flagValue(env.CLAUDE_CODE_REMOTE) === true || flagValue(env.CODESPACES) === true || Boolean(env.GITPOD_WORKSPACE_ID?.trim());
}
function realDirectory(directory) {
  try {
    return fs5.realpathSync(directory);
  } catch {
    return path6.resolve(directory);
  }
}
function sandboxedHome(env) {
  const home = (env.HOME ?? env.USERPROFILE)?.trim();
  if (!home)
    return false;
  const temp = realDirectory(os.tmpdir());
  const resolved = realDirectory(home);
  return resolved !== temp && resolved.startsWith(`${temp}${path6.sep}`);
}
function telemetryDirectory(env = process.env) {
  const explicit = env.KIBI_TELEMETRY_DIR?.trim();
  if (explicit)
    return explicit;
  if (process.platform === "win32" && env.LOCALAPPDATA) {
    return path6.join(env.LOCALAPPDATA, "kibi");
  }
  const stateHome = env.XDG_STATE_HOME?.trim();
  return path6.join(stateHome || path6.join(env.HOME || os.homedir(), ".local", "state"), "kibi");
}
function readTelemetryConfig(env = process.env) {
  try {
    const parsed = JSON.parse(fs5.readFileSync(path6.join(telemetryDirectory(env), CONFIG_FILE), "utf8"));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function writeTelemetryConfig(config, env) {
  const directory = telemetryDirectory(env);
  fs5.mkdirSync(directory, { recursive: true });
  fs5.writeFileSync(path6.join(directory, CONFIG_FILE), `${JSON.stringify(config, null, 2)}
`, "utf8");
}
function telemetryStatus(env = process.env) {
  const directory = telemetryDirectory(env);
  const status = (enabled, reason) => ({
    enabled,
    reason,
    directory
  });
  const explicit = flagValue(env.KIBI_TELEMETRY);
  if (explicit === false)
    return status(false, "KIBI_TELEMETRY=0");
  if (flagValue(env.DO_NOT_TRACK) === true) {
    return status(false, "DO_NOT_TRACK=1");
  }
  const preference = readTelemetryConfig(env).preference;
  if (preference === "disabled") {
    return status(false, "disabled with `kibi telemetry disable`");
  }
  if (telemetryKey(env) === "")
    return status(false, "no telemetry key");
  if (explicit === true)
    return status(true, "KIBI_TELEMETRY=1");
  const processEnv = process.env;
  const ciName = automationName(env, CI_ENV_KEYS) ?? automationName(processEnv, CI_ENV_KEYS);
  if (ciName)
    return status(false, `CI environment (${ciName})`);
  const testName = automationName(env, TEST_ENV_KEYS) ?? automationName(processEnv, TEST_ENV_KEYS);
  if (testName)
    return status(false, `test environment (${testName})`);
  if (sandboxedHome(env)) {
    return status(false, "sandboxed home in the temp directory (harness run)");
  }
  if (preference === "enabled") {
    return status(true, "enabled with `kibi telemetry enable`");
  }
  return status(true, "on by default; anonymous, opt-out");
}
function telemetryEnabled(env = process.env) {
  return telemetryStatus(env).enabled;
}
function telemetryKey(env) {
  const override = env.KIBI_TELEMETRY_KEY;
  return (override === undefined ? DEFAULT_TELEMETRY_KEY : override).trim();
}
function telemetryHost(env) {
  return (env.KIBI_TELEMETRY_HOST?.trim() || DEFAULT_TELEMETRY_HOST).replace(/\/+$/, "");
}
function installId(env) {
  const config = readTelemetryConfig(env);
  if (typeof config.installId === "string" && config.installId !== "") {
    return config.installId;
  }
  const created = randomUUID2();
  try {
    writeTelemetryConfig({ ...config, installId: created }, env);
  } catch {}
  return created;
}
function hashTelemetryId(value) {
  return createHash4("sha256").update("kibi-telemetry\x00").update(value).digest("hex").slice(0, 16);
}
function runtimeName() {
  return typeof globalThis.Bun === "undefined" ? "node" : "bun";
}
function sessionMarkersPath(env) {
  return path6.join(telemetryDirectory(env), SESSIONS_FILE);
}
function readSessionMarkers(env) {
  try {
    const parsed = JSON.parse(fs5.readFileSync(sessionMarkersPath(env), "utf8"));
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function workspaceKey(workspaceRoot) {
  return hashTelemetryId(`workspace\x00${path6.resolve(workspaceRoot)}`);
}
function rememberHookSession(workspaceRoot, sessionId, env = process.env) {
  if (!sessionId.trim() || !telemetryEnabled(env))
    return;
  const now = Date.now();
  const markers = readSessionMarkers(env);
  markers[workspaceKey(workspaceRoot)] = {
    session: hashTelemetryId(sessionId.trim()),
    at: now
  };
  const kept = Object.entries(markers).filter(([, marker]) => typeof marker?.at === "number" && now - marker.at <= SESSION_MARKER_MAX_AGE_MS).sort(([, left], [, right]) => right.at - left.at).slice(0, MAX_SESSION_MARKERS);
  try {
    const file = sessionMarkersPath(env);
    fs5.mkdirSync(path6.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${randomUUID2()}.tmp`;
    fs5.writeFileSync(temporary, JSON.stringify(Object.fromEntries(kept)));
    fs5.renameSync(temporary, file);
  } catch {}
}
function workspaceSessionHash(startDirectory, env = process.env) {
  const markers = readSessionMarkers(env);
  const now = Date.now();
  let current = path6.resolve(startDirectory);
  for (;; ) {
    const marker = markers[workspaceKey(current)];
    if (marker && typeof marker.session === "string" && typeof marker.at === "number" && now - marker.at <= SESSION_MARKER_MAX_AGE_MS) {
      return marker.session;
    }
    const parent = path6.dirname(current);
    if (parent === current)
      return;
    current = parent;
  }
}
function sessionProperty(source, env) {
  const sessionId = source.sessionId?.trim() || detectTelemetrySession(env);
  if (sessionId)
    return hashTelemetryId(sessionId);
  return source.workspaceRoot ? workspaceSessionHash(source.workspaceRoot, env) ?? null : null;
}
function baseProperties(source, env) {
  return {
    distinct_id: installId(env),
    $process_person_profile: false,
    $geoip_disable: true,
    $lib: "kibi",
    package: source.packageName,
    package_version: source.packageVersion ?? null,
    host: source.host?.trim() && hostKey(source.host) || detectTelemetryHost(env) || "unknown",
    remote: remoteEnvironment(env),
    session: sessionProperty(source, env),
    os: process.platform,
    arch: process.arch,
    runtime: runtimeName(),
    runtime_version: process.versions.node.split(".")[0] ?? null
  };
}
function queuePath(env) {
  return path6.join(telemetryDirectory(env), QUEUE_FILE);
}
function appendEvent(event, env) {
  try {
    const file = queuePath(env);
    fs5.mkdirSync(path6.dirname(file), { recursive: true });
    try {
      if (fs5.statSync(file).size > MAX_QUEUE_BYTES)
        return;
    } catch {}
    fs5.appendFileSync(file, `${JSON.stringify(event)}
`, "utf8");
  } catch {}
}
function recordHookTelemetry(source, hook, env = process.env) {
  if (!telemetryEnabled(env))
    return;
  appendEvent({
    event: "kibi_hook",
    timestamp: new Date().toISOString(),
    properties: {
      ...baseProperties(source, env),
      hook_event: hook.hookEvent,
      hook_action: hook.hookAction,
      path_kind: hook.pathKind ?? null,
      kb_operation: hook.kbOperation ?? null,
      kb_used_before: hook.kbUsedBefore ?? null,
      requirement_count: hook.requirementCount ?? null
    }
  }, env);
}
function parseQueued(text, now) {
  const events = [];
  for (const line of text.split(`
`)) {
    if (line.trim() === "")
      continue;
    try {
      const event = JSON.parse(line);
      const age = now - Date.parse(event.timestamp);
      if (Number.isFinite(age) && age <= MAX_EVENT_AGE_MS)
        events.push(event);
    } catch {}
  }
  return events;
}
function flushDue(file, now) {
  let text;
  try {
    text = fs5.readFileSync(file, "utf8");
  } catch {
    return false;
  }
  const lines = text.split(`
`).filter((line) => line.trim() !== "");
  if (lines.length === 0)
    return false;
  if (lines.length >= FLUSH_BATCH_EVENTS)
    return true;
  try {
    const first = JSON.parse(lines[0] ?? "");
    return now - Date.parse(first.timestamp) >= FLUSH_MAX_AGE_MS;
  } catch {
    return true;
  }
}
function claimBatches(directory, now) {
  const claimed = [];
  let names;
  try {
    names = fs5.readdirSync(directory);
  } catch {
    return claimed;
  }
  for (const name of names) {
    if (!name.endsWith(SENDING_SUFFIX))
      continue;
    const file = path6.join(directory, name);
    try {
      if (now - fs5.statSync(file).mtimeMs < STALE_CLAIM_MS)
        continue;
      const reclaimed = `${file}.${randomUUID2()}${SENDING_SUFFIX}`;
      fs5.renameSync(file, reclaimed);
      claimed.push(reclaimed);
    } catch {}
  }
  const queue = path6.join(directory, QUEUE_FILE);
  const target = path6.join(directory, `${QUEUE_FILE}.${process.pid}.${randomUUID2()}${SENDING_SUFFIX}`);
  try {
    fs5.renameSync(queue, target);
    claimed.push(target);
  } catch {}
  return claimed;
}
async function flushTelemetry(options = {}, env = process.env) {
  if (!telemetryEnabled(env))
    return 0;
  const directory = telemetryDirectory(env);
  const now = Date.now();
  if (!options.force && !flushDue(queuePath(env), now))
    return 0;
  const claimed = claimBatches(directory, now);
  if (claimed.length === 0)
    return 0;
  const events = [];
  for (const file of claimed) {
    try {
      events.push(...parseQueued(fs5.readFileSync(file, "utf8"), now));
    } catch {}
  }
  const release = () => {
    for (const file of claimed)
      fs5.rmSync(file, { force: true });
  };
  if (events.length === 0) {
    release();
    return 0;
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController;
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_FLUSH_TIMEOUT_MS);
  timer.unref?.();
  try {
    const response = await fetchImpl(`${telemetryHost(env)}/batch/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: telemetryKey(env),
        historical_migration: false,
        batch: events
      }),
      signal: controller.signal
    });
    if (!response.ok && response.status >= 500)
      throw new Error("retry");
    release();
    return response.ok ? events.length : 0;
  } catch {
    release();
    for (const event of events)
      appendEvent(event, env);
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

// ../agent-core/dist/hook-usage-log.js
var HOOK_ACTION_EDITED = "edited";
var HOOK_ACTION_KB_USAGE = "kb_usage";
function hookTelemetryEnabled(env = process.env) {
  const value = env.KIBI_DIAGNOSTIC_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
}
function hookTracesWanted(env = process.env) {
  return hookTelemetryEnabled(env) || telemetryEnabled(env);
}
function adapterPackage(host) {
  return host === "claude-code" ? "kibi-claude" : `kibi-${host}`;
}
function appendHookUsage(row, env = process.env) {
  if (row.trace.action === undefined)
    return;
  recordHookTelemetry({
    packageName: row.packageName ?? adapterPackage(row.host),
    packageVersion: row.packageVersion,
    host: row.host,
    sessionId: row.sessionId
  }, {
    hookEvent: row.event,
    hookAction: row.trace.action,
    pathKind: row.trace.pathKind,
    kbOperation: row.trace.kbOperation,
    kbUsedBefore: row.trace.kbUsedBefore,
    requirementCount: row.trace.requirementIds?.length
  }, env);
  if (!hookTelemetryEnabled(env))
    return;
  const finishedAt = new Date;
  const { trace } = row;
  const record = {
    timestamp: finishedAt.toISOString(),
    request_id: `hook-${randomUUID3()}`,
    tool: `hook_${row.event}`,
    interface: "hook",
    host: row.host,
    package_version: row.packageVersion ?? null,
    workspace_root: row.workspaceRoot,
    session_id: row.sessionId ?? null,
    hook_event: row.event,
    host_tool: row.hostTool ?? null,
    hook_action: trace.action,
    path: trace.path ?? null,
    path_kind: trace.pathKind ?? null,
    requirement_ids: trace.requirementIds ?? [],
    kb_operation: trace.kbOperation ?? null,
    kb_used_before: trace.kbUsedBefore ?? null,
    status: "success",
    duration_ms: finishedAt.getTime() - row.startedAt.getTime()
  };
  try {
    const logPath = path7.join(row.workspaceRoot, ".kb", "usage.log");
    fs6.mkdirSync(path7.dirname(logPath), { recursive: true });
    fs6.appendFileSync(logPath, `${JSON.stringify(record)}
`, "utf8");
  } catch {}
}
function kbUsageTrace(toolName, toolInput) {
  const kbOperation = hostKbOperation(toolName, toolInput);
  return kbOperation ? { action: HOOK_ACTION_KB_USAGE, kbOperation } : undefined;
}
function editTraces(relativePaths, requirementIdsFor) {
  const traces = [];
  for (const relativePath of new Set(relativePaths)) {
    const pathKind = classifyPath(relativePath);
    if (pathKind === "other")
      continue;
    traces.push({
      action: HOOK_ACTION_EDITED,
      path: relativePath,
      pathKind,
      requirementIds: pathKind === "kb" ? [] : requirementIdsFor(relativePath)
    });
  }
  return traces;
}
function appendHookUsageRows(row, traces, env = process.env) {
  if (!hookTracesWanted(env))
    return;
  for (const trace of traces)
    appendHookUsage({ ...row, trace }, env);
}
var TURN_END_EVENTS = new Set(["stop", "sessionend"]);
async function finishHookTelemetry(input, env = process.env) {
  try {
    if (input.workspaceRoot && input.sessionId) {
      rememberHookSession(input.workspaceRoot, input.sessionId, env);
    }
    const turnEnd = TURN_END_EVENTS.has(input.event.toLowerCase().replace(/[^a-z]/g, ""));
    await flushTelemetry({ force: turnEnd }, env);
  } catch {}
}
function readPackageVersion(packageJsonPath) {
  try {
    const parsed = JSON.parse(fs6.readFileSync(packageJsonPath, "utf8"));
    if (typeof parsed === "object" && parsed !== null && "version" in parsed && typeof parsed.version === "string") {
      return parsed.version;
    }
  } catch {}
  return null;
}

// src/hook-input.ts
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString2(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return;
}
function parseHookInput(input) {
  if (!isRecord4(input)) {
    return { event: "" };
  }
  const event = readString2(input, [
    "hook_event_name",
    "event",
    "hook_event",
    "hookEvent",
    "name"
  ]) ?? "";
  const cwd = readString2(input, [
    "cwd",
    "current_working_directory",
    "workspace"
  ]);
  const toolName = readString2(input, ["toolName", "tool_name", "tool"]);
  const toolInput = input.toolInput ?? input.tool_input ?? input.input;
  const sessionId = readString2(input, ["session_id", "sessionId"]);
  const parsed = { event };
  if (cwd !== undefined) {
    parsed.cwd = cwd;
  }
  if (toolName !== undefined) {
    parsed.toolName = toolName;
  }
  if (toolInput !== undefined) {
    parsed.toolInput = toolInput;
  }
  if (sessionId !== undefined) {
    parsed.sessionId = sessionId;
  }
  const prompt = readString2(input, ["prompt"]);
  if (prompt !== undefined) {
    parsed.prompt = prompt;
  }
  if (input.stop_hook_active === true) {
    parsed.stopHookActive = true;
  }
  return parsed;
}
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
function parseStdinJson(rawInput) {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return {};
  }
  return JSON.parse(trimmed);
}

// src/hook-state.ts
import { createHash as createHash5, randomUUID as randomUUID4 } from "node:crypto";
import fs7 from "node:fs";
import path8 from "node:path";
var stateFileName = "hook-state.json";
var journalFileName = "hook-state.events.jsonl";
var maxDirtyPaths = 50;
var workspaceStateRoot = "workspaces";
function resolveWorkspaceStateDir(pluginData, workspaceRoot) {
  if (!pluginData) {
    return;
  }
  const workspaceKey = createHash5("sha256").update(path8.resolve(workspaceRoot)).digest("hex");
  return path8.join(pluginData, workspaceStateRoot, workspaceKey);
}
function emptyHookState() {
  return {
    dirtyPaths: [],
    kbCheckRun: false,
    impactCheckRun: false,
    impactCheckedPaths: []
  };
}
function statePath(pluginData) {
  return path8.join(pluginData, stateFileName);
}
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeDirtyPath(dirtyPath) {
  return dirtyPath.trim().replaceAll("\\", "/");
}
function uniqueTempPath(pluginData) {
  return path8.join(pluginData, `${stateFileName}.${process.pid}.${Date.now()}.${randomUUID4()}.tmp`);
}
function mergeDirtyPaths(existingPaths, dirtyPaths) {
  const merged = [...existingPaths, ...dirtyPaths].map(normalizeDirtyPath).filter((dirtyPath) => dirtyPath.length > 0);
  return {
    ...emptyHookState(),
    dirtyPaths: [...new Set(merged)].slice(-maxDirtyPaths)
  };
}
function coerceHookState(value) {
  if (!isRecord5(value) || !Array.isArray(value.dirtyPaths)) {
    return emptyHookState();
  }
  const dirtyPaths = value.dirtyPaths.filter((dirtyPath) => typeof dirtyPath === "string").map(normalizeDirtyPath).filter((dirtyPath) => dirtyPath.length > 0);
  const impactCheckedPaths = Array.isArray(value.impactCheckedPaths) ? value.impactCheckedPaths.filter((entry) => typeof entry === "string").map(normalizeDirtyPath).filter((entry) => entry.length > 0) : [];
  return {
    dirtyPaths: [...new Set(dirtyPaths)].slice(-maxDirtyPaths),
    kbCheckRun: value.kbCheckRun === true,
    impactCheckRun: value.impactCheckRun === true,
    impactCheckedPaths: [...new Set(impactCheckedPaths)].slice(-maxDirtyPaths)
  };
}
function journalPath(pluginData) {
  return path8.join(pluginData, journalFileName);
}
function applyJournalEvent(state, event) {
  switch (event.kind) {
    case "add_dirty_paths":
      return {
        ...state,
        dirtyPaths: mergeDirtyPathValues(state.dirtyPaths, event.dirtyPaths)
      };
    case "record_kb_check":
      return {
        ...state,
        kbCheckRun: true,
        impactCheckRun: state.impactCheckRun || event.impactCheckRun,
        impactCheckedPaths: event.impactCheckRun ? mergeDirtyPathValues(state.impactCheckedPaths, event.sourceFiles) : state.impactCheckedPaths
      };
    case "clear":
      return emptyHookState();
    case "replace":
      return coerceHookState(event.state);
  }
}
function readJournal(pluginData, initialState) {
  let contents;
  try {
    contents = fs7.readFileSync(journalPath(pluginData), "utf8");
  } catch {
    return initialState;
  }
  return contents.split(`
`).reduce((state, line) => {
    if (line.trim().length === 0)
      return state;
    try {
      const value = JSON.parse(line);
      if (!isRecord5(value) || typeof value.kind !== "string")
        return state;
      if (value.kind === "clear")
        return applyJournalEvent(state, { kind: "clear" });
      if (value.kind === "replace" && isRecord5(value.state)) {
        return applyJournalEvent(state, {
          kind: "replace",
          state: coerceHookState(value.state)
        });
      }
      if (value.kind === "add_dirty_paths" && Array.isArray(value.dirtyPaths)) {
        return applyJournalEvent(state, {
          kind: "add_dirty_paths",
          dirtyPaths: value.dirtyPaths.filter((entry) => typeof entry === "string")
        });
      }
      if (value.kind === "record_kb_check") {
        return applyJournalEvent(state, {
          kind: "record_kb_check",
          impactCheckRun: value.impactCheckRun === true,
          sourceFiles: Array.isArray(value.sourceFiles) ? value.sourceFiles.filter((entry) => typeof entry === "string") : []
        });
      }
    } catch {}
    return state;
  }, initialState);
}
function appendJournalEvent(pluginData, event) {
  fs7.mkdirSync(pluginData, { recursive: true });
  fs7.appendFileSync(journalPath(pluginData), `${JSON.stringify(event)}
`, "utf8");
}
function loadHookState(pluginData) {
  if (!pluginData) {
    return emptyHookState();
  }
  try {
    return readJournal(pluginData, coerceHookState(JSON.parse(fs7.readFileSync(statePath(pluginData), "utf8"))));
  } catch {
    return readJournal(pluginData, emptyHookState());
  }
}
function saveHookState(pluginData, state) {
  if (!pluginData) {
    return;
  }
  const boundedState = coerceHookState(state);
  appendJournalEvent(pluginData, { kind: "replace", state: boundedState });
  fs7.mkdirSync(pluginData, { recursive: true });
  const tempPath = uniqueTempPath(pluginData);
  fs7.writeFileSync(tempPath, `${JSON.stringify(boundedState)}
`);
  fs7.renameSync(tempPath, statePath(pluginData));
}
function addDirtyPaths(pluginData, dirtyPaths) {
  const initialState = loadHookState(pluginData);
  const fallbackState = {
    ...initialState,
    dirtyPaths: mergeDirtyPathValues(initialState.dirtyPaths, dirtyPaths)
  };
  if (!pluginData) {
    return fallbackState;
  }
  appendJournalEvent(pluginData, {
    kind: "add_dirty_paths",
    dirtyPaths: [...dirtyPaths]
  });
  return loadHookState(pluginData);
}
function mergeDirtyPathValues(existingPaths, dirtyPaths) {
  return mergeDirtyPaths(existingPaths, dirtyPaths).dirtyPaths;
}
function recordKbMcpTool(pluginData, toolName, options = {}) {
  const normalized = toolName.trim();
  if (normalized.length === 0) {
    return loadHookState(pluginData);
  }
  const initialState = loadHookState(pluginData);
  const update = (state) => {
    if (normalized !== "kb_check") {
      return state;
    }
    return {
      ...state,
      kbCheckRun: true,
      impactCheckRun: state.impactCheckRun || options.impactCheckRun === true,
      impactCheckedPaths: options.impactCheckRun === true ? mergeDirtyPathValues(state.impactCheckedPaths, options.sourceFiles ?? []) : state.impactCheckedPaths
    };
  };
  const fallbackState = update(initialState);
  if (!pluginData) {
    return fallbackState;
  }
  if (normalized !== "kb_check") {
    return initialState;
  }
  appendJournalEvent(pluginData, {
    kind: "record_kb_check",
    impactCheckRun: options.impactCheckRun === true,
    sourceFiles: [...options.sourceFiles ?? []]
  });
  return loadHookState(pluginData);
}
function clearDirtyPaths(pluginData) {
  const clearedState = emptyHookState();
  if (!pluginData) {
    return clearedState;
  }
  appendJournalEvent(pluginData, { kind: "clear" });
  saveHookState(pluginData, clearedState);
  return loadHookState(pluginData);
}

// src/kb-mcp-tools.ts
function extractKbMcpToolCall2(toolName, toolInput) {
  return extractKbMcpToolCall(toolName, toolInput);
}

// src/messages.ts
var DIRECT_KB_EDIT_WARNING = "Avoid direct edits to .kb/. Use Kibi MCP tools for KB discovery and mutations so project memory stays valid.";
function freshnessReminder(dirtyPaths) {
  const preview = dirtyPaths.slice(0, 10).map((dirtyPath) => `- ${dirtyPath}`);
  const remaining = dirtyPaths.length - preview.length;
  const suffix = remaining > 0 ? [`- …and ${remaining} more`] : [];
  return [
    "Kibi freshness reminder: source, test, or documentation paths changed during this Codex session.",
    "Before finishing, use Kibi MCP tools to resolve KB freshness or record a no-impact rationale.",
    ...preview,
    ...suffix
  ].join(`
`);
}
function impactCheckReminder(sourcePaths) {
  const preview = sourcePaths.slice(0, 10);
  const sourceFiles = JSON.stringify(preview);
  const remaining = sourcePaths.length - preview.length;
  const suffix = remaining > 0 ? [`- …and ${remaining} more`] : [];
  return [
    "Kibi impact reminder: source paths changed during this Codex session.",
    `Run kb_check({sourceFiles:${sourceFiles}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) before finishing.`,
    "Review symbol granularity and semantic review of linked requirements/tests before stopping.",
    ...preview.map((sourcePath) => `- ${sourcePath}`),
    ...suffix
  ].join(`
`);
}

// src/path-policy.ts
function isDirectKbPath(candidate) {
  return isKbPath(candidate);
}
function isMeaningfulTrackedPath2(candidate) {
  return isMeaningfulTrackedPath(candidate);
}
function isSourceImpactRelevantPath2(candidate) {
  return isSourceImpactRelevantPath(candidate);
}

// src/workspace-optin.ts
import fs8 from "node:fs";
import path9 from "node:path";
var KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT"
];
function nextAncestorDirectory(current) {
  const parent = path9.dirname(current);
  return parent === current ? undefined : parent;
}
function hasKibiManifest(directory) {
  return fs8.existsSync(path9.join(directory, ".kb", "manifest.json"));
}
function hasGitBoundary(directory) {
  return fs8.existsSync(path9.join(directory, ".git"));
}
function resolutionFor(root) {
  return { root, optedIn: hasKibiManifest(root) };
}
function resolveKibiWorkspace(startDir, env = process.env) {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      return resolutionFor(path9.resolve(value));
    }
  }
  let current = path9.resolve(startDir && startDir.trim().length > 0 ? startDir : process.cwd());
  while (current !== undefined) {
    if (hasKibiManifest(current)) {
      return { root: current, optedIn: true };
    }
    if (hasGitBoundary(current)) {
      return { root: current, optedIn: false };
    }
    current = nextAncestorDirectory(current);
  }
  return resolutionFor(path9.resolve(startDir ?? process.cwd()));
}

// src/hook-runner.ts
var editableTools = new Set(["Edit", "MultiEdit", "Write", "apply_patch"]);
function defaultResult() {
  return { continue: true };
}
function isEditLikeTool(toolName) {
  return toolName === undefined || editableTools.has(toolName);
}
function isKnownEditTool(toolName) {
  return toolName !== undefined && editableTools.has(toolName);
}
function editTargets(workspaceRoot, input) {
  return extractEditedPaths(input.toolInput).map((rawPath) => canonicalizeWorkspacePath(workspaceRoot, {
    eventCwd: input.cwd,
    rawPath
  })).filter((target) => target !== undefined).map((target) => ({
    relative: target.workspaceRelative,
    absolute: target.absolute
  }));
}
function preEditContext(workspaceRoot, stateDir, input, env) {
  const targets = editTargets(workspaceRoot, input);
  if (targets.length === 0)
    return;
  const index = loadKnowledgeIndex(workspaceRoot, stateDir);
  const summarize = createEntitySummarizer(workspaceRoot);
  const session = { stateDir, sessionId: input.sessionId };
  const words = requestWords(session);
  const notice = firmNotice(targets, index.files, summarize, session, input, env);
  const knowledge = editKnowledgeContext({
    relativePaths: targets.map((target) => target.relative),
    symbolsFor: (relativePath) => index.files[relativePath] ?? [],
    summarize,
    stateDir,
    sessionId: input.sessionId,
    focusFor: (relativePath) => {
      const target = targets.find((candidate) => candidate.relative === relativePath);
      return target ? editFocus(target.absolute, input.toolInput) : undefined;
    },
    noteFor: (relativePath) => {
      if (!isSourceImpactRelevantPath2(relativePath))
        return;
      const unread = index.manifest === "unreadable" || index.coordinateFiles.includes(relativePath) && !index.unlinkedFiles.includes(relativePath);
      if (!unread)
        return unownedSourceNote(relativePath, requirementCandidatesForPath(workspaceRoot, relativePath, undefined, words));
      const noticeKey = `${input.sessionId ?? ""}\x00notice\x00manifest-unreadable`;
      return claimSnippetSlot(stateDir, noticeKey) ? unreadableManifestNote(relativePath) : undefined;
    }
  });
  const parts = [notice, knowledge].filter((part) => part !== undefined);
  return parts.join(`

`) || undefined;
}
function firmNotice(targets, files, summarize, session, input, env) {
  if (!confirmFirmEdits(env))
    return;
  const settled = settledFirmRequirements(session);
  for (const target of targets) {
    const focus = editFocus(target.absolute, input.toolInput);
    const { ids, symbol } = firmRequirementsTouched({
      symbols: files[target.relative] ?? [],
      focus,
      wholeFile: focus === undefined,
      summarize,
      confirmed: settled
    });
    if (ids.length === 0)
      continue;
    settleFirmRequirements(session, ids);
    return firmEditNotice(symbol ? `${symbol.title} in ${target.relative}` : target.relative, ids.map(summarize));
  }
  return;
}
function packageVersion() {
  return readPackageVersion(path10.join(path10.dirname(fileURLToPath(import.meta.url)), "..", "package.json"));
}
function editTelemetryTraces(workspaceRoot, stateDir, input) {
  const files = loadKnowledgeIndex(workspaceRoot, stateDir).files;
  return editTraces(editTargets(workspaceRoot, input).map((target) => target.relative), (relativePath) => implementedRequirementIds(files[relativePath] ?? []));
}
function recordToolTelemetry(workspaceRoot, stateDir, input, startedAt, env) {
  if (!hookTracesWanted(env))
    return;
  const kbUsage = kbUsageTrace(input.toolName, input.toolInput);
  if (!kbUsage && !isKnownEditTool(input.toolName))
    return;
  const traces = kbUsage ? [kbUsage] : editTelemetryTraces(workspaceRoot, stateDir, input);
  appendHookUsageRows({
    host: "codex",
    packageVersion: packageVersion(),
    workspaceRoot,
    event: "PostToolUse",
    sessionId: input.sessionId,
    hostTool: input.toolName,
    startedAt
  }, traces, env);
}
async function runHook(rawInput, environment = {}) {
  const startedAt = new Date;
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? process.env.PLUGIN_DATA;
  const workspace = resolveKibiWorkspace(input.cwd ?? process.cwd());
  if (!workspace.optedIn) {
    return defaultResult();
  }
  const stateDir = resolveWorkspaceStateDir(pluginData, workspace.root);
  try {
    switch (input.event) {
      case "SessionStart":
        return defaultResult();
      case "UserPromptSubmit": {
        const rule = recordRequest({ stateDir, sessionId: input.sessionId }, input.prompt ?? "");
        if (rule === undefined)
          return defaultResult();
        return {
          continue: true,
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: rulePromptNote(rule)
          }
        };
      }
      case "PreToolUse": {
        const stamped = stampKibiWorkspace(input.toolName, input.toolInput, workspace.root);
        if (stamped) {
          return {
            continue: true,
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "allow",
              updatedInput: stamped
            }
          };
        }
        const explicitPaths = extractEditedPaths(input.toolInput);
        const hasDirectKbEdit = isEditLikeTool(input.toolName) && explicitPaths.some(isDirectKbPath);
        if (hasDirectKbEdit) {
          return { continue: true, systemMessage: DIRECT_KB_EDIT_WARNING };
        }
        let context;
        try {
          context = isKnownEditTool(input.toolName) ? preEditContext(workspace.root, stateDir, input, environment.env ?? process.env) : undefined;
        } catch {}
        if (context) {
          return {
            continue: true,
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              additionalContext: context
            }
          };
        }
        return defaultResult();
      }
      case "PostToolUse": {
        try {
          recordToolTelemetry(workspace.root, stateDir, input, startedAt, environment.env);
        } catch {}
        const kbToolCall = extractKbMcpToolCall2(input.toolName, input.toolInput);
        if (kbToolCall) {
          recordKbMcpTool(stateDir, kbToolCall.toolName, {
            impactCheckRun: kbToolCall.impactCheckRun,
            sourceFiles: kbToolCall.sourceFiles
          });
        }
        const dirtyPaths = extractEditedPaths(input.toolInput).filter(isMeaningfulTrackedPath2);
        if (dirtyPaths.length > 0) {
          addDirtyPaths(stateDir, dirtyPaths);
        }
        const session = { stateDir, sessionId: input.sessionId };
        if (isKnownEditTool(input.toolName) && dirtyPaths.some(isSourceImpactRelevantPath2)) {
          markDecisionFlag(session, "source-edited");
        }
        if (kbToolCall?.toolName === "kb_upsert" || kbUsageTrace(input.toolName, input.toolInput)?.kbOperation === "kb_upsert") {
          markDecisionFlag(session, "kb-recorded");
          if (isRequirementUpsert(input.toolInput)) {
            markDecisionFlag(session, "requirement-recorded");
          }
        }
        return defaultResult();
      }
      case "Stop": {
        const state = loadHookState(stateDir);
        const uncheckedSourcePaths = state.dirtyPaths.filter(isSourceImpactRelevantPath2).filter((sourcePath) => !state.impactCheckedPaths.includes(sourcePath));
        const session = { stateDir, sessionId: input.sessionId };
        if (!input.stopHookActive && claimCaptureReminder(session)) {
          const reason = [
            captureReminder(hasDecisionFlag(session, "rule-prompt")),
            ...uncheckedSourcePaths.length > 0 ? [impactCheckReminder(uncheckedSourcePaths)] : []
          ].join(`
`);
          clearDirtyPaths(stateDir);
          return { continue: true, decision: "block", reason };
        }
        if (!input.stopHookActive && claimSignoffReminder(session, workspace.root)) {
          return {
            continue: true,
            decision: "block",
            reason: signoffReminder()
          };
        }
        if (uncheckedSourcePaths.length > 0) {
          clearDirtyPaths(stateDir);
          return {
            continue: true,
            systemMessage: impactCheckReminder(uncheckedSourcePaths)
          };
        }
        const freshnessPaths = state.dirtyPaths.filter((dirtyPath) => !isSourceImpactRelevantPath2(dirtyPath));
        if (freshnessPaths.length > 0) {
          clearDirtyPaths(stateDir);
          return {
            continue: true,
            systemMessage: freshnessReminder(freshnessPaths)
          };
        }
        if (state.dirtyPaths.length > 0 || state.kbCheckRun) {
          clearDirtyPaths(stateDir);
        }
        return defaultResult();
      }
      default:
        return defaultResult();
    }
  } finally {
    await finishHookTelemetry({
      event: input.event,
      workspaceRoot: workspace.root,
      sessionId: input.sessionId
    }, environment.env ?? process.env);
  }
}
async function main() {
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}
`);
}
function isInvokedAsCli(argv1, moduleUrl) {
  const invokedPath = argv1 ? pathToFileURL(path10.resolve(argv1)).href : "";
  return moduleUrl === invokedPath;
}
async function runHookCli() {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown hook error";
    process.stdout.write(`${JSON.stringify({ continue: true, systemMessage: `Kibi hook runner error: ${message}` })}
`);
  }
}
async function runHookCliIfMain(isMain = isInvokedAsCli(process.argv[1], import.meta.url), start = runHookCli) {
  if (!isMain)
    return;
  await start();
}
runHookCliIfMain();
var hookRunnerPath = fileURLToPath(import.meta.url);
export {
  hookRunnerPath,
  isInvokedAsCli,
  main,
  runHook,
  runHookCli,
  runHookCliIfMain
};
