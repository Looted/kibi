#!/usr/bin/env node

// src/hook-runner.ts
import os2 from "node:os";
import path13 from "node:path";
import { pathToFileURL } from "node:url";

// src/bash-command.ts
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
var MAX_COMMAND_CHARS = 20000;
var MAX_CANDIDATES = 200;
var MTIME_TOLERANCE_MS = 1000;
var TOKEN_SEPARATOR = /[\s;|&<>()'"`,=[\]{}]/;
var PATH_LIKE = /^[\w@.~/+-]*[\w-]\.[A-Za-z0-9]{1,8}$|^[\w@.~+-]*\/[\w@.~/+-]*$/;
var SEARCH_COMMAND = /(^|[\s;|&(])(grep|egrep|rg|ag|ack|find|fd|git\s+(grep|ls-files))(\s|$)/;
var CD_TARGET = /(?:^|[\s;&|(])cd\s+("[^"]+"|'[^']+'|[^\s;&|)]+)/g;
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
var REDIRECT_TARGET = /(?:^|[^0-9&<>])>>?\s*([^\s;&|<>()]+)/g;
var IN_PLACE_FLAG = /^(-[A-Za-z]*i\S*|--in-place(=\S*)?)$/;
var IN_PLACE_EDITORS = new Set(["sed", "gsed", "perl"]);
var COMMAND_PREFIXES = new Set(["sudo", "env", "command", "exec", "nice"]);
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
function* writtenNames(command) {
  const masked = maskQuoted(command);
  for (const match of masked.matchAll(REDIRECT_TARGET)) {
    const end = match.index + match[0].length;
    yield unquote(command.slice(end - match[1].length, end));
  }
  for (const words of simpleCommandWords(command, masked)) {
    const [name, ...args] = words.slice(words.findIndex(isCommandWord));
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

// src/hook-input.ts
function readString(record, key) {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}
function parseHookInput(raw) {
  const input = raw ?? {};
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
  const prompt = readString(input, "prompt");
  if (source !== undefined)
    parsed.source = source;
  if (prompt !== undefined)
    parsed.prompt = prompt;
  if (input.tool_input !== undefined)
    parsed.toolInput = input.tool_input;
  if (input.stop_hook_active === true)
    parsed.stopHookActive = true;
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
  return trimmed.length === 0 ? {} : JSON.parse(trimmed);
}

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
import path5 from "node:path";

// ../agent-core/dist/requirement-candidates.js
import fs3 from "node:fs";
import path3 from "node:path";
var REQUIREMENTS_DIR = path3.join(".kb", "requirements");
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
function unquote2(value) {
  const trimmed = value.trim();
  return /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}
function readHead(file) {
  let head;
  try {
    const descriptor = fs3.openSync(file, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const bytes = fs3.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs3.closeSync(descriptor);
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
      fields[match[1]] = unquote2(match[2]);
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
function rankRequirementCandidates(relativePath, requirements, limit = MAX_REQUIREMENT_CANDIDATES, requestWords) {
  const topic = new Set(pathTopicWords(relativePath));
  const request = new Set(requestWords?.filter((word) => !topic.has(word)));
  const scored = [];
  for (const head of requirements) {
    if (RETIRED_STATUS.test(String(head.status)))
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
function requirementCandidatesForPath(workspaceRoot, relativePath, limit = MAX_REQUIREMENT_CANDIDATES, requestWords) {
  if (pathTopicWords(relativePath).length === 0 && (requestWords?.length ?? 0) < 2)
    return [];
  const directory = path3.join(workspaceRoot, REQUIREMENTS_DIR);
  let names;
  try {
    names = fs3.readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return [];
  }
  if (names.length > MAX_SCANNED)
    return [];
  const heads = names.map((name) => readHead(path3.join(directory, name))).filter((head) => head !== undefined);
  return rankRequirementCandidates(relativePath, heads, limit, requestWords);
}

// ../agent-core/dist/snippets.js
import fs5 from "node:fs";

// ../agent-core/dist/knowledge-index.js
import { createHash, randomUUID } from "node:crypto";
import fs4 from "node:fs";
import path4 from "node:path";
var SYMBOLS_MANIFEST = ".kb/symbols.yaml";
var SYMBOL_COORDINATES = ".kb/symbol-coordinates.yaml";
var INDEX_FORMAT = "kibi-agent-core.knowledge-index.v2";
var CACHE_FILE = "knowledge-index.json";
function unquote3(raw) {
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
      return unquote3(raw);
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
  return completeFlowValue(raw)?.value ?? unquote3(raw);
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
      pendingFlow.target[pendingFlow.key] = unquote3(pendingFlow.first);
      pendingFlow = undefined;
    }
    if (indent === 0 && !dash) {
      const pair = keyValue.exec(content);
      otherSection = pair === null || unquote3(pair[1]) !== sectionKey;
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
        const key = unquote3(pair[1]);
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
        listItem = { [unquote3(pair[1])]: parseScalarOrFlow(pair[2]) };
        list.push(listItem);
      } else {
        list.push(unquote3(rest));
      }
      continue;
    }
    const pair = keyValue.exec(content);
    if (pair === null)
      continue;
    const key = unquote3(pair[1]);
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
    const key = unquote3(pair[1]);
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
    const value = unquote3(pair[2]);
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
    const stats = fs4.statSync(filePath);
    return `${stats.size}:${stats.mtimeMs}`;
  } catch {
    return "missing";
  }
}
function readText(filePath) {
  try {
    return fs4.readFileSync(filePath, "utf8");
  } catch {}
  return;
}
function writeCacheAtomically(cachePath, payload) {
  try {
    fs4.mkdirSync(path4.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
    fs4.writeFileSync(temporary, payload);
    fs4.renameSync(temporary, cachePath);
  } catch {}
}
function readCachedIndex(cachePath, signature) {
  try {
    const parsed = JSON.parse(String(fs4.readFileSync(cachePath)));
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
  return { value: block ? joined : unquote3(joined), last };
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
    const descriptor = fs4.openSync(path4.join(workspaceRoot, ".kb", lane[1], `${entityId}.md`), "r");
    try {
      const buffer = Buffer.alloc(8192);
      const bytes = fs4.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs4.closeSync(descriptor);
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
      values.push(unquote3(scalar[2]));
    }
    const flowSet = /^value_set:\s*\[(.*)\]\s*$/.exec(line);
    if (flowSet !== null && flowSet[1].trim()) {
      values.push(...flowSet[1].split(",").map((member) => unquote3(member)));
    }
    if (/^\S/.test(line))
      inValueSet = /^value_set:\s*$/.test(line);
    else if (inValueSet) {
      const member = /^\s*-\s*(.+)/.exec(line);
      if (member)
        values.push(unquote3(member[1]));
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
      summary.title = unquote3(match[2]);
    if (match?.[1] === "status" && match[2])
      summary.status = unquote3(match[2]);
    if (match?.[1] === "firmness" && match[2])
      summary.firmness = unquote3(match[2]);
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
      pending.type = unquote3(field[2]);
    else if (field?.[1] === "target")
      pending.target = unquote3(field[2]);
    else if (entry && SAFE_ENTITY_ID.test(unquote3(body)))
      pending.bare = unquote3(body);
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
function formatList(items, limit) {
  const shown = items.slice(0, limit).join(", ");
  return items.length > limit ? `${shown} +${items.length - limit}` : shown;
}
var RETIRED_STATUS2 = /supersed|deprecat|reject|obsolete|retired/i;
function isRetiredStatus(status) {
  return RETIRED_STATUS2.test(String(status));
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
function unownedSourceNote(relativePath, candidates = []) {
  const head = `Kibi: no symbol in ${relativePath} is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.`;
  const search = `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) surfaces requirements that may already describe it; new behavior is recorded with kb_upsert (requirement + scenario + symbol implements link) as part of the change.`;
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
function editKnowledgeUpdate(input) {
  const { relativePath, symbols, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);
  const { requirementIds } = requirementOwners(symbols, focus);
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
  lines.push(...requirementGroundingLines(leadId, summarize));
  lines.push(impactCheckLine(relativePath));
  return truncate(lines.join(`
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
    "If the edit was declined or could not be confirmed, the requirement stands: name it and ask the person how to proceed, rather than reaching the same change another way. If it was allowed and the change alters what the requirement says, the requirement is updated with kb_upsert in this change."
  ].join(`
`);
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
function sessionPath(session, name) {
  if (!session.stateDir)
    throw new Error;
  const key = createHash2("sha256").update(session.sessionId?.trim() || "unattributed").digest("hex").slice(0, 32);
  return path5.join(session.stateDir, "decision-guard", key, name);
}
function touchMarker(file, flag) {
  fs6.mkdirSync(path5.dirname(file), { recursive: true });
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
var SIGNOFF_LATEST_JSON = path5.join(".kb", "briefs", "signoff", "latest.json");
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
    time = fs6.statSync(file()).mtimeMs;
  } catch {}
  return time;
}
function claimSignoffReminder(session, workspaceRoot) {
  const recorded = mtimeMs(() => sessionPath(session, "requirement-recorded"));
  if (Number.isNaN(recorded))
    return false;
  const shown = mtimeMs(() => path5.join(workspaceRoot, SIGNOFF_LATEST_JSON));
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

// ../agent-core/dist/kb-mcp-tools.js
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

// ../agent-core/dist/hook-usage-log.js
import { randomUUID as randomUUID4 } from "node:crypto";
import fs9 from "node:fs";
import path9 from "node:path";

// ../agent-core/dist/path-policy.js
import path6 from "node:path";
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
  const base = options.base ?? options.eventCwd ?? workspaceRoot;
  const absolute = path6.isAbsolute(trimmed) ? path6.resolve(trimmed) : path6.resolve(base, trimmed);
  const workspaceRelative = path6.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  if (workspaceRelative.length === 0 || workspaceRelative === ".." || workspaceRelative.startsWith("../") || path6.isAbsolute(workspaceRelative)) {
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
  const extension = path6.extname(basename).toLowerCase();
  if (!codeExtensions.has(extension))
    return "other";
  if (testBasename.test(basename) || segments.some((segment) => testSegments.has(segment))) {
    return "test";
  }
  return "source";
}

// ../agent-core/dist/telemetry-signals.js
import { createHash as createHash3, randomUUID as randomUUID2 } from "node:crypto";
import fs7 from "node:fs";
import path7 from "node:path";
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
  return path7.join(directory, RECENT_FILE);
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
    parsed = JSON.parse(String(fs7.readFileSync(recentPath(directory)))) ?? parsed;
  } catch {}
  return {
    calls: entries(parsed.calls).filter((entry) => fresh(entry, now, RETRY_WINDOW_MS) && typeof entry.o === "string"),
    skills: entries(parsed.skills).filter((entry) => fresh(entry, now, SKILL_WINDOW_MS))
  };
}
function writeRecent(directory, recent) {
  try {
    fs7.mkdirSync(directory, { recursive: true });
    const file = recentPath(directory);
    const temporary = `${file}.${process.pid}.${randomUUID2()}.tmp`;
    fs7.writeFileSync(temporary, JSON.stringify({
      calls: recent.calls.slice(-MAX_RECENT_ENTRIES),
      skills: recent.skills.slice(-MAX_RECENT_ENTRIES)
    }));
    fs7.renameSync(temporary, file);
  } catch {}
}
function rememberSkillLoad(directory, workspaceHash, now = Date.now()) {
  const recent = readRecent(directory, now);
  recent.skills.push({ w: workspaceHash, t: now });
  writeRecent(directory, recent);
}

// ../agent-core/dist/usage-telemetry.js
import { createHash as createHash4, randomUUID as randomUUID3 } from "node:crypto";
import fs8 from "node:fs";
import os from "node:os";
import path8 from "node:path";
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
    return fs8.realpathSync(directory);
  } catch {
    return path8.resolve(directory);
  }
}
function sandboxedHome(env) {
  const home = (env.HOME ?? env.USERPROFILE)?.trim();
  if (!home)
    return false;
  const temp = realDirectory(os.tmpdir());
  const resolved = realDirectory(home);
  return resolved.startsWith(`${temp}${path8.sep}`);
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
  let current = path8.dirname(resolved);
  for (;; ) {
    try {
      const manifest = JSON.parse(fs8.readFileSync(path8.join(current, "package.json"), "utf8"));
      if (manifest.name === KIBI_REPOSITORY_PACKAGE && fs8.existsSync(path8.join(current, "packages", "agent-core"))) {
        return true;
      }
    } catch {}
    const parent = path8.dirname(current);
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
    return path8.join(env.LOCALAPPDATA, "kibi");
  }
  const stateHome = env.XDG_STATE_HOME?.trim();
  return path8.join(stateHome || path8.join(env.HOME || os.homedir(), ".local", "state"), "kibi");
}
function readTelemetryConfig(env = process.env) {
  try {
    const parsed = JSON.parse(String(fs8.readFileSync(path8.join(telemetryDirectory(env), CONFIG_FILE))));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function writeTelemetryConfig(config, env) {
  const directory = telemetryDirectory(env);
  fs8.mkdirSync(directory, { recursive: true });
  fs8.writeFileSync(path8.join(directory, CONFIG_FILE), `${JSON.stringify(config, null, 2)}
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
  return path8.join(telemetryDirectory(env), SESSIONS_FILE);
}
function readSessionMarkers(env) {
  try {
    const parsed = JSON.parse(String(fs8.readFileSync(sessionMarkersPath(env))));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function workspaceKey(workspaceRoot) {
  return hashTelemetryId(`workspace\x00${path8.resolve(workspaceRoot)}`);
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
    fs8.mkdirSync(path8.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${randomUUID3()}.tmp`;
    fs8.writeFileSync(temporary, JSON.stringify(Object.fromEntries(kept)));
    fs8.renameSync(temporary, file);
  } catch {}
}
function workspaceSessionHash(startDirectory, env = process.env) {
  const markers = readSessionMarkers(env);
  const now = Date.now();
  let current = path8.resolve(startDirectory);
  for (;; ) {
    const marker = markers[workspaceKey(current)];
    if (marker && typeof marker.session === "string" && typeof marker.at === "number" && now - marker.at <= SESSION_MARKER_MAX_AGE_MS) {
      return marker.session;
    }
    const parent = path8.dirname(current);
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
  return path8.join(telemetryDirectory(env), QUEUE_FILE);
}
function appendEvent(event, env) {
  try {
    const file = queuePath(env);
    fs8.mkdirSync(path8.dirname(file), { recursive: true });
    try {
      if (fs8.statSync(file).size > MAX_QUEUE_BYTES)
        return;
    } catch {}
    fs8.appendFileSync(file, `${JSON.stringify(event)}
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
    text = fs8.readFileSync(file, "utf8");
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
    names = fs8.readdirSync(directory);
  } catch {
    return claimed;
  }
  for (const name of names) {
    if (!name.endsWith(SENDING_SUFFIX))
      continue;
    const file = path8.join(directory, name);
    try {
      if (now - fs8.statSync(file).mtimeMs < STALE_CLAIM_MS)
        continue;
      const reclaimed = `${file}.${randomUUID3()}${SENDING_SUFFIX}`;
      fs8.renameSync(file, reclaimed);
      claimed.push(reclaimed);
    } catch {}
  }
  const queue = path8.join(directory, QUEUE_FILE);
  const target = path8.join(directory, `${QUEUE_FILE}.${process.pid}.${randomUUID3()}${SENDING_SUFFIX}`);
  try {
    fs8.renameSync(queue, target);
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
      events.push(...parseQueued(fs8.readFileSync(file, "utf8"), now));
    } catch {}
  }
  const release = () => {
    for (const file of claimed)
      fs8.rmSync(file, { force: true });
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
    const logPath = path9.join(row.workspaceRoot, ".kb", "usage.log");
    fs9.mkdirSync(path9.dirname(logPath), { recursive: true });
    fs9.appendFileSync(logPath, `${JSON.stringify(record)}
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
    const parsed = JSON.parse(String(fs9.readFileSync(packageJsonPath)));
    const version = parsed.version;
    if (typeof version === "string")
      return version;
  } catch {}
  return null;
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
  const name = `${toolName}`.trim();
  const lastSegment = name.split("__").at(-1);
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

// src/knowledge-index.ts
function loadKnowledgeIndex2(workspaceRoot, cacheDir) {
  return loadKnowledgeIndex(workspaceRoot, cacheDir);
}

// src/path-policy.ts
function toWorkspacePath2(workspaceRoot, rawPath, eventCwd) {
  return toWorkspacePath(workspaceRoot, rawPath, eventCwd);
}
function classifyPath2(relativePath) {
  return classifyPath(relativePath);
}

// src/session-state.ts
import { createHash as createHash5 } from "node:crypto";
import fs10 from "node:fs";
import path10 from "node:path";
var JOURNAL = "session.jsonl";
function workspaceDataDir(pluginData, workspaceRoot) {
  if (!pluginData)
    return;
  const key = createHash5("sha256").update(path10.resolve(workspaceRoot)).digest("hex").slice(0, 32);
  return path10.join(pluginData, "workspaces", key);
}
function sessionDir(workspaceDir, sessionId) {
  if (!workspaceDir)
    return;
  const trimmed = sessionId?.trim() ?? "";
  const key = trimmed.length > 0 ? createHash5("sha256").update(trimmed).digest("hex").slice(0, 32) : "unattributed";
  return path10.join(workspaceDir, "sessions", key);
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
    requestWords: [],
    rulePrompt: false,
    firmAsked: new Map,
    firmConfirmed: new Set,
    sourceEdited: false,
    kbRecorded: false
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
        state.firmConfirmed.add(id);
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
      state.requestWords = event.words;
      if (event.rule)
        state.rulePrompt = true;
      return;
    case "firm_asked":
      state.firmAsked.set(event.path, [
        ...new Set([...state.firmAsked.get(event.path) ?? [], ...event.ids])
      ]);
      return;
    case "context_reset":
      state.shownRead.clear();
      state.shownEdit.clear();
      state.notices.clear();
      state.exploredPaths.clear();
      state.exploredIds.clear();
      return;
  }
}
function loadSessionState(dir) {
  const state = emptySessionState();
  if (!dir)
    return state;
  let journal;
  try {
    journal = fs10.readFileSync(path10.join(dir, JOURNAL), "utf8");
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
    fs10.mkdirSync(dir, { recursive: true });
    fs10.appendFileSync(path10.join(dir, JOURNAL), events.map((event) => `${JSON.stringify(event)}
`).join(""));
  } catch {}
}

// src/snippets.ts
function searchTip(linkedFileCount) {
  return `Kibi tip: this repository records requirements, scenarios, decisions, and code ownership in a Kibi knowledge base (${linkedFileCount} source files have requirement-linked symbols). For intent questions — why code exists, what it must do — kb_search answers from that knowledge, naming the governing requirements, facts, decisions and tests; kb_query({sourceFile:"<path>"}) lists what a file implements.`;
}
var DIRECT_KB_ACCESS_NOTE = "Kibi: .kb/ holds Kibi-managed knowledge. kb_query/kb_search read it and kb_upsert writes it while keeping the branch store, relationships, and validation consistent; direct file reads miss relationships and direct edits bypass validation.";
function sessionStartContext(linkedFileCount) {
  return [
    `Kibi knowledge base is active in this workspace (${linkedFileCount} source files have requirement-linked symbols).`,
    "Kibi hooks add short requirement/test snippets (from the symbol manifest) before reads and edits of linked files; kb_query returns the authoritative detail.",
    "A request that conflicts with a recorded requirement or ADR is a question, not a task: name the rule and ask before changing the code or the rule, and change it only when the person says so.",
    "A file with no linked symbols gets a short note; no link is not no rule, so kb_search what it does (permissions, roles, limits, data).",
    "Recording new behavior (requirement, scenario, implements link) is part of the change and needs no permission.",
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
import path11 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var pluginVersion = readPackageVersion(path11.join(path11.dirname(fileURLToPath2(import.meta.url)), "..", "package.json"));
function appendHookUsage2(row, env = process.env) {
  appendHookUsage({
    ...row,
    host: "claude-code",
    packageVersion: pluginVersion
  }, env);
}
var flushHookTelemetry = finishHookTelemetry;

// src/workspace-optin.ts
import fs11 from "node:fs";
import path12 from "node:path";
var KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT"
];
function nextAncestorDirectory(current) {
  const parent = path12.dirname(current);
  return parent === current ? undefined : parent;
}
function hasKibiManifest(directory) {
  return fs11.existsSync(path12.join(directory, ".kb", "manifest.json"));
}
function hasGitBoundary(directory) {
  return fs11.existsSync(path12.join(directory, ".git"));
}
function resolutionFor(root) {
  return { root, optedIn: hasKibiManifest(root) };
}
function resolveKibiWorkspace(startDir, env = process.env) {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      return resolutionFor(path12.resolve(value));
    }
  }
  let current = path12.resolve(startDir && startDir.trim().length > 0 ? startDir : process.cwd());
  while (current !== undefined) {
    if (hasKibiManifest(current)) {
      return { root: current, optedIn: true };
    }
    if (hasGitBoundary(current)) {
      return { root: current, optedIn: false };
    }
    current = nextAncestorDirectory(current);
  }
  return resolutionFor(path12.resolve(startDir ?? process.cwd()));
}

// src/hook-runner.ts
var readTools = new Set(["Read"]);
var editTools = new Set([
  "Edit",
  "MultiEdit",
  "Write",
  "NotebookEdit"
]);
var searchTools = new Set(["Grep", "Glob"]);
function context(event, text) {
  return {
    hookSpecificOutput: { hookEventName: event, additionalContext: text }
  };
}
function fieldsOf(toolInput) {
  return toolInput ?? {};
}
function toolPath(toolInput) {
  const fields = fieldsOf(toolInput);
  const candidate = fields.file_path ?? fields.notebook_path;
  return typeof candidate === "string" ? candidate : undefined;
}
function bashCommand(toolInput) {
  return String(fieldsOf(toolInput).command);
}
function symbolsFor(workspace, relativePath) {
  return workspace.index().files[relativePath] ?? [];
}
function linkedFileCount(index) {
  return Object.values(index.files).filter((symbols) => symbols.some((symbol) => symbol.implements.length > 0)).length;
}
function readFocus(toolInput) {
  const fields = fieldsOf(toolInput);
  const offset = typeof fields.offset === "number" ? fields.offset : undefined;
  const limit = typeof fields.limit === "number" ? fields.limit : undefined;
  if (offset === undefined && limit === undefined)
    return;
  const start = Math.max(1, offset ?? 1);
  return [{ start, end: limit !== undefined ? start + limit - 1 : start }];
}
function editFocus2(absolutePath, toolInput) {
  return editFocus(absolutePath, toolInput);
}
function isExplored(state, relativePath) {
  return state.exploredPaths.has(relativePath);
}
function requirementIds(symbols) {
  return implementedRequirementIds(symbols);
}
function firmEdit(relativePath, symbols, focus, wholeFile, state, workspace) {
  if (!workspace.confirmFirm)
    return;
  const { ids, symbol } = firmRequirementsTouched({
    symbols,
    focus,
    wholeFile,
    summarize: workspace.summarize,
    confirmed: state.firmConfirmed
  });
  if (ids.length === 0)
    return;
  return {
    path: relativePath,
    where: symbol ? `${symbol.title} in ${relativePath}` : relativePath,
    ids
  };
}
function withFirmConfirmation(output, firm, workspace, trace) {
  appendSessionEvents(workspace.stateDir, [
    { kind: "firm_asked", path: firm.path, ids: firm.ids }
  ]);
  trace.action = "edit_firm_ask";
  trace.requirementIds = firm.ids;
  const describe = (id) => workspace.summarize(id);
  const agentContext = [
    output.hookSpecificOutput?.additionalContext,
    firmEditContext(firm.ids)
  ].filter((part) => part !== undefined).join(`

`);
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: firmEditConfirmation(firm.where, firm.ids.map(describe)),
      additionalContext: agentContext
    }
  };
}
function preToolUse(input, workspace, trace = {}) {
  const toolName = input.toolName;
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
  if (toolName === "Bash") {
    return bashPreToolUse(input, workspace, state, trace);
  }
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
  const symbols = symbolsFor(workspace, relativePath);
  trace.requirementIds = requirementIds(symbols);
  if (isRead) {
    trace.action = "read_silent";
    const snippet = readSnippet(relativePath, symbols, state, workspace, readFocus(input.toolInput));
    if (!snippet)
      return {};
    events.push({ kind: "shown", surface: "read", path: relativePath });
    return emit(snippet, "read_snippet");
  }
  trace.action = "edit_silent";
  const focus = toolName === "Edit" || toolName === "MultiEdit" ? editFocus2(target.absolute, input.toolInput) : undefined;
  const firm = firmEdit(relativePath, symbols, focus, toolName === "Write", state, workspace);
  const output = editPreToolUse(relativePath, kind, symbols, focus, state, workspace, events, emit);
  return firm ? withFirmConfirmation(output, firm, workspace, trace) : output;
}
function editPreToolUse(relativePath, kind, symbols, focus, state, workspace, events, emit) {
  if (state.shownEdit.has(relativePath)) {
    const symbol = focusedSymbols(symbols, focus)[0];
    if (!symbol || symbol.implements.length === 0)
      return {};
    const key = `${relativePath}#${symbol.id}`;
    if (state.shownEdit.has(key))
      return {};
    const update = focusUpdate(relativePath, symbols, focus);
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
  const snippetInput = {
    relativePath,
    symbols,
    surface: "edit",
    focus,
    summarize: workspace.summarize
  };
  if (alreadyKnown) {
    const update = editKnowledgeUpdate(snippetInput);
    if (update)
      return emit(update, "edit_update_snippet");
    appendSessionEvents(workspace.stateDir, events);
    return {};
  }
  const snippet = fileKnowledgeSnippet(snippetInput);
  if (snippet)
    return emit(snippet, "edit_snippet");
  if (kind === "source") {
    const index = workspace.index();
    const unread = index.manifest === "unreadable" || index.coordinateFiles.includes(relativePath) && !index.unlinkedFiles.includes(relativePath);
    if (!unread) {
      return emit(unownedSourceNote(relativePath, requirementCandidatesForPath(workspace.root, relativePath, undefined, state.requestWords)), "edit_unowned_note");
    }
    if (!state.notices.has("manifest-unreadable")) {
      events.push({ kind: "notice", name: "manifest-unreadable" });
      return emit(unreadableManifestNote(relativePath), "edit_manifest_note");
    }
  }
  appendSessionEvents(workspace.stateDir, events);
  return {};
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
function bashPreToolUse(input, workspace, state, trace) {
  const events = [{ kind: "command_started", at: Date.now() }];
  const command = bashCommand(input.toolInput);
  const emit = (text, action) => {
    trace.action = action;
    appendSessionEvents(workspace.stateDir, events);
    return context("PreToolUse", text);
  };
  const cwd = input.cwd ?? workspace.root;
  const edited = new Set(commandEditPaths(command, cwd));
  const firm = [...edited].map((absolute) => {
    const target = toWorkspacePath2(workspace.root, absolute, input.cwd);
    if (!target || classifyPath2(target.relative) !== "source")
      return;
    const symbols = symbolsFor(workspace, target.relative);
    return firmEdit(target.relative, symbols, undefined, true, state, workspace);
  }).find((candidate) => candidate !== undefined);
  const output = bashContext(input, workspace, state, trace, command, edited, events, emit);
  return firm ? withFirmConfirmation(output, firm, workspace, trace) : output;
}
function bashContext(input, workspace, state, trace, command, edited, events, emit) {
  let namesKb = false;
  const cwd = input.cwd ?? workspace.root;
  for (const absolute of commandFilePaths(command, cwd)) {
    const target = toWorkspacePath2(workspace.root, absolute, input.cwd);
    if (!target)
      continue;
    const kind = classifyPath2(target.relative);
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
      return emit(note, alreadyKnown ? "edit_update_snippet" : "edit_snippet");
    }
    const snippet = readSnippet(target.relative, symbols, state, workspace);
    if (!snippet)
      continue;
    trace.path = target.relative;
    trace.pathKind = kind;
    trace.requirementIds = requirementIds(symbols);
    events.push({ kind: "shown", surface: "read", path: target.relative });
    return emit(snippet, "read_snippet");
  }
  if (namesKb && !state.notices.has("kb-direct")) {
    events.push({ kind: "notice", name: "kb-direct" });
    return emit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
  }
  if (isSearchCommand(command) && !state.kbUsed && !state.notices.has("search-tip")) {
    const linked = linkedFileCount(workspace.index());
    if (linked > 0) {
      events.push({ kind: "notice", name: "search-tip" });
      return emit(searchTip(linked), "search_tip");
    }
  }
  appendSessionEvents(workspace.stateDir, events);
  return {};
}
function bashChanges(workspace, events, trace) {
  const state = loadSessionState(workspace.stateDir);
  if (state.commandStartedAt === undefined)
    return;
  let note;
  for (const relative of filesChangedSince(workspace.root, state.commandStartedAt)) {
    const pathKind = classifyPath2(relative);
    if (pathKind === "kb" || pathKind === "other")
      continue;
    events.push({ kind: "edited", path: relative, pathKind });
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
function postToolUse(input, workspace, trace = {}) {
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
        if (workspace.telemetry && pathKind !== "kb") {
          trace.requirementIds = requirementIds(symbolsFor(workspace, target.relative));
        }
      }
    }
  } else if (toolName === "Bash") {
    const command = bashCommand(input.toolInput);
    const usage = extractCliKbUsage(command);
    if (usage)
      recordUsage(usage);
    const note = bashChanges(workspace, events, trace);
    if (isVerifiedGitCommit(command) && hasKibiPreCommitGate(workspace.root)) {
      events.push({ kind: "checked", paths: [], all: true });
    }
    appendSessionEvents(workspace.stateDir, events);
    return note ? context("PostToolUse", note) : {};
  } else {
    const usage = extractMcpKbUsage(toolName, input.toolInput);
    if (usage)
      recordUsage(usage);
    if (usage?.operation === "kb_upsert" && isRequirementUpsert(input.toolInput)) {
      markDecisionFlag({ stateDir: workspace.stateDir, sessionId: input.sessionId }, "requirement-recorded");
    }
  }
  appendSessionEvents(workspace.stateDir, events);
  return {};
}
function stop(input, workspace, trace = {}) {
  if (input.stopHookActive)
    return {};
  const state = loadSessionState(workspace.stateDir);
  const unreminded = state.pendingSource.filter((pending) => !state.reminded.has(pending));
  const capture = state.sourceEdited && !state.kbRecorded && !state.notices.has("capture-stop");
  const signoff = !capture && claimSignoffReminder({ stateDir: workspace.stateDir, sessionId: input.sessionId }, workspace.root);
  if (unreminded.length === 0 && !capture && !signoff)
    return {};
  const events = [];
  const parts = [];
  if (capture) {
    events.push({ kind: "notice", name: "capture-stop" });
    parts.push(captureReminder(state.rulePrompt));
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
  return context("Stop", parts.join(`
`));
}
function userPromptSubmit(input, workspace, trace) {
  const prompt = input.prompt ?? "";
  const rule = statedRule(prompt);
  appendSessionEvents(workspace.stateDir, [
    {
      kind: "prompt",
      words: requestTopicWords(prompt),
      rule: rule !== undefined
    }
  ]);
  if (rule === undefined) {
    trace.action = "prompt_silent";
    return {};
  }
  trace.action = "prompt_rule_note";
  return context("UserPromptSubmit", rulePromptNote(rule));
}
async function runHook(rawInput, environment = {}) {
  const startedAt = new Date;
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? process.env.CLAUDE_PLUGIN_DATA ?? path13.join(os2.tmpdir(), `kibi-claude-${process.getuid?.() ?? "user"}`);
  const projectDir = environment.projectDir ?? process.env.CLAUDE_PROJECT_DIR;
  const resolved = resolveKibiWorkspace(input.cwd ?? projectDir ?? process.cwd());
  if (!resolved.optedIn)
    return {};
  const dataDir = workspaceDataDir(pluginData, resolved.root);
  let index;
  const workspace = {
    root: resolved.root,
    stateDir: sessionDir(dataDir, input.sessionId),
    index: () => {
      index ??= loadKnowledgeIndex2(resolved.root, dataDir);
      return index;
    },
    telemetry: hookTelemetryEnabled(environment.env),
    confirmFirm: confirmFirmEdits(environment.env ?? process.env),
    summarize: createEntitySummarizer(resolved.root)
  };
  const trace = {};
  const output = dispatchHook(input, workspace, trace);
  appendHookUsage2({
    workspaceRoot: resolved.root,
    event: input.event,
    sessionId: input.sessionId,
    hostTool: input.toolName,
    trace,
    startedAt
  }, environment.env);
  await flushHookTelemetry({
    event: input.event,
    workspaceRoot: resolved.root,
    sessionId: input.sessionId
  }, environment.env);
  return output;
}
function dispatchHook(input, workspace, trace) {
  switch (input.event) {
    case "SessionStart":
      trace.action = "session_start";
      if (input.source === "compact" || input.source === "clear") {
        appendSessionEvents(workspace.stateDir, [{ kind: "context_reset" }]);
      }
      return context("SessionStart", [
        sessionStartContext(linkedFileCount(workspace.index())),
        missingHooksNote(workspace.root)
      ].filter((line) => line !== null).join(`
`));
    case "UserPromptSubmit":
      return userPromptSubmit(input, workspace, trace);
    case "PreToolUse": {
      const output = preToolUse(input, workspace, trace);
      if (trace.action === undefined) {
        Object.assign(trace, skillLoadTrace(input.toolName, input.toolInput));
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
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}
`);
}
function isInvokedAsCli(argv1, moduleUrl) {
  const invokedPath = argv1 ? pathToFileURL(path13.resolve(argv1)).href : "";
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
  readFocus,
  runHook,
  runHookCli,
  runHookCliIfMain
};
