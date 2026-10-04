#!/usr/bin/env node

// src/hook-runner.ts
import path7 from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ../agent-core/dist/hook-usage-log.js
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path2 from "node:path";

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
  const base = isRecord(toolInput) ? toolInput : {};
  return { ...base, [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot };
}
function extractKbMcpToolCall(toolName, toolInput) {
  let normalizedToolName = canonicalKbToolName(toolName);
  if (isRecord(toolInput)) {
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
    if (isRecord(nestedArgs)) {
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
  if (!toolName || !SHELL_TOOL_NAMES.has(toolName) || !isRecord(toolInput)) {
    return;
  }
  return kibiCliOperation(toolInput.command);
}

// ../agent-core/dist/path-policy.js
import path from "node:path";
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
  if (isRecord2(toolInput)) {
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
  const absolute = path.isAbsolute(trimmed) ? path.resolve(trimmed) : path.resolve(base, trimmed);
  const workspaceRelative = path.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  if (workspaceRelative.length === 0 || workspaceRelative === ".." || workspaceRelative.startsWith("../") || path.isAbsolute(workspaceRelative)) {
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
  const extension = path.extname(basename).toLowerCase();
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
  const extension = path.extname(basename).toLowerCase();
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

// ../agent-core/dist/hook-usage-log.js
var HOOK_ACTION_EDITED = "edited";
var HOOK_ACTION_KB_USAGE = "kb_usage";
function hookTelemetryEnabled(env = process.env) {
  const value = env.KIBI_DIAGNOSTIC_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
}
function appendHookUsage(row, env = process.env) {
  if (!hookTelemetryEnabled(env) || row.trace.action === undefined)
    return;
  const finishedAt = new Date;
  const { trace } = row;
  const record = {
    timestamp: finishedAt.toISOString(),
    request_id: `hook-${randomUUID()}`,
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
    const logPath = path2.join(row.workspaceRoot, ".kb", "usage.log");
    fs.mkdirSync(path2.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${JSON.stringify(record)}
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
  if (!hookTelemetryEnabled(env))
    return;
  for (const trace of traces)
    appendHookUsage({ ...row, trace }, env);
}
function readPackageVersion(packageJsonPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (typeof parsed === "object" && parsed !== null && "version" in parsed && typeof parsed.version === "string") {
      return parsed.version;
    }
  } catch {}
  return null;
}

// ../agent-core/dist/knowledge-index.js
import { createHash, randomUUID as randomUUID2 } from "node:crypto";
import fs2 from "node:fs";
import path3 from "node:path";
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
  return scanRecordSequence(text, "symbols");
}
function scanRecordSequence(text, sectionKey) {
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
      section = pair?.[1] !== undefined && unquote(pair[1]) === sectionKey ? "records" : "other";
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
    fs2.mkdirSync(path3.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.${process.pid}.${randomUUID2()}.tmp`;
    fs2.writeFileSync(temporary, payload);
    fs2.renameSync(temporary, cachePath);
  } catch {}
}
function loadKnowledgeIndex(workspaceRoot, cacheDir, options = {}) {
  const symbolsPath = path3.join(workspaceRoot, SYMBOLS_MANIFEST);
  const coordinatesPath = path3.join(workspaceRoot, SYMBOL_COORDINATES);
  const legacyMode = options.legacyLinksAsImplements === false ? "typed" : "legacy";
  const signature = `${INDEX_FORMAT}|${legacyMode}|${fileSignature(symbolsPath)}|${fileSignature(coordinatesPath)}`;
  const cachePath = cacheDir ? path3.join(cacheDir, options.cacheFileName ?? CACHE_FILE) : undefined;
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
var RELATIONSHIPS_DIR = ".kb/relationships";
var shardCache = new Map;
function shardPathFor(workspaceRoot, entityId) {
  const shard = createHash("sha256").update(entityId).digest("hex");
  return path3.join(workspaceRoot, RELATIONSHIPS_DIR, `${shard.slice(0, 2)}.yaml`);
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
    const descriptor = fs2.openSync(path3.join(workspaceRoot, ".kb", lane[1], `${entityId}.md`), "r");
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
  let pending;
  for (const line of lines.slice(1)) {
    if (line.trim() === "---")
      break;
    const match = /^(title|status):\s*(.*)$/.exec(line);
    if (match?.[1] === "title" && match[2])
      summary.title = unquote(match[2]);
    if (match?.[1] === "status" && match[2])
      summary.status = unquote(match[2]);
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
      pending.type = unquote(field[2] ?? "");
    else if (field?.[1] === "target")
      pending.target = unquote(field[2] ?? "");
    else if (entry && SAFE_ENTITY_ID.test(unquote(body)))
      pending.bare = unquote(body);
  }
  flushLink(authored, pending);
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
import { createHash as createHash2 } from "node:crypto";
import fs3 from "node:fs";
import path4 from "node:path";
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
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function editFocus(absolutePath, toolInput) {
  if (!isRecord3(toolInput))
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
      if (isRecord3(edit))
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
var RETIRED_STATUS = /supersed|deprecat|reject|obsolete|retired/i;
function isRetiredStatus(status) {
  return status !== undefined && RETIRED_STATUS.test(status);
}
function describeEntity(summary) {
  const notable = isRetiredStatus(summary.status) ? ` (${summary.status})` : "";
  return summary.title ? `${summary.id}${notable}: ${truncate(summary.title, MAX_TITLE)}` : `${summary.id}${notable}`;
}
function jsonString(value) {
  return JSON.stringify(value);
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
  if (surface === "edit") {
    lines.push(`Behavior changes here are traced to these requirements; kb_check({sourceFiles:[${jsonString(relativePath)}], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.`);
  }
  return truncate(lines.join(`
`), input.maxChars ?? MAX_SNIPPET_CHARS);
}
function editKnowledgeContext(input) {
  const snippets = [];
  for (const relativePath of new Set(input.relativePaths)) {
    if (snippets.length >= (input.maxFiles ?? 3))
      break;
    const symbols = input.symbolsFor(relativePath);
    if (symbols.length === 0)
      continue;
    const snippet = fileKnowledgeSnippet({
      relativePath,
      symbols,
      surface: "edit",
      focus: input.focusFor?.(relativePath),
      summarize: input.summarize,
      maxChars: input.maxChars
    });
    if (!snippet)
      continue;
    const key = `${input.sessionId ?? ""}\x00edit\x00${relativePath}`;
    if (!claimSnippetSlot(input.stateDir, key))
      continue;
    snippets.push(snippet);
  }
  return snippets.length > 0 ? snippets.join(`

`) : undefined;
}
function claimSnippetSlot(stateDir, key) {
  if (!stateDir)
    return true;
  const marker = path4.join(stateDir, "shown-snippets", createHash2("sha256").update(key).digest("hex").slice(0, 32));
  try {
    fs3.mkdirSync(path4.dirname(marker), { recursive: true });
    fs3.writeFileSync(marker, "", { flag: "wx" });
    return true;
  } catch {
    return false;
  }
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
import { createHash as createHash3, randomUUID as randomUUID3 } from "node:crypto";
import fs4 from "node:fs";
import path5 from "node:path";
var stateFileName = "hook-state.json";
var journalFileName = "hook-state.events.jsonl";
var maxDirtyPaths = 50;
var workspaceStateRoot = "workspaces";
function resolveWorkspaceStateDir(pluginData, workspaceRoot) {
  if (!pluginData) {
    return;
  }
  const workspaceKey = createHash3("sha256").update(path5.resolve(workspaceRoot)).digest("hex");
  return path5.join(pluginData, workspaceStateRoot, workspaceKey);
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
  return path5.join(pluginData, stateFileName);
}
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeDirtyPath(dirtyPath) {
  return dirtyPath.trim().replaceAll("\\", "/");
}
function uniqueTempPath(pluginData) {
  return path5.join(pluginData, `${stateFileName}.${process.pid}.${Date.now()}.${randomUUID3()}.tmp`);
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
  return path5.join(pluginData, journalFileName);
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
    contents = fs4.readFileSync(journalPath(pluginData), "utf8");
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
  fs4.mkdirSync(pluginData, { recursive: true });
  fs4.appendFileSync(journalPath(pluginData), `${JSON.stringify(event)}
`, "utf8");
}
function loadHookState(pluginData) {
  if (!pluginData) {
    return emptyHookState();
  }
  try {
    return readJournal(pluginData, coerceHookState(JSON.parse(fs4.readFileSync(statePath(pluginData), "utf8"))));
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
  fs4.mkdirSync(pluginData, { recursive: true });
  const tempPath = uniqueTempPath(pluginData);
  fs4.writeFileSync(tempPath, `${JSON.stringify(boundedState)}
`);
  fs4.renameSync(tempPath, statePath(pluginData));
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
function extractExplicitPathFields2(input) {
  return extractExplicitPathFields(input);
}
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
import fs5 from "node:fs";
import path6 from "node:path";
var KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT"
];
function nextAncestorDirectory(current) {
  const parent = path6.dirname(current);
  return parent === current ? undefined : parent;
}
function hasKibiManifest(directory) {
  return fs5.existsSync(path6.join(directory, ".kb", "manifest.json"));
}
function hasGitBoundary(directory) {
  return fs5.existsSync(path6.join(directory, ".git"));
}
function resolutionFor(root) {
  return { root, optedIn: hasKibiManifest(root) };
}
function resolveKibiWorkspace(startDir, env = process.env) {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      return resolutionFor(path6.resolve(value));
    }
  }
  let current = path6.resolve(startDir && startDir.trim().length > 0 ? startDir : process.cwd());
  while (current !== undefined) {
    if (hasKibiManifest(current)) {
      return { root: current, optedIn: true };
    }
    if (hasGitBoundary(current)) {
      return { root: current, optedIn: false };
    }
    current = nextAncestorDirectory(current);
  }
  return resolutionFor(path6.resolve(startDir ?? process.cwd()));
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
function preEditContext(workspaceRoot, stateDir, input) {
  const targets = editTargets(workspaceRoot, input);
  if (targets.length === 0)
    return;
  const files = loadKnowledgeIndex(workspaceRoot, stateDir).files;
  return editKnowledgeContext({
    relativePaths: targets.map((target) => target.relative),
    symbolsFor: (relativePath) => files[relativePath] ?? [],
    summarize: createEntitySummarizer(workspaceRoot),
    stateDir,
    sessionId: input.sessionId,
    focusFor: (relativePath) => {
      const target = targets.find((candidate) => candidate.relative === relativePath);
      return target ? editFocus(target.absolute, input.toolInput) : undefined;
    }
  });
}
var cachedPackageVersion;
function packageVersion() {
  if (cachedPackageVersion !== undefined)
    return cachedPackageVersion;
  cachedPackageVersion = readPackageVersion(path7.join(path7.dirname(fileURLToPath(import.meta.url)), "..", "package.json"));
  return cachedPackageVersion;
}
function recordToolTelemetry(workspaceRoot, stateDir, input, startedAt, env) {
  if (!hookTelemetryEnabled(env))
    return;
  const kbUsage = kbUsageTrace(input.toolName, input.toolInput);
  let traces = kbUsage ? [kbUsage] : [];
  if (!kbUsage && isKnownEditTool(input.toolName)) {
    const files = loadKnowledgeIndex(workspaceRoot, stateDir).files;
    traces = editTraces(editTargets(workspaceRoot, input).map((target) => target.relative), (relativePath) => implementedRequirementIds(files[relativePath] ?? []));
  }
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
  switch (input.event) {
    case "SessionStart":
      return defaultResult();
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
      const explicitPaths = extractExplicitPathFields2(input.toolInput);
      const hasDirectKbEdit = isEditLikeTool(input.toolName) && explicitPaths.some(isDirectKbPath);
      if (hasDirectKbEdit) {
        return { continue: true, systemMessage: DIRECT_KB_EDIT_WARNING };
      }
      let context;
      try {
        context = isKnownEditTool(input.toolName) ? preEditContext(workspace.root, stateDir, input) : undefined;
      } catch {
        context = undefined;
      }
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
      const dirtyPaths = extractExplicitPathFields2(input.toolInput).filter(isMeaningfulTrackedPath2);
      if (dirtyPaths.length > 0) {
        addDirtyPaths(stateDir, dirtyPaths);
      }
      return defaultResult();
    }
    case "Stop": {
      const state = loadHookState(stateDir);
      const uncheckedSourcePaths = state.dirtyPaths.filter(isSourceImpactRelevantPath2).filter((sourcePath) => !state.impactCheckedPaths.includes(sourcePath));
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
}
async function main() {
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}
`);
}
function isInvokedAsCli(argv1, moduleUrl) {
  const invokedPath = argv1 ? pathToFileURL(path7.resolve(argv1)).href : "";
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
