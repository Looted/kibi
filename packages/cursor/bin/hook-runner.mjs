#!/usr/bin/env node

// src/hook-runner.ts
import fs8 from "node:fs";
import path10 from "node:path";
import { fileURLToPath as fileURLToPath2, pathToFileURL } from "node:url";

// ../agent-core/dist/decision-guard.js
import { createHash as createHash2 } from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";

// ../agent-core/dist/requirement-candidates.js
import path from "node:path";
var REQUIREMENTS_DIR = path.join(".kb", "requirements");
var LAYOUT_WORDS = stems([
  "src",
  "app",
  "apps",
  "lib",
  "libs",
  "source",
  "page",
  "component",
  "view",
  "screen",
  "package",
  "main",
  "index",
  "shared",
  "common",
  "core",
  "util",
  "helper",
  "public",
  "static",
  "asset",
  "web",
  "client",
  "server",
  "frontend",
  "backend",
  "module",
  "feature",
  "internal",
  "service",
  "test",
  "spec",
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
var FILLER_WORDS = stems([
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
  return text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length >= 3 && !/\d/.test(word)).map((word) => word.length > 4 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word) ?? [];
}
function stems(list) {
  return new Set(list.flatMap(words));
}
function requestTopicWords(text, limit = 40) {
  const found = words(text).filter((word) => !FILLER_WORDS.has(word) && !REQUEST_FILLER_WORDS.has(word));
  return [...new Set(found)].slice(0, limit);
}
var REQUEST_FILLER_WORDS = stems([
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

// ../agent-core/dist/snippets.js
import fs2 from "node:fs";

// ../agent-core/dist/knowledge-index.js
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path2 from "node:path";
var SYMBOLS_MANIFEST = ".kb/symbols.yaml";
var SYMBOL_COORDINATES = ".kb/symbol-coordinates.yaml";
var INDEX_FORMAT = "kibi-agent-core.knowledge-index.v2";
var CACHE_FILE = "knowledge-index.json";
function unquote(raw) {
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
  return value.replace(/\s#[\s\S]*/, "").trimEnd();
}
var FLOW_BLANK = /(?:[ \t\n\r]|#[^\n]*)*/y;
var DOUBLE_QUOTED = /"(?:[^"\\]|\\[\s\S])*"/y;
var SINGLE_QUOTED = /'(?:[^']|'')*'/y;
function parseFlow(text, start = 0) {
  let pos = start;
  const skip = () => {
    FLOW_BLANK.lastIndex = pos;
    FLOW_BLANK.test(text);
    pos = FLOW_BLANK.lastIndex;
  };
  const scalar = (stops) => {
    const quote = text.charAt(pos);
    if (quote === '"' || quote === "'") {
      const pattern = quote === '"' ? DOUBLE_QUOTED : SINGLE_QUOTED;
      pattern.lastIndex = pos;
      const raw = pattern.exec(text)[0];
      pos = pattern.lastIndex;
      return unquote(raw);
    }
    let cursor = pos;
    for (;; ) {
      const char = text.charAt(cursor);
      if (stops.includes(char) && char !== ":" || char === `
` || char === "\r")
        break;
      if (stops.includes(":") && char === ":" && /[\s,\]}]/.test(text.charAt(cursor + 1)))
        break;
      if (char === "#" && /\s/.test(text.charAt(cursor - 1)))
        break;
      cursor += 1;
    }
    const raw = text.slice(pos, cursor).trim();
    pos = cursor;
    return raw;
  };
  const value = () => {
    const open = text.charAt(pos);
    if (open === "[") {
      pos += 1;
      const items = [];
      for (;; ) {
        skip();
        if (text.charAt(pos) === "]") {
          pos += 1;
          return items;
        }
        items.push(value());
        skip();
        if (text.charAt(pos) === ",")
          pos += 1;
        else if (text.charAt(pos) !== "]")
          throw new SyntaxError;
      }
    }
    if (open === "{") {
      pos += 1;
      const record = {};
      for (;; ) {
        skip();
        if (text.charAt(pos) === "}") {
          pos += 1;
          return record;
        }
        const key = scalar(":,}");
        skip();
        let entry;
        if (text.charAt(pos) === ":") {
          pos += 1;
          skip();
          entry = text.charAt(pos) === "," || text.charAt(pos) === "}" ? undefined : value();
        }
        if (key.length > 0)
          record[key] = entry;
        skip();
        if (text.charAt(pos) === ",")
          pos += 1;
        else if (text.charAt(pos) !== "}")
          throw new SyntaxError;
      }
    }
    return scalar(",]}");
  };
  try {
    const parsed = value();
    return { value: parsed, end: pos };
  } catch {}
  return;
}
function opensFlow(raw) {
  return raw.startsWith("[") || raw.startsWith("{");
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
  if (!raw)
    return;
  return completeFlowValue(raw)?.value ?? unquote(raw);
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
  return parsed.value.filter((item) => typeof item === "object" && !Array.isArray(item));
}
function scanFlowSection(text, sectionKey) {
  const header = new RegExp(`^${sectionKey}:[ \\t]*(\\[)?`);
  let offset = 0;
  let first = true;
  let afterHeader = false;
  for (const piece of text.split(/(\r?\n)/)) {
    const content = piece.trim();
    if (content.length > 0 && !content.startsWith("#")) {
      const bracket = offset + piece.indexOf("[");
      if ((first || afterHeader) && content.startsWith("["))
        return flowRecords(text, bracket);
      if (afterHeader)
        return;
      first = false;
      const match = header.exec(piece);
      if (match) {
        if (match[1] !== undefined)
          return flowRecords(text, bracket);
        afterHeader = true;
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
  let item;
  let listKey;
  let listItem;
  let otherSection = false;
  let pendingFlow;
  const assign = (target, key, raw, recordIndent) => {
    if (raw !== undefined && unbalancedFlow(raw)) {
      pendingFlow = { target, key, first: raw, text: raw, recordIndent };
      return false;
    }
    const value = parseScalarOrFlow(raw);
    if (value === undefined)
      return true;
    target[key] = value;
    return false;
  };
  for (const rawLine of text.split(/\r?\n/)) {
    const content = rawLine.trim();
    if (content.length === 0 || content.startsWith("#"))
      continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const dash = /^(\s*)-(\s+)(.*)$/.exec(rawLine);
    if (pendingFlow !== undefined) {
      if (indent > pendingFlow.recordIndent) {
        pendingFlow.text += `
${content}`;
        const parsed = parseFlow(pendingFlow.text);
        if (parsed === undefined)
          continue;
        pendingFlow.target[pendingFlow.key] = parsed.value;
        pendingFlow = undefined;
        continue;
      }
      pendingFlow.target[pendingFlow.key] = unquote(pendingFlow.first);
      pendingFlow = undefined;
    }
    if (indent === 0 && !dash) {
      const pair = keyValue.exec(content);
      otherSection = pair === null || unquote(pair[1]) !== sectionKey;
      item = undefined;
      continue;
    }
    if (otherSection)
      continue;
    if (dash && (item === undefined || indent === item.indent)) {
      const rest = dash[3];
      item = { record: {}, indent, keyIndent: rawLine.length - rest.length };
      records.push(item.record);
      listKey = undefined;
      listItem = undefined;
      const pair = keyValue.exec(rest);
      if (pair !== null) {
        const key = unquote(pair[1]);
        if (assign(item.record, key, pair[2], indent))
          listKey = key;
      }
      continue;
    }
    if (item === undefined || indent <= item.indent)
      continue;
    if (dash) {
      if (listKey === undefined)
        continue;
      const list = Array.isArray(item.record[listKey]) ? item.record[listKey] : [];
      item.record[listKey] = list;
      const rest = dash[3];
      const flowItem = completeFlowValue(rest);
      listItem = undefined;
      if (flowItem !== undefined) {
        list.push(flowItem.value);
        continue;
      }
      const pair = keyValue.exec(rest);
      if (pair?.[2] !== undefined) {
        listItem = { [unquote(pair[1])]: parseScalarOrFlow(pair[2]) };
        list.push(listItem);
      } else {
        list.push(unquote(rest));
      }
      continue;
    }
    const pair = keyValue.exec(content);
    if (pair === null)
      continue;
    const key = unquote(pair[1]);
    if (indent === item.keyIndent) {
      listItem = undefined;
      listKey = assign(item.record, key, pair[2], item.indent) ? key : undefined;
    } else if (listItem !== undefined) {
      assign(listItem, key, pair[2], item.indent);
    }
  }
  return records;
}
function scanSymbolCoordinates(text) {
  const coordinates = {};
  let inCoordinates = false;
  let current;
  for (const rawLine of text.split(/\r?\n/)) {
    const pair = keyValue.exec(rawLine.trim());
    if (pair === null)
      continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const key = unquote(pair[1]);
    if (indent === 0) {
      inCoordinates = key === "coordinates";
      current = undefined;
      continue;
    }
    if (!inCoordinates)
      continue;
    if (current !== undefined && indent < current.indent)
      continue;
    if (current === undefined || indent === current.indent) {
      coordinates[key] ??= {};
      current = { indent, entry: coordinates[key] };
      continue;
    }
    if (pair[2] === undefined)
      continue;
    const value = unquote(pair[2]);
    if (key === "sourceFile") {
      const sourceFile = normalizeSourceFile(value);
      if (sourceFile.length > 0)
        current.entry.sourceFile = sourceFile;
      continue;
    }
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric))
      continue;
    if (key === "sourceLine")
      current.entry.line = numeric;
    if (key === "sourceEndLine")
      current.entry.endLine = numeric;
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
    const relate = (type, target) => {
      if (type === "implements")
        pushUnique(symbol.implements, target);
      else if (type === "covered_by")
        pushUnique(symbol.coveredBy, target);
      else if (type === "executable_for")
        pushUnique(symbol.executableFor, target);
    };
    const relateTyped = (relation) => {
      const typed = relation ?? {};
      if (typeof typed.target === "string")
        relate(typed.type, typed.target);
    };
    if (options.legacyLinksAsImplements !== false) {
      let links = [];
      if (typeof record.links === "string")
        links = [record.links];
      else if (Array.isArray(record.links))
        links = record.links;
      for (const link of links) {
        if (typeof link === "string")
          relate("implements", link);
        else
          relateTyped(link);
      }
    }
    if (Array.isArray(record.relationships))
      for (const relation of record.relationships)
        relateTyped(relation);
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
    const stats = fs.statSync(filePath);
    return `${stats.size}:${stats.mtimeMs}`;
  } catch {
    return "missing";
  }
}
function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {}
  return;
}
function writeCacheAtomically(cachePath, payload) {
  try {
    fs.mkdirSync(path2.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, payload);
    fs.renameSync(temporary, cachePath);
  } catch {}
}
function readCachedIndex(cachePath, signature) {
  try {
    const parsed = JSON.parse(String(fs.readFileSync(cachePath)));
    if (parsed.signature === signature && parsed.index)
      return parsed.index;
  } catch {}
  return;
}
function scanKnowledgeIndex(symbolsPath, coordinatesPath, options) {
  const symbolsText = readText(symbolsPath);
  const coordinatesText = readText(coordinatesPath);
  const records = symbolsText === undefined ? [] : scanSymbolsManifest(symbolsText);
  return buildKnowledgeIndex(records, coordinatesText === undefined ? {} : scanSymbolCoordinates(coordinatesText), options, manifestStateOf(symbolsText, records.length));
}
function loadKnowledgeIndex(workspaceRoot, cacheDir, options = {}) {
  const symbolsPath = path2.join(workspaceRoot, SYMBOLS_MANIFEST);
  const coordinatesPath = path2.join(workspaceRoot, SYMBOL_COORDINATES);
  if (!cacheDir)
    return scanKnowledgeIndex(symbolsPath, coordinatesPath, options);
  const legacyMode = options.legacyLinksAsImplements === false ? "typed" : "legacy";
  const signature = `${INDEX_FORMAT}|${legacyMode}|${fileSignature(symbolsPath)}|${fileSignature(coordinatesPath)}`;
  const cachePath = path2.join(cacheDir, options.cacheFileName ?? CACHE_FILE);
  const cached = readCachedIndex(cachePath, signature);
  if (cached !== undefined)
    return cached;
  const index = scanKnowledgeIndex(symbolsPath, coordinatesPath, options);
  writeCacheAtomically(cachePath, JSON.stringify({ signature, index }));
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
var SUMMARY_SCALARS = {
  semantic_text: "statement",
  fact_kind: "factKind",
  subject_key: "subjectKey",
  property_key: "propertyKey",
  operator: "operator",
  unit: "unit",
  claim_text: "claimText"
};
var SCALAR_VALUE_FIELDS = new Set([
  "value_string",
  "value_int",
  "value_number",
  "value_bool"
]);
function readScalar(lines, index, raw) {
  const block = /^[>|][+-]?$/.test(raw.trim());
  const parts = block ? [] : [raw.trim()];
  let last = index;
  for (const next of lines.slice(index + 1)) {
    if (next.trim() === "---" || !/^\s+\S/.test(next))
      break;
    if (!block && /^\s+-\s/.test(next))
      break;
    parts.push(next.trim());
    last += 1;
  }
  const joined = parts.join(" ");
  return { value: block ? joined : unquote(joined), last };
}
function firstParagraph(lines) {
  const paragraph = [];
  for (const line of lines) {
    const text = line.trim();
    if (text === "") {
      if (paragraph.length > 0)
        break;
      continue;
    }
    if (/^#{1,6}\s/.test(text)) {
      if (paragraph.length > 0)
        break;
      continue;
    }
    paragraph.push(text);
  }
  return paragraph.join(" ");
}
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
  let cached = shardCache.get(shardPath);
  if (cached?.signature !== signature) {
    const byFrom = new Map;
    const text = readText(shardPath);
    if (text !== undefined) {
      for (const { type, from, to } of scanRecordSequence(text, "relationships")) {
        if (typeof type !== "string" || typeof to !== "string")
          continue;
        const list = byFrom.get(from) ?? [];
        list.push({ type, target: to });
        byFrom.set(from, list);
      }
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
    const descriptor = fs.openSync(path2.join(workspaceRoot, ".kb", lane[1], `${entityId}.md`), "r");
    try {
      const buffer = Buffer.alloc(8192);
      const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs.closeSync(descriptor);
    }
  } catch {
    return { id: entityId };
  }
  const lines = head.split(/\r?\n/);
  if (lines[0].trim() !== "---")
    return { id: entityId };
  const summary = { id: entityId };
  const authored = [];
  const claim = {};
  const values = [];
  let inLinks = false;
  let inValueSet = false;
  let inOrigin = false;
  let originKind;
  let closed = false;
  let bodyStart = lines.length;
  let pending;
  for (let index = 1;index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "---") {
      closed = true;
      bodyStart = index + 1;
      break;
    }
    const scalar = /^([a-z_]+):\s*(.*)/.exec(line);
    const scalarField = scalar ? SUMMARY_SCALARS[scalar[1]] : undefined;
    if (scalar && scalarField && scalar[2]) {
      const { value, last } = readScalar(lines, index, scalar[2]);
      if (value !== "") {
        if (scalarField === "statement")
          summary.statement = value;
        else
          claim[scalarField] = value;
      }
      index = last;
      flushLink(authored, pending);
      pending = undefined;
      inLinks = false;
      inValueSet = false;
      continue;
    }
    if (scalar && SCALAR_VALUE_FIELDS.has(scalar[1]) && scalar[2]) {
      values.push(unquote(scalar[2]));
    }
    const flowSet = /^value_set:\s*\[(.*)\]\s*$/.exec(line);
    if (flowSet !== null && flowSet[1].trim()) {
      values.push(...flowSet[1].split(",").map((member) => unquote(member)));
    }
    if (/^\S/.test(line))
      inValueSet = /^value_set:\s*$/.test(line);
    else if (inValueSet) {
      const member = /^\s*-\s*(.+)/.exec(line);
      if (member)
        values.push(unquote(member[1]));
    }
    const flowOrigin = /^origin:\s*\{.*\bkind:\s*["']?([a-z]+)/.exec(line);
    if (flowOrigin)
      originKind = flowOrigin[1];
    const nestedKind = inOrigin ? /^\s+kind:\s*["']?([a-z]+)/.exec(line) : null;
    if (nestedKind)
      originKind = nestedKind[1];
    if (/^\S/.test(line))
      inOrigin = /^origin:\s*$/.test(line);
    const match = /^(title|status|firmness):\s*(.*)/.exec(line);
    if (match?.[1] === "title" && match[2])
      summary.title = unquote(match[2]);
    if (match?.[1] === "status" && match[2])
      summary.status = unquote(match[2]);
    if (match?.[1] === "firmness" && match[2])
      summary.firmness = unquote(match[2]);
    if (/^\S/.test(line)) {
      flushLink(authored, pending);
      pending = undefined;
      inLinks = /^links:\s*$/.test(line);
      continue;
    }
    if (!inLinks)
      continue;
    const entry = /^\s*-\s*(.*)/.exec(line);
    if (entry) {
      flushLink(authored, pending);
      pending = {};
    }
    if (!pending)
      continue;
    const body = (entry ? entry[1] : line).trim();
    const field = /^(type|target):\s*(.+)/.exec(body);
    if (field?.[1] === "type")
      pending.type = unquote(field[2]);
    else if (field?.[1] === "target")
      pending.target = unquote(field[2]);
    else if (entry && SAFE_ENTITY_ID.test(unquote(body)))
      pending.bare = unquote(body);
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
  if (values.length > 0)
    claim.values = values;
  if (Object.keys(claim).length > 0)
    summary.claim = claim;
  if (summary.statement === undefined && lane[1] === "requirements" && closed) {
    const paragraph = firstParagraph(lines.slice(bodyStart));
    if (paragraph)
      summary.statement = paragraph;
  }
  return summary;
}

// ../agent-core/dist/snippets.js
var MAX_REQUIREMENTS = 4;
var MAX_SYMBOLS_PER_REQUIREMENT = 3;
var MAX_TESTS = 3;
var MAX_TITLE = 80;
var MAX_GROUNDING = 2;
var MAX_CLAIM = 160;
var MAX_FOCUS_SCAN_BYTES = 2 * 1024 * 1024;
var MAX_SNIPPET_CHARS = 1200;
function truncate(text, limit) {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}
function overlaps(symbol, range) {
  const line = Number(symbol.line);
  return line <= range.end && Number(symbol.endLine ?? line) >= range.start;
}
function span(symbol) {
  return Number(symbol.endLine ?? symbol.line) - Number(symbol.line);
}
function focusedSymbols(symbols, focus) {
  if (!focus)
    return [];
  return symbols.filter((symbol) => focus.some((range) => overlaps(symbol, range))).sort((left, right) => span(left) - span(right));
}
function editFocus(absolutePath, toolInput) {
  const input = toolInput ?? {};
  const edits = Array.isArray(input.edits) ? input.edits : [];
  const usable = [input, ...edits.map((edit) => edit ?? {})].flatMap((record) => [record.old_string, record.oldString]).filter((needle) => typeof needle === "string" && needle.length > 0);
  if (usable.length === 0)
    return;
  let content;
  try {
    if (fs2.statSync(absolutePath).size > MAX_FOCUS_SCAN_BYTES)
      return;
    content = fs2.readFileSync(absolutePath, "utf8");
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
var RETIRED_STATUS = /supersed|deprecat|reject|obsolete|retired/i;
function isRetiredStatus(status) {
  return RETIRED_STATUS.test(String(status));
}
function describeEntity(summary) {
  const retired = isRetiredStatus(summary.status) ? ` (${summary.status})` : "";
  const firmness = !retired && (summary.firmness === "firm" || summary.firmness === "exploratory") ? summary.firmness === "firm" ? " [firm: ask before changing]" : " [exploratory]" : "";
  const notable = `${retired}${firmness}`;
  const title = displayTitle(summary);
  return title ? `${summary.id}${notable}: ${truncate(title, MAX_TITLE)}` : `${summary.id}${notable}`;
}
function displayTitle(summary) {
  const { title, statement } = summary;
  if (!title || !statement?.startsWith(title))
    return title;
  const rest = statement.slice(title.length);
  if (!/^\.\S/.test(rest))
    return title;
  const end = rest.search(/[.!?](?:\s|$)/);
  return end === -1 ? statement : statement.slice(0, title.length + end);
}
function jsonString(value) {
  return JSON.stringify(value);
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
var PROPERTY_VERBS = {
  calls: "call",
  imports: "import",
  reads: "read",
  uses: "use",
  throws: "throw"
};
var OPERATOR_PHRASES = {
  eq: "must be",
  neq: "must not be",
  lt: "must be less than",
  lte: "must be at most",
  gt: "must be greater than",
  gte: "must be at least",
  matches: "must match",
  includes: "must include",
  subset_of: "must be within",
  excludes: "must not include"
};
function joinMembers(values, conjunction) {
  if (values.length === 1)
    return values[0];
  return `${values.slice(0, -1).join(", ")} ${conjunction} ${values.at(-1)}`;
}
var MODAL = /^(.{1,100}?)\s+(?:must|may|can|cannot|should|shall|will|never)\b/i;
function subjectPhrase(claim) {
  const spoken = MODAL.exec(String(claim.claimText))?.[1];
  if (spoken)
    return spoken;
  return claim.subjectKey?.replace(/[._]+/g, " ").trim() || undefined;
}
function factClaimSentence(summary) {
  const claim = summary.claim;
  if (!claim || claim.factKind === "subject")
    return;
  const values = claim.values ?? [];
  if (claim.propertyKey && claim.operator && values.length > 0) {
    const subject = subjectPhrase(claim);
    if (!subject)
      return claim.claimText;
    const verb = PROPERTY_VERBS[claim.propertyKey];
    const verbal = verb ? {
      excludes: `must not ${verb} ${joinMembers(values, "or")}`,
      includes: `must ${verb} ${joinMembers(values, "and")}`,
      subset_of: `may ${verb} only ${joinMembers(values, "or")}`,
      eq: `must ${verb} exactly ${joinMembers(values, "and")}`
    }[claim.operator] : undefined;
    if (verbal)
      return `${subject} ${verbal}`;
    const phrase = OPERATOR_PHRASES[claim.operator];
    if (phrase) {
      const property = claim.propertyKey.replace(/_+/g, " ");
      const unit = claim.unit ? ` ${claim.unit}` : "";
      return `${subject}: ${property} ${phrase} ${values.join(", ")}${unit}`;
    }
  }
  return claim.claimText;
}
function groundingText(summary) {
  if (summary.claim?.factKind === "subject")
    return;
  return factClaimSentence(summary) ?? summary.title;
}
function withoutClosingStop(text) {
  return text.replace(/[.\s]+$/, "");
}
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
    const claims = [
      ...new Set(facts.map((id) => groundingText(summarize(id))).filter((sentence) => Boolean(sentence)).map(withoutClosingStop))
    ];
    const statement = requirement.statement ? withoutClosingStop(requirement.statement) : undefined;
    const shown = claims.length > 0 ? claims.slice(0, maxFacts) : statement ? [statement] : [];
    const more = claims.length > maxFacts ? ` +${claims.length - maxFacts} more` : "";
    if (shown.length > 0) {
      lines.push(`${requirementId} must keep true: ${shown.map((claim) => truncate(claim, MAX_CLAIM)).join("; ")}${more}.`);
    }
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
  const ordered = new Set([...focus, ...symbols]);
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
    return focusOrder !== 0 ? focusOrder : owners.get(right).length - owners.get(left).length;
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
    const symbolTitles = owners.get(requirementId);
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
    throw new Error;
  const key = createHash2("sha256").update(session.sessionId?.trim() || "unattributed").digest("hex").slice(0, 32);
  return path3.join(session.stateDir, "decision-guard", key, name);
}
function writeMarker(file, content) {
  fs3.mkdirSync(path3.dirname(file), { recursive: true });
  fs3.writeFileSync(file, content);
}
function touchMarker(file, flag) {
  fs3.mkdirSync(path3.dirname(file), { recursive: true });
  fs3.closeSync(fs3.openSync(file, flag));
}
function readMarker(session, name) {
  return JSON.parse(String(fs3.readFileSync(sessionPath(session, name))));
}
function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function markDecisionFlag(session, flag) {
  try {
    touchMarker(sessionPath(session, flag), "w");
  } catch {}
}
function hasDecisionFlag(session, flag) {
  try {
    return fs3.existsSync(sessionPath(session, flag));
  } catch {
    return false;
  }
}
function claimDecisionFlag(session, flag) {
  try {
    touchMarker(sessionPath(session, flag), "wx");
    return true;
  } catch {
    return false;
  }
}
function recordRequest(session, prompt) {
  const rule = statedRule(prompt);
  try {
    writeMarker(sessionPath(session, "request-words.json"), JSON.stringify(requestTopicWords(prompt)));
  } catch {}
  if (rule !== undefined)
    markDecisionFlag(session, "rule-prompt");
  return rule;
}
function claimCaptureReminder(session) {
  return hasDecisionFlag(session, "source-edited") && !hasDecisionFlag(session, "kb-recorded") && claimDecisionFlag(session, "capture-asked");
}
var SIGNOFF_LATEST_JSON = path3.join(".kb", "briefs", "signoff", "latest.json");
function record(value) {
  return typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
function isRequirementUpsert(toolInput) {
  const input = record(toolInput);
  const args = record(input?.arguments) ?? record(input?.args) ?? input;
  return args?.type === "req" && args.dryRun !== true;
}
function mtimeMs(file) {
  let time = Number.NaN;
  try {
    time = fs3.statSync(file()).mtimeMs;
  } catch {}
  return time;
}
function claimSignoffReminder(session, workspaceRoot) {
  const recorded = mtimeMs(() => sessionPath(session, "requirement-recorded"));
  if (Number.isNaN(recorded))
    return false;
  const shown = mtimeMs(() => path3.join(workspaceRoot, SIGNOFF_LATEST_JSON));
  if (shown >= recorded)
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
function readSettled(session) {
  try {
    return stringList(readMarker(session, "firm-settled.json"));
  } catch {
    return [];
  }
}
function settledFirmRequirements(session) {
  return new Set(readSettled(session));
}
function settleFirmRequirements(session, ids) {
  try {
    writeMarker(sessionPath(session, "firm-settled.json"), JSON.stringify([...new Set([...readSettled(session), ...ids])]));
  } catch {}
}
function holdRuleNote(session, phrase) {
  try {
    writeMarker(sessionPath(session, "rule-note"), rulePromptNote(phrase));
  } catch {}
}
function takeRuleNote(session) {
  let note = "";
  try {
    const file = sessionPath(session, "rule-note");
    note = String(fs3.readFileSync(file));
    fs3.rmSync(file);
  } catch {}
  return note || undefined;
}

// ../agent-core/dist/hook-usage-log.js
import { randomUUID as randomUUID4 } from "node:crypto";
import fs6 from "node:fs";
import path7 from "node:path";

// ../agent-core/dist/kb-mcp-tools.js
function isRecord(value) {
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
    if (isRecord(value)) {
      return value;
    }
  }
  return;
}
function canonicalKbToolName(toolName) {
  const trimmed = String(toolName).trim();
  const lastSegment = trimmed.includes("__") ? trimmed.split("__").at(-1) : trimmed.replace(/^MCP:/i, "");
  const operation = lastSegment.replace(/^kibi_/, "");
  return operation.startsWith("kb_") ? operation : undefined;
}
var KIBI_WORKSPACE_ARGUMENT = "workspaceRoot";
function isKibiMcpToolName(toolName) {
  const name = String(toolName).trim();
  if (/^MCP:kb_[a-z_]+$/i.test(name))
    return true;
  const segments = name.split("__");
  if (segments[0] !== "mcp")
    return false;
  const server = segments.slice(1, -1).join("__");
  return /kibi/i.test(server) && /^kb_[a-z_]+$/.test(segments.at(-1));
}
function stampKibiWorkspace(toolName, toolInput, workspaceRoot) {
  if (!workspaceRoot || !isKibiMcpToolName(toolName))
    return;
  const base = isRecord(toolInput) ? toolInput : {};
  return { ...base, [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot };
}
function resolveKibiInterface(mcpState, workspaceTrusted) {
  if (mcpState === "observed") {
    return "mcp";
  }
  return workspaceTrusted ? "cli" : "setup";
}
var TOOL_NAME_KEYS = ["toolName", "tool_name", "name"];
function extractKbMcpToolCall(toolName, toolInput) {
  const input = isRecord(toolInput) ? toolInput : {};
  let name = canonicalKbToolName(toolName) ?? readString(input, TOOL_NAME_KEYS);
  if (!name?.startsWith("kb_")) {
    const nested = input.arguments ?? input.args;
    const nestedTool = isRecord(nested) ? readString(nested, TOOL_NAME_KEYS) : undefined;
    return nestedTool?.startsWith("kb_") ? { toolName: nestedTool, impactCheckRun: false, sourceFiles: [] } : undefined;
  }
  const payload = readRecord(input, ["arguments", "args"]) ?? input;
  if (name === "kb_upsert" && readBoolean(payload, ["dryRun"]) === true) {
    name = "kb_validate_upsert";
  }
  const sourceFiles = readStringArray(payload, ["sourceFiles", "source_files"]);
  return {
    toolName: name,
    impactCheckRun: name === "kb_check" && readBoolean(payload, [
      "includeImpactDiagnostics",
      "include_impact_diagnostics"
    ]) === true && readBoolean(payload, [
      "includeWorkingTreeDiff",
      "include_working_tree_diff"
    ]) === true && sourceFiles.length > 0,
    sourceFiles
  };
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
  if (/kb_[a-z_]+$/.test(String(mcp)))
    return mcp;
  if (!toolName || !SHELL_TOOL_NAMES.has(toolName) || !isRecord(toolInput)) {
    return;
  }
  return kibiCliOperation(toolInput.command);
}

// ../agent-core/dist/path-policy.js
import path4 from "node:path";
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
function isRecord2(value) {
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
  if (!isRecord2(value))
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
function classifyPath(relativePath) {
  const segments = pathSegments(relativePath);
  if (segments[0] === ".kb")
    return "kb";
  if (segments.some((segment) => ignoredSegments.has(segment)))
    return "other";
  if (segments.some((segment) => documentationSegments.has(segment))) {
    return "other";
  }
  const basename = segments.at(-1);
  if (basename === undefined)
    return "other";
  const extension = path4.extname(basename).toLowerCase();
  if (!codeExtensions.has(extension))
    return "other";
  if (testBasename.test(basename) || segments.some((segment) => testSegments.has(segment))) {
    return "test";
  }
  return "source";
}
function isKbPath(candidate) {
  return pathSegments(candidate).includes(".kb");
}
function isCanonicalKbKnowledgePath(segments) {
  const lane = segments[segments.indexOf(".kb") + 1];
  return canonicalKbKnowledgeFiles.has(lane) || canonicalKbKnowledgeLanes.has(lane);
}
function isMeaningfulTrackedPath(candidate) {
  const segments = pathSegments(candidate);
  if (segments.some((segment) => ignoredSegments.has(segment)))
    return false;
  if (segments.includes(".kb"))
    return isCanonicalKbKnowledgePath(segments);
  const basename = segments.at(-1);
  if (basename === undefined)
    return false;
  const extension = path4.extname(basename).toLowerCase();
  if (basename === "README.md")
    return true;
  if (segments.some((segment) => documentationSegments.has(segment))) {
    return documentationExtensions.has(extension);
  }
  if (testBasename.test(basename) || segments.some((segment) => testSegments.has(segment))) {
    return codeExtensions.has(extension) || documentationExtensions.has(extension);
  }
  return codeExtensions.has(extension);
}
function isSourceImpactRelevantPath(candidate) {
  return classifyPath(normalizeWorkspacePath(candidate)) === "source";
}
function isDocumentationTrackedPath(candidate) {
  const segments = pathSegments(candidate);
  const basename = segments.at(-1);
  if (basename === undefined)
    return false;
  return segments.some((segment) => documentationSegments.has(segment)) || documentationExtensions.has(path4.extname(basename).toLowerCase());
}

// ../agent-core/dist/telemetry-signals.js
import { createHash as createHash3, randomUUID as randomUUID2 } from "node:crypto";
import fs4 from "node:fs";
import path5 from "node:path";
var RETRY_WINDOW_MS = 10 * 60 * 1000;
var SEARCH_REPEAT_WINDOW_MS = 2 * 60 * 1000;
var SKILL_WINDOW_MS = 30 * 60 * 1000;
var MAX_RECENT_ENTRIES = 200;
var RECENT_FILE = "telemetry-recent.json";
var KIBI_SKILL_NAMES = new Set([
  "kibi-bootstrap",
  "kibi-commit-review",
  "kibi-decisions",
  "kibi-freshness",
  "kibi-provable-code",
  "kibi-traceability",
  "kibi-usage"
]);
var RESULT_COUNT_BUCKETS = [
  [0, 0, "0"],
  [1, 1, "1"],
  [2, 5, "2-5"],
  [6, 10, "6-10"],
  [11, Number.POSITIVE_INFINITY, "11+"]
];
var RELATIONSHIP_COUNT_BUCKETS = [
  [0, 0, "0"],
  [1, 1, "1"],
  [2, 5, "2-5"],
  [6, Number.POSITIVE_INFINITY, "6+"]
];
var SMALL_COUNT_BUCKETS = [
  [1, 1, "1"],
  [2, 2, "2"],
  [3, 3, "3"],
  [4, Number.POSITIVE_INFINITY, "4+"]
];
var KIBI_SOURCE_PACKAGES = "agent-core|cli|mcp|core|runtime|claude|codex|cursor|opencode|zcode|vscode|plugin-[a-z0-9-]+|lang-[a-z0-9-]+";
var SOURCE_FRAME = new RegExp(`(?:^|/)packages/(${KIBI_SOURCE_PACKAGES})/((?:src|dist|bin)/.+)$`);
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}
var SKILL_FILE = /(?:^|[\\/])(kibi-[a-z0-9-]+)[\\/]SKILL\.md\b/i;
function skillName(name) {
  return KIBI_SKILL_NAMES.has(name) ? name : "other";
}
function skillInStrings(value, depth) {
  if (typeof value === "string") {
    const match = SKILL_FILE.exec(value);
    return match ? skillName(match[1].toLowerCase()) : undefined;
  }
  if (depth <= 0)
    return;
  for (const child of Object.values(value ?? {}).slice(0, 50)) {
    const found = skillInStrings(child, depth - 1);
    if (found)
      return found;
  }
  return;
}
function kibiSkillLoad(toolName, toolInput) {
  if (/^skill$/i.test(String(toolName).trim()) && isRecord3(toolInput)) {
    for (const key of ["skill", "name", "command"]) {
      const value = toolInput[key];
      if (typeof value !== "string")
        continue;
      const bare = value.trim().split(":").at(-1).toLowerCase();
      if (/^kibi-[a-z0-9-]+$/.test(bare))
        return skillName(bare);
    }
  }
  return skillInStrings(toolInput, 3);
}
function recentPath(directory) {
  return path5.join(directory, RECENT_FILE);
}
function entries(value) {
  return Array.isArray(value) ? value : [];
}
function fresh(entry, now, windowMs) {
  return isRecord3(entry) && typeof entry.t === "number" && now - entry.t <= windowMs;
}
function readRecent(directory, now) {
  let parsed = {};
  try {
    parsed = JSON.parse(String(fs4.readFileSync(recentPath(directory)))) ?? parsed;
  } catch {}
  return {
    calls: entries(parsed.calls).filter((entry) => fresh(entry, now, RETRY_WINDOW_MS) && typeof entry.o === "string"),
    skills: entries(parsed.skills).filter((entry) => fresh(entry, now, SKILL_WINDOW_MS))
  };
}
function writeRecent(directory, recent) {
  try {
    fs4.mkdirSync(directory, { recursive: true });
    const file = recentPath(directory);
    const temporary = `${file}.${process.pid}.${randomUUID2()}.tmp`;
    fs4.writeFileSync(temporary, JSON.stringify({
      calls: recent.calls.slice(-MAX_RECENT_ENTRIES),
      skills: recent.skills.slice(-MAX_RECENT_ENTRIES)
    }));
    fs4.renameSync(temporary, file);
  } catch {}
}
function rememberSkillLoad(directory, workspaceHash, now = Date.now()) {
  const recent = readRecent(directory, now);
  recent.skills.push({ w: workspaceHash, t: now });
  writeRecent(directory, recent);
}

// ../agent-core/dist/usage-telemetry.js
import { createHash as createHash4, randomUUID as randomUUID3 } from "node:crypto";
import fs5 from "node:fs";
import os from "node:os";
import path6 from "node:path";
import { fileURLToPath } from "node:url";
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
var TELEMETRY_EVENT_VERSION = 2;
var REJECTED_CATEGORIES = new Set([
  "bootstrap_plan_rejected",
  "check_violations",
  "coarse_symbol_linkage",
  "conflicting_input",
  "entity_not_found",
  "entity_validation_failed",
  "firm_decision_locked",
  "generated_artifacts_stale",
  "incomplete_propositions",
  "input_read_failed",
  "integration_failed",
  "invalid_project_config",
  "invalid_relationship",
  "legacy_branch_storage",
  "migration_plan_refused",
  "missing_input",
  "query_limit_exceeded",
  "relationship_source_mismatch",
  "relationship_validation_failed",
  "semantic_contradiction",
  "symbol_granularity_violation",
  "tests_failed",
  "uncompiled_source",
  "unknown_operation",
  "upsert_dry_run_invalid",
  "validation_failed"
]);
function flagValue(value) {
  const normalized = String(value).trim().toLowerCase();
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
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  return resolved.startsWith(`${temp}${path6.sep}`);
}
var KIBI_REPOSITORY_PACKAGE = "kibi";
function moduleFileFromUrl(readUrl) {
  let file;
  try {
    const url = readUrl();
    if (typeof url === "string")
      file = fileURLToPath(url);
  } catch {}
  return file;
}
function thisModuleFile() {
  return moduleFileFromUrl(() => import.meta.url);
}
function insideKibiCheckout(file) {
  const resolved = realDirectory(file);
  if (resolved.split(/[\\/]/).includes("node_modules"))
    return false;
  let current = path6.dirname(resolved);
  for (;; ) {
    try {
      const manifest = JSON.parse(fs5.readFileSync(path6.join(current, "package.json"), "utf8"));
      if (manifest.name === KIBI_REPOSITORY_PACKAGE && fs5.existsSync(path6.join(current, "packages", "agent-core"))) {
        return true;
      }
    } catch {}
    const parent = path6.dirname(current);
    if (parent === current)
      return false;
    current = parent;
  }
}
var checkoutCache = new Map;
function detectTelemetryChannel(env = process.env, moduleFile = thisModuleFile() ?? null) {
  return telemetryChannel(env, moduleFile).channel;
}
function telemetryChannel(env = process.env, moduleFile = thisModuleFile() ?? null) {
  const explicit = env.KIBI_TELEMETRY_CHANNEL?.trim();
  if (explicit)
    return {
      channel: telemetryCategory(explicit),
      source: "KIBI_TELEMETRY_CHANNEL"
    };
  if (!moduleFile)
    return { channel: "release", source: "installed" };
  let fromCheckout = checkoutCache.get(moduleFile);
  if (fromCheckout === undefined) {
    fromCheckout = insideKibiCheckout(moduleFile);
    checkoutCache.set(moduleFile, fromCheckout);
  }
  return fromCheckout ? { channel: "source", source: "checkout" } : { channel: "release", source: "installed" };
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
    const parsed = JSON.parse(String(fs5.readFileSync(path6.join(telemetryDirectory(env), CONFIG_FILE))));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function writeTelemetryConfig(config, env) {
  const directory = telemetryDirectory(env);
  fs5.mkdirSync(directory, { recursive: true });
  fs5.writeFileSync(path6.join(directory, CONFIG_FILE), `${JSON.stringify(config, null, 2)}
`);
}
function telemetryStatus(env = process.env) {
  const directory = telemetryDirectory(env);
  const { channel, source } = telemetryChannel(env);
  const status = (enabled, reason) => ({
    enabled,
    reason,
    directory,
    channel,
    channelSource: source
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
  const created = randomUUID3();
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
    const parsed = JSON.parse(String(fs5.readFileSync(sessionMarkersPath(env))));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
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
    const temporary = `${file}.${process.pid}.${randomUUID3()}.tmp`;
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
    telemetry_version: TELEMETRY_EVENT_VERSION,
    package: source.packageName,
    package_version: source.packageVersion ?? null,
    host: source.host && hostKey(source.host) || detectTelemetryHost(env) || "unknown",
    remote: remoteEnvironment(env),
    channel: detectTelemetryChannel(env),
    session: sessionProperty(source, env),
    os: process.platform,
    arch: process.arch,
    runtime: runtimeName(),
    runtime_version: process.versions.node.split(".")[0]
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
`);
  } catch {}
}
function telemetryCategory(value) {
  const trimmed = value?.trim();
  if (!trimmed)
    return null;
  return /^[A-Za-z0-9_.:+-]{1,160}$/.test(trimmed) ? trimmed.toLowerCase() : "unclassified";
}
function rememberTelemetrySkillLoad(workspaceRoot, env = process.env) {
  if (!telemetryEnabled(env))
    return;
  rememberSkillLoad(telemetryDirectory(env), workspaceKey(workspaceRoot));
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
      requirement_count: hook.requirementCount ?? null,
      skill: hook.skill ?? null
    }
  }, env);
}
function parseQueued(text, now) {
  const events = [];
  for (const line of text.split(`
`)) {
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
    const first = JSON.parse(lines[0]);
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
      const reclaimed = `${file}.${randomUUID3()}${SENDING_SUFFIX}`;
      fs5.renameSync(file, reclaimed);
      claimed.push(reclaimed);
    } catch {}
  }
  const queue = path6.join(directory, QUEUE_FILE);
  const target = path6.join(directory, `${QUEUE_FILE}.${process.pid}.${randomUUID3()}${SENDING_SUFFIX}`);
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
  timer.unref();
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
      throw new Error;
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
var HOOK_ACTION_SKILL_LOADED = "skill_loaded";
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
    requirementCount: row.trace.requirementIds?.length,
    skill: row.trace.skill
  }, env);
  if (row.trace.action === HOOK_ACTION_SKILL_LOADED) {
    rememberTelemetrySkillLoad(row.workspaceRoot, env);
  }
  if (!hookTelemetryEnabled(env))
    return;
  const finishedAt = new Date;
  const { trace } = row;
  const record = {
    timestamp: finishedAt.toISOString(),
    request_id: `hook-${randomUUID4()}`,
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
`);
  } catch {}
}
function kbUsageTrace(toolName, toolInput) {
  const kbOperation = hostKbOperation(toolName, toolInput);
  if (kbOperation)
    return { action: HOOK_ACTION_KB_USAGE, kbOperation };
  return skillLoadTrace(toolName, toolInput);
}
function skillLoadTrace(toolName, toolInput) {
  const skill = kibiSkillLoad(toolName, toolInput);
  return skill ? { action: HOOK_ACTION_SKILL_LOADED, skill } : undefined;
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
    const parsed = JSON.parse(String(fs6.readFileSync(packageJsonPath)));
    const version = parsed.version;
    if (typeof version === "string")
      return version;
  } catch {}
  return null;
}

// src/kb-mcp-tools.ts
function resolveKibiInterface2(mcpState, workspaceTrusted) {
  return resolveKibiInterface(mcpState, workspaceTrusted);
}
function extractKbMcpToolCall2(toolName, toolInput) {
  return extractKbMcpToolCall(toolName, toolInput);
}

// src/path-policy.ts
function isFreshnessLane(lane) {
  return lane === "requirements" || lane === "scenarios" || lane === "tests" || lane === "facts" || lane === "adr" || lane === "flags" || lane === "events" || lane === "symbols.yaml" || lane === "symbol-coordinates.yaml";
}
function extractExplicitPathFields2(input) {
  return extractExplicitPathFields(input);
}
function isDirectKbPath(candidate) {
  return isKbPath(candidate);
}
function isMeaningfulTrackedPath2(candidate) {
  return isMeaningfulTrackedPath(candidate);
}
function isKbFreshnessRelevantPath(candidate) {
  const segments = normalizeWorkspacePath(candidate).split("/").filter(Boolean);
  if (segments[0] === ".kb" && isFreshnessLane(segments[1]))
    return true;
  if (segments.includes("documentation"))
    return true;
  return segments[0] === "packages" && segments[1] === "core" && segments[2] === "src";
}
function isSourceImpactRelevantPath2(candidate) {
  return isSourceImpactRelevantPath(candidate);
}
function isDocumentationTrackedPath2(candidate) {
  return isDocumentationTrackedPath(candidate);
}
function toRepoRelativePath(candidate, cwd) {
  const normalized = normalizeWorkspacePath(candidate);
  if (!cwd)
    return normalized;
  const cwdPrefix = `${normalizeWorkspacePath(cwd)}/`;
  return normalized.startsWith(cwdPrefix) ? normalized.slice(cwdPrefix.length) : normalized;
}

// src/messages.ts
var BOOTSTRAP_REMINDER = "Kibi config was not found at the Cursor workspace root. Use visible Kibi MCP tools or a trusted project-local CLI JSON route with --input (peer surfaces) to bootstrap project memory; if neither interface is available, tell the operator. Do not read or edit `.kb/` files directly. Query before mutate, run kb_upsert sequentially, and run kb_check before completion.";
var DIRECT_KB_EDIT_WARNING = "Do not read or edit `.kb/` files directly. Use visible Kibi MCP tools or trusted project-local CLI JSON routes with --input (peer surfaces). Query before mutate, run kb_upsert sequentially, and run kb_check before completion.";
function interfaceAdvisory(mcpState, workspaceTrusted) {
  const selectedInterface = resolveKibiInterface2(mcpState, workspaceTrusted);
  switch (selectedInterface) {
    case "mcp":
      return;
    case "cli":
      return "Kibi MCP has not been observed in this session. In this explicitly trusted workspace, the project-local CLI is an advisory fallback: use npx --no-install kibi or bunx --no-install kibi. Do not use global or installing runners.";
    case "setup":
      return "Kibi MCP has not been observed in this session and workspace trust is unknown. Do not probe or execute a CLI fallback; ask the operator to enable MCP or explicitly approve the trusted project-local CLI workflow.";
  }
}
function stopFollowupMessage(state) {
  if (state.kbMutationTools.length > 0) {
    const tools = [...new Set(state.kbMutationTools)];
    return `Kibi KB updated (${tools.join(", ")}).`;
  }
  const sourceImpactPaths = state.dirtyPaths.filter(isSourceImpactRelevantPath2);
  const uncheckedSourcePaths = sourceImpactPaths.filter((sourcePath) => !state.impactCheckedPaths.includes(sourcePath));
  const freshnessPaths = state.dirtyPaths.filter(isKbFreshnessRelevantPath);
  if (uncheckedSourcePaths.length > 0) {
    return impactCheckFollowup(uncheckedSourcePaths);
  }
  if (freshnessPaths.length === 0 || state.kbCheckRun) {
    return;
  }
  const fileCount = freshnessPaths.length;
  const noun = fileCount === 1 ? "file" : "files";
  return `Kibi: sync or record no-impact after ${fileCount} edited ${noun}.`;
}
function impactCheckFollowup(sourcePaths) {
  const fileCount = sourcePaths.length;
  const noun = fileCount === 1 ? "file" : "files";
  const sourceFiles = JSON.stringify(sourcePaths.slice(0, 10));
  return [
    `Kibi: run impact-enabled kb_check after ${fileCount} edited source ${noun}.`,
    `Use kb_check({sourceFiles:${sourceFiles}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}).`,
    "Review symbol granularity and semantic review of linked requirements/tests before stopping."
  ].join(`
`);
}

// src/guidance.ts
var PRE_EDIT_FOLLOWUP = "Kibi pre-edit guidance: read those requirements with kb_query before changing behavior here; if the change contradicts one, resolve that in Kibi before writing the edit.";
function withAdvisory(context, guidance) {
  const advisory = interfaceAdvisory(context.mcpState, context.workspaceTrusted);
  return (advisory ? [advisory, ...guidance] : guidance).join(`
`);
}
function readGuidance(filePath, context) {
  if (!context.hasKibi) {
    return;
  }
  const relativePath = toRepoRelativePath(filePath, context.cwd);
  if (!isMeaningfulTrackedPath2(relativePath)) {
    return;
  }
  if (context.knowledge) {
    return withAdvisory(context, [context.knowledge]);
  }
  const guidance = [
    "Kibi read guidance: before changing this file, discover linked knowledge through the selected MCP or CLI JSON route.",
    `Start with kb_search, then kb_query with sourceFile="${relativePath}".`,
    "Prefer Kibi facts and requirements over long inline comments for durable knowledge."
  ];
  return withAdvisory(context, guidance);
}
function preEditGuidance(filePath, context) {
  if (!context.hasKibi) {
    return;
  }
  const relativePath = toRepoRelativePath(filePath, context.cwd);
  if (!isMeaningfulTrackedPath2(relativePath)) {
    return;
  }
  if (isDocumentationTrackedPath2(relativePath)) {
    return;
  }
  if (context.knowledge) {
    return withAdvisory(context, [context.knowledge, PRE_EDIT_FOLLOWUP]);
  }
  const linkedRequirements = context.linkedRequirementIds ?? [];
  const guidance = linkedRequirements.length > 0 ? [
    `Kibi pre-edit guidance: ${relativePath} already implements ${linkedRequirements.join(", ")}.`,
    `Read those requirements with kb_query before changing behavior here, and widen with kb_query({sourceFile:"${relativePath}"}) for scenarios and tests.`,
    "If the change contradicts an existing requirement, resolve that in Kibi before writing the edit."
  ] : [
    `Kibi pre-edit guidance: ${relativePath} has no linked requirement in the symbol manifest.`,
    `Discover existing constraints with kb_search, then kb_query({sourceFile:"${relativePath}"}), before changing behavior here.`,
    "Record the requirement this change serves rather than leaving the symbol unowned."
  ];
  return withAdvisory(context, guidance);
}
function writeGuidance(filePath, context) {
  if (!context.hasKibi) {
    return;
  }
  const relativePath = toRepoRelativePath(filePath, context.cwd);
  if (!isMeaningfulTrackedPath2(relativePath)) {
    return;
  }
  if (isDocumentationTrackedPath2(relativePath)) {
    const guidance = [
      "Kibi write guidance: keep REQ, SCEN, and TEST artifacts separate.",
      "Query before mutate. Update KB entities through kb_upsert sequentially. Run kb_check before completion.",
      "Do not read or edit `.kb/` files directly."
    ];
    return withAdvisory(context, guidance);
  }
  const guidance = [
    `Kibi impact review: run kb_check({sourceFiles:["${relativePath}"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) while this edit is fresh.`,
    "Check symbol granularity and whether linked requirements, scenarios, and tests still cover the changed behavior.",
    "Prefer symbol manifest + executable_for or // implements REQ-<area>-<behavior> for traceability."
  ];
  return withAdvisory(context, guidance);
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
function readStringArray2(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) {
      continue;
    }
    const strings = value.filter((item) => typeof item === "string" && item.length > 0);
    if (strings.length > 0) {
      return strings;
    }
  }
  return;
}
function normalizeEventName(event) {
  const trimmed = event.trim();
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}
function parseStopStatus(value) {
  if (value === "completed" || value === "aborted" || value === "error") {
    return value;
  }
  return;
}
function parseHookInput(input) {
  if (!isRecord4(input)) {
    return { event: "" };
  }
  const rawEvent = readString2(input, [
    "event",
    "hook_event",
    "hookEvent",
    "hook_event_name",
    "name"
  ]) ?? "";
  const event = normalizeEventName(rawEvent);
  const cwd = readString2(input, [
    "cwd",
    "current_working_directory",
    "workspace"
  ]);
  const workspaceRoots = readStringArray2(input, [
    "workspace_roots",
    "workspaceRoots"
  ]);
  const toolName = readString2(input, ["toolName", "tool_name", "tool"]);
  const toolInput = input.toolInput ?? input.tool_input ?? input.input;
  const conversationId = readString2(input, [
    "conversation_id",
    "conversationId"
  ]);
  const filePath = readString2(input, ["file_path", "filePath", "path"]);
  const status = parseStopStatus(readString2(input, ["status"]));
  const prompt = readString2(input, ["prompt"]);
  const parsed = { event };
  if (cwd !== undefined) {
    parsed.cwd = cwd;
  }
  if (workspaceRoots !== undefined) {
    parsed.workspaceRoots = workspaceRoots;
  }
  if (toolName !== undefined) {
    parsed.toolName = toolName;
  }
  if (toolInput !== undefined) {
    parsed.toolInput = toolInput;
  }
  if (conversationId !== undefined) {
    parsed.conversationId = conversationId;
  }
  if (filePath !== undefined) {
    parsed.filePath = filePath;
  }
  if (prompt !== undefined) {
    parsed.prompt = prompt;
  }
  if (status !== undefined) {
    parsed.status = status;
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

// src/hook-state-storage.ts
import { randomUUID as randomUUID5 } from "node:crypto";
import fs7 from "node:fs";
import os2 from "node:os";
import path8 from "node:path";
var stateFileName = "hook-state.json";
var lockFileName = "hook-state.lock";
var maxDirtyPaths = 50;
var maxGuidedPaths = 100;
var maxKbMutationTools = 20;
var lockRetryCount = 100;
var lockRetryDelayMs = 5;
var staleLockAgeMs = 30000;
function statePath(pluginData) {
  return path8.join(pluginData, stateFileName);
}
function lockPath(pluginData) {
  return path8.join(pluginData, lockFileName);
}
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizePath(dirtyPath) {
  return dirtyPath.trim().replaceAll("\\", "/");
}
function sleepSync(milliseconds) {
  const buffer = new SharedArrayBuffer(4);
  const view = new Int32Array(buffer);
  Atomics.wait(view, 0, 0, milliseconds);
}
function uniqueTempPath(pluginData) {
  return path8.join(pluginData, `${stateFileName}.${process.pid}.${Date.now()}.${randomUUID5()}.tmp`);
}
function mergeStringPaths(existingPaths, nextPaths) {
  const merged = [...existingPaths, ...nextPaths].map(normalizePath).filter((dirtyPath) => dirtyPath.length > 0);
  return [...new Set(merged)].slice(-maxGuidedPaths);
}
function emptyHookState() {
  return {
    mcpState: "unknown",
    dirtyPaths: [],
    guidedReadPaths: [],
    guidedPreEditPaths: [],
    guidedWritePaths: [],
    kbMutationTools: [],
    kbCheckRun: false,
    impactCheckRun: false,
    impactCheckedPaths: [],
    planDelivered: false
  };
}
function acquireLock(pluginData) {
  const targetLockPath = lockPath(pluginData);
  for (let attempt = 0;attempt < lockRetryCount; attempt++) {
    try {
      return fs7.openSync(targetLockPath, "wx");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST") {
        if (removeStaleLock(targetLockPath)) {
          continue;
        }
        sleepSync(lockRetryDelayMs);
        continue;
      }
      return;
    }
  }
  return;
}
function removeStaleLock(targetLockPath) {
  let stats;
  try {
    stats = fs7.statSync(targetLockPath);
  } catch {
    return false;
  }
  if (Date.now() - stats.mtimeMs < staleLockAgeMs) {
    return false;
  }
  try {
    fs7.unlinkSync(targetLockPath);
    return true;
  } catch {
    return false;
  }
}
function releaseLock(pluginData, fileDescriptor) {
  try {
    fs7.closeSync(fileDescriptor);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
  }
  try {
    fs7.unlinkSync(lockPath(pluginData));
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
  }
}
function coerceHookState(value) {
  if (!isRecord5(value)) {
    return emptyHookState();
  }
  const strings = (candidate, normalize) => Array.isArray(candidate) ? candidate.filter((entry) => typeof entry === "string").map(normalize).filter((entry) => entry.length > 0) : [];
  const dirtyPaths = strings(value.dirtyPaths, normalizePath);
  const guidedReadPaths = strings(value.guidedReadPaths, normalizePath);
  const guidedPreEditPaths = strings(value.guidedPreEditPaths, normalizePath);
  const guidedWritePaths = strings(value.guidedWritePaths, normalizePath);
  const kbMutationTools = strings(value.kbMutationTools, (entry) => entry.trim());
  const impactCheckedPaths = strings(value.impactCheckedPaths, normalizePath);
  return {
    mcpState: value.mcpState === "observed" ? "observed" : "unknown",
    dirtyPaths: [...new Set(dirtyPaths)].slice(-maxDirtyPaths),
    guidedReadPaths: [...new Set(guidedReadPaths)].slice(-maxGuidedPaths),
    guidedPreEditPaths: [...new Set(guidedPreEditPaths)].slice(-maxGuidedPaths),
    guidedWritePaths: [...new Set(guidedWritePaths)].slice(-maxGuidedPaths),
    kbMutationTools: [...new Set(kbMutationTools)].slice(-maxKbMutationTools),
    kbCheckRun: value.kbCheckRun === true,
    impactCheckRun: value.impactCheckRun === true,
    impactCheckedPaths: [...new Set(impactCheckedPaths)].slice(-maxGuidedPaths),
    planDelivered: value.planDelivered === true
  };
}
function resolveStateDir(pluginData, conversationId) {
  if (pluginData) {
    return pluginData;
  }
  if (!conversationId) {
    return;
  }
  return path8.join(os2.tmpdir(), "kibi-cursor-hook-state", conversationId.replaceAll(/[^a-zA-Z0-9._-]/g, "_"));
}
function loadHookState(stateDir) {
  if (!stateDir) {
    return emptyHookState();
  }
  try {
    return coerceHookState(JSON.parse(fs7.readFileSync(statePath(stateDir), "utf8")));
  } catch {
    return emptyHookState();
  }
}
function saveHookState(stateDir, state) {
  if (!stateDir) {
    return;
  }
  fs7.mkdirSync(stateDir, { recursive: true });
  const boundedState = coerceHookState(state);
  const tempPath = uniqueTempPath(stateDir);
  fs7.writeFileSync(tempPath, `${JSON.stringify(boundedState)}
`);
  fs7.renameSync(tempPath, statePath(stateDir));
}
function updateHookState(stateDir, updater) {
  const initialState = loadHookState(stateDir);
  if (!stateDir) {
    return updater(initialState);
  }
  fs7.mkdirSync(stateDir, { recursive: true });
  const lockFileDescriptor = acquireLock(stateDir);
  if (lockFileDescriptor === undefined) {
    return updater(initialState);
  }
  try {
    const lockedState = loadHookState(stateDir);
    const nextState = updater(lockedState);
    saveHookState(stateDir, nextState);
    return nextState;
  } catch {
    return updater(initialState);
  } finally {
    releaseLock(stateDir, lockFileDescriptor);
  }
}

// src/hook-state.ts
function addDirtyPaths(stateDir, dirtyPaths) {
  return updateHookState(stateDir, (state) => ({
    ...state,
    dirtyPaths: mergeStringPaths(state.dirtyPaths, dirtyPaths).slice(-maxDirtyPaths)
  }));
}
function rememberGuidedPath(stateDir, kind, guidedPath) {
  return updateHookState(stateDir, (state) => {
    const normalized = normalizePath(guidedPath);
    if (kind === "read") {
      return {
        ...state,
        guidedReadPaths: mergeStringPaths(state.guidedReadPaths, [normalized])
      };
    }
    if (kind === "pre-edit") {
      return {
        ...state,
        guidedPreEditPaths: mergeStringPaths(state.guidedPreEditPaths, [
          normalized
        ])
      };
    }
    return {
      ...state,
      guidedWritePaths: mergeStringPaths(state.guidedWritePaths, [normalized])
    };
  });
}
function hasGuidedPath(state, kind, guidedPath) {
  return guidedBucket(state, kind).includes(normalizePath(guidedPath));
}
function guidedBucket(state, kind) {
  if (kind === "read")
    return state.guidedReadPaths;
  if (kind === "pre-edit")
    return state.guidedPreEditPaths;
  return state.guidedWritePaths;
}
function recordPlanDelivered(stateDir) {
  return updateHookState(stateDir, (state) => state.planDelivered ? state : { ...state, planDelivered: true });
}
function recordKbMcpTool(stateDir, toolName, options = {}) {
  const normalized = toolName.trim();
  if (normalized.length === 0) {
    return loadHookState(stateDir);
  }
  return updateHookState(stateDir, (state) => {
    const observedState = { ...state, mcpState: "observed" };
    if (normalized === "kb_check") {
      return {
        ...observedState,
        kbCheckRun: true,
        impactCheckRun: state.impactCheckRun || options.impactCheckRun === true,
        impactCheckedPaths: options.impactCheckRun === true ? mergeStringPaths(state.impactCheckedPaths, options.sourceFiles ?? []) : state.impactCheckedPaths
      };
    }
    if (normalized === "kb_upsert" || normalized === "kb_delete") {
      return {
        ...observedState,
        kbMutationTools: mergeStringPaths(state.kbMutationTools, [
          normalized
        ]).slice(-maxKbMutationTools)
      };
    }
    return observedState;
  });
}
function clearSessionHookState(stateDir) {
  const clearedState = emptyHookState();
  if (!stateDir) {
    return clearedState;
  }
  return updateHookState(stateDir, () => clearedState);
}

// src/source-linked-requirements.ts
import path9 from "node:path";
var CURSOR_INDEX_OPTIONS = {
  legacyLinksAsImplements: false,
  cacheFileName: "cursor-knowledge-index.json"
};
function toManifestPath(workspaceRoot, filePath) {
  const absolute = path9.isAbsolute(filePath) ? filePath : path9.resolve(workspaceRoot, filePath);
  return path9.relative(workspaceRoot, absolute).split(path9.sep).join("/");
}
function getSourceLinkedSymbols(workspaceRoot, filePath, cacheDir) {
  const relativePath = toManifestPath(workspaceRoot, filePath);
  const symbols = loadKnowledgeIndex(workspaceRoot, cacheDir, CURSOR_INDEX_OPTIONS).files[relativePath] ?? [];
  return { relativePath, symbols };
}

// src/hook-runner.ts
function knowledgeFor(workspaceRoot, linked, surface, focus) {
  if (implementedRequirementIds(linked.symbols).length === 0)
    return;
  return fileKnowledgeSnippet({
    relativePath: linked.relativePath,
    symbols: linked.symbols,
    surface,
    focus,
    summarize: createEntitySummarizer(workspaceRoot)
  });
}
function firmNotice(workspaceRoot, linked, focus, session, env) {
  if (!confirmFirmEdits(env))
    return;
  const summarize = createEntitySummarizer(workspaceRoot);
  const { ids, symbol } = firmRequirementsTouched({
    symbols: linked.symbols,
    focus,
    wholeFile: focus === undefined,
    summarize,
    confirmed: settledFirmRequirements(session)
  });
  if (ids.length === 0)
    return;
  settleFirmRequirements(session, ids);
  return firmEditNotice(symbol ? `${symbol.title} in ${linked.relativePath}` : linked.relativePath, ids.map(summarize));
}
function packageVersion() {
  return readPackageVersion(path10.join(path10.dirname(fileURLToPath2(import.meta.url)), "..", "package.json"));
}
function recordToolTelemetry(input, workspaceRoot, stateDir, startedAt, env) {
  if (!hookTracesWanted(env))
    return;
  const kbUsage = kbUsageTrace(input.toolName, input.toolInput);
  if (!kbUsage && !isKnownEditableTool(input.toolName))
    return;
  const traces = kbUsage ? [kbUsage] : editTraces(extractExplicitPathFields2(input.toolInput).map((candidate) => toRepoRelativePath(candidate, workspaceRoot)), (relativePath) => implementedRequirementIds(getSourceLinkedSymbols(workspaceRoot, relativePath, stateDir).symbols));
  appendHookUsageRows({
    host: "cursor",
    packageVersion: packageVersion(),
    workspaceRoot,
    event: "postToolUse",
    sessionId: input.conversationId,
    hostTool: input.toolName,
    startedAt
  }, traces, env);
}
var editableTools = new Set([
  "Edit",
  "MultiEdit",
  "Write",
  "StrReplace",
  "apply_patch",
  "EditNotebook"
]);
var readTools = new Set(["Read", "TabRead"]);
var planDeliveryTools = new Set(["CreatePlan", "create_plan", "createPlan"]);
function emptyResult() {
  return {};
}
function hasKibiConfig(cwd) {
  if (!cwd) {
    return false;
  }
  return fs8.existsSync(path10.join(cwd, ".kb", "manifest.json"));
}
function kibiWorkspaceFor(directory) {
  if (!directory)
    return;
  let current = path10.resolve(directory);
  for (;; ) {
    if (fs8.existsSync(path10.join(current, ".kb", "manifest.json"))) {
      return current;
    }
    if (fs8.existsSync(path10.join(current, ".git")))
      return;
    const parent = path10.dirname(current);
    if (parent === current)
      return;
    current = parent;
  }
}
function isEditLikeTool(toolName) {
  return toolName === undefined || editableTools.has(toolName);
}
function isKnownEditableTool(toolName) {
  return toolName !== undefined && editableTools.has(toolName);
}
function isPlanDeliveryTool(toolName) {
  return toolName !== undefined && planDeliveryTools.has(toolName);
}
function isReadLikeTool(toolName) {
  return toolName === undefined || readTools.has(toolName);
}
function resolveWorkspaceRoot(input) {
  return input.workspaceRoots?.[0] ?? input.cwd ?? process.cwd();
}
function resolvePrimaryPath(input) {
  if (input.filePath) {
    return input.filePath;
  }
  const explicitPaths = extractExplicitPathFields2(input.toolInput);
  return explicitPaths[0];
}
async function runHook(rawInput, environment = {}) {
  const startedAt = new Date;
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? process.env.PLUGIN_DATA;
  const stateDir = resolveStateDir(pluginData, input.conversationId);
  const cwd = resolveWorkspaceRoot(input);
  const kibiReady = hasKibiConfig(cwd);
  const workspaceTrusted = environment.workspaceTrusted === true;
  const initialState = loadHookState(stateDir);
  const session = {
    stateDir,
    sessionId: input.conversationId
  };
  const trace = {};
  try {
    switch (input.event) {
      case "sessionStart":
        trace.action = "session_start";
        if (!kibiReady) {
          const advisory = interfaceAdvisory(initialState.mcpState, workspaceTrusted);
          return {
            additional_context: advisory ? `${BOOTSTRAP_REMINDER}
${advisory}` : BOOTSTRAP_REMINDER
          };
        }
        {
          const advisory = interfaceAdvisory(initialState.mcpState, workspaceTrusted);
          return advisory ? { additional_context: advisory } : emptyResult();
        }
      case "preToolUse": {
        const stamped = stampKibiWorkspace(input.toolName, input.toolInput, kibiWorkspaceFor(input.cwd ?? input.workspaceRoots?.[0]));
        if (stamped) {
          return { updated_input: stamped };
        }
        const explicitPaths = extractExplicitPathFields2(input.toolInput);
        const hasDirectKbEdit = isEditLikeTool(input.toolName) && explicitPaths.some(isDirectKbPath);
        if (hasDirectKbEdit) {
          trace.action = "kb_direct_note";
          trace.pathKind = "kb";
          return {
            permission: "allow",
            agent_message: DIRECT_KB_EDIT_WARNING
          };
        }
        const primaryPath = resolvePrimaryPath(input);
        if (!primaryPath || !kibiReady || !isKnownEditableTool(input.toolName)) {
          return emptyResult();
        }
        const relativePath = toRepoRelativePath(primaryPath, cwd);
        const state = loadHookState(stateDir);
        const linked = getSourceLinkedSymbols(cwd, primaryPath, stateDir);
        trace.pathKind = classifyPath(relativePath);
        trace.requirementIds = implementedRequirementIds(linked.symbols);
        const focus = editFocus(path10.resolve(cwd, primaryPath), input.toolInput);
        const ruleNote = takeRuleNote(session);
        const notice = firmNotice(cwd, linked, focus, session, environment.env ?? process.env);
        const guidance = hasGuidedPath(state, "pre-edit", relativePath) ? undefined : preEditGuidance(primaryPath, {
          cwd,
          hasKibi: kibiReady,
          mcpState: state.mcpState,
          workspaceTrusted,
          knowledge: knowledgeFor(cwd, linked, "edit", focus)
        });
        if (guidance) {
          rememberGuidedPath(stateDir, "pre-edit", relativePath);
        }
        const parts = [ruleNote, notice, guidance].filter((part) => part !== undefined);
        trace.action = parts.length > 0 ? "edit_snippet" : "edit_silent";
        return parts.length > 0 ? { permission: "allow", agent_message: parts.join(`

`) } : emptyResult();
      }
      case "beforeSubmitPrompt": {
        if (kibiReady && input.prompt) {
          const rule = recordRequest(session, input.prompt);
          if (rule !== undefined)
            holdRuleNote(session, rule);
          trace.action = rule === undefined ? "prompt_silent" : "prompt_rule_note";
        }
        return { continue: true };
      }
      case "beforeReadFile": {
        const primaryPath = resolvePrimaryPath(input);
        if (!primaryPath || !kibiReady) {
          return { permission: "allow" };
        }
        const relativePath = toRepoRelativePath(primaryPath, cwd);
        trace.pathKind = classifyPath(relativePath);
        trace.action = "read_silent";
        const state = loadHookState(stateDir);
        if (hasGuidedPath(state, "read", relativePath)) {
          return { permission: "allow" };
        }
        const guidance = readGuidance(primaryPath, {
          cwd,
          hasKibi: kibiReady,
          mcpState: state.mcpState,
          workspaceTrusted,
          knowledge: knowledgeFor(cwd, getSourceLinkedSymbols(cwd, primaryPath, stateDir), "read")
        });
        if (!guidance) {
          return { permission: "allow" };
        }
        rememberGuidedPath(stateDir, "read", relativePath);
        trace.action = "read_snippet";
        return {
          permission: "allow",
          agent_message: guidance
        };
      }
      case "postToolUse": {
        if (kibiReady) {
          try {
            recordToolTelemetry(input, cwd, stateDir, startedAt, environment.env);
          } catch {}
        }
        const kbToolCall = extractKbMcpToolCall2(input.toolName, input.toolInput);
        if (kbToolCall) {
          recordKbMcpTool(stateDir, kbToolCall.toolName, {
            impactCheckRun: kbToolCall.impactCheckRun,
            sourceFiles: kbToolCall.sourceFiles
          });
        }
        if (isPlanDeliveryTool(input.toolName)) {
          recordPlanDelivered(stateDir);
        }
        const explicitPaths = extractExplicitPathFields2(input.toolInput);
        if (isKnownEditableTool(input.toolName)) {
          const dirtyPaths = explicitPaths.map((candidate) => toRepoRelativePath(candidate, cwd)).filter((candidate) => isMeaningfulTrackedPath2(candidate) || isKbFreshnessRelevantPath(candidate));
          if (dirtyPaths.length > 0) {
            addDirtyPaths(stateDir, dirtyPaths);
          }
          if (dirtyPaths.some(isSourceImpactRelevantPath2)) {
            markDecisionFlag(session, "source-edited");
          }
        }
        const kbOperation = kbToolCall ? kbToolCall.toolName : kbUsageTrace(input.toolName, input.toolInput)?.kbOperation;
        if (kbOperation === "kb_upsert") {
          markDecisionFlag(session, "kb-recorded");
          if (isRequirementUpsert(input.toolInput)) {
            markDecisionFlag(session, "requirement-recorded");
          }
        }
        const primaryPath = resolvePrimaryPath(input);
        if (!primaryPath || !kibiReady) {
          return emptyResult();
        }
        const relativePath = toRepoRelativePath(primaryPath, cwd);
        const state = loadHookState(stateDir);
        if (isReadLikeTool(input.toolName)) {
          if (hasGuidedPath(state, "read", relativePath)) {
            return emptyResult();
          }
          const guidance = readGuidance(primaryPath, {
            cwd,
            hasKibi: kibiReady,
            mcpState: state.mcpState,
            workspaceTrusted,
            knowledge: knowledgeFor(cwd, getSourceLinkedSymbols(cwd, primaryPath, stateDir), "read")
          });
          if (!guidance) {
            return emptyResult();
          }
          rememberGuidedPath(stateDir, "read", relativePath);
          return { additional_context: guidance };
        }
        if (isEditLikeTool(input.toolName)) {
          if (hasGuidedPath(state, "write", relativePath)) {
            return emptyResult();
          }
          const guidance = writeGuidance(primaryPath, {
            cwd,
            hasKibi: kibiReady,
            mcpState: state.mcpState,
            workspaceTrusted
          });
          if (!guidance) {
            return emptyResult();
          }
          rememberGuidedPath(stateDir, "write", relativePath);
          return { additional_context: guidance };
        }
        return emptyResult();
      }
      case "stop": {
        const state = loadHookState(stateDir);
        const shouldClearSession = state.dirtyPaths.length > 0 || state.kbCheckRun || state.planDelivered;
        if (input.status === "aborted" || input.status === "error") {
          if (shouldClearSession) {
            clearSessionHookState(stateDir);
          }
          return emptyResult();
        }
        const capture = claimCaptureReminder(session) ? captureReminder(hasDecisionFlag(session, "rule-prompt")) : undefined;
        const signoff = claimSignoffReminder(session, cwd) ? signoffReminder() : undefined;
        const reminder = stopFollowupMessage(state);
        const followupMessage = [capture, signoff, reminder].filter((part) => part !== undefined).join(`
`);
        if (followupMessage) {
          trace.action = capture ? "stop_capture_reminder" : signoff ? "stop_signoff_reminder" : "stop_reminder";
          clearSessionHookState(stateDir);
          return { followup_message: followupMessage };
        }
        if (shouldClearSession) {
          clearSessionHookState(stateDir);
        }
        return emptyResult();
      }
      default:
        return emptyResult();
    }
  } finally {
    if (kibiReady) {
      appendHookUsage({
        host: "cursor",
        packageVersion: packageVersion(),
        workspaceRoot: cwd,
        event: input.event,
        sessionId: input.conversationId,
        hostTool: input.toolName,
        trace,
        startedAt
      }, environment.env ?? process.env);
    }
    await finishHookTelemetry({
      event: input.event,
      workspaceRoot: kibiReady ? cwd : undefined,
      sessionId: input.conversationId
    }, environment.env ?? process.env);
  }
}
async function main() {
  const result = await runHook(parseStdinJson(await readStdin()), {
    workspaceTrusted: process.argv.includes("--trusted-workspace")
  });
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
    process.stdout.write(`${JSON.stringify({
      additional_context: `Kibi hook runner error: ${message}`
    })}
`);
  }
}
async function runHookCliIfMain(isMain = isInvokedAsCli(process.argv[1], import.meta.url), start = runHookCli) {
  if (!isMain)
    return;
  await start();
}
runHookCliIfMain();
var hookRunnerPath = fileURLToPath2(import.meta.url);
export {
  hookRunnerPath,
  isInvokedAsCli,
  kibiWorkspaceFor,
  main,
  runHook,
  runHookCli,
  runHookCliIfMain
};
