#!/usr/bin/env node

// src/hook-runner.ts
import { createHash as createHash7, randomUUID as randomUUID5 } from "node:crypto";
import os2 from "node:os";
import path14 from "node:path";
import { pathToFileURL } from "node:url";

// ../agent-core/dist/bash-command.js
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
var MAX_COMMAND_CHARS = 20000;
var MAX_CANDIDATES = 200;
var MTIME_TOLERANCE_MS = 1000;
var TOKEN_SEPARATOR = /[\s;|&<>()'"`,=[\]{}]/;
var PATH_LIKE = /^[\w@.~/+-]*[\w-]\.[A-Za-z0-9]{1,8}$|^[\w@.~+-]*\/[\w@.~/+-]*$/;
var SEARCH_COMMAND = /(^|[\s;|&(])(grep|egrep|rg|ag|ack|find|fd|git\s+(grep|ls-files))(\s|$)/;
var CD_TARGET = /(?:^|[\s;&|('"])cd\s+("[^"]+"|'[^']+'|[^\s;&|)]+)/g;
function unquote(value) {
  return value.replace(/^["']|["']$/g, "");
}
function* cdTargets(command, cwd) {
  let base = cwd;
  for (const match of command.matchAll(CD_TARGET)) {
    const target = unquote(match[1]);
    if (target === "-")
      continue;
    base = path.resolve(base, target);
    yield base;
  }
}
function commandFilePaths(command, cwd) {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const found = new Set;
  let candidates = 0;
  for (const token of scanned.split(TOKEN_SEPARATOR)) {
    if (!PATH_LIKE.test(token) || token.startsWith("-"))
      continue;
    if (++candidates > MAX_CANDIDATES)
      break;
    for (const base of bases) {
      const absolute = path.resolve(base, token);
      try {
        if (fs.statSync(absolute).isFile()) {
          found.add(absolute);
          break;
        }
      } catch {}
    }
  }
  return [...found];
}
function isSearchCommand(command) {
  return SEARCH_COMMAND.test(command.slice(0, MAX_COMMAND_CHARS));
}
function filesChangedSince(root, sinceMs) {
  const listed = spawnSync("git", ["ls-files", "--modified", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8", timeout: 3000 });
  if (listed.status !== 0)
    return [];
  const changed = new Set;
  for (const relative of listed.stdout.split("\x00")) {
    if (relative.length === 0)
      continue;
    try {
      const { mtimeMs } = fs.statSync(path.join(root, relative));
      if (mtimeMs >= sinceMs - MTIME_TOLERANCE_MS)
        changed.add(relative);
    } catch {}
  }
  return [...changed];
}
var SIMPLE_COMMAND_SEPARATOR = /&&|\|\||[;|\n]/g;
var REDIRECT_TARGET = /(?:^|[^0-9&<>])(?:&>>?|>>?\|?)\s*([^\s;&|<>()]+)/g;
var IN_PLACE_FLAG = /^(-[A-Za-z]*i\S*|--in-place(=\S*)?)$/;
var IN_PLACE_EDITORS = new Set(["sed", "gsed", "perl"]);
var COMMAND_PREFIXES = new Set([
  "sudo",
  "env",
  "command",
  "exec",
  "nice",
  "time",
  "xargs",
  "timeout",
  "(",
  "{",
  "then",
  "do",
  "else",
  "!"
]);
var SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
var SCRIPT_FLAG = /^-[A-Za-z]*c[A-Za-z]*$/;
function shellScript(words) {
  const [name, ...args] = words;
  if (!SHELLS.has(path.basename(String(name))))
    return;
  const flag = args.findIndex((arg) => SCRIPT_FLAG.test(arg));
  return flag === -1 ? undefined : args[flag + 1];
}
function maskQuoted(command) {
  let masked = "";
  let quote = null;
  let escaped = false;
  for (const char of command.split("")) {
    if (escaped) {
      escaped = false;
      masked += "_";
    } else if (quote === null && (char === "'" || char === '"')) {
      quote = char;
      masked += "_";
    } else if (char === "\\" && quote !== "'") {
      escaped = true;
      masked += "_";
    } else if (quote !== null) {
      if (char === quote)
        quote = null;
      masked += "_";
    } else
      masked += char;
  }
  return masked;
}
function* simpleCommandWords(command, masked) {
  let start = 0;
  const cut = (end) => [...masked.slice(start, end).matchAll(/\S+/g)].map((word) => {
    const from = start + word.index;
    return command.slice(from, from + word[0].length);
  });
  for (const separator of masked.matchAll(SIMPLE_COMMAND_SEPARATOR)) {
    yield cut(separator.index);
    start = separator.index + separator[0].length;
  }
  yield cut(masked.length);
}
function isCommandWord(word) {
  return !COMMAND_PREFIXES.has(word) && !/^\w+=/.test(word);
}
function commandStart(words) {
  let afterPrefix = false;
  for (const [index, word] of words.entries()) {
    if (!isCommandWord(word)) {
      afterPrefix = afterPrefix || COMMAND_PREFIXES.has(word);
      continue;
    }
    if (afterPrefix && (/^-/.test(word) || /^\d+(?:\.\d+)?[smhd]?$/.test(word)))
      continue;
    return index;
  }
  return -1;
}
function unbracketed(words) {
  return words.flatMap((word) => {
    const opened = /^\(+./.test(word) ? word.replace(/^\(+/, "") : word;
    const closed = /.\)+$/.test(opened) ? opened.replace(/\)+$/, "") : opened;
    return closed === ")" || closed === "}" ? [] : [closed];
  });
}
function* writtenNames(command) {
  const masked = maskQuoted(command);
  for (const match of masked.matchAll(REDIRECT_TARGET)) {
    const end = match.index + match[0].length;
    yield unquote(command.slice(end - match[1].length, end));
  }
  for (const words of simpleCommandWords(command, masked)) {
    const plain = unbracketed(words);
    const commandWords = plain.slice(commandStart(plain));
    const script = shellScript(commandWords);
    if (script !== undefined) {
      yield* writtenNames(unquote(script));
      continue;
    }
    const [name, ...args] = commandWords;
    const program = path.basename(String(name));
    if (IN_PLACE_EDITORS.has(program) && args.some((arg) => IN_PLACE_FLAG.test(arg)) || program === "tee")
      yield* args;
  }
}
function commandEditPaths(command, cwd) {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const wanted = new Set;
  for (const target of writtenNames(scanned)) {
    const name = unquote(target);
    for (const base of bases)
      wanted.add(path.resolve(base, name));
  }
  return commandFilePaths(scanned, cwd).filter((absolute) => wanted.has(absolute));
}
var SHELL_TOOLS = new Set([
  "Bash",
  "Shell",
  "shell",
  "local_shell",
  "exec_command",
  "run_shell_command"
]);

// ../agent-core/dist/checkout-hooks.js
import { spawnSync as spawnSync2 } from "node:child_process";
import * as fs2 from "node:fs";
import * as path2 from "node:path";
var HOOK_MANAGER_FILES = [
  "lefthook.yml",
  "lefthook.yaml",
  ".lefthook.yml",
  ".lefthook.yaml",
  "lefthook.json",
  ".husky",
  ".pre-commit-config.yaml"
];
function git(workspaceRoot, args) {
  const result = spawnSync2("git", args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    timeout: 2000
  });
  return result.status === 0 ? result.stdout.trim() : null;
}
function hasKibiPreCommitGate(workspaceRoot) {
  const resolved = git(workspaceRoot, [
    "rev-parse",
    "--git-path",
    "hooks/pre-commit"
  ]);
  const hookPath = resolved !== null ? path2.resolve(workspaceRoot, resolved) : path2.join(workspaceRoot, ".git", "hooks", "pre-commit");
  try {
    return /kibi[^\n]*\bcheck\b/i.test(String(fs2.readFileSync(hookPath)));
  } catch {}
  return false;
}
function kibiHooksMissing(workspaceRoot) {
  if (!fs2.existsSync(path2.join(workspaceRoot, ".kb", "manifest.json")))
    return false;
  if (git(workspaceRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true")
    return false;
  if (git(workspaceRoot, ["config", "--get", "core.hooksPath"]) !== null)
    return false;
  if (HOOK_MANAGER_FILES.some((file) => fs2.existsSync(path2.join(workspaceRoot, file))))
    return false;
  return !hasKibiPreCommitGate(workspaceRoot);
}
var MISSING_HOOKS_NOTE = "Kibi git hooks are not installed in this checkout (a clone never carries .git/hooks), so commits skip `kibi check --staged` and a branch switch does not recompile the KB. Install them with `npx --no-install kibi hooks install` (or the project's package-manager runner), or by installing the project's dependencies when its prepare script runs it.";
function missingHooksNote(workspaceRoot) {
  return kibiHooksMissing(workspaceRoot) ? MISSING_HOOKS_NOTE : null;
}

// ../agent-core/dist/decision-guard.js
import { createHash as createHash2 } from "node:crypto";
import fs6 from "node:fs";
import path6 from "node:path";

// ../agent-core/dist/kb-mcp-tools.js
function canonicalKbToolName(toolName) {
  const trimmed = String(toolName).trim();
  const lastSegment = trimmed.includes("__") ? trimmed.split("__").at(-1) : trimmed.replace(/^MCP:/i, "");
  const operation = lastSegment.replace(/^kibi_/, "");
  return operation.startsWith("kb_") ? operation : undefined;
}
var KIBI_WORKSPACE_ARGUMENT = "workspaceRoot";
function effectiveKbOperation(operation, payload) {
  const write = operation === "kb_record" ? "kb_upsert" : operation;
  return write === "kb_upsert" && payload.dryRun === true ? "kb_validate_upsert" : write;
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
  record: "kb_upsert",
  sync: "kb_sync"
};
function kibiCliOperation(command) {
  if (typeof command !== "string")
    return;
  const route = /(?:^|[\s;&|(/])kibi\s+([a-z-]+)/.exec(command)?.[1];
  return route ? KIBI_CLI_ROUTES[route] : undefined;
}
var SHELL_TOOL_NAMES = new Set(["Bash", "bash", "Shell", "shell"]);

// ../agent-core/dist/path-policy.js
import path3 from "node:path";
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
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeWorkspacePath(candidate) {
  return candidate.trim().replaceAll("\\", "/");
}
function pathSegments(candidate) {
  return normalizeWorkspacePath(candidate).split("/").filter(Boolean);
}
var patchTextKeys = ["command", "patch", "input", "patchText"];
function extractPatchTexts(toolInput) {
  const fields = isRecord(toolInput) ? toolInput : {};
  return patchTextKeys.map((key) => fields[key]).filter((value) => typeof value === "string");
}
function canonicalizeWorkspacePath(workspaceRoot, options) {
  const trimmed = normalizeWorkspacePath(options.rawPath);
  const base = options.base ?? options.eventCwd ?? workspaceRoot;
  const absolute = path3.isAbsolute(trimmed) ? path3.resolve(trimmed) : path3.resolve(base, trimmed);
  const workspaceRelative = path3.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  if (workspaceRelative.length === 0 || workspaceRelative === ".." || workspaceRelative.startsWith("../") || path3.isAbsolute(workspaceRelative)) {
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
  const basename = segments.at(-1);
  if (basename === undefined)
    return "other";
  const extension = path3.extname(basename).toLowerCase();
  if (!codeExtensions.has(extension))
    return "other";
  if (testBasename.test(basename) || segments.some((segment) => testSegments.has(segment))) {
    return "test";
  }
  return "source";
}

// ../agent-core/dist/requirement-candidates.js
import fs4 from "node:fs";
import path5 from "node:path";

// ../agent-core/dist/knowledge-index.js
import { createHash, randomUUID } from "node:crypto";
import fs3 from "node:fs";
import path4 from "node:path";
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
      return unquote2(raw);
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
      pendingFlow.target[pendingFlow.key] = unquote2(pendingFlow.first);
      pendingFlow = undefined;
    }
    if (indent === 0 && !dash) {
      const pair = keyValue.exec(content);
      otherSection = pair === null || unquote2(pair[1]) !== sectionKey;
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
        const key = unquote2(pair[1]);
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
        listItem = { [unquote2(pair[1])]: parseScalarOrFlow(pair[2]) };
        list.push(listItem);
      } else {
        list.push(unquote2(rest));
      }
      continue;
    }
    const pair = keyValue.exec(content);
    if (pair === null)
      continue;
    const key = unquote2(pair[1]);
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
    const key = unquote2(pair[1]);
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
    const value = unquote2(pair[2]);
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
    const stats = fs3.statSync(filePath);
    return `${stats.size}:${stats.mtimeMs}`;
  } catch {
    return "missing";
  }
}
function readText(filePath) {
  try {
    return fs3.readFileSync(filePath, "utf8");
  } catch {}
  return;
}
function writeCacheAtomically(cachePath, payload) {
  try {
    fs3.mkdirSync(path4.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
    fs3.writeFileSync(temporary, payload);
    fs3.renameSync(temporary, cachePath);
  } catch {}
}
function readCachedIndex(cachePath, signature) {
  try {
    const parsed = JSON.parse(String(fs3.readFileSync(cachePath)));
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
  const symbolsPath = path4.join(workspaceRoot, SYMBOLS_MANIFEST);
  const coordinatesPath = path4.join(workspaceRoot, SYMBOL_COORDINATES);
  if (!cacheDir)
    return scanKnowledgeIndex(symbolsPath, coordinatesPath, options);
  const legacyMode = options.legacyLinksAsImplements === false ? "typed" : "legacy";
  const signature = `${INDEX_FORMAT}|${legacyMode}|${fileSignature(symbolsPath)}|${fileSignature(coordinatesPath)}`;
  const cachePath = path4.join(cacheDir, options.cacheFileName ?? CACHE_FILE);
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
var MAX_REASON_CHARS = 280;
var REQUIREMENT_READ_BYTES = 65536;
var ENTITY_READ_BYTES = 8192;
var SUMMARY_SCALARS = {
  semantic_text: "statement",
  rationale: "rationale",
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
  return { value: block ? joined : unquote2(joined), last };
}
function proseExcerpt(lines, maxChars) {
  const prose = lines.map((line) => line.replace(/^\s*(?:[-*+]|\d+[.)])\s/, "").replace(/^\s*>\s?/, "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|__|`/g, "").trim()).filter((line) => !line.startsWith("|")).join(" ").replace(/\s+/g, " ").trim();
  if (!prose)
    return;
  let excerpt = "";
  for (const sentence of prose.split(/(?<=[.!?]) /)) {
    const next = `${excerpt} ${sentence}`.trim();
    if (excerpt !== "" && Array.from(next).length > maxChars)
      break;
    excerpt = next;
  }
  const chars = Array.from(excerpt);
  return chars.length <= maxChars ? excerpt : `${chars.slice(0, maxChars - 1).join("")}…`;
}
var NO_REASON_STATED = /^reason not stated\b/i;
var REASON_SECTIONS = [
  [/^(?:rationale|why(?! this changed)|context)\b/, "section"],
  [/^why this changed\b/, "why_this_changed"]
];
var CHANGE_NOTE = /^(?:[-*+>]\s*)?(?:split from|superseded by|supersedes|replaces|replaced by)\s/i;
function withoutChangeNotes(lines) {
  return lines.filter((line) => !CHANGE_NOTE.test(line.trim()));
}
function recordedReason(rationale, body) {
  const field = proseExcerpt(withoutChangeNotes([rationale ?? ""]), MAX_REASON_CHARS);
  if (field && !NO_REASON_STATED.test(field))
    return { text: field, from: "rationale" };
  const sections = [];
  let current;
  let fenced = false;
  for (const line of body) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced)
      continue;
    const heading = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      current = [];
      sections.push([heading[1].toLowerCase(), current]);
      continue;
    }
    current?.push(line);
  }
  for (const [pattern, from] of REASON_SECTIONS) {
    const text = sections.filter(([name]) => pattern.test(name)).map(([, content]) => proseExcerpt(withoutChangeNotes(content), MAX_REASON_CHARS)).find((prose) => prose !== undefined && !NO_REASON_STATED.test(prose));
    if (text)
      return { text, from };
  }
  return;
}
var SPEAKING_ORIGINS = new Set(["human", "agent", "import"]);
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
  return path4.join(workspaceRoot, RELATIONSHIPS_DIR, `${shard.slice(0, 2)}.yaml`);
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
var RETIRED_STATUS = /supersed|deprecat|reject|obsolete|retired|archived|removed/i;
function isRetiredStatus(status) {
  return RETIRED_STATUS.test(String(status));
}
function isCurrentFirmSummary(summary) {
  return summary.firmness === "firm" && !isRetiredStatus(summary.status) && summary.supersededBy === undefined;
}
function shardSupersedes(text) {
  const pick = (records) => records.flatMap(({ type, from, to }) => type === "supersedes" && typeof from === "string" && typeof to === "string" ? [{ from, to }] : []);
  if (!/^relationships:\s*\[/m.test(text)) {
    const blocks = text.split(/\n(?=\s*- )/).filter((block) => block.includes("supersedes"));
    const records = scanRecordSequence(`relationships:
${blocks.map((block) => block.replace(/^relationships:\s*\n/, "")).join(`
`)}
`, "relationships");
    const found = pick(records);
    if (found.length === records.filter((record) => record.type === "supersedes").length)
      return found;
  }
  return pick(scanRecordSequence(text, "relationships"));
}
function currentSuccessors(workspaceRoot) {
  const edges = [];
  const list = (dir, suffix) => {
    try {
      return fs3.readdirSync(path4.join(workspaceRoot, dir)).filter((name) => name.endsWith(suffix)).sort();
    } catch {}
    return [];
  };
  for (const name of list(".kb/requirements", ".md")) {
    const id = name.slice(0, -3);
    const text = readText(path4.join(workspaceRoot, ".kb/requirements", name));
    if (text === undefined || !text.includes("supersedes"))
      continue;
    for (const link of readSummaryHead(workspaceRoot, id, false).links ?? [])
      if (link.type === "supersedes")
        edges.push({ from: id, to: link.target });
  }
  for (const name of list(RELATIONSHIPS_DIR, ".yaml")) {
    const text = readText(path4.join(workspaceRoot, RELATIONSHIPS_DIR, name));
    if (text === undefined || !text.includes("supersedes"))
      continue;
    for (const { from, to } of shardSupersedes(text))
      edges.push({ from, to });
  }
  const successors = new Map;
  const retired = new Map;
  for (const { from, to } of edges) {
    if (from === to || successors.has(to) || !from.startsWith("REQ-"))
      continue;
    if (!retired.has(from))
      retired.set(from, isRetiredStatus(readSummaryHead(workspaceRoot, from, false).status));
    if (retired.get(from) === false)
      successors.set(to, from);
  }
  return successors;
}
function supersedingRequirement(workspaceRoot, requirementId) {
  return currentSuccessors(workspaceRoot).get(requirementId);
}
function flushLink(links, pending) {
  if (pending?.target !== undefined) {
    links.push({ type: pending.type ?? "relates_to", target: pending.target });
  } else if (pending?.bare !== undefined) {
    links.push({ type: "relates_to", target: pending.bare });
  }
}
function readEntitySummary(workspaceRoot, entityId) {
  const summary = readSummaryHead(workspaceRoot, entityId);
  if (summary.status === "closed" && entityId.startsWith("REQ-")) {
    const successor = supersedingRequirement(workspaceRoot, entityId);
    if (successor !== undefined)
      summary.supersededBy = successor;
  }
  return summary;
}
function readSummaryHead(workspaceRoot, entityId, withShardLinks = true) {
  const lane = ENTITY_LANES.find(([prefix]) => entityId.startsWith(prefix));
  if (!lane || !SAFE_ENTITY_ID.test(entityId))
    return { id: entityId };
  const requirement = lane[1] === "requirements";
  let head;
  let whole;
  try {
    const descriptor = fs3.openSync(path4.join(workspaceRoot, ".kb", lane[1], `${entityId}.md`), "r");
    try {
      const buffer = Buffer.alloc(requirement ? REQUIREMENT_READ_BYTES : ENTITY_READ_BYTES);
      const bytes = fs3.readSync(descriptor, buffer, 0, buffer.length, 0);
      whole = bytes < buffer.length;
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs3.closeSync(descriptor);
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
  const origin = {};
  let rationale;
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
        else if (scalarField === "rationale")
          rationale = value;
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
      values.push(unquote2(scalar[2]));
    }
    const flowSet = /^value_set:\s*\[(.*)\]\s*$/.exec(line);
    if (flowSet !== null && flowSet[1].trim()) {
      values.push(...flowSet[1].split(",").map((member) => unquote2(member)));
    }
    if (/^\S/.test(line))
      inValueSet = /^value_set:\s*$/.test(line);
    else if (inValueSet) {
      const member = /^\s*-\s*(.+)/.exec(line);
      if (member)
        values.push(unquote2(member[1]));
    }
    const flowOrigin = /^origin:\s*\{.*\bkind:\s*["']?([a-z]+)/.exec(line);
    if (flowOrigin)
      originKind = flowOrigin[1];
    const nestedKind = inOrigin ? /^\s+kind:\s*["']?([a-z]+)/.exec(line) : null;
    if (nestedKind)
      originKind = nestedKind[1];
    const originField = inOrigin ? /^\s+(approved_by|recorded_at):(.+)/.exec(line) : null;
    if (originField)
      origin[originField[1]] = unquote2(originField[2]);
    if (/^\S/.test(line))
      inOrigin = /^origin:\s*$/.test(line);
    const match = /^(title|status|firmness):\s*(.*)/.exec(line);
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
      pending.type = unquote2(field[2]);
    else if (field?.[1] === "target")
      pending.target = unquote2(field[2]);
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
    ...withShardLinks ? shardLinksFrom(workspaceRoot, entityId) : []
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
  if (summary.statement === undefined && requirement && closed) {
    const paragraph = firstParagraph(lines.slice(bodyStart));
    if (paragraph)
      summary.statement = paragraph;
  }
  if (requirement && closed) {
    const reason = recordedReason(rationale, lines.slice(bodyStart));
    if (reason) {
      const speaking = SPEAKING_ORIGINS.has(String(originKind));
      const by = origin.approved_by || (speaking ? originKind : undefined);
      const on = /^\d{4}-\d{2}-\d{2}/.exec(String(origin.recorded_at))?.[0];
      summary.why = {
        recorded: true,
        ...reason,
        ...speaking && by ? { by } : {},
        ...speaking && by && on ? { on } : {}
      };
    } else if (whole) {
      summary.why = { recorded: false };
    }
  }
  return summary;
}

// ../agent-core/dist/requirement-candidates.js
var REQUIREMENTS_DIR = path5.join(".kb", "requirements");
var HEAD_BYTES = 4096;
var MAX_SCANNED = 2000;
var MAX_REQUIREMENT_CANDIDATES = 3;
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
function pathTopicWords(relativePath) {
  const found = words(relativePath).filter((word) => !LAYOUT_WORDS.has(word) && !FILLER_WORDS.has(word));
  return [...new Set(found)];
}
function unquote3(value) {
  const trimmed = value.trim();
  return /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}
function readHead(file) {
  let head;
  try {
    const descriptor = fs4.openSync(file, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const bytes = fs4.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs4.closeSync(descriptor);
    }
  } catch {
    return;
  }
  const lines = head.split(/\r?\n/);
  if (lines[0].trim() !== "---")
    return;
  const fields = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === "---")
      break;
    const match = /^(id|title|status):(.+)/.exec(line);
    if (match)
      fields[match[1]] = unquote3(match[2]);
  }
  if (!fields.id || !fields.title)
    return;
  return {
    id: fields.id,
    title: fields.title,
    ...fields.status ? { status: fields.status } : {}
  };
}
var RETIRED_STATUS2 = /supersed|deprecat|reject|obsolete|retired|archived|removed/i;
var NOTHING_REPLACED = new Set;
function isClosed(head) {
  return String(head.status).trim().toLowerCase() === "closed";
}
function replacedRequirements(workspaceRoot, requirements, closed) {
  const replaced = new Set;
  for (const head of requirements) {
    if (isClosed(head) || RETIRED_STATUS2.test(String(head.status)))
      continue;
    for (const link of readEntitySummary(workspaceRoot, head.id).links ?? [])
      if (link.type === "supersedes" && closed.has(link.target))
        replaced.add(link.target);
  }
  return replaced;
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
function rankRequirementCandidates(relativePath, requirements, limit = MAX_REQUIREMENT_CANDIDATES, requestWords, replaced = NOTHING_REPLACED) {
  const topic = new Set(pathTopicWords(relativePath));
  const request = new Set(requestWords?.filter((word) => !topic.has(word)));
  const scored = [];
  for (const head of requirements) {
    if (RETIRED_STATUS2.test(String(head.status)))
      continue;
    if (replaced.has(head.id))
      continue;
    const titleWords = words(head.title);
    const pathHits = titleWords.filter((word) => topic.has(word));
    const requestHits = titleWords.filter((word) => request.has(word));
    const shared = new Set(pathHits).size;
    const asked = new Set(requestHits).size;
    if (shared > 0 || asked >= 2) {
      scored.push({
        head,
        closed: isClosed(head) ? 1 : 0,
        shared,
        asked,
        uses: pathHits.length + requestHits.length
      });
    }
  }
  scored.sort((a, b) => a.closed - b.closed || b.shared - a.shared || b.asked - a.asked || b.uses - a.uses || a.head.id.localeCompare(b.head.id));
  return scored.slice(0, limit).map((entry) => entry.head);
}
function requirementCandidatesForPath(workspaceRoot, relativePath, limit = MAX_REQUIREMENT_CANDIDATES, requestWords) {
  if (pathTopicWords(relativePath).length === 0 && (requestWords?.length ?? 0) < 2)
    return [];
  const directory = path5.join(workspaceRoot, REQUIREMENTS_DIR);
  let names;
  try {
    names = fs4.readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return [];
  }
  if (names.length > MAX_SCANNED)
    return [];
  const heads = names.map((name) => readHead(path5.join(directory, name))).filter((head) => head !== undefined);
  const closed = new Set(rankRequirementCandidates(relativePath, heads, heads.length, requestWords).filter(isClosed).map((head) => head.id));
  const replaced = closed.size > 0 ? replacedRequirements(workspaceRoot, heads, closed) : NOTHING_REPLACED;
  return rankRequirementCandidates(relativePath, heads, limit, requestWords, replaced);
}

// ../agent-core/dist/snippets.js
import fs5 from "node:fs";
var MAX_REQUIREMENTS = 4;
var MAX_SYMBOLS_PER_REQUIREMENT = 3;
var MAX_TESTS = 3;
var MAX_TITLE = 80;
var MAX_GROUNDING = 2;
var MAX_CLAIM = 160;
var MAX_WHY_CHARS = 240;
var SHORT_WHY_CHARS = 160;
var TIGHT_WHY_CHARS = 100;
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
  const usable = [input, ...edits.map((edit) => edit ?? {})].flatMap((record) => [record.old_string, record.oldString].map((needle) => ({
    needle,
    all: record.replace_all === true || record.replaceAll === true
  }))).filter((entry) => typeof entry.needle === "string" && entry.needle.length > 0);
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
  for (const { needle, all } of usable) {
    let offset = content.indexOf(needle);
    while (offset >= 0) {
      const start = content.slice(0, offset).split(`
`).length;
      ranges.push({ start, end: start + needle.split(`
`).length - 1 });
      if (!all)
        break;
      offset = content.indexOf(needle, offset + needle.length);
    }
  }
  return ranges.length > 0 ? ranges : undefined;
}
function formatList(items, limit) {
  const shown = items.slice(0, limit).join(", ");
  return items.length > limit ? `${shown} +${items.length - limit}` : shown;
}
function describeEntity(summary, supersededBy) {
  const successor = supersededBy ?? summary.supersededBy;
  const retired = successor ? ` (${summary.status ?? "closed"}, superseded by ${successor})` : isRetiredStatus(summary.status) ? ` (${summary.status})` : "";
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
function unownedSourceNote(relativePath, candidates = []) {
  const head = `Kibi: no symbol in ${relativePath} is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.`;
  const search = `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) surfaces requirements that may already describe it; new behavior is recorded with kb_record (statement, why, who said it, code) as part of the change.`;
  for (let shown = candidates.length;shown > 0; shown--) {
    const named = candidates.slice(0, shown).map((candidate) => `${candidate.id}: ${truncate(candidate.title, MAX_TITLE)}`);
    const note = [
      head,
      `Requirements whose titles share words with this path or the request: ${named.join("; ")}. kb_query({id:${jsonString(candidates[0].id)}}) shows whether one describes the behavior being changed; one that does is traced by an implements link from the symbol that implements it (for markup, the component that renders it).`,
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
    `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) finds a rule recorded under other words. A decision this change makes for this code (a rule the person states, a limit, who may do what) is recorded with kb_record (statement, why, who said it, code) before the work is reported done.`
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
  return `Behavior changes here are traced to these requirements; kb_check({changed:true, sourceFiles:[${jsonString(relativePath)}]}) gives the commit gate's verdict on the edit.`;
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
var REASON_LABELS = {
  rationale: "rationale",
  why_this_changed: "Why this changed",
  section: "context section"
};
function reasonLine(summary, maxChars = MAX_WHY_CHARS, requirementId) {
  const why = summary.why;
  if (!why)
    return;
  const of = requirementId ? ` for ${requirementId}` : "";
  if (!why.recorded)
    return `Why: no reason is recorded${of}.`;
  const text = proseExcerpt([why.text], maxChars);
  const said = why.by ? `; ${why.by}${why.on ? `, ${why.on}` : ""}` : "";
  const owner = requirementId ? `${requirementId} ` : "";
  return `Why: ${withoutClosingStop(text)} (${owner}${REASON_LABELS[why.from]}${said}).`;
}
function requirementGroundingLines(requirementId, summarize, options = {}) {
  const maxFacts = options.maxFacts ?? MAX_GROUNDING;
  const whyChars = options.whyChars ?? MAX_WHY_CHARS;
  const requirement = summarize(requirementId);
  if (isRetiredStatus(requirement.status) || requirement.supersededBy !== undefined)
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
  const why = whyChars > 0 ? reasonLine(requirement, whyChars, requirementId) : undefined;
  if (why)
    lines.push(why);
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
function replacedAmong(requirementIds, summarize) {
  const listed = new Set(requirementIds);
  const replaced = new Map;
  for (const id of requirementIds) {
    const summary = summarize(id);
    if (summary.supersededBy !== undefined && !replaced.has(id))
      replaced.set(id, summary.supersededBy);
    if (summary.status === "closed" || isRetiredStatus(summary.status))
      continue;
    for (const link of summary.links ?? [])
      if (link.type === "supersedes" && link.target !== id && listed.has(link.target) && !replaced.has(link.target))
        replaced.set(link.target, id);
  }
  return replaced;
}
function currentFirstOwners(symbols, focus, summarize) {
  const { owners, requirementIds } = requirementOwners(symbols, focus);
  const replaced = replacedAmong(requirementIds, summarize);
  return {
    owners,
    requirementIds: [
      ...requirementIds.filter((id) => !replaced.has(id)),
      ...requirementIds.filter((id) => replaced.has(id))
    ],
    replaced
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
var SNIPPET_LAYOUTS = [
  {
    requirements: MAX_REQUIREMENTS,
    facts: MAX_GROUNDING,
    whyChars: MAX_WHY_CHARS,
    tests: true
  },
  {
    requirements: 3,
    facts: MAX_GROUNDING,
    whyChars: MAX_WHY_CHARS,
    tests: true
  },
  { requirements: 2, facts: 1, whyChars: MAX_WHY_CHARS, tests: true },
  { requirements: 2, facts: 1, whyChars: SHORT_WHY_CHARS, tests: true },
  { requirements: 1, facts: 1, whyChars: SHORT_WHY_CHARS, tests: true },
  { requirements: 1, facts: 1, whyChars: SHORT_WHY_CHARS, tests: false },
  { requirements: 1, facts: 1, whyChars: TIGHT_WHY_CHARS, tests: false }
];
function fitLayouts(compose, maxChars) {
  const texts = SNIPPET_LAYOUTS.map(compose);
  const fits = texts.find((text) => text.length <= maxChars);
  return fits ?? truncate(texts.at(-1), maxChars);
}
function fileKnowledgeSnippet(input) {
  const { relativePath, symbols, surface, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);
  const { owners, requirementIds, replaced } = currentFirstOwners(symbols, focus, summarize);
  const tests = [
    ...new Set(symbols.flatMap((symbol) => symbol.coveredBy))
  ].sort();
  const executes = [
    ...new Set(symbols.flatMap((symbol) => symbol.executableFor))
  ].sort();
  if (owners.size === 0 && tests.length === 0 && executes.length === 0) {
    return;
  }
  const leadId = requirementIds[0];
  const primaryFocus = focus[0];
  const compose = (layout) => {
    const lines = [
      `Kibi knowledge for ${relativePath} (symbol manifest):`
    ];
    for (const requirementId of requirementIds.slice(0, layout.requirements)) {
      const symbolTitles = owners.get(requirementId);
      lines.push(`- ${describeEntity(summarize(requirementId), replaced.get(requirementId))} — ${formatList(symbolTitles, MAX_SYMBOLS_PER_REQUIREMENT)}`);
    }
    if (requirementIds.length > layout.requirements) {
      lines.push(`- +${requirementIds.length - layout.requirements} more requirements: kb_query({sourceFile:${jsonString(relativePath)}})`);
    }
    const grounding = surface === "edit" && leadId ? requirementGroundingLines(leadId, summarize, {
      maxFacts: layout.facts,
      whyChars: layout.whyChars
    }) : [];
    lines.push(...grounding);
    if (layout.tests && tests.length > 0) {
      lines.push(`Covered by: ${formatList(tests, MAX_TESTS)}.`);
    }
    if (layout.tests && executes.length > 0) {
      lines.push(`Test code for: ${formatList(executes, MAX_TESTS)}.`);
    }
    if (primaryFocus) {
      const owner = primaryFocus.implements[0];
      const verb = surface === "edit" ? "The edit is inside" : "These lines are inside";
      lines.push(owner ? `${verb} ${primaryFocus.title}, which implements ${owner}.` : `${verb} ${primaryFocus.title}.`);
    }
    const location = primaryFocus ? `{path:${jsonString(relativePath)}, symbol:${jsonString(primaryFocus.title)}}` : `{path:${jsonString(relativePath)}}`;
    const reasonShown = grounding.some((line) => line.startsWith("Why: "));
    const next = [
      leadId ? `kb_query({id:${jsonString(leadId)}, includeBody:true}) returns the full requirement text${reasonShown ? "" : " and why it exists"}` : undefined,
      `kb_search({query:"<topic>", sourceLocations:[${location}]}) answers with governing requirements, facts, decisions, and tests`
    ].filter((part) => part !== undefined);
    lines.push(`Next layer: ${next.join("; ")}.`);
    if (surface === "edit")
      lines.push(impactCheckLine(relativePath));
    return lines.join(`
`);
  };
  return fitLayouts(compose, input.maxChars ?? MAX_SNIPPET_CHARS);
}
function editKnowledgeUpdate(input) {
  const { relativePath, symbols, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);
  const { requirementIds } = currentFirstOwners(symbols, focus, summarize);
  const leadId = requirementIds[0];
  const lines = [];
  const focused = focusUpdate(relativePath, symbols, input.focus);
  if (focused) {
    lines.push(focused);
  } else if (leadId) {
    lines.push(`Kibi: this edit to ${relativePath} changes code that implements ${formatList(requirementIds, 2)}.`);
  }
  if (!leadId)
    return lines[0];
  return fitLayouts((layout) => [
    ...lines,
    ...requirementGroundingLines(leadId, summarize, {
      maxFacts: layout.facts,
      whyChars: layout.whyChars
    }),
    impactCheckLine(relativePath)
  ].join(`
`), input.maxChars ?? MAX_SNIPPET_CHARS);
}
function focusUpdate(relativePath, symbols, focus) {
  const symbol = focusedSymbols(symbols, focus)[0];
  if (!symbol)
    return;
  const owners = symbol.implements.length > 0 ? `, which implements ${formatList(symbol.implements, 2)}` : "";
  return `Kibi: this edit to ${relativePath} is inside ${symbol.title}${owners}.`;
}

// ../agent-core/dist/decision-guard.js
var CONFIRM_FIRM_EDITS_ENV = "KIBI_CONFIRM_FIRM_EDITS";
function confirmFirmEdits(env) {
  const value = env[CONFIRM_FIRM_EDITS_ENV]?.trim().toLowerCase();
  return !(value === "0" || value === "false" || value === "off");
}
var MAX_LOCATE_BYTES = 2 * 1024 * 1024;
var CODE_NAME = /^[A-Za-z_$][\w$]*(?:[.#:][A-Za-z_$][\w$]*)*$/;
var NAME_LOOKAHEAD_LINES = 5;
function readSmallText(absolutePath) {
  try {
    if (fs6.statSync(absolutePath).size > MAX_LOCATE_BYTES)
      return;
    return fs6.readFileSync(absolutePath, "utf8");
  } catch {
    return;
  }
}
function unlocatedSymbols(symbols, content) {
  const lines = content?.split(`
`);
  return symbols.filter((symbol) => {
    if (symbol.line === undefined)
      return true;
    if (lines === undefined)
      return false;
    const end = symbol.endLine ?? symbol.line;
    if (end > lines.length)
      return true;
    if (!CODE_NAME.test(symbol.title))
      return false;
    if (symbol.line === 1 && end >= lines.length - 1)
      return false;
    const name = symbol.title.split(/[.#:]/).pop();
    const window = lines.slice(symbol.line - 1, Math.min(end, symbol.line + NAME_LOOKAHEAD_LINES)).join(`
`);
    return !window.includes(name);
  });
}
function firmRequirementsTouched(input) {
  if (input.commentOnly === true)
    return { ids: [], symbol: undefined };
  const unlocated = input.wholeFile ? [] : unlocatedSymbols(input.symbols, input.absolutePath === undefined ? undefined : readSmallText(input.absolutePath));
  const touched = input.wholeFile ? input.symbols : [
    ...focusedSymbols(input.symbols.filter((symbol) => !unlocated.includes(symbol)), input.focus),
    ...unlocated
  ];
  const ids = implementedRequirementIds(touched).filter((id) => {
    if (input.confirmed?.has(id))
      return false;
    const summary = input.summarize(id);
    if (!isCurrentFirmSummary(summary))
      return false;
    const reviewed = input.reviewed;
    if (reviewed === undefined)
      return true;
    return !touched.filter((symbol) => symbol.implements.includes(id)).every((symbol) => reviewed(id, symbol));
  });
  return { ids, symbol: input.wholeFile ? undefined : touched[0] };
}
var MAX_COMMENT_ONLY_BYTES = 2 * 1024 * 1024;
var DEAD_IMPLEMENTS_LINE = /^\s*(?:\/\/+|#+|%+|\/\*+|\*|--)\s*(?:implements|Implements|IMPLEMENTS)(?:\s*:\s*|\s+)[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+(?:\s*,\s*[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+)*\s*(?:\*\/)?\s*$/;
function isDeadImplementsComment(line) {
  return DEAD_IMPLEMENTS_LINE.test(line);
}
var TRAILING_DEAD_IMPLEMENTS = /^\s*(?:\/\/+|#+|%+|\/\*+|--)\s*(?:implements|Implements|IMPLEMENTS)(?:\s*:\s*|\s+)[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+(?:\s*,\s*[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+)*\s*(?:\*\/)?\s*$/;
function quotesClosed(code) {
  const unescaped = code.replace(/\\./g, "");
  return ["'", '"', "`"].every((quote) => unescaped.split(quote).length % 2 === 1);
}
function removesTrailingDeadImplementsComment(before, after) {
  const code = after.trimEnd();
  if (code === "" || !before.startsWith(code))
    return false;
  const cut = before.slice(code.length);
  if (!TRAILING_DEAD_IMPLEMENTS.test(cut))
    return false;
  if (!/^\s/.test(cut) && !code.endsWith(";"))
    return false;
  return quotesClosed(code);
}
function removesOnlyDeadComments(before, after) {
  const kept = before.split(`
`);
  const wanted = after.split(`
`);
  let removed = 0;
  let next = 0;
  for (const line of kept) {
    const target = wanted[next];
    if (target === line) {
      next += 1;
    } else if (isDeadImplementsComment(line)) {
      removed += 1;
    } else if (target !== undefined && removesTrailingDeadImplementsComment(line, target)) {
      removed += 1;
      next += 1;
    } else {
      return false;
    }
  }
  return removed > 0 && next === wanted.length;
}
var PATCH_SECTION_HEADER = /^\*\*\* (Update|Add|Delete) File: (.+)$/;
function parsePatchSections(patch) {
  const lines = patch.trim().split(/\r?\n/);
  if (lines[0]?.trim() !== "*** Begin Patch")
    return;
  if (lines.at(-1)?.trim() !== "*** End Patch")
    return;
  const sections = [];
  let current;
  for (const line of lines.slice(1, -1)) {
    const header = PATCH_SECTION_HEADER.exec(line.trim());
    if (header?.[1] && header[2]) {
      current = {
        kind: header[1],
        path: normalizeWorkspacePath(header[2]),
        lines: []
      };
      sections.push(current);
    } else if (current === undefined) {
      return;
    } else {
      current.lines.push(line);
    }
  }
  return sections;
}
function patchSectionRemovesOnlyDeadComments(section) {
  if (section.kind !== "Update")
    return false;
  let removed = 0;
  const lines = section.lines;
  for (let index = 0;index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("-")) {
      const replacement = lines[index + 1];
      if (isDeadImplementsComment(line.slice(1))) {
        removed += 1;
      } else if (replacement?.startsWith("+") && removesTrailingDeadImplementsComment(line.slice(1), replacement.slice(1))) {
        removed += 1;
        index += 1;
      } else {
        return false;
      }
    } else if (!(line.startsWith(" ") || line.startsWith("@@") || line === "" || line === "*** End of File")) {
      return false;
    }
  }
  return removed > 0;
}
function patchesRemoveOnlyDeadComments(absolutePath, patches, base) {
  const target = path6.resolve(absolutePath);
  const relevant = [];
  for (const patch of patches) {
    const sections = parsePatchSections(patch);
    if (sections === undefined)
      return false;
    relevant.push(...base === undefined ? sections : sections.filter((section) => path6.resolve(base, section.path) === target));
  }
  return relevant.length > 0 && relevant.every(patchSectionRemovesOnlyDeadComments);
}
function removesOnlyDeadImplementsComments(absolutePath, toolInput, base) {
  const input = toolInput ?? {};
  const records = Array.isArray(input.edits) ? [input, ...input.edits.map((edit) => edit ?? {})] : [input];
  const pairs = [];
  for (const entry of records) {
    const before = entry.old_string ?? entry.oldString;
    const after = entry.new_string ?? entry.newString;
    if (before === undefined && after === undefined)
      continue;
    if (typeof before !== "string" || typeof after !== "string")
      return false;
    pairs.push([before, after]);
  }
  const patches = extractPatchTexts(toolInput);
  if (patches.length > 0) {
    return pairs.length === 0 && input.content === undefined && patchesRemoveOnlyDeadComments(absolutePath, patches, base);
  }
  if (pairs.length === 0) {
    if (typeof input.content !== "string")
      return false;
    try {
      if (fs6.statSync(absolutePath).size > MAX_COMMENT_ONLY_BYTES)
        return false;
      pairs.push([fs6.readFileSync(absolutePath, "utf8"), input.content]);
    } catch {
      return false;
    }
  }
  return pairs.every(([before, after]) => removesOnlyDeadComments(before, after));
}
function firmEditConfirmation(where, requirements) {
  const shown = requirements.slice(0, 2).map((summary) => summary.title ? `${summary.id}: ${summary.title}` : summary.id);
  const more = requirements.length > shown.length ? ` (+${requirements.length - shown.length} more)` : "";
  const noun = requirements.length === 1 ? "a firm requirement" : "firm requirements";
  const named = `${shown.join("; ")}${more}`.replace(/\.+$/, "");
  return `Kibi: this edit changes ${where}, which implements ${noun} recorded in the knowledge base: ${named}. Allow it if the change keeps ${requirements.length === 1 ? "that requirement" : "them"}, or if you mean to change ${requirements.length === 1 ? "the requirement" : "them"} too.`;
}
function firmEditContext(ids) {
  const named = ids.slice(0, 2).join(", ");
  return [
    `Kibi asked the person to confirm this edit because it changes code that implements firm ${ids.length === 1 ? "requirement" : "requirements"} ${named}.`,
    "If the person declined the edit, the requirement stands: name it and ask the person how to proceed, rather than reaching the same change another way. If it was allowed and the change alters what the requirement says, the requirement is updated with kb_upsert in this change. " + `If nobody could answer and the edit keeps the requirement, record verdict "keeps" for that symbol with kb_review_firm_edit (CLI: kibi review-firm-edit) and retry: a keeps receipt recorded after this question lets the retry of this edit through in this session; a later session is asked again. kibi check --staged blocks the commit until each edited symbol has a current keeps receipt, so record one after the edit too. A receipt is your judgment, not the person's approval, and kibi signoff lists it as such.`
  ].join(`
`);
}
var RULE_PHRASES = /\b(?:from now on|going forward|must(?:n['’]t| not)?|should (?:always|never)(?!\s+have\b)|is not allowed|are not allowed|not be allowed|only (?:allow|admins?|owners?)|is required|are required|has to|have to)\b/gi;
var DESCRIBING_FRAME = /\b(?:bug|issue|problem|regression|error|crash)\s+(?:where|when|that|in which)\b|\b(?:which|whether|what)\s+(?:of\s+)?[\w'’-]+\s+$/i;
var SPEAKER_FRAME = /\bI\s+$/;
var SPEAKER_PHRASE = /^ha(?:s|ve) to$/i;
var CLAUSE_BREAK = /[;:]|,\s*(?:(?:and|but|so)\s+)?|\b(?:and|but)\s+/gi;
function currentClause(prefix) {
  let start = 0;
  for (const match of prefix.matchAll(CLAUSE_BREAK))
    start = match.index + match[0].length;
  return prefix.slice(start);
}
var IMPERATIVE_ADVERB = /(?:^|[;:,(]\s*|\b(?:and|but|so|then|please|also|let['’]?s|let us)\s+)(never|always)\b(?!-)(?!\s+mind\b)/i;
var ASKING_ADVERB = /(?:\b(?:make sure|ensure)(?:\s+that)?(?:\s+[\w'’-]+){0,3}?\s+|\b(?:remember|need|want|be sure|try) to\s+|\b(?:may|shall|can)\s+(?=never)|\b(?:we|you)\s+(?=(?:never|always)\s+(?:want|need) to\b))(never|always)\b(?!-)/i;
var DESCRIBING_NEXT_WORD = /^\s+(?:a|an|the|have been|has|had|been|was|were|is|are|am|did|does|\w+ed|\w*[^s\W]s)\b/i;
var REQUEST_QUESTION = /^(?:please\s+)?(?:can|could|would|will)\s+(?:you|we)\b/i;
var ASKS_TO_BE_TOLD = /^(?:please\s+)?(?:can|could|would|will)\s+(?:you|we)\s+(?:tell|explain|show)\b/i;
var CODE_SPANS = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`/g;
var LINE_MARKERS = /^(?:[-*+#]+\s+|\d+[.)]\s+)+/;
var PASTED_OUTPUT_LINE = /^\s*(?:[\w.$]*Error:|[\w.$]+Exception:|(?:[Ee]rror|ERROR|[Ww]arning|WARNING|[Ff]atal|FATAL|[Pp]anic|PANIC)\s*[:[]|at\s+\S+\s+\(\S*:\d+)/;
var QUOTED_WORDS = /(?<!\w)'[^'\n]+'(?!\w)|‘[^’\n]*’/g;
var MIN_QUOTED_RULE_WORDS = 4;
function quotedRule(span) {
  const words = span.split(/\s+/).filter((word) => /\w/.test(word));
  return words.length >= MIN_QUOTED_RULE_WORDS && new RegExp(RULE_PHRASES.source, "i").test(span);
}
var EMPHASIS = /\*+|(?<!\w)_+|_+(?!\w)/g;
function requestLines(text) {
  const lines = [];
  let previous = "blank";
  for (const line of text.split(`
`)) {
    if (/^(?: {4}|\t)/.test(line) && previous !== "text") {
      previous = "code";
      continue;
    }
    previous = line.trim() === "" ? "blank" : "text";
    if (/^\s*>/.test(line) || PASTED_OUTPUT_LINE.test(line))
      continue;
    lines.push(line.trim().replace(LINE_MARKERS, "").replace(EMPHASIS, ""));
  }
  return lines;
}
function requestSentences(prompt) {
  return requestLines(prompt.replace(CODE_SPANS, " ")).map((line) => line.replace(QUOTED_WORDS, (span) => quotedRule(span) ? span : " ")).flatMap((line) => line.split(/(?<=[.!?])\s/)).map((sentence) => sentence.trim());
}
function instructingAdverb(sentence) {
  const asked = ASKING_ADVERB.exec(sentence);
  if (asked)
    return asked[1].toLowerCase();
  const pattern = new RegExp(IMPERATIVE_ADVERB.source, "gi");
  for (const match of sentence.matchAll(pattern)) {
    const rest = sentence.slice(match.index + match[0].length);
    if (!DESCRIBING_NEXT_WORD.test(rest))
      return match[1].toLowerCase();
  }
  return;
}
function ruleMatch(prompt) {
  const sentences = requestSentences(prompt);
  for (const [index, sentence] of sentences.entries()) {
    if (sentence.endsWith("?") && (!REQUEST_QUESTION.test(sentence) || ASKS_TO_BE_TOLD.test(sentence)))
      continue;
    for (const match of sentence.matchAll(RULE_PHRASES)) {
      const clause = currentClause(sentence.slice(0, match.index));
      if (DESCRIBING_FRAME.test(clause))
        continue;
      if (SPEAKER_PHRASE.test(match[0]) && SPEAKER_FRAME.test(clause))
        continue;
      return { phrase: match[0].toLowerCase(), sentences, index };
    }
    const adverb = instructingAdverb(sentence);
    if (adverb)
      return { phrase: adverb, sentences, index };
  }
  return;
}
function statedRule(prompt) {
  return ruleMatch(prompt)?.phrase;
}
var REASON_MARKER = /\b(?:because|so that)\b/i;
var MAX_REASON_CHARS2 = 200;
function statedReason(prompt) {
  const match = prompt === undefined ? undefined : ruleMatch(prompt);
  if (match === undefined)
    return;
  for (const sentence of match.sentences.slice(match.index, match.index + 2)) {
    const marker = REASON_MARKER.exec(sentence);
    if (marker === null)
      continue;
    const reason = sentence.slice(marker.index).replace(/[.!]+$/, "");
    return reason.length > MAX_REASON_CHARS2 ? `${reason.slice(0, MAX_REASON_CHARS2 - 1).trimEnd()}…` : reason;
  }
  return;
}
function reasonLine2(reason) {
  return `The request gives its reason ("${reason}"): put that reason in the why field, in the person's words.`;
}
function rulePromptNote(phrase, reason) {
  return [
    `Kibi: this request reads as a rule or decision (it says "${phrase}").`,
    "A rule the person states is project knowledge: kb_search shows whether a recorded requirement already says something about it (changing a firm one is a question for the person first), and a new rule is recorded with kb_record (the statement, the person's reason, saidBy user and the code that enforces it; a changed one with kb_upsert) as part of this change, not after it.",
    ...reason === undefined ? [] : [reasonLine2(reason)]
  ].join(`
`);
}
function captureReminder(rulePhrase) {
  return rulePhrase === undefined ? [
    "Kibi: this session changed source files and recorded nothing in the knowledge base.",
    "A decision the person stated or this change made (a rule, a limit, a default, who may do what) is recorded with kb_record (statement, why, who said it and the code that implements it) before the work is reported done; when there was none, the final report says so in one line."
  ].join(`
`) : [
    `Kibi: the person's request said "${rulePhrase}", this session changed source files, and nothing was recorded in the knowledge base.`,
    `Record the rule behind "${rulePhrase}" with kb_record (statement, why, who said it and the code that implements it) before the work is reported done, or say in the final report why "${rulePhrase}" is not a rule.`
  ].join(`
`);
}
function ruleCaptureTemplate(rulePhrase, reason) {
  const template = {
    statement: "<the rule as one shall or must sentence>",
    why: reason === undefined ? "<why the person wants it, in their words; 'Reason not stated' if they gave none>" : "<the person's reason, in their words>",
    saidBy: "user",
    quote: "<the person's words, quoted>",
    code: [
      { file: "<file you changed>", symbol: "<function that enforces it>" }
    ]
  };
  return [
    `Kibi: the request said "${rulePhrase}" and this session now changes source files. Record that rule in this change with one kb_record call (without MCP: kibi record --input -); fill in this template:`,
    JSON.stringify(template),
    ...reason === undefined ? [] : [reasonLine2(reason)],
    "Then follow the nextActions the result returns. Facts, decisions and other modeling go through kb_upsert."
  ].join(`
`);
}
var UNATTRIBUTED = "unattributed";
var UNATTRIBUTED_IDLE_MS = 2 * 60 * 60 * 1000;
var STALE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
function sessionKey(session) {
  return createHash2("sha256").update(session.sessionId?.trim() || UNATTRIBUTED).digest("hex").slice(0, 32);
}
function guardRoot(session) {
  if (!session.stateDir)
    throw new Error;
  return path6.join(session.stateDir, "decision-guard");
}
function sessionPath(session, name) {
  return path6.join(guardRoot(session), sessionKey(session), name);
}
function newestOf(files) {
  let newest = Number.NaN;
  for (const file of files) {
    try {
      const time = fs6.statSync(file).mtimeMs;
      if (!(time <= newest))
        newest = time;
    } catch {}
  }
  return newest;
}
function markerFiles(dir) {
  try {
    return fs6.readdirSync(dir).map((name) => path6.join(dir, name));
  } catch {
    return [];
  }
}
function removeQuietly(target) {
  try {
    fs6.rmSync(target, { recursive: true, force: true });
  } catch {}
}
function startDecisionSession(session, cause, options = {}) {
  const now = options.now ?? Date.now();
  const hostFiles = options.hostFiles ?? [];
  let root;
  try {
    root = guardRoot(session);
  } catch {
    return false;
  }
  const own = sessionKey(session);
  let dropped = false;
  if (!session.sessionId?.trim() && cause !== "resume") {
    const files = [...markerFiles(path6.join(root, own)), ...hostFiles];
    dropped = cause === "startup" || newestOf(files) < now - UNATTRIBUTED_IDLE_MS;
    if (dropped) {
      for (const file of files)
        removeQuietly(file);
    }
  }
  if (cause === "prompt")
    return dropped;
  let keys = [];
  try {
    keys = fs6.readdirSync(root);
  } catch {}
  for (const key of keys) {
    if (key === own)
      continue;
    const dir = path6.join(root, key);
    if (!(newestOf(markerFiles(dir)) >= now - STALE_SESSION_MS)) {
      removeQuietly(dir);
    }
  }
  return dropped;
}
function touchMarker(file, flag) {
  fs6.mkdirSync(path6.dirname(file), { recursive: true });
  fs6.closeSync(fs6.openSync(file, flag));
}
function markDecisionFlag(session, flag) {
  try {
    touchMarker(sessionPath(session, flag), "w");
  } catch {}
}
function claimDecisionFlag(session, flag) {
  try {
    touchMarker(sessionPath(session, flag), "wx");
    return true;
  } catch {
    return false;
  }
}
var SIGNOFF_LATEST_JSON = path6.join(".kb", "briefs", "signoff", "latest.json");
function record(value) {
  return typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
function isRequirementUpsert(toolInput) {
  const input = record(toolInput);
  if (typeof input?.command === "string") {
    const command = input.command;
    const route = kibiCliOperation(command);
    if (route !== "kb_upsert" || /--dry-run\b|"dryRun"\s*:\s*true/.test(command))
      return false;
    return /(?:^|[\s;&|(/])kibi\s+record\b/.test(command) || /"type"\s*:\s*"req"/.test(command);
  }
  const args = record(input?.arguments) ?? record(input?.args) ?? input;
  const recorded = typeof args?.statement === "string" && typeof args.saidBy === "string";
  if (!args || args.type !== "req" && !recorded)
    return false;
  return args.dryRun !== true;
}
function mtimeMs(file) {
  let time = Number.NaN;
  try {
    time = fs6.statSync(file()).mtimeMs;
  } catch {}
  return time;
}
function claimSignoffReminder(session, workspaceRoot) {
  const recorded = mtimeMs(() => sessionPath(session, "requirement-recorded"));
  if (Number.isNaN(recorded))
    return false;
  const shown = mtimeMs(() => path6.join(workspaceRoot, SIGNOFF_LATEST_JSON));
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

// ../agent-core/dist/firm-edit-review.js
import { createHash as createHash3 } from "node:crypto";
import fs7 from "node:fs";
import path7 from "node:path";
var FIRM_EDIT_REVIEWS_DIR = ".kb/firm-edit-reviews";
var FIRM_EDIT_RECEIPT_VERSION = 1;
var REQUIREMENT_ID = /^REQ-[A-Za-z0-9._-]+$/;
function sha256(text) {
  return `sha256:${createHash3("sha256").update(text).digest("hex")}`;
}
function firmEditStatementHash(statement) {
  return sha256(statement.replace(/\s+/g, " ").trim());
}
function firmEditCodeHash(content, startLine, endLine) {
  const lines = content.split(/\r?\n/);
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine || endLine > lines.length)
    return;
  return sha256(lines.slice(startLine - 1, endLine).map((line) => line.trimEnd()).join(`
`));
}
function fileSafe(text) {
  return text.replace(/\//g, "__").replace(/[^A-Za-z0-9._-]/g, "_");
}
var RECEIPT_NAME_PREFIX = 48;
var MAX_FILE_NAME = 255;
function firmEditReceiptPath(requirementId, sourceFile, symbol) {
  if (!REQUIREMENT_ID.test(requirementId))
    return;
  const digest = createHash3("sha256").update(`${sourceFile}\x00${symbol}`).digest("hex").slice(0, 32);
  const prefix = fileSafe(symbol).slice(0, RECEIPT_NAME_PREFIX);
  return `${FIRM_EDIT_REVIEWS_DIR}/${requirementId}/${prefix}--${digest}.json`;
}
function firmEditLegacyReceiptPath(requirementId, sourceFile, symbol) {
  if (!REQUIREMENT_ID.test(requirementId))
    return;
  const name = `${fileSafe(sourceFile)}--${fileSafe(symbol)}.json`;
  if (name.length > MAX_FILE_NAME)
    return;
  return `${FIRM_EDIT_REVIEWS_DIR}/${requirementId}/${name}`;
}
function readFirmEditReceipt(requirementId, sourceFile, symbol, readFile) {
  for (const receiptPath of [
    firmEditReceiptPath(requirementId, sourceFile, symbol),
    firmEditLegacyReceiptPath(requirementId, sourceFile, symbol)
  ]) {
    if (receiptPath === undefined)
      continue;
    const receipt = parseFirmEditReceipt(readFile(receiptPath));
    if (receipt !== undefined && receipt.requirementId === requirementId && receipt.sourceFile === sourceFile && receipt.symbol === symbol)
      return receipt;
  }
  return;
}
function isText(value) {
  return typeof value === "string" && value.length > 0;
}
function parseFirmEditReceipt(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {}
  const receipt = value ?? {};
  if (receipt.version !== FIRM_EDIT_RECEIPT_VERSION || !isText(receipt.requirementId) || !REQUIREMENT_ID.test(receipt.requirementId) || !isText(receipt.sourceFile) || !isText(receipt.symbol) || receipt.verdict !== "keeps" && receipt.verdict !== "changes" || typeof receipt.note !== "string" || receipt.requestQuote !== undefined && typeof receipt.requestQuote !== "string" || !isText(receipt.statementHash) || !isText(receipt.codeHash) || !Number.isInteger(receipt.startLine) || !Number.isInteger(receipt.endLine) || typeof receipt.recordedAt !== "string")
    return;
  return receipt;
}
function receiptCodeFound(receipt, content) {
  const length = receipt.endLine - receipt.startLine;
  const lineCount = content.split(/\r?\n/).length;
  for (let start = 1;start + length <= lineCount; start += 1)
    if (firmEditCodeHash(content, start, start + length) === receipt.codeHash)
      return true;
  return false;
}
function firmEditReceiptMismatch(receipt, current) {
  if (receipt.statementHash !== firmEditStatementHash(current.statement))
    return "statement-changed";
  if (current.codeHash !== undefined)
    return current.codeHash === receipt.codeHash ? undefined : "code-changed";
  return current.content !== undefined && receiptCodeFound(receipt, current.content) ? undefined : "code-changed";
}
var CONTEXT_HEADING = /^(?:context|rationale|why|background|source|notes|evidence)\b/i;
var HEADING_LINE = /^\s{0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
function frontMatterScalar(lines, key) {
  const prefix = new RegExp(`^${key}:(?:\\s+(.*?))?\\s*$`);
  const index = lines.findIndex((line) => prefix.test(line));
  if (index === -1)
    return;
  const raw = prefix.exec(lines[index])[1] ?? "";
  const rest = [];
  for (const line of lines.slice(index + 1)) {
    if (line.trim() !== "" && !/^\s/.test(line))
      break;
    rest.push(line);
  }
  if (/^[>|][0-9+-]*$/.test(raw))
    return rest.map((line) => line.trim()).filter((line) => line !== "").join(" ");
  const text = [raw, ...rest.map((line) => line.trim())].filter((line) => line !== "").join(" ");
  const quote = text[0];
  if (quote === '"') {
    const end = /^"((?:[^"\\]|\\.)*)"/.exec(text);
    const body = end ? end[1] : text.slice(1);
    return body.replace(/\\(.)/g, (_, char) => char === "n" ? `
` : char === "t" ? "\t" : char);
  }
  if (quote === "'") {
    const end = /^'((?:[^']|'')*)'/.exec(text);
    return (end ? end[1] : text.slice(1)).replace(/''/g, "'");
  }
  return text.replace(/\s+#.*$/, "");
}
function requirementStatementFromDocument(text) {
  const lines = text.replace(/\r\n?/g, `
`).split(`
`);
  if (lines[0]?.trim() !== "---")
    return;
  const close = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (close === -1)
    return;
  const front = lines.slice(1, close);
  const semantic = frontMatterScalar(front, "semantic_text");
  if (semantic !== undefined && semantic.trim() !== "")
    return semantic;
  const body = [];
  let contextLevel = 0;
  for (const line of lines.slice(close + 1)) {
    const heading = HEADING_LINE.exec(line);
    if (heading === null) {
      if (contextLevel === 0)
        body.push(line.replace(/^\s*(?:(?:[-*+]|\d+[.)])\s+|>\s*)/, ""));
      continue;
    }
    const level = heading[1].length;
    const words = (heading[2] ?? "").replace(/^[*_`\s]+/, "");
    if (level <= contextLevel)
      contextLevel = 0;
    if (contextLevel === 0 && CONTEXT_HEADING.test(words))
      contextLevel = level;
  }
  const derived = body.join(" ").replace(/\s+/g, " ").trim();
  if (derived !== "")
    return derived;
  const title = frontMatterScalar(front, "title");
  return title !== undefined && title.trim() !== "" ? title : undefined;
}
function readRequirementStatement(workspaceRoot, requirementId) {
  if (!REQUIREMENT_ID.test(requirementId))
    return;
  const text = readText2(path7.join(workspaceRoot, ".kb", "requirements", `${requirementId}.md`));
  return requirementStatementFromDocument(text);
}
function firmEditReviewed(workspaceRoot, sourceFile, askedAt) {
  let content;
  return (requirementId, symbol) => {
    const asked = askedAt(requirementId);
    if (asked === undefined)
      return false;
    const receipt = readFirmEditReceipt(requirementId, sourceFile, symbol.title, (relativePath) => readText2(path7.join(workspaceRoot, relativePath)));
    if (receipt?.verdict !== "keeps" || !(Date.parse(receipt.recordedAt) >= asked))
      return false;
    const statement = readRequirementStatement(workspaceRoot, requirementId);
    if (statement === undefined)
      return false;
    content ??= readText2(path7.join(workspaceRoot, sourceFile));
    return firmEditReceiptMismatch(receipt, { statement, content }) === undefined;
  };
}
function readText2(file) {
  try {
    return fs7.readFileSync(file, "utf8");
  } catch {}
  return "";
}

// ../agent-core/dist/hook-input.js
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

// ../agent-core/dist/hook-usage-log.js
import { randomUUID as randomUUID4 } from "node:crypto";
import fs10 from "node:fs";
import path10 from "node:path";

// ../agent-core/dist/telemetry-signals.js
import { createHash as createHash4, randomUUID as randomUUID2 } from "node:crypto";
import fs8 from "node:fs";
import path8 from "node:path";
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
function isRecord2(value) {
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
  if (/^skill$/i.test(String(toolName).trim()) && isRecord2(toolInput)) {
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
  return path8.join(directory, RECENT_FILE);
}
function entries(value) {
  return Array.isArray(value) ? value : [];
}
function fresh(entry, now, windowMs) {
  return isRecord2(entry) && typeof entry.t === "number" && now - entry.t <= windowMs;
}
function readRecent(directory, now) {
  let parsed = {};
  try {
    parsed = JSON.parse(String(fs8.readFileSync(recentPath(directory)))) ?? parsed;
  } catch {}
  return {
    calls: entries(parsed.calls).filter((entry) => fresh(entry, now, RETRY_WINDOW_MS) && typeof entry.o === "string"),
    skills: entries(parsed.skills).filter((entry) => fresh(entry, now, SKILL_WINDOW_MS))
  };
}
function writeRecent(directory, recent) {
  try {
    fs8.mkdirSync(directory, { recursive: true });
    const file = recentPath(directory);
    const temporary = `${file}.${process.pid}.${randomUUID2()}.tmp`;
    fs8.writeFileSync(temporary, JSON.stringify({
      calls: recent.calls.slice(-MAX_RECENT_ENTRIES),
      skills: recent.skills.slice(-MAX_RECENT_ENTRIES)
    }));
    fs8.renameSync(temporary, file);
  } catch {}
}
function rememberSkillLoad(directory, workspaceHash, now = Date.now()) {
  const recent = readRecent(directory, now);
  recent.skills.push({ w: workspaceHash, t: now });
  writeRecent(directory, recent);
}

// ../agent-core/dist/usage-telemetry.js
import { createHash as createHash5, randomUUID as randomUUID3 } from "node:crypto";
import fs9 from "node:fs";
import os from "node:os";
import path9 from "node:path";
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
  "git_conflicts_unresolved",
  "incomplete_propositions",
  "input_read_failed",
  "integration_failed",
  "inventory_ingestion_failed",
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
    return fs9.realpathSync(directory);
  } catch {
    return path9.resolve(directory);
  }
}
function sandboxedHome(env) {
  const home = (env.HOME ?? env.USERPROFILE)?.trim();
  if (!home)
    return false;
  const temp = realDirectory(os.tmpdir());
  const resolved = realDirectory(home);
  return resolved.startsWith(`${temp}${path9.sep}`);
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
  let current = path9.dirname(resolved);
  for (;; ) {
    try {
      const manifest = JSON.parse(fs9.readFileSync(path9.join(current, "package.json"), "utf8"));
      if (manifest.name === KIBI_REPOSITORY_PACKAGE && fs9.existsSync(path9.join(current, "packages", "agent-core"))) {
        return true;
      }
    } catch {}
    const parent = path9.dirname(current);
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
    return path9.join(env.LOCALAPPDATA, "kibi");
  }
  const stateHome = env.XDG_STATE_HOME?.trim();
  return path9.join(stateHome || path9.join(env.HOME || os.homedir(), ".local", "state"), "kibi");
}
function readTelemetryConfig(env = process.env) {
  try {
    const parsed = JSON.parse(String(fs9.readFileSync(path9.join(telemetryDirectory(env), CONFIG_FILE))));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function writeTelemetryConfig(config, env) {
  const directory = telemetryDirectory(env);
  fs9.mkdirSync(directory, { recursive: true });
  fs9.writeFileSync(path9.join(directory, CONFIG_FILE), `${JSON.stringify(config, null, 2)}
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
  return createHash5("sha256").update("kibi-telemetry\x00").update(value).digest("hex").slice(0, 16);
}
function runtimeName() {
  return typeof globalThis.Bun === "undefined" ? "node" : "bun";
}
function sessionMarkersPath(env) {
  return path9.join(telemetryDirectory(env), SESSIONS_FILE);
}
function readSessionMarkers(env) {
  try {
    const parsed = JSON.parse(String(fs9.readFileSync(sessionMarkersPath(env))));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function workspaceKey(workspaceRoot) {
  return hashTelemetryId(`workspace\x00${realDirectory(workspaceRoot)}`);
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
    fs9.mkdirSync(path9.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${randomUUID3()}.tmp`;
    fs9.writeFileSync(temporary, JSON.stringify(Object.fromEntries(kept)));
    fs9.renameSync(temporary, file);
  } catch {}
}
function workspaceSessionHash(startDirectory, env = process.env) {
  const markers = readSessionMarkers(env);
  const now = Date.now();
  let current = path9.resolve(startDirectory);
  for (;; ) {
    const marker = markers[workspaceKey(current)];
    if (marker && typeof marker.session === "string" && typeof marker.at === "number" && now - marker.at <= SESSION_MARKER_MAX_AGE_MS) {
      return marker.session;
    }
    const parent = path9.dirname(current);
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
  return path9.join(telemetryDirectory(env), QUEUE_FILE);
}
function appendEvent(event, env) {
  try {
    const file = queuePath(env);
    fs9.mkdirSync(path9.dirname(file), { recursive: true });
    try {
      if (fs9.statSync(file).size > MAX_QUEUE_BYTES)
        return;
    } catch {}
    fs9.appendFileSync(file, `${JSON.stringify(event)}
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
    text = fs9.readFileSync(file, "utf8");
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
    names = fs9.readdirSync(directory);
  } catch {
    return claimed;
  }
  for (const name of names) {
    if (!name.endsWith(SENDING_SUFFIX))
      continue;
    const file = path9.join(directory, name);
    try {
      if (now - fs9.statSync(file).mtimeMs < STALE_CLAIM_MS)
        continue;
      const reclaimed = `${file}.${randomUUID3()}${SENDING_SUFFIX}`;
      fs9.renameSync(file, reclaimed);
      claimed.push(reclaimed);
    } catch {}
  }
  const queue = path9.join(directory, QUEUE_FILE);
  const target = path9.join(directory, `${QUEUE_FILE}.${process.pid}.${randomUUID3()}${SENDING_SUFFIX}`);
  try {
    fs9.renameSync(queue, target);
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
      events.push(...parseQueued(fs9.readFileSync(file, "utf8"), now));
    } catch {}
  }
  const release = () => {
    for (const file of claimed)
      fs9.rmSync(file, { force: true });
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
var HOOK_ACTION_SKILL_LOADED = "skill_loaded";
function hookTelemetryEnabled(env = process.env) {
  const value = env.KIBI_DIAGNOSTIC_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
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
    const logPath = path10.join(row.workspaceRoot, ".kb", "usage.log");
    fs10.mkdirSync(path10.dirname(logPath), { recursive: true });
    fs10.appendFileSync(logPath, `${JSON.stringify(record)}
`);
  } catch {}
}
function skillLoadTrace(toolName, toolInput) {
  const skill = kibiSkillLoad(toolName, toolInput);
  return skill ? { action: HOOK_ACTION_SKILL_LOADED, skill } : undefined;
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
    const parsed = JSON.parse(String(fs10.readFileSync(packageJsonPath)));
    const version = parsed.version;
    if (typeof version === "string")
      return version;
  } catch {}
  return null;
}

// ../agent-core/dist/workspace-optin.js
import fs11 from "node:fs";
import path11 from "node:path";
var KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT"
];
function nextAncestorDirectory(current) {
  const parent = path11.dirname(current);
  return parent === current ? undefined : parent;
}
function hasKibiManifest(directory) {
  return fs11.existsSync(path11.join(directory, ".kb", "manifest.json"));
}
function hasGitBoundary(directory) {
  return fs11.existsSync(path11.join(directory, ".git"));
}
function resolveKibiWorkspace(startDir, env = process.env) {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      const root = path11.resolve(value);
      return { root, optedIn: hasKibiManifest(root) };
    }
  }
  const start = path11.resolve(startDir?.trim() ? startDir : process.cwd());
  let current = start;
  while (current !== undefined) {
    if (hasKibiManifest(current)) {
      return { root: current, optedIn: true };
    }
    if (hasGitBoundary(current)) {
      return { root: current, optedIn: false };
    }
    current = nextAncestorDirectory(current);
  }
  return { root: start, optedIn: false };
}

// src/hook-input.ts
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function readString(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string")
      return value;
  }
  return;
}
function readBoolean(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean")
      return value;
  }
  return;
}
function readStringArray(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === "string" && item.length > 0);
    }
  }
  return [];
}
function readNumber(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value))
      return value;
  }
  return;
}
function parseHookInput(raw) {
  const input = asRecord(raw);
  const toolCall = asRecord(input.toolCall ?? input.tool_call);
  const argsRecord = toolCall.args ?? toolCall.arguments ?? input.toolInput ?? input.tool_input;
  const toolArgs = typeof argsRecord === "object" && argsRecord !== null && !Array.isArray(argsRecord) ? argsRecord : undefined;
  return {
    event: readString(input, ["hookEventName", "hook_event_name", "event"]) ?? "",
    conversationId: readString(input, [
      "conversationId",
      "conversation_id",
      "sessionId",
      "session_id"
    ]),
    workspacePaths: readStringArray(input, [
      "workspacePaths",
      "workspace_paths"
    ]),
    cwd: readString(input, ["cwd"]),
    lastUserInput: readString(input, [
      "lastUserInput",
      "last_user_input",
      "prompt"
    ]),
    invocationNum: readNumber(input, ["invocationNum", "invocation_num"]),
    toolCallId: readString(toolCall, ["id"]),
    toolName: readString(toolCall, ["name"]) ?? readString(input, ["toolName", "tool_name"]),
    toolArgs,
    error: readString(input, ["error"]),
    terminationReason: readString(input, [
      "terminationReason",
      "termination_reason"
    ]),
    fullyIdle: readBoolean(input, ["fullyIdle", "fully_idle"]),
    continuationActive: readBoolean(input, [
      "continuationActive",
      "continuation_active",
      "stopHookActive",
      "stop_hook_active"
    ]) ?? false
  };
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
  if (!toolName)
    return;
  const trimmed = toolName.trim();
  const shared = canonicalKbToolName(trimmed);
  if (shared && /^kb_[a-z_]+$/.test(shared))
    return shared;
  const afterColon = trimmed.includes(":") ? trimmed.split(":").at(-1) : trimmed;
  const match = /(?:^|(?:^|_)kibi_)(kb_[a-z_]+)$/.exec(afterColon);
  if (match?.[1])
    return match[1];
  const mcpMatch = /^mcp_[^_]*kibi[^_]*_(kb_[a-z_]+)$/i.exec(afterColon);
  return mcpMatch?.[1];
}
function parseArgumentsField(raw) {
  if (isRecord3(raw))
    return { parsed: raw, asString: false };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (isRecord3(parsed))
        return { parsed, asString: true };
    } catch {}
    return { parsed: {}, asString: true };
  }
  return { parsed: {}, asString: false };
}
function firstStringField(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string")
      return value;
  }
  return;
}
function unwrapKibiMcpCall(toolName, toolArgs) {
  if (toolName === "call_mcp_tool" && isRecord3(toolArgs)) {
    const innerName = firstStringField(toolArgs, ["ToolName", "toolName"]);
    const serverName = firstStringField(toolArgs, ["ServerName", "serverName"]);
    const operation = canonicalKbOperation(innerName);
    if (!operation)
      return;
    if (serverName && !/kibi/i.test(serverName))
      return;
    const argumentsKey = !("Arguments" in toolArgs) && "arguments" in toolArgs ? "arguments" : "Arguments";
    const { parsed, asString } = parseArgumentsField(toolArgs[argumentsKey]);
    return {
      operation,
      payload: parsed,
      wrapped: true,
      argumentsKey,
      argumentsAsJsonString: asString
    };
  }
  const operation = canonicalKbOperation(toolName);
  if (!operation)
    return;
  const payload = payloadOf(toolArgs);
  return { operation, payload, wrapped: false };
}
function workspaceOverwrite(toolName, toolArgs, workspaceRoot) {
  if (!workspaceRoot)
    return;
  const unwrapped = unwrapKibiMcpCall(toolName, toolArgs);
  if (!unwrapped)
    return;
  const existing = unwrapped.payload[KIBI_WORKSPACE_ARGUMENT];
  if (typeof existing === "string" && existing.trim().length > 0) {
    return;
  }
  if (unwrapped.wrapped) {
    const updated = {
      ...unwrapped.payload,
      [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot
    };
    const key = unwrapped.argumentsKey ?? "Arguments";
    return {
      [key]: unwrapped.argumentsAsJsonString ? JSON.stringify(updated) : updated
    };
  }
  return { [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot };
}
function payloadOf(toolArgs) {
  if (!isRecord3(toolArgs))
    return {};
  const nested = toolArgs.arguments ?? toolArgs.args ?? toolArgs.Arguments;
  if (isRecord3(nested))
    return nested;
  if (typeof nested === "string") {
    try {
      const parsed = JSON.parse(nested);
      if (isRecord3(parsed))
        return parsed;
    } catch {}
  }
  return toolArgs;
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
    checkAll: check && paths.length === 0 && (payload.includeWorkingTreeDiff === true || payload.changed === true)
  };
}
function extractMcpKbUsage(toolName, toolArgs) {
  const unwrapped = unwrapKibiMcpCall(toolName, toolArgs);
  if (!unwrapped)
    return;
  return usageFromPayload(effectiveKbOperation(unwrapped.operation, unwrapped.payload), unwrapped.payload);
}
function isVerifiedGitCommit(command) {
  const gitCommit = /(?:^|[\s;&|(])git(?:\s+-[Cc]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+commit(?=\s|$|[;&|)])/;
  if (!gitCommit.test(command))
    return false;
  return !/\s(?:--no-verify|-n)(?=\s|$)/.test(command);
}
function extractCliKbUsage(command) {
  const operation = kibiCliOperation(command);
  if (!operation)
    return;
  let payload = {};
  const inline = /'(\{.*\})'/s.exec(command) ?? /"(\{.*\})"/s.exec(command);
  if (inline) {
    const json = inline[1];
    try {
      payload = JSON.parse(json);
    } catch {}
  }
  const usage = usageFromPayload(operation, payload);
  if (operation === "kb_check" && usage.paths.length === 0) {
    usage.checkAll = true;
  }
  return usage;
}

// src/session-state.ts
import { createHash as createHash6 } from "node:crypto";
import fs12 from "node:fs";
import path12 from "node:path";
var JOURNAL = "session.jsonl";
function workspaceDataDir(pluginData, workspaceRoot) {
  if (!pluginData)
    return;
  const key = createHash6("sha256").update(path12.resolve(workspaceRoot)).digest("hex").slice(0, 32);
  return path12.join(pluginData, "workspaces", key);
}
function sessionDir(workspaceDir, sessionId) {
  if (!workspaceDir)
    return;
  const trimmed = sessionId?.trim() ?? "";
  const key = trimmed.length > 0 ? createHash6("sha256").update(trimmed).digest("hex").slice(0, 32) : "unattributed";
  return path12.join(workspaceDir, "sessions", key);
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
    reminded: new Set,
    commandStartedAt: undefined,
    lastPromptHash: undefined,
    requestWords: [],
    rulePhrase: undefined,
    ruleReason: undefined,
    firmAsked: new Map,
    firmAskedAt: new Map,
    firmAskedEdit: new Map,
    firmConfirmed: new Set,
    sourceEdited: false,
    kbRecorded: false,
    queuedContext: []
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
      if (event.operation === "kb_upsert")
        state.kbRecorded = true;
      for (const explored of event.paths)
        state.exploredPaths.add(explored);
      for (const id of event.ids)
        state.exploredIds.add(id);
      return;
    case "edited": {
      for (const id of state.firmAsked.get(event.path) ?? []) {
        if (event.edit !== undefined && state.firmAskedEdit.get(id) === event.edit) {
          state.firmConfirmed.add(id);
        }
      }
      state.firmAsked.delete(event.path);
      if (event.pathKind !== "source")
        return;
      state.sourceEdited = true;
      state.pendingSource = [
        ...state.pendingSource.filter((pending) => pending !== event.path),
        event.path
      ];
      state.reminded.delete(event.path);
      return;
    }
    case "checked":
      state.pendingSource = event.all ? [] : state.pendingSource.filter((pending) => !event.paths.includes(pending));
      return;
    case "reminded":
      for (const reminded of event.paths)
        state.reminded.add(reminded);
      return;
    case "command_started":
      state.commandStartedAt = Math.max(state.commandStartedAt ?? 0, event.at);
      return;
    case "prompt":
      state.lastPromptHash = event.hash;
      state.requestWords = event.words;
      if (event.phrase) {
        state.rulePhrase = event.phrase;
        state.ruleReason = event.reason || undefined;
      }
      return;
    case "firm_asked":
      state.firmAsked.set(event.path, [
        ...new Set([...state.firmAsked.get(event.path) ?? [], ...event.ids])
      ]);
      if (event.at !== undefined) {
        for (const id of event.ids)
          state.firmAskedAt.set(id, event.at);
      }
      for (const id of event.ids) {
        if (event.edit === undefined)
          state.firmAskedEdit.delete(id);
        else
          state.firmAskedEdit.set(id, event.edit);
      }
      return;
    case "firm_reviewed": {
      const left = (state.firmAsked.get(event.path) ?? []).filter((id) => !event.ids.includes(id));
      if (left.length > 0)
        state.firmAsked.set(event.path, left);
      else
        state.firmAsked.delete(event.path);
      return;
    }
    case "queued_context":
      if (!state.queuedContext.some((item) => item.id === event.id)) {
        state.queuedContext.push({ id: event.id, text: event.text });
      }
      return;
    case "context_flushed": {
      const flushed = new Set(event.ids);
      state.queuedContext = state.queuedContext.filter((item) => !flushed.has(item.id));
      return;
    }
  }
}
function sessionJournal(dir) {
  return dir ? [path12.join(dir, JOURNAL)] : [];
}
function loadSessionState(dir) {
  const state = emptySessionState();
  if (!dir)
    return state;
  let journal;
  try {
    journal = fs12.readFileSync(path12.join(dir, JOURNAL), "utf8");
  } catch {
    return state;
  }
  for (const line of journal.split(`
`)) {
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
    fs12.mkdirSync(dir, { recursive: true });
    fs12.appendFileSync(path12.join(dir, JOURNAL), events.map((event) => `${JSON.stringify(event)}
`).join(""));
  } catch {}
}
// ../agent-core/dist/session-brief.js
var SESSION_BRIEF_LINES = [
  "Kibi records this repository's requirements and decisions with their reasons.",
  "- Before changing behaviour, kb_search for the recorded intent and kb_query the requirement that governs it.",
  "- When the person states a rule, record it with their reason (kb_record); a decision goes through kb_upsert.",
  "- Before finishing, stage the change with its .kb files and run the commit check, `kibi check --staged`.",
  "A request that would make a recorded requirement or decision false (narrowing it or adding an exception counts; touching its code does not) is a question, not a task: name the rule and ask."
];
var SESSION_BRIEF = SESSION_BRIEF_LINES.join(`
`);
function sessionBriefWith(hostLines) {
  return [SESSION_BRIEF, ...hostLines.filter((line) => line.length > 0)].join(`
`);
}

// src/snippets.ts
function searchTip(linkedFileCount) {
  return `Kibi tip: this repository records requirements, scenarios, decisions, and code ownership in a Kibi knowledge base (${linkedFileCount} source files have requirement-linked symbols). For intent questions — why code exists, what it must do — kb_search answers from that knowledge, naming the governing requirements, facts, decisions and tests; kb_query({sourceFile:"<path>"}) lists what a file implements.`;
}
var DIRECT_KB_ACCESS_NOTE = "Kibi: .kb/ holds Kibi-managed knowledge. kb_query/kb_search read it and kb_upsert writes it while keeping the branch store, relationships, and validation consistent; direct file reads miss relationships and direct edits bypass validation.";
function sessionStartContext(linkedFileCount) {
  return sessionBriefWith([
    `Kibi hooks show requirement snippets for the ${linkedFileCount} linked source files and ask before edits to firm requirements. MCP tools: kb_* (server: kibi); CLI peer: \`npx --no-install kibi <route> --input -\`. Guidance: the kibi-usage skill.`
  ]);
}
function stopReminder(paths) {
  const shown = paths.slice(0, 8);
  const more = paths.length > shown.length ? ` +${paths.length - shown.length}` : "";
  return [
    `Kibi: ${paths.length} source ${paths.length === 1 ? "file" : "files"} changed this session without a Kibi impact check: ${shown.join(", ")}${more}.`,
    `kb_check({changed:true, sourceFiles:${JSON.stringify(shown)}}) gives the commit gate's verdict on ${paths.length === 1 ? "it" : "them"}: each finding says whether it blocks the commit. If the change has no KB impact, a one-line no-impact rationale in the final report closes this out.`
  ].join(`
`);
}

// src/usage-log.ts
import path13 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var pluginVersion = readPackageVersion(path13.join(path13.dirname(fileURLToPath2(import.meta.url)), "..", "package.json"));
function appendHookUsage2(row, env = process.env) {
  appendHookUsage({
    ...row,
    host: "antigravity",
    packageName: "kibi-antigravity",
    packageVersion: pluginVersion
  }, env);
}
var flushHookTelemetry = finishHookTelemetry;

// src/hook-runner.ts
var readTools = new Set(["read_file", "view_file"]);
var editTools = new Set([
  "edit_file",
  "write_file",
  "replace_file_content",
  "multi_replace_file_content",
  "write_to_file"
]);
var wholeFileWriteTools = new Set(["write_file", "write_to_file"]);
var searchTools = new Set(["grep_search", "find_by_name"]);
var shellTools = new Set(["run_command"]);
var MAX_INJECTED_CONTEXT_CHARS = 3600;
function injectSystem(text) {
  return {
    injectSteps: [{ systemMessage: { systemMessage: text } }]
  };
}
function fieldsOf(toolArgs) {
  return toolArgs ?? {};
}
function toolPath(toolArgs) {
  const fields = fieldsOf(toolArgs);
  const candidate = fields.Path ?? fields.AbsolutePath ?? fields.TargetFile ?? fields.file_path ?? fields.path;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : undefined;
}
function shellCommand(toolArgs) {
  const fields = fieldsOf(toolArgs);
  const candidate = fields.CommandLine ?? fields.command ?? "";
  return typeof candidate === "string" ? candidate : "";
}
function symbolsFor(workspace, relativePath) {
  return workspace.index().files[relativePath] ?? [];
}
function linkedFileCount(index) {
  return Object.values(index.files).filter((symbols) => symbols.some((symbol) => symbol.implements.length > 0)).length;
}
function readFocus(toolArgs) {
  const fields = fieldsOf(toolArgs);
  const startLine = typeof fields.StartLine === "number" ? fields.StartLine : undefined;
  const endLine = typeof fields.EndLine === "number" ? fields.EndLine : undefined;
  if (startLine === undefined && endLine === undefined)
    return;
  const start = Math.max(1, startLine ?? 1);
  const end = Math.max(start, endLine ?? start);
  return [{ start, end }];
}
function normalizeEditArgs(toolName, toolArgs) {
  const fields = fieldsOf(toolArgs);
  if (toolName === "edit_file") {
    return {
      old_string: fields.Target,
      new_string: fields.Replacement,
      replace_all: true
    };
  }
  if (toolName === "replace_file_content") {
    return {
      old_string: fields.TargetContent,
      new_string: fields.ReplacementContent,
      replace_all: fields.AllowMultiple === true
    };
  }
  if (toolName === "multi_replace_file_content") {
    const chunks = Array.isArray(fields.ReplacementChunks) ? fields.ReplacementChunks : [];
    return {
      edits: chunks.map((chunk) => {
        const record = fieldsOf(chunk);
        return {
          old_string: record.TargetContent,
          new_string: record.ReplacementContent,
          replace_all: record.AllowMultiple === true
        };
      })
    };
  }
  if (toolName === "write_file") {
    return { content: fields.Content };
  }
  if (toolName === "write_to_file") {
    return { content: fields.CodeContent };
  }
  return fields;
}
function editFocus2(absolutePath, toolName, toolArgs) {
  return editFocus(absolutePath, normalizeEditArgs(toolName, toolArgs));
}
function isWholeFileWrite(toolName, toolArgs) {
  if (!wholeFileWriteTools.has(toolName))
    return false;
  return fieldsOf(toolArgs).Append !== true;
}
function isExplored(state, relativePath) {
  return state.exploredPaths.has(relativePath);
}
function requirementIds(symbols) {
  return implementedRequirementIds(symbols);
}
function editFingerprint(toolName, toolArgs) {
  return createHash7("sha256").update(JSON.stringify([toolName ?? null, toolArgs ?? null])).digest("hex");
}
function promptHash(prompt) {
  return createHash7("sha256").update(prompt).digest("hex").slice(0, 24);
}
function queueContextEvent(text) {
  return { kind: "queued_context", id: randomUUID5(), text };
}
function firmEdit(relativePath, symbols, focus, wholeFile, state, workspace, edit) {
  if (!workspace.confirmFirm)
    return;
  const touched = {
    symbols,
    focus,
    wholeFile,
    absolutePath: path14.join(workspace.root, relativePath),
    summarize: workspace.summarize,
    confirmed: state.firmConfirmed
  };
  const { ids, symbol } = firmRequirementsTouched({
    ...touched,
    reviewed: firmEditReviewed(workspace.root, relativePath, (id) => state.firmAskedEdit.get(id) === edit ? state.firmAskedAt.get(id) : undefined)
  });
  const reviewedIds = firmRequirementsTouched(touched).ids.filter((id) => !ids.includes(id));
  if (reviewedIds.length > 0) {
    appendSessionEvents(workspace.stateDir, [
      { kind: "firm_reviewed", path: relativePath, ids: reviewedIds }
    ]);
  }
  if (ids.length === 0)
    return;
  return {
    path: relativePath,
    where: symbol ? `${symbol.title} in ${relativePath}` : relativePath,
    ids,
    edit
  };
}
function withFirmConfirmation(firm, workspace, trace) {
  appendSessionEvents(workspace.stateDir, [
    {
      kind: "firm_asked",
      path: firm.path,
      ids: firm.ids,
      at: Date.now(),
      edit: firm.edit
    },
    queueContextEvent(firmEditContext(firm.ids))
  ]);
  trace.action = "edit_firm_ask";
  trace.requirementIds = firm.ids;
  const describe = (id) => workspace.summarize(id);
  return {
    decision: "force_ask",
    reason: firmEditConfirmation(firm.where, firm.ids.map(describe))
  };
}
function passthroughPreToolDecision(input, workspaceRoot) {
  if (readTools.has(input.toolName) || searchTools.has(input.toolName)) {
    return { decision: "allow" };
  }
  if (!workspaceRoot) {
    return { decision: "ask" };
  }
  const args = fieldsOf(input.toolArgs);
  if (input.toolName === "call_mcp_tool") {
    return { decision: "ask" };
  }
  if (shellTools.has(input.toolName) && args.BypassSandbox === true) {
    return { decision: "ask" };
  }
  if (editTools.has(input.toolName)) {
    const rawPath = toolPath(input.toolArgs);
    if (!rawPath || !toWorkspacePath(workspaceRoot, rawPath, input.cwd)) {
      return { decision: "ask" };
    }
  }
  return { decision: "allow" };
}
function preToolUse(input, workspace, trace = {}) {
  const passthrough = passthroughPreToolDecision(input, workspace.root);
  const toolName = input.toolName;
  const overwrite = workspaceOverwrite(toolName, input.toolArgs, workspace.root);
  if (overwrite) {
    return {
      decision: passthrough.decision ?? "ask",
      overwrite
    };
  }
  const state = loadSessionState(workspace.stateDir);
  trace.kbUsedBefore = state.kbUsed;
  const events = [];
  const queueAndCommit = (text, action) => {
    trace.action = action;
    events.push(queueContextEvent(text));
    appendSessionEvents(workspace.stateDir, events);
  };
  if (shellTools.has(toolName)) {
    return shellPreToolUse(input, workspace, state, trace, passthrough);
  }
  if (searchTools.has(toolName)) {
    trace.action = "search_silent";
    if (state.kbUsed || state.notices.has("search-tip"))
      return passthrough;
    const linked = linkedFileCount(workspace.index());
    if (linked === 0)
      return passthrough;
    events.push({ kind: "notice", name: "search-tip" });
    queueAndCommit(searchTip(linked), "search_tip");
    return passthrough;
  }
  const isRead = readTools.has(toolName);
  const isEdit = editTools.has(toolName);
  if (!isRead && !isEdit)
    return passthrough;
  const rawPath = toolPath(input.toolArgs);
  const target = rawPath ? toWorkspacePath(workspace.root, rawPath, input.cwd) : undefined;
  if (!target)
    return passthrough;
  const kind = classifyPath(target.relative);
  trace.path = target.relative;
  trace.pathKind = kind;
  if (kind === "kb") {
    trace.action = "kb_direct_silent";
    if (state.notices.has("kb-direct"))
      return passthrough;
    events.push({ kind: "notice", name: "kb-direct" });
    queueAndCommit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
    return passthrough;
  }
  if (kind === "other")
    return passthrough;
  const relativePath = target.relative;
  const symbols = symbolsFor(workspace, relativePath);
  trace.requirementIds = requirementIds(symbols);
  if (isRead) {
    trace.action = "read_silent";
    const snippet = readSnippet(relativePath, symbols, state, workspace, readFocus(input.toolArgs));
    if (!snippet)
      return passthrough;
    events.push({ kind: "shown", surface: "read", path: relativePath });
    queueAndCommit(snippet, "read_snippet");
    return passthrough;
  }
  trace.action = "edit_silent";
  const wholeFile = isWholeFileWrite(toolName, input.toolArgs);
  const focus = wholeFile ? undefined : editFocus2(target.absolute, toolName, input.toolArgs);
  const normalizedEdit = normalizeEditArgs(toolName, input.toolArgs);
  const firm = removesOnlyDeadImplementsComments(target.absolute, normalizedEdit, input.cwd ?? workspace.root) ? undefined : firmEdit(relativePath, symbols, focus, wholeFile, state, workspace, editFingerprint(toolName, input.toolArgs));
  queueEditPreToolUse(relativePath, kind, symbols, focus, state, workspace, events, queueAndCommit);
  return firm ? withFirmConfirmation(firm, workspace, trace) : passthrough;
}
function queueEditPreToolUse(relativePath, kind, symbols, focus, state, workspace, events, queueAndCommit) {
  if (state.shownEdit.has(relativePath)) {
    const symbol = focusedSymbols(symbols, focus)[0];
    if (!symbol || symbol.implements.length === 0)
      return;
    const key = `${relativePath}#${symbol.id}`;
    if (state.shownEdit.has(key))
      return;
    const update = focusUpdate(relativePath, symbols, focus);
    if (!update)
      return;
    events.push({ kind: "shown", surface: "edit", path: key });
    queueAndCommit(update, "edit_focus_update");
    return;
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
  const snippetInput = {
    relativePath,
    symbols,
    surface: "edit",
    focus,
    summarize: workspace.summarize
  };
  if (alreadyKnown) {
    const update = editKnowledgeUpdate(snippetInput);
    if (update) {
      queueAndCommit(update, "edit_update_snippet");
      return;
    }
    appendSessionEvents(workspace.stateDir, events);
    return;
  }
  const snippet = fileKnowledgeSnippet(snippetInput);
  if (snippet) {
    queueAndCommit(snippet, "edit_snippet");
    return;
  }
  if (kind === "source") {
    const index = workspace.index();
    const unread = index.manifest === "unreadable" || index.coordinateFiles.includes(relativePath) && !index.unlinkedFiles.includes(relativePath);
    if (!unread) {
      queueAndCommit(unownedSourceNote(relativePath, requirementCandidatesForPath(workspace.root, relativePath, undefined, state.requestWords)), "edit_unowned_note");
      return;
    }
    if (!state.notices.has("manifest-unreadable")) {
      events.push({ kind: "notice", name: "manifest-unreadable" });
      queueAndCommit(unreadableManifestNote(relativePath), "edit_manifest_note");
      return;
    }
  }
  appendSessionEvents(workspace.stateDir, events);
}
function readSnippet(relativePath, symbols, state, workspace, focus) {
  if (state.shownRead.has(relativePath) || state.shownEdit.has(relativePath) || isExplored(state, relativePath)) {
    return;
  }
  const owners = requirementIds(symbols);
  if (owners.length > 0 && owners.every((id) => state.exploredIds.has(id))) {
    return;
  }
  return fileKnowledgeSnippet({
    relativePath,
    symbols,
    surface: "read",
    focus,
    summarize: workspace.summarize
  }) ?? undefined;
}
function shellPreToolUse(input, workspace, state, trace, passthrough) {
  const events = [{ kind: "command_started", at: Date.now() }];
  const command = shellCommand(input.toolArgs);
  const queueAndCommit = (text, action) => {
    trace.action = action;
    events.push(queueContextEvent(text));
    appendSessionEvents(workspace.stateDir, events);
  };
  const cwd = input.cwd ?? workspace.root;
  const edited = new Set(commandEditPaths(command, cwd));
  const firm = [...edited].map((absolute) => {
    const target = toWorkspacePath(workspace.root, absolute, input.cwd);
    if (!target || classifyPath(target.relative) !== "source")
      return;
    const symbols = symbolsFor(workspace, target.relative);
    return firmEdit(target.relative, symbols, undefined, true, state, workspace, editFingerprint("run_command", command));
  }).find((candidate) => candidate !== undefined);
  queueShellContext(input, workspace, state, trace, command, edited, events, queueAndCommit);
  return firm ? withFirmConfirmation(firm, workspace, trace) : passthrough;
}
function queueShellContext(input, workspace, state, trace, command, edited, events, queueAndCommit) {
  let namesKb = false;
  const cwd = input.cwd ?? workspace.root;
  for (const absolute of commandFilePaths(command, cwd)) {
    const target = toWorkspacePath(workspace.root, absolute, input.cwd);
    if (!target)
      continue;
    const kind = classifyPath(target.relative);
    if (kind === "kb")
      namesKb = true;
    if (kind === "kb" || kind === "other")
      continue;
    const symbols = symbolsFor(workspace, target.relative);
    if (edited.has(absolute)) {
      if (state.shownEdit.has(target.relative))
        continue;
      const alreadyKnown = state.shownRead.has(target.relative) || isExplored(state, target.relative);
      const snippetInput = {
        relativePath: target.relative,
        symbols,
        surface: "edit",
        summarize: workspace.summarize
      };
      const note = alreadyKnown ? editKnowledgeUpdate(snippetInput) : fileKnowledgeSnippet(snippetInput);
      if (!note)
        continue;
      trace.path = target.relative;
      trace.pathKind = kind;
      trace.requirementIds = requirementIds(symbols);
      events.push({ kind: "shown", surface: "edit", path: target.relative });
      queueAndCommit(note, alreadyKnown ? "edit_update_snippet" : "edit_snippet");
      return;
    }
    const snippet = readSnippet(target.relative, symbols, state, workspace);
    if (!snippet)
      continue;
    trace.path = target.relative;
    trace.pathKind = kind;
    trace.requirementIds = requirementIds(symbols);
    events.push({ kind: "shown", surface: "read", path: target.relative });
    queueAndCommit(snippet, "read_snippet");
    return;
  }
  if (namesKb && !state.notices.has("kb-direct")) {
    events.push({ kind: "notice", name: "kb-direct" });
    queueAndCommit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
    return;
  }
  if (isSearchCommand(command) && !state.kbUsed && !state.notices.has("search-tip")) {
    const linked = linkedFileCount(workspace.index());
    if (linked > 0) {
      events.push({ kind: "notice", name: "search-tip" });
      queueAndCommit(searchTip(linked), "search_tip");
      return;
    }
  }
  appendSessionEvents(workspace.stateDir, events);
}
function shellChanges(workspace, events, trace, edit) {
  const state = loadSessionState(workspace.stateDir);
  if (state.commandStartedAt === undefined)
    return;
  let note;
  for (const relative of filesChangedSince(workspace.root, state.commandStartedAt)) {
    const pathKind = classifyPath(relative);
    if (pathKind === "kb" || pathKind === "other")
      continue;
    events.push({ kind: "edited", path: relative, pathKind, edit });
    const symbols = symbolsFor(workspace, relative);
    const owners = requirementIds(symbols);
    if (trace.action === undefined && owners.length > 0) {
      trace.action = "edited";
      trace.kbUsedBefore = state.kbUsed;
      trace.path = relative;
      trace.pathKind = pathKind;
      trace.requirementIds = owners;
    }
    if (note !== undefined || state.shownEdit.has(relative))
      continue;
    const alreadyKnown = state.shownRead.has(relative) || isExplored(state, relative);
    const snippetInput = {
      relativePath: relative,
      symbols,
      surface: "edit",
      summarize: workspace.summarize
    };
    const snippet = alreadyKnown ? editKnowledgeUpdate(snippetInput) : fileKnowledgeSnippet(snippetInput);
    if (snippet) {
      note = snippet;
    } else if (pathKind === "source" && workspace.index().manifest !== "unreadable") {
      note = unownedSourceNote(relative, requirementCandidatesForPath(workspace.root, relative, undefined, state.requestWords));
    }
    if (note !== undefined) {
      events.push({ kind: "shown", surface: "edit", path: relative });
    }
  }
  return note;
}
function captureTemplateNote(workspace, events) {
  const field = (event, name) => event[name];
  if (!events.some((event) => field(event, "pathKind") === "source") || events.some((event) => field(event, "operation") === "kb_upsert")) {
    return;
  }
  const state = loadSessionState(workspace.stateDir);
  if (state.rulePhrase === undefined || state.kbRecorded || state.notices.has("capture-template")) {
    return;
  }
  events.push({ kind: "notice", name: "capture-template" });
  return ruleCaptureTemplate(state.rulePhrase, state.ruleReason);
}
function recordKbUsage(usage, workspace, events) {
  const paths = usage.paths.map((candidate) => toWorkspacePath(workspace.root, candidate, workspace.root)?.relative).filter((candidate) => candidate !== undefined);
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
function postToolUse(input, workspace, trace = {}) {
  if (input.error && input.error.trim().length > 0)
    return {};
  const toolName = input.toolName;
  const events = [];
  const kbUsedBefore = () => workspace.telemetry ? loadSessionState(workspace.stateDir).kbUsed : undefined;
  const recordUsage = (usage) => {
    trace.kbUsedBefore = kbUsedBefore();
    trace.action = "kb_usage";
    trace.kbOperation = usage.operation;
    recordKbUsage(usage, workspace, events);
  };
  if (editTools.has(toolName)) {
    const rawPath = toolPath(input.toolArgs);
    const target = rawPath ? toWorkspacePath(workspace.root, rawPath, input.cwd) : undefined;
    if (target) {
      const pathKind = classifyPath(target.relative);
      events.push({
        kind: "edited",
        path: target.relative,
        pathKind,
        edit: editFingerprint(toolName, input.toolArgs)
      });
      if (pathKind !== "other") {
        trace.kbUsedBefore = kbUsedBefore();
        trace.action = "edited";
        trace.path = target.relative;
        trace.pathKind = pathKind;
        if (workspace.telemetry && pathKind !== "kb") {
          trace.requirementIds = requirementIds(symbolsFor(workspace, target.relative));
        }
      }
    }
  } else if (shellTools.has(toolName)) {
    const command = shellCommand(input.toolArgs);
    const usage = extractCliKbUsage(command);
    if (usage)
      recordUsage(usage);
    if (isRequirementUpsert({ command })) {
      markDecisionFlag({ stateDir: workspace.stateDir, sessionId: input.conversationId }, "requirement-recorded");
    }
    const changed = shellChanges(workspace, events, trace, editFingerprint("run_command", command));
    const note = changed ?? captureTemplateNote(workspace, events);
    if (note)
      events.push(queueContextEvent(note));
    if (isVerifiedGitCommit(command) && hasKibiPreCommitGate(workspace.root)) {
      events.push({ kind: "checked", paths: [], all: true });
    }
    appendSessionEvents(workspace.stateDir, events);
    return {};
  } else {
    const unwrapped = unwrapKibiMcpCall(toolName, input.toolArgs);
    const usage = extractMcpKbUsage(toolName, input.toolArgs);
    if (usage)
      recordUsage(usage);
    if (usage?.operation === "kb_upsert" && isRequirementUpsert(unwrapped?.payload ?? input.toolArgs)) {
      markDecisionFlag({ stateDir: workspace.stateDir, sessionId: input.conversationId }, "requirement-recorded");
    }
  }
  const template = captureTemplateNote(workspace, events);
  if (template)
    events.push(queueContextEvent(template));
  appendSessionEvents(workspace.stateDir, events);
  return {};
}
function preInvocation(input, workspace, trace = {}) {
  const state = loadSessionState(workspace.stateDir);
  const events = [];
  const messages = [];
  const prompt = input.lastUserInput?.trim() ?? "";
  if (prompt.length > 0) {
    const hash = promptHash(prompt);
    if (hash !== state.lastPromptHash) {
      const rule = statedRule(prompt);
      const reason = statedReason(prompt);
      startDecisionSession({ stateDir: workspace.stateDir, sessionId: input.conversationId }, "prompt", { hostFiles: sessionJournal(workspace.stateDir) });
      events.push({
        kind: "prompt",
        hash,
        words: requestTopicWords(prompt),
        rule: rule !== undefined,
        phrase: rule ?? "",
        reason
      });
      if (rule !== undefined) {
        trace.action = "prompt_rule_note";
        messages.push(rulePromptNote(rule, reason));
      } else {
        trace.action = "prompt_silent";
      }
    }
  }
  if (state.queuedContext.length > 0) {
    const flushedIds = state.queuedContext.map((item) => item.id);
    events.push({ kind: "context_flushed", ids: flushedIds });
    for (const item of state.queuedContext) {
      if (!messages.includes(item.text)) {
        messages.push(item.text);
      }
    }
    trace.action ??= "context_injected";
  }
  appendSessionEvents(workspace.stateDir, events);
  if (messages.length === 0)
    return {};
  let combined = messages.join(`

`);
  if (combined.length > MAX_INJECTED_CONTEXT_CHARS) {
    combined = `${combined.slice(0, MAX_INJECTED_CONTEXT_CHARS - 1)}…`;
  }
  return injectSystem(combined);
}
function stop(input, workspace, trace = {}) {
  if (input.continuationActive)
    return {};
  if (input.terminationReason && input.terminationReason !== "NO_TOOL_CALL") {
    return {};
  }
  const state = loadSessionState(workspace.stateDir);
  const unreminded = state.pendingSource.filter((pending) => !state.reminded.has(pending));
  const capture = state.sourceEdited && !state.kbRecorded && !state.notices.has("capture-stop");
  const signoff = !capture && claimSignoffReminder({ stateDir: workspace.stateDir, sessionId: input.conversationId }, workspace.root);
  if (unreminded.length === 0 && !capture && !signoff)
    return {};
  const events = [];
  const parts = [];
  if (capture) {
    events.push({ kind: "notice", name: "capture-stop" });
    parts.push(captureReminder(state.rulePhrase));
  }
  if (signoff)
    parts.push(signoffReminder());
  if (unreminded.length > 0) {
    events.push({ kind: "reminded", paths: unreminded });
    parts.push(stopReminder(unreminded));
  }
  appendSessionEvents(workspace.stateDir, events);
  trace.action = capture ? "stop_capture_reminder" : signoff ? "stop_signoff_reminder" : "stop_reminder";
  trace.kbUsedBefore = state.kbUsed;
  return {
    decision: "continue",
    reason: parts.join(`
`)
  };
}
function resolveStartDirectory(input, env) {
  if (input.cwd && input.cwd.trim().length > 0)
    return input.cwd;
  if (input.workspacePaths.length > 0 && input.workspacePaths[0]) {
    return input.workspacePaths[0];
  }
  return env.ANTIGRAVITY_WORKSPACE?.trim() || process.cwd();
}
async function runHook(rawInput, environment = {}) {
  const startedAt = new Date;
  const env = environment.env ?? process.env;
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? env.PLUGIN_DATA ?? path14.join(os2.tmpdir(), `kibi-antigravity-${process.getuid?.() ?? "user"}`);
  const startDir = resolveStartDirectory(input, env);
  let resolved = resolveKibiWorkspace(startDir, env);
  if (!resolved.optedIn && input.workspacePaths.length > 1) {
    for (const candidate of input.workspacePaths.slice(1)) {
      const check = resolveKibiWorkspace(candidate, env);
      if (check.optedIn) {
        resolved = check;
        break;
      }
    }
  }
  if (!resolved.optedIn) {
    return input.event === "PreToolUse" ? passthroughPreToolDecision(input) : {};
  }
  const dataDir = workspaceDataDir(pluginData, resolved.root);
  let index;
  const workspace = {
    root: resolved.root,
    stateDir: sessionDir(dataDir, input.conversationId),
    index: () => {
      index ??= loadKnowledgeIndex(resolved.root, dataDir);
      return index;
    },
    telemetry: hookTelemetryEnabled(env),
    confirmFirm: confirmFirmEdits(env),
    summarize: createEntitySummarizer(resolved.root)
  };
  const trace = {};
  const output = dispatchHook(input, workspace, trace);
  appendHookUsage2({
    workspaceRoot: resolved.root,
    event: input.event,
    sessionId: input.conversationId,
    hostTool: input.toolName,
    trace,
    startedAt
  }, env);
  await flushHookTelemetry({
    event: input.event,
    workspaceRoot: resolved.root,
    sessionId: input.conversationId
  }, env);
  return output;
}
function dispatchHook(input, workspace, trace) {
  switch (input.event) {
    case "SessionStart": {
      trace.action = "session_start";
      startDecisionSession({ stateDir: workspace.stateDir, sessionId: input.conversationId }, "startup", { hostFiles: sessionJournal(workspace.stateDir) });
      return injectSystem([
        sessionStartContext(linkedFileCount(workspace.index())),
        missingHooksNote(workspace.root)
      ].filter((line) => line !== null).join(`
`));
    }
    case "PreInvocation":
      return preInvocation(input, workspace, trace);
    case "PreToolUse": {
      const output = preToolUse(input, workspace, trace);
      if (trace.action === undefined) {
        Object.assign(trace, skillLoadTrace(input.toolName, {
          ...input.toolArgs ?? {},
          file_path: toolPath(input.toolArgs)
        }));
      }
      return output;
    }
    case "PostToolUse":
      return postToolUse(input, workspace, trace);
    case "Stop":
      return stop(input, workspace, trace);
    default:
      return {};
  }
}
async function main() {
  const raw = parseStdinJson(await readStdin());
  try {
    const result = await runHook(raw);
    process.stdout.write(`${JSON.stringify(result)}
`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`kibi-antigravity hook error: ${message}
`);
    const parsed = parseHookInput(raw);
    const fallback = parsed.event === "PreToolUse" ? passthroughPreToolDecision(parsed) : {};
    process.stdout.write(`${JSON.stringify(fallback)}
`);
  }
}
function isInvokedAsCli(argv1, moduleUrl) {
  const invokedPath = argv1 ? pathToFileURL(path14.resolve(argv1)).href : "";
  return moduleUrl === invokedPath;
}
async function runHookCli() {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`kibi-antigravity hook error: ${message}
`);
    process.stdout.write(`{}
`);
  }
}
async function runHookCliIfMain(isMain = isInvokedAsCli(process.argv[1], import.meta.url), start = runHookCli) {
  if (isMain)
    await start();
}
runHookCliIfMain();
export {
  CONFIRM_FIRM_EDITS_ENV,
  editFocus2 as editFocus,
  isInvokedAsCli,
  main,
  normalizeEditArgs,
  readFocus,
  runHook,
  runHookCli,
  runHookCliIfMain
};
