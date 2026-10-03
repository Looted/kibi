#!/usr/bin/env node

// src/hook-runner.ts
import fs5 from "node:fs";
import os from "node:os";
import path6 from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

// src/hook-input.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, key) {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}
function parseHookInput(input) {
  if (!isRecord(input)) {
    return { event: "" };
  }
  const parsed = {
    event: readString(input, "hook_event_name") ?? ""
  };
  const sessionId = readString(input, "session_id");
  const cwd = readString(input, "cwd");
  const toolName = readString(input, "tool_name");
  const source = readString(input, "source");
  if (sessionId !== undefined)
    parsed.sessionId = sessionId;
  if (cwd !== undefined)
    parsed.cwd = cwd;
  if (toolName !== undefined)
    parsed.toolName = toolName;
  if (source !== undefined)
    parsed.source = source;
  if (input.tool_input !== undefined)
    parsed.toolInput = input.tool_input;
  if (input.stop_hook_active === true)
    parsed.stopHookActive = true;
  return parsed;
}
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function parseStdinJson(rawInput) {
  const trimmed = rawInput.trim();
  return trimmed.length === 0 ? {} : JSON.parse(trimmed);
}

// ../agent-core/dist/kb-mcp-tools.js
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

// src/kb-tools.ts
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function strings(value) {
  if (typeof value === "string")
    return value.length > 0 ? [value] : [];
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.length > 0) : [];
}
function canonicalKbOperation(toolName) {
  const name = toolName?.trim() ?? "";
  const lastSegment = name.includes("__") ? name.split("__").at(-1) ?? "" : name;
  const operation = lastSegment.replace(/^kibi_/, "");
  return /^kb_[a-z_]+$/.test(operation) ? operation : undefined;
}
function payloadOf(toolInput) {
  if (!isRecord3(toolInput))
    return {};
  const nested = toolInput.arguments ?? toolInput.args;
  return isRecord3(nested) ? nested : toolInput;
}
function usageFromPayload(operation, payload) {
  const paths = [
    ...strings(payload.sourceFile),
    ...strings(payload.sourceFiles)
  ];
  if (Array.isArray(payload.sourceLocations)) {
    for (const location of payload.sourceLocations) {
      if (isRecord3(location))
        paths.push(...strings(location.path));
    }
  }
  const ids = [...strings(payload.id), ...strings(payload.ids)];
  const check = operation === "kb_check";
  return {
    operation,
    paths,
    ids,
    check,
    checkAll: check && paths.length === 0 && payload.includeWorkingTreeDiff === true
  };
}
function extractMcpKbUsage(toolName, toolInput) {
  const operation = canonicalKbOperation(toolName);
  return operation ? usageFromPayload(operation, payloadOf(toolInput)) : undefined;
}
var CLI_ROUTES = {
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
function isVerifiedGitCommit(command) {
  if (typeof command !== "string")
    return false;
  const gitCommit = /(?:^|[\s;&|(])git(?:\s+-[Cc]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+commit(?=\s|$|[;&|)])/;
  if (!gitCommit.test(command))
    return false;
  return !/\s(?:--no-verify|-n)(?=\s|$)/.test(command);
}
function extractCliKbUsage(command) {
  if (typeof command !== "string")
    return;
  const match = /(?:^|[\s;&|(/])kibi\s+([a-z-]+)/.exec(command);
  const route = match?.[1];
  const operation = route ? CLI_ROUTES[route] : undefined;
  if (!operation)
    return;
  let payload = {};
  const inline = /'(\{.*\})'/s.exec(command) ?? /"(\{.*\})"/s.exec(command);
  if (inline?.[1]) {
    try {
      const parsed = JSON.parse(inline[1]);
      if (isRecord3(parsed))
        payload = parsed;
    } catch {}
  }
  const usage = usageFromPayload(operation, payload);
  if (operation === "kb_check" && usage.paths.length === 0) {
    usage.checkAll = true;
  }
  return usage;
}

// ../agent-core/dist/knowledge-index.js
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
var SYMBOLS_MANIFEST = ".kb/symbols.yaml";
var SYMBOL_COORDINATES = ".kb/symbol-coordinates.yaml";
var INDEX_FORMAT = "kibi-agent-core.knowledge-index.v1";
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
  const comment = value.search(/\s#/);
  return comment >= 0 ? value.slice(0, comment).trimEnd() : value;
}
function parseFlowList(raw) {
  const value = raw.trim();
  if (!value.startsWith("[") || !value.endsWith("]"))
    return;
  const inner = value.slice(1, -1).trim();
  if (inner.length === 0)
    return [];
  return inner.split(",").map(unquote).filter((item) => item.length > 0);
}
var keyValue = /^([A-Za-z0-9_"'-][^:]*?):(?:\s+(.*))?$/;
function parseScalarOrFlow(raw) {
  if (raw === undefined || raw.trim().length === 0)
    return;
  return parseFlowList(raw) ?? unquote(raw);
}
function scanSymbolsManifest(text) {
  const records = [];
  let itemIndent;
  let keyIndent = 0;
  let current;
  let listKey;
  let listItem;
  let section = "root";
  for (const rawLine of text.split(/\r?\n/)) {
    const content = rawLine.trim();
    if (content.length === 0 || content.startsWith("#"))
      continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const dash = /^(\s*)-(\s+)(.*)$/.exec(rawLine);
    if (indent === 0 && !dash) {
      const pair = keyValue.exec(content);
      section = pair?.[1] !== undefined && unquote(pair[1]) === "symbols" ? "symbols" : "other";
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
        const value = parseScalarOrFlow(pair[2]);
        if (value !== undefined)
          current[unquote(pair[1])] = value;
        else
          listKey = unquote(pair[1]);
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
      const pair = keyValue.exec(dash[3] ?? "");
      if (pair?.[1] !== undefined && pair[2] !== undefined) {
        listItem = { [unquote(pair[1])]: unquote(pair[2]) };
        list.push(listItem);
      } else {
        listItem = undefined;
        list.push(unquote(dash[3] ?? ""));
      }
      continue;
    }
    const pair = keyValue.exec(content);
    if (pair?.[1] === undefined)
      continue;
    const key = unquote(pair[1]);
    if (indent === keyIndent) {
      listItem = undefined;
      const value = parseScalarOrFlow(pair[2]);
      if (value === undefined) {
        listKey = key;
      } else {
        current[key] = value;
        listKey = undefined;
      }
    } else if (listItem !== undefined && pair[2] !== undefined) {
      listItem[key] = unquote(pair[2]);
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
    const key = unquote(pair[1]);
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
    const numeric = Number.parseInt(unquote(pair[2] ?? ""), 10);
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
function buildKnowledgeIndex(records, coordinates = {}, options = {}) {
  const files = {};
  let symbolCount = 0;
  for (const record of records) {
    const id = typeof record.id === "string" ? record.id : undefined;
    const sourceFile = typeof record.sourceFile === "string" ? record.sourceFile.replaceAll("\\", "/").replace(/^\.\//, "") : undefined;
    if (!id || !sourceFile)
      continue;
    symbolCount += 1;
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
  return { files, symbolCount };
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
  } catch {
    return;
  }
}
function writeCacheAtomically(cachePath, payload) {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, payload);
    fs.renameSync(temporary, cachePath);
  } catch {}
}
function loadKnowledgeIndex(workspaceRoot, cacheDir, options = {}) {
  const symbolsPath = path.join(workspaceRoot, SYMBOLS_MANIFEST);
  const coordinatesPath = path.join(workspaceRoot, SYMBOL_COORDINATES);
  const legacyMode = options.legacyLinksAsImplements === false ? "typed" : "legacy";
  const signature = `${INDEX_FORMAT}|${legacyMode}|${fileSignature(symbolsPath)}|${fileSignature(coordinatesPath)}`;
  const cachePath = cacheDir ? path.join(cacheDir, options.cacheFileName ?? CACHE_FILE) : undefined;
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
  const index = symbolsText === undefined ? { files: {}, symbolCount: 0 } : buildKnowledgeIndex(scanSymbolsManifest(symbolsText), scanSymbolCoordinates(readText(coordinatesPath) ?? ""), options);
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
function readEntitySummary(workspaceRoot, entityId) {
  const lane = ENTITY_LANES.find(([prefix]) => entityId.startsWith(prefix));
  if (!lane || !SAFE_ENTITY_ID.test(entityId))
    return { id: entityId };
  let head;
  try {
    const descriptor = fs.openSync(path.join(workspaceRoot, ".kb", lane[1], `${entityId}.md`), "r");
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
  if (lines[0]?.trim() !== "---")
    return { id: entityId };
  const summary = { id: entityId };
  const links = [];
  let inLinks = false;
  let pendingType;
  for (const line of lines.slice(1)) {
    if (line.trim() === "---")
      break;
    const match = /^(title|status):\s*(.*)$/.exec(line);
    if (match?.[1] === "title" && match[2])
      summary.title = unquote(match[2]);
    if (match?.[1] === "status" && match[2])
      summary.status = unquote(match[2]);
    if (/^\S/.test(line)) {
      inLinks = /^links:\s*$/.test(line);
      pendingType = undefined;
      continue;
    }
    if (!inLinks || links.length >= MAX_SUMMARY_LINKS)
      continue;
    const entry = /^\s*-\s*(.*)$/.exec(line);
    const body = (entry ? entry[1] ?? "" : line).trim();
    if (entry)
      pendingType = undefined;
    const field = /^(type|target):\s*(.+)$/.exec(body);
    if (field?.[1] === "type") {
      pendingType = unquote(field[2] ?? "");
    } else if (field?.[1] === "target") {
      links.push({
        type: pendingType ?? "relates_to",
        target: unquote(field[2] ?? "")
      });
      pendingType = undefined;
    } else if (entry && SAFE_ENTITY_ID.test(unquote(body))) {
      links.push({ type: "relates_to", target: unquote(body) });
    }
  }
  if (links.length > 0)
    summary.links = links;
  return summary;
}

// src/knowledge-index.ts
function loadKnowledgeIndex2(workspaceRoot, cacheDir) {
  return loadKnowledgeIndex(workspaceRoot, cacheDir);
}
function readEntitySummary2(workspaceRoot, entityId) {
  return readEntitySummary(workspaceRoot, entityId);
}

// ../agent-core/dist/path-policy.js
import path2 from "node:path";
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
function normalizeWorkspacePath(candidate) {
  return candidate.trim().replaceAll("\\", "/");
}
function pathSegments(candidate) {
  return normalizeWorkspacePath(candidate).split("/").filter(Boolean);
}
function canonicalizeWorkspacePath(workspaceRoot, options) {
  const trimmed = normalizeWorkspacePath(options.rawPath);
  if (trimmed.length === 0)
    return;
  const base = options.base ?? options.eventCwd ?? workspaceRoot;
  const absolute = path2.isAbsolute(trimmed) ? path2.resolve(trimmed) : path2.resolve(base, trimmed);
  const workspaceRelative = path2.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  if (workspaceRelative.length === 0 || workspaceRelative === ".." || workspaceRelative.startsWith("../") || path2.isAbsolute(workspaceRelative)) {
    return;
  }
  return { workspaceRelative, absolute };
}
function toWorkspacePath(workspaceRoot, rawPath, eventCwd) {
  const canonical = canonicalizeWorkspacePath(workspaceRoot, {
    rawPath,
    eventCwd
  });
  return canonical ? { relative: canonical.workspaceRelative, absolute: canonical.absolute } : undefined;
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
  const extension = path2.extname(basename).toLowerCase();
  if (!codeExtensions.has(extension))
    return "other";
  if (testBasename.test(basename) || segments.slice(0, -1).some((segment) => testSegments.has(segment))) {
    return "test";
  }
  return "source";
}

// src/path-policy.ts
function toWorkspacePath2(workspaceRoot, rawPath, eventCwd) {
  return toWorkspacePath(workspaceRoot, rawPath, eventCwd);
}
function classifyPath2(relativePath) {
  return classifyPath(relativePath);
}

// src/session-state.ts
import { createHash } from "node:crypto";
import fs2 from "node:fs";
import path3 from "node:path";
var JOURNAL = "session.jsonl";
function workspaceDataDir(pluginData, workspaceRoot) {
  if (!pluginData)
    return;
  const key = createHash("sha256").update(path3.resolve(workspaceRoot)).digest("hex").slice(0, 32);
  return path3.join(pluginData, "workspaces", key);
}
function sessionDir(workspaceDir, sessionId) {
  if (!workspaceDir)
    return;
  const trimmed = sessionId?.trim() ?? "";
  const key = trimmed.length > 0 ? createHash("sha256").update(trimmed).digest("hex").slice(0, 32) : "unattributed";
  return path3.join(workspaceDir, "sessions", key);
}
function emptySessionState() {
  return {
    shownRead: new Set,
    shownEdit: new Set,
    notices: new Set,
    kbUsed: false,
    exploredPaths: new Set,
    exploredIds: new Set,
    pendingSource: [],
    reminded: new Set
  };
}
function applyEvent(state, event) {
  switch (event.kind) {
    case "shown":
      (event.surface === "read" ? state.shownRead : state.shownEdit).add(event.path);
      return;
    case "notice":
      state.notices.add(event.name);
      return;
    case "kb":
      state.kbUsed = true;
      for (const explored of event.paths)
        state.exploredPaths.add(explored);
      for (const id of event.ids)
        state.exploredIds.add(id);
      return;
    case "edited":
      if (event.pathKind !== "source")
        return;
      state.pendingSource = [
        ...state.pendingSource.filter((pending) => pending !== event.path),
        event.path
      ];
      state.reminded.delete(event.path);
      return;
    case "checked":
      state.pendingSource = event.all ? [] : state.pendingSource.filter((pending) => !event.paths.includes(pending));
      return;
    case "reminded":
      for (const reminded of event.paths)
        state.reminded.add(reminded);
      return;
  }
}
function loadSessionState(dir) {
  const state = emptySessionState();
  if (!dir)
    return state;
  let journal;
  try {
    journal = fs2.readFileSync(path3.join(dir, JOURNAL), "utf8");
  } catch {
    return state;
  }
  for (const line of journal.split(`
`)) {
    if (line.length === 0)
      continue;
    try {
      applyEvent(state, JSON.parse(line));
    } catch {}
  }
  return state;
}
function appendSessionEvents(dir, events) {
  if (!dir || events.length === 0)
    return;
  try {
    fs2.mkdirSync(dir, { recursive: true });
    fs2.appendFileSync(path3.join(dir, JOURNAL), events.map((event) => `${JSON.stringify(event)}
`).join(""));
  } catch {}
}

// src/snippets.ts
var MAX_REQUIREMENTS = 4;
var MAX_SYMBOLS_PER_REQUIREMENT = 3;
var MAX_TESTS = 3;
var MAX_TITLE = 80;
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
function formatList(items, limit) {
  const shown = items.slice(0, limit).join(", ");
  return items.length > limit ? `${shown} +${items.length - limit}` : shown;
}
function describeEntity(summary) {
  const notable = summary.status && /supersed|deprecat|reject|obsolete/i.test(summary.status) ? ` (${summary.status})` : "";
  return summary.title ? `${summary.id}${notable}: ${truncate(summary.title, MAX_TITLE)}` : `${summary.id}${notable}`;
}
function jsonString(value) {
  return JSON.stringify(value);
}
var FACT_LINK_TYPES = new Set([
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule"
]);
var MAX_GROUNDING = 2;
function groundingLines(requirementId, summarize) {
  const links = summarize(requirementId).links ?? [];
  const facts = [
    ...new Set(links.filter((link) => FACT_LINK_TYPES.has(link.type)).map((link) => link.target))
  ];
  const adrs = [
    ...new Set(links.filter((link) => link.target.startsWith("ADR-")).map((link) => link.target))
  ];
  const lines = [];
  if (facts.length > 0) {
    const shown = facts.slice(0, MAX_GROUNDING).map((id) => describeEntity(summarize(id)));
    const more = facts.length > MAX_GROUNDING ? ` +${facts.length - MAX_GROUNDING}` : "";
    lines.push(`${requirementId} must keep true: ${shown.join("; ")}${more}.`);
  }
  const adr = adrs[0];
  if (adr)
    lines.push(`Decision: ${describeEntity(summarize(adr))}.`);
  return lines;
}
function fileKnowledgeSnippet(input) {
  const { relativePath, symbols, surface, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);
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
  const tests = [
    ...new Set(symbols.flatMap((symbol) => symbol.coveredBy))
  ].sort();
  const executes = [
    ...new Set(symbols.flatMap((symbol) => symbol.executableFor))
  ].sort();
  if (owners.size === 0 && tests.length === 0 && executes.length === 0) {
    return;
  }
  const focusOwners = new Set(focus.flatMap((symbol) => symbol.implements));
  const requirementIds = [...owners.keys()].sort((left, right) => {
    const focusOrder = Number(focusOwners.has(right)) - Number(focusOwners.has(left));
    return focusOrder !== 0 ? focusOrder : (owners.get(right)?.length ?? 0) - (owners.get(left)?.length ?? 0);
  });
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
    lines.push(...groundingLines(leadId, summarize));
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
  const leadRequirement = requirementIds[0];
  const next = [
    leadRequirement ? `kb_query({id:${jsonString(leadRequirement)}}) returns full requirement text` : undefined,
    `kb_search({query:"<topic>", sourceLocations:[${location}]}) answers with governing requirements, facts, decisions, and tests`
  ].filter((part) => part !== undefined);
  lines.push(`Next layer: ${next.join("; ")}.`);
  if (surface === "edit") {
    lines.push(`Behavior changes here are traced to these requirements; kb_check({sourceFiles:[${jsonString(relativePath)}], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.`);
  }
  return truncate(lines.join(`
`), MAX_SNIPPET_CHARS);
}
function focusUpdate(relativePath, symbols, focus) {
  const symbol = focusedSymbols(symbols, focus)[0];
  if (!symbol)
    return;
  const owners = symbol.implements.length > 0 ? `, which implements ${formatList(symbol.implements, 2)}` : "";
  return `Kibi: this edit to ${relativePath} is inside ${symbol.title}${owners}.`;
}
function unownedSourceNote(relativePath) {
  return [
    `Kibi: no symbol in ${relativePath} is linked to a requirement yet.`,
    `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) surfaces requirements that may already describe it; new behavior is recorded with kb_upsert (requirement + symbol implements link).`
  ].join(`
`);
}
function searchTip(linkedFileCount) {
  return `Kibi tip: this repository records requirements, scenarios, decisions, and code ownership in a Kibi knowledge base (${linkedFileCount} source files have requirement-linked symbols). For intent questions — why code exists, what it must do — kb_search answers from that knowledge, naming the governing requirements, facts, decisions and tests; kb_query({sourceFile:"<path>"}) lists what a file implements.`;
}
var DIRECT_KB_ACCESS_NOTE = "Kibi: .kb/ holds Kibi-managed knowledge. kb_query/kb_search read it and kb_upsert writes it while keeping the branch store, relationships, and validation consistent; direct file reads miss relationships and direct edits bypass validation.";
function sessionStartContext(linkedFileCount) {
  return [
    `Kibi knowledge base is active in this workspace (${linkedFileCount} source files have requirement-linked symbols).`,
    "Kibi hooks add short requirement/test snippets before reads and edits of linked files, derived from the symbol manifest; kb_query returns the authoritative detail.",
    "Operations: kb_search (ask it a question; the answer layer names governing requirements, must-stay-true facts, ADRs and tests), kb_query (exact id or sourceFile), kb_check (validation and edit impact), kb_upsert (writes). MCP tool names are host-prefixed (e.g. mcp__plugin_kibi-claude_kibi__kb_query); the project-local CLI (`npx --no-install kibi <route> --input -`) is the peer route.",
    "Workflow guidance lives in the kibi-claude:kibi-usage skill (also served by kb_skills with action load)."
  ].join(`
`);
}
function stopReminder(paths) {
  const shown = paths.slice(0, 8);
  const more = paths.length > shown.length ? ` +${paths.length - shown.length}` : "";
  return [
    `Kibi: ${paths.length} source ${paths.length === 1 ? "file" : "files"} changed this session without a Kibi impact check: ${shown.join(", ")}${more}.`,
    `kb_check({sourceFiles:${JSON.stringify(shown)}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports requirement ownership, stale traceability, and symbol-manifest drift for ${paths.length === 1 ? "it" : "them"}. If the change has no KB impact, a one-line no-impact rationale in the final report closes this out.`
  ].join(`
`);
}

// src/usage-log.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import fs3 from "node:fs";
import path4 from "node:path";
import { fileURLToPath } from "node:url";
function hookTelemetryEnabled(env = process.env) {
  const value = env.KIBI_DIAGNOSTIC_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
}
var cachedPluginVersion;
function pluginVersion() {
  if (cachedPluginVersion !== undefined)
    return cachedPluginVersion;
  cachedPluginVersion = null;
  const candidate = path4.join(path4.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  try {
    const parsed = JSON.parse(fs3.readFileSync(candidate, "utf8"));
    if (typeof parsed === "object" && parsed !== null && "version" in parsed && typeof parsed.version === "string") {
      cachedPluginVersion = parsed.version;
    }
  } catch {}
  return cachedPluginVersion;
}
function appendHookUsage(row, env = process.env) {
  if (!hookTelemetryEnabled(env) || row.trace.action === undefined)
    return;
  const finishedAt = new Date;
  const { trace } = row;
  const record = {
    timestamp: finishedAt.toISOString(),
    request_id: `hook-${randomUUID2()}`,
    tool: `hook_${row.event}`,
    interface: "hook",
    host: "claude-code",
    package_version: pluginVersion(),
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
    const logPath = path4.join(row.workspaceRoot, ".kb", "usage.log");
    fs3.mkdirSync(path4.dirname(logPath), { recursive: true });
    fs3.appendFileSync(logPath, `${JSON.stringify(record)}
`, "utf8");
  } catch {}
}

// src/workspace-optin.ts
import fs4 from "node:fs";
import path5 from "node:path";
var KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT"
];
function nextAncestorDirectory(current) {
  const parent = path5.dirname(current);
  return parent === current ? undefined : parent;
}
function hasKibiManifest(directory) {
  return fs4.existsSync(path5.join(directory, ".kb", "manifest.json"));
}
function hasGitBoundary(directory) {
  return fs4.existsSync(path5.join(directory, ".git"));
}
function resolutionFor(root) {
  return { root, optedIn: hasKibiManifest(root) };
}
function resolveKibiWorkspace(startDir, env = process.env) {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      return resolutionFor(path5.resolve(value));
    }
  }
  let current = path5.resolve(startDir && startDir.trim().length > 0 ? startDir : process.cwd());
  while (current !== undefined) {
    if (hasKibiManifest(current)) {
      return { root: current, optedIn: true };
    }
    if (hasGitBoundary(current)) {
      return { root: current, optedIn: false };
    }
    current = nextAncestorDirectory(current);
  }
  return resolutionFor(path5.resolve(startDir ?? process.cwd()));
}

// src/hook-runner.ts
var readTools = new Set(["Read"]);
var editTools = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);
var searchTools = new Set(["Grep", "Glob"]);
var MAX_FOCUS_SCAN_BYTES = 2 * 1024 * 1024;
function context(event, text) {
  return {
    hookSpecificOutput: { hookEventName: event, additionalContext: text }
  };
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toolPath(toolInput) {
  if (!isRecord4(toolInput))
    return;
  const candidate = toolInput.file_path ?? toolInput.notebook_path;
  return typeof candidate === "string" ? candidate : undefined;
}
function linkedFileCount(index) {
  return Object.values(index.files).filter((symbols) => symbols.some((symbol) => symbol.implements.length > 0)).length;
}
function readFocus(toolInput) {
  if (!isRecord4(toolInput))
    return;
  const offset = typeof toolInput.offset === "number" ? toolInput.offset : undefined;
  const limit = typeof toolInput.limit === "number" ? toolInput.limit : undefined;
  if (offset === undefined && limit === undefined)
    return;
  const start = Math.max(1, offset ?? 1);
  return [{ start, end: limit !== undefined ? start + limit - 1 : start }];
}
function editFocus(absolutePath, toolInput) {
  if (!isRecord4(toolInput))
    return;
  const needles = [];
  if (typeof toolInput.old_string === "string")
    needles.push(toolInput.old_string);
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (isRecord4(edit) && typeof edit.old_string === "string") {
        needles.push(edit.old_string);
      }
    }
  }
  const usable = needles.filter((needle) => needle.length > 0);
  if (usable.length === 0)
    return;
  let content;
  try {
    if (fs5.statSync(absolutePath).size > MAX_FOCUS_SCAN_BYTES)
      return;
    content = fs5.readFileSync(absolutePath, "utf8");
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
function isExplored(state, relativePath) {
  return state.exploredPaths.has(relativePath);
}
function requirementIds(symbols) {
  return [...new Set(symbols.flatMap((symbol) => symbol.implements))];
}
function preToolUse(input, workspace, trace = {}) {
  const toolName = input.toolName ?? "";
  const stamped = stampKibiWorkspace(toolName, input.toolInput, workspace.root);
  if (stamped) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        updatedInput: stamped
      }
    };
  }
  const state = loadSessionState(workspace.stateDir);
  trace.kbUsedBefore = state.kbUsed;
  const events = [];
  const emit = (text, action) => {
    trace.action = action;
    appendSessionEvents(workspace.stateDir, events);
    return context("PreToolUse", text);
  };
  if (searchTools.has(toolName)) {
    trace.action = "search_silent";
    if (state.kbUsed || state.notices.has("search-tip"))
      return {};
    const linked = linkedFileCount(workspace.index());
    if (linked === 0)
      return {};
    events.push({ kind: "notice", name: "search-tip" });
    return emit(searchTip(linked), "search_tip");
  }
  const isRead = readTools.has(toolName);
  const isEdit = editTools.has(toolName);
  if (!isRead && !isEdit)
    return {};
  const rawPath = toolPath(input.toolInput);
  const target = rawPath ? toWorkspacePath2(workspace.root, rawPath, input.cwd) : undefined;
  if (!target)
    return {};
  const kind = classifyPath2(target.relative);
  trace.path = target.relative;
  trace.pathKind = kind;
  if (kind === "kb") {
    trace.action = "kb_direct_silent";
    if (state.notices.has("kb-direct"))
      return {};
    events.push({ kind: "notice", name: "kb-direct" });
    return emit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
  }
  if (kind === "other")
    return {};
  const relativePath = target.relative;
  const symbols = workspace.index().files[relativePath] ?? [];
  trace.requirementIds = requirementIds(symbols);
  if (isRead) {
    trace.action = "read_silent";
    if (state.shownRead.has(relativePath) || state.shownEdit.has(relativePath) || isExplored(state, relativePath)) {
      return {};
    }
    const owners = requirementIds(symbols);
    if (owners.length > 0 && owners.every((id) => state.exploredIds.has(id))) {
      return {};
    }
    const snippet = fileKnowledgeSnippet({
      relativePath,
      symbols,
      surface: "read",
      focus: readFocus(input.toolInput),
      summarize: workspace.summarize
    });
    if (!snippet)
      return {};
    events.push({ kind: "shown", surface: "read", path: relativePath });
    return emit(snippet, "read_snippet");
  }
  trace.action = "edit_silent";
  const focus = toolName === "Edit" || toolName === "MultiEdit" ? editFocus(target.absolute, input.toolInput) : undefined;
  if (state.shownEdit.has(relativePath)) {
    const symbol = focusedSymbols(symbols, focus)[0];
    if (!symbol || symbol.implements.length === 0)
      return {};
    const key = `${relativePath}#${symbol.id}`;
    if (state.shownEdit.has(key))
      return {};
    const update = focusUpdate(relativePath, symbols, focus);
    if (!update)
      return {};
    events.push({ kind: "shown", surface: "edit", path: key });
    return emit(update, "edit_focus_update");
  }
  const alreadyKnown = state.shownRead.has(relativePath) || isExplored(state, relativePath);
  const focusSymbol = focusedSymbols(symbols, focus)[0];
  if (focusSymbol) {
    events.push({
      kind: "shown",
      surface: "edit",
      path: `${relativePath}#${focusSymbol.id}`
    });
  }
  events.push({ kind: "shown", surface: "edit", path: relativePath });
  if (alreadyKnown) {
    const update = focusUpdate(relativePath, symbols, focus);
    if (update)
      return emit(update, "edit_focus_update");
    appendSessionEvents(workspace.stateDir, events);
    return {};
  }
  const snippet = fileKnowledgeSnippet({
    relativePath,
    symbols,
    surface: "edit",
    focus,
    summarize: workspace.summarize
  });
  if (snippet)
    return emit(snippet, "edit_snippet");
  if (kind === "source") {
    return emit(unownedSourceNote(relativePath), "edit_unowned_note");
  }
  appendSessionEvents(workspace.stateDir, events);
  return {};
}
function recordKbUsage(usage, workspace, events) {
  const paths = usage.paths.map((candidate) => toWorkspacePath2(workspace.root, candidate, workspace.root)?.relative).filter((candidate) => candidate !== undefined);
  events.push({
    kind: "kb",
    operation: usage.operation,
    paths,
    ids: usage.ids
  });
  if (usage.check) {
    events.push({ kind: "checked", paths, all: usage.checkAll });
  }
}
function hasKibiPreCommitGate(workspaceRoot) {
  const resolved = spawnSync("git", ["rev-parse", "--git-path", "hooks/pre-commit"], { cwd: workspaceRoot, encoding: "utf8", timeout: 2000 });
  const hookPath = resolved.status === 0 && resolved.stdout.trim().length > 0 ? path6.resolve(workspaceRoot, resolved.stdout.trim()) : path6.join(workspaceRoot, ".git", "hooks", "pre-commit");
  try {
    return /kibi[^\n]*\bcheck\b/.test(fs5.readFileSync(hookPath, "utf8"));
  } catch {
    return false;
  }
}
function postToolUse(input, workspace, trace = {}) {
  const toolName = input.toolName ?? "";
  const events = [];
  const kbUsedBefore = () => workspace.telemetry ? loadSessionState(workspace.stateDir).kbUsed : undefined;
  const recordUsage = (usage) => {
    trace.kbUsedBefore = kbUsedBefore();
    trace.action = "kb_usage";
    trace.kbOperation = usage.operation;
    recordKbUsage(usage, workspace, events);
  };
  if (editTools.has(toolName)) {
    const rawPath = toolPath(input.toolInput);
    const target = rawPath ? toWorkspacePath2(workspace.root, rawPath, input.cwd) : undefined;
    if (target) {
      const pathKind = classifyPath2(target.relative);
      events.push({ kind: "edited", path: target.relative, pathKind });
      if (pathKind !== "other") {
        trace.kbUsedBefore = kbUsedBefore();
        trace.action = "edited";
        trace.path = target.relative;
        trace.pathKind = pathKind;
      }
    }
  } else if (toolName === "Bash") {
    const command = isRecord4(input.toolInput) ? input.toolInput.command : undefined;
    const usage = extractCliKbUsage(command);
    if (usage)
      recordUsage(usage);
    if (isVerifiedGitCommit(command) && hasKibiPreCommitGate(workspace.root)) {
      events.push({ kind: "checked", paths: [], all: true });
    }
  } else {
    const usage = extractMcpKbUsage(toolName, input.toolInput);
    if (usage)
      recordUsage(usage);
  }
  appendSessionEvents(workspace.stateDir, events);
  return {};
}
function stop(input, workspace, trace = {}) {
  if (input.stopHookActive)
    return {};
  const state = loadSessionState(workspace.stateDir);
  const unreminded = state.pendingSource.filter((pending) => !state.reminded.has(pending));
  if (unreminded.length === 0)
    return {};
  appendSessionEvents(workspace.stateDir, [
    { kind: "reminded", paths: unreminded }
  ]);
  trace.action = "stop_reminder";
  trace.kbUsedBefore = state.kbUsed;
  return context("Stop", stopReminder(unreminded));
}
async function runHook(rawInput, environment = {}) {
  const startedAt = new Date;
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? process.env.CLAUDE_PLUGIN_DATA ?? path6.join(os.tmpdir(), `kibi-claude-${process.getuid?.() ?? "user"}`);
  const projectDir = environment.projectDir ?? process.env.CLAUDE_PROJECT_DIR;
  const resolved = resolveKibiWorkspace(input.cwd ?? projectDir ?? process.cwd());
  if (!resolved.optedIn)
    return {};
  const dataDir = workspaceDataDir(pluginData, resolved.root);
  let index;
  const summaries = new Map;
  const workspace = {
    root: resolved.root,
    stateDir: sessionDir(dataDir, input.sessionId),
    index: () => {
      index ??= loadKnowledgeIndex2(resolved.root, dataDir);
      return index;
    },
    telemetry: hookTelemetryEnabled(environment.env),
    summarize: (entityId) => {
      let summary = summaries.get(entityId);
      if (!summary) {
        summary = readEntitySummary2(resolved.root, entityId);
        summaries.set(entityId, summary);
      }
      return summary;
    }
  };
  const trace = {};
  const output = dispatchHook(input, workspace, trace);
  appendHookUsage({
    workspaceRoot: resolved.root,
    event: input.event,
    sessionId: input.sessionId,
    hostTool: input.toolName,
    trace,
    startedAt
  }, environment.env);
  return output;
}
function dispatchHook(input, workspace, trace) {
  switch (input.event) {
    case "SessionStart":
      trace.action = "session_start";
      return context("SessionStart", sessionStartContext(linkedFileCount(workspace.index())));
    case "PreToolUse":
      return preToolUse(input, workspace, trace);
    case "PostToolUse":
      return postToolUse(input, workspace, trace);
    case "Stop":
      return stop(input, workspace, trace);
    default:
      return {};
  }
}
async function main() {
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}
`);
}
function isInvokedAsCli(argv1, moduleUrl) {
  const invokedPath = argv1 ? pathToFileURL(path6.resolve(argv1)).href : "";
  return moduleUrl === invokedPath;
}
async function runHookCli() {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`kibi-claude hook error: ${message}
`);
    process.stdout.write(`{}
`);
  }
}
if (isInvokedAsCli(process.argv[1], import.meta.url)) {
  runHookCli();
}
export {
  editFocus,
  readFocus,
  runHook
};
