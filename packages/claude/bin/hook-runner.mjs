#!/usr/bin/env node

// src/hook-runner.ts
import fs9 from "node:fs";
import os from "node:os";
import path10 from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync as spawnSync2 } from "node:child_process";

// src/bash-command.ts
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
var MAX_COMMAND_CHARS = 20000;
var MAX_CANDIDATES = 200;
var MTIME_TOLERANCE_MS = 1000;
var TOKEN_SEPARATOR = /[\s;|&<>()'"`,=[\]{}]+/;
var PATH_LIKE = /^[\w@.~/+-]*[\w-]\.[A-Za-z0-9]{1,8}$|^[\w@.~+-]*\/[\w@.~/+-]*$/;
var SEARCH_COMMAND = /(^|[\s;|&(])(grep|egrep|rg|ag|ack|find|fd|git\s+(grep|ls-files))(\s|$)/;
var CD_TARGET = /(?:^|[\s;&|(])cd\s+("[^"]+"|'[^']+'|[^\s;&|)]+)/g;
function unquote(value) {
  return value.replace(/^["']|["']$/g, "");
}
function cdTargets(command, cwd) {
  const targets = [];
  let base = cwd;
  for (const match of command.matchAll(CD_TARGET)) {
    const target = unquote(match[1] ?? "");
    if (!target || target === "-")
      continue;
    base = path.resolve(base, target);
    targets.push(base);
  }
  return targets;
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
    for (const base of path.isAbsolute(token) ? [""] : bases) {
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
  if (listed.status !== 0 || typeof listed.stdout !== "string")
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
var REDIRECT_TARGET = /(?:^|[^0-9&<>])>>?\s*("[^"]+"|'[^']+'|[^\s;&|<>()]+)/g;
var IN_PLACE_FLAG = /^(-[A-Za-z]*i\S*|--in-place(=\S*)?)$/;
var IN_PLACE_EDITORS = new Set(["sed", "gsed", "perl"]);
var COMMAND_PREFIXES = new Set(["sudo", "env", "command", "exec", "nice"]);
function maskQuoted(command) {
  let masked = "";
  let quote = null;
  for (let index = 0;index < command.length; index += 1) {
    const char = command[index] ?? "";
    if (quote === null && (char === "'" || char === '"')) {
      quote = char;
      masked += "_";
    } else if (char === "\\" && quote !== "'" && index + 1 < command.length) {
      masked += "__";
      index += 1;
    } else if (quote !== null) {
      if (char === quote)
        quote = null;
      masked += "_";
    } else
      masked += char;
  }
  return masked;
}
function simpleCommandWords(command, masked) {
  const commands = [];
  let start = 0;
  const cut = (end) => {
    const words = [];
    for (const word of masked.slice(start, end).matchAll(/\S+/g)) {
      const from = start + (word.index ?? 0);
      words.push(command.slice(from, from + word[0].length));
    }
    commands.push(words);
  };
  for (const separator of masked.matchAll(SIMPLE_COMMAND_SEPARATOR)) {
    cut(separator.index ?? 0);
    start = (separator.index ?? 0) + separator[0].length;
  }
  cut(masked.length);
  return commands;
}
function commandEditPaths(command, cwd) {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const masked = maskQuoted(scanned);
  const targets = [];
  for (const match of masked.matchAll(REDIRECT_TARGET)) {
    const end = (match.index ?? 0) + match[0].length;
    targets.push(unquote(scanned.slice(end - (match[1] ?? "").length, end)));
  }
  for (const words of simpleCommandWords(scanned, masked)) {
    let start = 0;
    while (start < words.length && (COMMAND_PREFIXES.has(words[start] ?? "") || /^\w+=/.test(words[start] ?? "")))
      start += 1;
    const name = path.basename(words[start] ?? "");
    const args = words.slice(start + 1);
    if (IN_PLACE_EDITORS.has(name) && args.some((a) => IN_PLACE_FLAG.test(a)))
      targets.push(...args.filter((arg) => !arg.startsWith("-")));
    else if (name === "tee")
      targets.push(...args.filter((arg) => !arg.startsWith("-")));
  }
  if (targets.length === 0)
    return [];
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const wanted = new Set;
  for (const target of targets) {
    const name = unquote(target);
    if (!name)
      continue;
    for (const base of path.isAbsolute(name) ? [""] : bases)
      wanted.add(path.resolve(base, name));
  }
  return commandFilePaths(scanned, cwd).filter((absolute) => wanted.has(absolute));
}

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
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function parseStdinJson(rawInput) {
  const trimmed = rawInput.trim();
  return trimmed.length === 0 ? {} : JSON.parse(trimmed);
}

// ../agent-core/dist/decision-guard.js
import { createHash as createHash2 } from "node:crypto";
import fs5 from "node:fs";
import path4 from "node:path";

// ../agent-core/dist/requirement-candidates.js
import fs2 from "node:fs";
import path2 from "node:path";
var REQUIREMENTS_DIR = path2.join(".kb", "requirements");
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
function unquote2(value) {
  const trimmed = value.trim();
  return /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}
function readHead(file) {
  let head;
  try {
    const descriptor = fs2.openSync(file, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const bytes = fs2.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs2.closeSync(descriptor);
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
  const directory = path2.join(workspaceRoot, REQUIREMENTS_DIR);
  let names;
  try {
    names = fs2.readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return [];
  }
  if (names.length > MAX_SCANNED)
    return [];
  const heads = names.map((name) => readHead(path2.join(directory, name))).filter((head) => head !== undefined);
  return rankRequirementCandidates(relativePath, heads, limit, requestWords);
}

// ../agent-core/dist/snippets.js
import fs4 from "node:fs";

// ../agent-core/dist/knowledge-index.js
import { createHash, randomUUID } from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";
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
      return unquote3(raw);
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
      target[pendingFlow.key] = unquote3(pendingFlow.first);
      pendingFlow = undefined;
    }
    if (indent === 0 && !dash) {
      const pair = keyValue.exec(content);
      section = pair?.[1] !== undefined && unquote3(pair[1]) === sectionKey ? "records" : "other";
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
        const key = unquote3(pair[1]);
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
        listItem = { [unquote3(pair[1])]: parseScalarOrFlow(pair[2]) };
        list.push(listItem);
      } else {
        listItem = undefined;
        list.push(unquote3(item));
      }
      continue;
    }
    const pair = keyValue.exec(content);
    if (pair?.[1] === undefined)
      continue;
    const key = unquote3(pair[1]);
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
    const key = unquote3(pair[1]);
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
      const sourceFile = normalizeSourceFile(unquote3(pair[2] ?? ""));
      if (sourceFile.length > 0)
        entry.sourceFile = sourceFile;
      coordinates[currentId] = entry;
      continue;
    }
    const numeric = Number.parseInt(unquote3(pair[2] ?? ""), 10);
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
    const stats = fs3.statSync(filePath);
    return `${stats.size}:${stats.mtimeMs}`;
  } catch {
    return "missing";
  }
}
function readText(filePath) {
  try {
    return fs3.readFileSync(filePath, "utf8");
  } catch {
    return;
  }
}
function writeCacheAtomically(cachePath, payload) {
  try {
    fs3.mkdirSync(path3.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
    fs3.writeFileSync(temporary, payload);
    fs3.renameSync(temporary, cachePath);
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
    const descriptor = fs3.openSync(path3.join(workspaceRoot, ".kb", lane[1], `${entityId}.md`), "r");
    try {
      const buffer = Buffer.alloc(8192);
      const bytes = fs3.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs3.closeSync(descriptor);
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
      pending.type = unquote3(field[2] ?? "");
    else if (field?.[1] === "target")
      pending.target = unquote3(field[2] ?? "");
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
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function editFocus(absolutePath, toolInput) {
  if (!isRecord2(toolInput))
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
      if (isRecord2(edit))
        collect(edit);
    }
  }
  const usable = needles.filter((needle) => needle.length > 0);
  if (usable.length === 0)
    return;
  let content;
  try {
    if (fs4.statSync(absolutePath).size > MAX_FOCUS_SCAN_BYTES)
      return;
    content = fs4.readFileSync(absolutePath, "utf8");
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
    return;
  const key = createHash2("sha256").update(session.sessionId?.trim() || "unattributed").digest("hex").slice(0, 32);
  return path4.join(session.stateDir, "decision-guard", key, name);
}
function writeMarker(file, content, flag) {
  fs5.mkdirSync(path4.dirname(file), { recursive: true });
  fs5.writeFileSync(file, content, { flag });
}
function markDecisionFlag(session, flag) {
  const file = sessionPath(session, flag);
  if (!file)
    return;
  try {
    writeMarker(file, "", "w");
  } catch {}
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
    return fs5.statSync(file).mtimeMs;
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
    "Before reporting the work done or asking to commit, run `kibi signoff` and put its output in the reply unchanged; a requirement the agent wrote waits for the person's approval, so ask for it with this view, never in your own words. When replies go through a messaging tool, pass the output there, and attach or publish `.kb/briefs/signoff/latest.html` when the host can show a page (kibi-decisions, resources/signoff-views.md)."
  ].join(`
`);
}

// ../agent-core/dist/kb-mcp-tools.js
function isRecord3(value) {
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
  const base = isRecord3(toolInput) ? toolInput : {};
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

// src/kb-tools.ts
function isRecord4(value) {
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
  if (!isRecord4(toolInput))
    return {};
  const nested = toolInput.arguments ?? toolInput.args;
  return isRecord4(nested) ? nested : toolInput;
}
function usageFromPayload(operation, payload) {
  const paths = [
    ...strings(payload.sourceFile),
    ...strings(payload.sourceFiles)
  ];
  if (Array.isArray(payload.sourceLocations)) {
    for (const location of payload.sourceLocations) {
      if (isRecord4(location))
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
  const operation = kibiCliOperation(command);
  if (!operation)
    return;
  let payload = {};
  const inline = /'(\{.*\})'/s.exec(command) ?? /"(\{.*\})"/s.exec(command);
  if (inline?.[1]) {
    try {
      const parsed = JSON.parse(inline[1]);
      if (isRecord4(parsed))
        payload = parsed;
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
  const absolute = path5.isAbsolute(trimmed) ? path5.resolve(trimmed) : path5.resolve(base, trimmed);
  const workspaceRelative = path5.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  if (workspaceRelative.length === 0 || workspaceRelative === ".." || workspaceRelative.startsWith("../") || path5.isAbsolute(workspaceRelative)) {
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
  const extension = path5.extname(basename).toLowerCase();
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
import { createHash as createHash3 } from "node:crypto";
import fs6 from "node:fs";
import path6 from "node:path";
var JOURNAL = "session.jsonl";
function workspaceDataDir(pluginData, workspaceRoot) {
  if (!pluginData)
    return;
  const key = createHash3("sha256").update(path6.resolve(workspaceRoot)).digest("hex").slice(0, 32);
  return path6.join(pluginData, "workspaces", key);
}
function sessionDir(workspaceDir, sessionId) {
  if (!workspaceDir)
    return;
  const trimmed = sessionId?.trim() ?? "";
  const key = trimmed.length > 0 ? createHash3("sha256").update(trimmed).digest("hex").slice(0, 32) : "unattributed";
  return path6.join(workspaceDir, "sessions", key);
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
    journal = fs6.readFileSync(path6.join(dir, JOURNAL), "utf8");
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
    fs6.mkdirSync(dir, { recursive: true });
    fs6.appendFileSync(path6.join(dir, JOURNAL), events.map((event) => `${JSON.stringify(event)}
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
import path8 from "node:path";
import { fileURLToPath } from "node:url";

// ../agent-core/dist/hook-usage-log.js
import { randomUUID as randomUUID2 } from "node:crypto";
import fs7 from "node:fs";
import path7 from "node:path";
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
    request_id: `hook-${randomUUID2()}`,
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
    fs7.mkdirSync(path7.dirname(logPath), { recursive: true });
    fs7.appendFileSync(logPath, `${JSON.stringify(record)}
`, "utf8");
  } catch {}
}
function readPackageVersion(packageJsonPath) {
  try {
    const parsed = JSON.parse(fs7.readFileSync(packageJsonPath, "utf8"));
    if (typeof parsed === "object" && parsed !== null && "version" in parsed && typeof parsed.version === "string") {
      return parsed.version;
    }
  } catch {}
  return null;
}

// src/usage-log.ts
var cachedPluginVersion;
function pluginVersion() {
  if (cachedPluginVersion !== undefined)
    return cachedPluginVersion;
  cachedPluginVersion = readPackageVersion(path8.join(path8.dirname(fileURLToPath(import.meta.url)), "..", "package.json"));
  return cachedPluginVersion;
}
function appendHookUsage2(row, env = process.env) {
  if (!hookTelemetryEnabled(env) || row.trace.action === undefined)
    return;
  appendHookUsage({ ...row, host: "claude-code", packageVersion: pluginVersion() }, env);
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
var readTools = new Set(["Read"]);
var editTools = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);
var searchTools = new Set(["Grep", "Glob"]);
function context(event, text) {
  return {
    hookSpecificOutput: { hookEventName: event, additionalContext: text }
  };
}
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toolPath(toolInput) {
  if (!isRecord5(toolInput))
    return;
  const candidate = toolInput.file_path ?? toolInput.notebook_path;
  return typeof candidate === "string" ? candidate : undefined;
}
function bashCommand(toolInput) {
  if (!isRecord5(toolInput))
    return "";
  return typeof toolInput.command === "string" ? toolInput.command : "";
}
function linkedFileCount(index) {
  return Object.values(index.files).filter((symbols) => symbols.some((symbol) => symbol.implements.length > 0)).length;
}
function readFocus(toolInput) {
  if (!isRecord5(toolInput))
    return;
  const offset = typeof toolInput.offset === "number" ? toolInput.offset : undefined;
  const limit = typeof toolInput.limit === "number" ? toolInput.limit : undefined;
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
  const symbols = workspace.index().files[relativePath] ?? [];
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
    const update = editKnowledgeUpdate({
      relativePath,
      symbols,
      surface: "edit",
      focus,
      summarize: workspace.summarize
    });
    if (update)
      return emit(update, "edit_update_snippet");
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
    const symbols = workspace.index().files[target.relative] ?? [];
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
    const symbols = workspace.index().files[target.relative] ?? [];
    if (edited.has(absolute)) {
      if (state.shownEdit.has(target.relative))
        continue;
      const alreadyKnown = state.shownRead.has(target.relative) || isExplored(state, target.relative);
      const note = alreadyKnown ? editKnowledgeUpdate({
        relativePath: target.relative,
        symbols,
        surface: "edit",
        summarize: workspace.summarize
      }) : fileKnowledgeSnippet({
        relativePath: target.relative,
        symbols,
        surface: "edit",
        summarize: workspace.summarize
      });
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
    const index = workspace.index();
    const symbols = index.files[relative] ?? [];
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
    const snippet = alreadyKnown ? editKnowledgeUpdate({
      relativePath: relative,
      symbols,
      surface: "edit",
      summarize: workspace.summarize
    }) : fileKnowledgeSnippet({
      relativePath: relative,
      symbols,
      surface: "edit",
      summarize: workspace.summarize
    });
    if (snippet) {
      note = snippet;
    } else if (pathKind === "source" && owners.length === 0 && index.manifest !== "unreadable") {
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
function hasKibiPreCommitGate(workspaceRoot) {
  const resolved = spawnSync2("git", ["rev-parse", "--git-path", "hooks/pre-commit"], { cwd: workspaceRoot, encoding: "utf8", timeout: 2000 });
  const hookPath = resolved.status === 0 && resolved.stdout.trim().length > 0 ? path10.resolve(workspaceRoot, resolved.stdout.trim()) : path10.join(workspaceRoot, ".git", "hooks", "pre-commit");
  try {
    return /kibi[^\n]*\bcheck\b/.test(fs9.readFileSync(hookPath, "utf8"));
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
        if (workspace.telemetry && pathKind !== "kb") {
          trace.requirementIds = requirementIds(workspace.index().files[target.relative] ?? []);
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
  const pluginData = environment.pluginData ?? process.env.CLAUDE_PLUGIN_DATA ?? path10.join(os.tmpdir(), `kibi-claude-${process.getuid?.() ?? "user"}`);
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
  return output;
}
function dispatchHook(input, workspace, trace) {
  switch (input.event) {
    case "SessionStart":
      trace.action = "session_start";
      if (input.source === "compact" || input.source === "clear") {
        appendSessionEvents(workspace.stateDir, [{ kind: "context_reset" }]);
      }
      return context("SessionStart", sessionStartContext(linkedFileCount(workspace.index())));
    case "UserPromptSubmit":
      return userPromptSubmit(input, workspace, trace);
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
  const invokedPath = argv1 ? pathToFileURL(path10.resolve(argv1)).href : "";
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
  CONFIRM_FIRM_EDITS_ENV,
  editFocus2 as editFocus,
  readFocus,
  runHook
};
