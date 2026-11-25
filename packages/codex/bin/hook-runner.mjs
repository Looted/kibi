#!/usr/bin/env node

// src/hook-runner.ts
import path14 from "node:path";
import { fileURLToPath as fileURLToPath2, pathToFileURL } from "node:url";

// ../agent-core/dist/bash-command.js
import fs from "node:fs";
import path from "node:path";
var MAX_COMMAND_CHARS = 20000;
var MAX_CANDIDATES = 200;
var TOKEN_SEPARATOR = /[\s;|&<>()'"`,=[\]{}]/;
var PATH_LIKE = /^[\w@.~/+-]*[\w-]\.[A-Za-z0-9]{1,8}$|^[\w@.~+-]*\/[\w@.~/+-]*$/;
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
function shellToolCommand(toolName, toolInput) {
  if (toolName === undefined || !SHELL_TOOLS.has(toolName))
    return;
  const raw = toolInput !== null && typeof toolInput === "object" ? toolInput.command : undefined;
  const argv = Array.isArray(raw) ? raw.filter((part) => typeof part === "string") : undefined;
  const command = argv === undefined ? raw : shellScript(argv) ?? argv.join(" ");
  return typeof command === "string" ? command : undefined;
}
function shellToolEditPaths(toolName, toolInput, cwd) {
  const command = shellToolCommand(toolName, toolInput);
  return command === undefined ? [] : commandEditPaths(command, cwd);
}
function shellToolReadViews(toolName, toolInput, cwd) {
  const command = shellToolCommand(toolName, toolInput);
  if (command === undefined)
    return [];
  const edited = new Set(commandEditPaths(command, cwd));
  return commandReadViews(command, cwd).filter((view) => !edited.has(view.absolute));
}
var SEARCH_PROGRAMS = new Set(["grep", "egrep", "fgrep", "rg"]);
var WHOLE_FILE_PROGRAMS = new Set(["cat", "nl", "bat", "less", "more"]);
var GREP_VALUE_FLAGS = new Set([
  "-A",
  "-B",
  "-C",
  "-m",
  "-g",
  "-t",
  "-T",
  "-f",
  "--glob",
  "--type",
  "--max-count",
  "--context",
  "--after-context",
  "--before-context",
  "--include",
  "--exclude",
  "--exclude-dir"
]);
var SED_PRINT = /^(\d+)(?:,(\d+|\$))?p$/;
var DEFAULT_HEAD_LINES = 10;
function lineCount(args, index) {
  const arg = args[index];
  if (arg === "-n" || arg === "--lines") {
    const value = args[index + 1];
    return value === undefined ? undefined : { value, used: 2 };
  }
  const attached = /^(?:-n|--lines=)(\+?\d+)$/.exec(arg) ?? /^-(\d+)$/.exec(arg);
  return attached ? { value: attached[1], used: 1 } : undefined;
}
function readText(absolute) {
  try {
    return fs.readFileSync(absolute, "utf8");
  } catch {
    return;
  }
}
function fileLineCount(absolute) {
  const content = readText(absolute) ?? "";
  const lines = content.split(`
`).length;
  return content.endsWith(`
`) || content === "" ? lines - 1 : lines;
}
function readStage(words) {
  const [name, ...args] = words;
  const program = path.basename(String(name));
  if (program === "sed") {
    if (!args.includes("-n"))
      return;
    const rest = args.filter((arg) => arg !== "-n");
    const scriptIndex = rest.findIndex((arg) => !arg.startsWith("-"));
    if (scriptIndex === -1)
      return;
    const print = SED_PRINT.exec(unquote(rest[scriptIndex]));
    if (!print)
      return;
    const start = Number(print[1]);
    const endText = print[2] ?? print[1];
    return {
      operands: rest.slice(scriptIndex + 1).filter((arg) => !arg.startsWith("-")),
      range: (absolute) => ({
        start,
        end: endText === "$" ? fileLineCount(absolute) : Number(endText)
      }),
      recursive: false,
      whole: false
    };
  }
  if (program === "head" || program === "tail") {
    let count = String(DEFAULT_HEAD_LINES);
    const operands = [];
    for (let index = 0;index < args.length; index++) {
      const found = lineCount(args, index);
      if (found) {
        count = found.value;
        index += found.used - 1;
      } else if (!args[index].startsWith("-"))
        operands.push(args[index]);
    }
    const lines = Number(count.replace(/^\+/, ""));
    return {
      operands,
      range: (absolute) => {
        if (program === "head")
          return { start: 1, end: lines };
        const total = fileLineCount(absolute);
        return count.startsWith("+") ? { start: lines, end: total } : { start: Math.max(1, total - lines + 1), end: total };
      },
      recursive: false,
      whole: false
    };
  }
  if (SEARCH_PROGRAMS.has(program))
    return searchStage(program, args);
  if (WHOLE_FILE_PROGRAMS.has(program))
    return {
      operands: args.filter((arg) => !arg.startsWith("-")),
      recursive: false,
      whole: true
    };
  return;
}
function searchStage(program, args) {
  let pattern;
  let ignoreCase = false;
  let fixed = program === "fgrep";
  let basic = program === "grep";
  let word = false;
  let recursive = program === "rg";
  const operands = [];
  for (let index = 0;index < args.length; index++) {
    const arg = args[index];
    if (arg === "--") {
      for (const rest of args.slice(index + 1)) {
        if (pattern === undefined)
          pattern = unquote(rest);
        else
          operands.push(rest);
      }
      break;
    }
    if (arg === "-e" || arg === "--regexp") {
      pattern = unquote(String(args[++index]));
      continue;
    }
    if (GREP_VALUE_FLAGS.has(arg)) {
      index++;
      continue;
    }
    if (arg.startsWith("--")) {
      if (arg === "--ignore-case")
        ignoreCase = true;
      else if (arg === "--fixed-strings")
        fixed = true;
      else if (arg === "--extended-regexp" || arg === "--perl-regexp")
        basic = false;
      else if (arg === "--word-regexp")
        word = true;
      else if (arg === "--recursive")
        recursive = true;
      continue;
    }
    if (arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === "i")
          ignoreCase = true;
        else if (flag === "F")
          fixed = true;
        else if (flag === "E" || flag === "P")
          basic = false;
        else if (flag === "w")
          word = true;
        else if (flag === "r" || flag === "R")
          recursive = true;
      }
      continue;
    }
    if (pattern === undefined)
      pattern = unquote(arg);
    else
      operands.push(arg);
  }
  return {
    operands,
    ...pattern === undefined || pattern.length === 0 ? {} : { grep: { pattern, ignoreCase, fixed, basic: basic && !fixed, word } },
    recursive,
    whole: false
  };
}
function* pipelines(command) {
  const masked = maskQuoted(command);
  const separator = /&&|\|\||[;\n]/g;
  let start = 0;
  const pieces = [];
  for (const match of masked.matchAll(separator)) {
    pieces.push([start, match.index]);
    start = match.index + match[0].length;
  }
  pieces.push([start, masked.length]);
  for (const [from, to] of pieces) {
    const stages = [];
    let stageStart = from;
    const cut = (end) => {
      const words = [...masked.slice(stageStart, end).matchAll(/\S+/g)].map((word) => {
        const at = stageStart + word.index;
        return command.slice(at, at + word[0].length);
      });
      const plain = unbracketed(words);
      stages.push(plain.slice(Math.max(0, commandStart(plain))));
    };
    for (let index = from;index < to; index++) {
      if (masked[index] === "|") {
        cut(index);
        stageStart = index + 1;
      }
    }
    cut(to);
    yield stages;
  }
}
function commandReadViews(command, cwd) {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const views = new Map;
  const resolve = (word) => {
    const name = unquote(word);
    for (const base of bases) {
      const absolute = path.resolve(base, name);
      try {
        const stat = fs.statSync(absolute);
        if (stat.isFile() || stat.isDirectory())
          return { absolute, directory: stat.isDirectory() };
      } catch {}
    }
    return;
  };
  const add = (view) => {
    const known = views.get(view.absolute);
    if (!known || !known.focus && !known.grep)
      views.set(view.absolute, view);
  };
  const visit = (line, depth) => {
    for (const stages of pipelines(line)) {
      let source;
      for (const words of stages) {
        const script = shellScript(words);
        if (script !== undefined && depth < 2) {
          visit(unquote(script), depth + 1);
          continue;
        }
        const stage = readStage(words);
        if (!stage) {
          source = undefined;
          continue;
        }
        const operands = stage.operands.map(resolve).filter((target) => target !== undefined);
        if (stage.grep) {
          const targets = operands.length === 0 && stage.recursive ? [
            {
              absolute: path.resolve(bases.at(-1)),
              directory: true
            }
          ] : operands;
          for (const target of targets)
            if (!target.directory || stage.recursive)
              add({ ...target, grep: stage.grep });
          if (operands.length === 0 && source)
            add({ absolute: source, directory: false, grep: stage.grep });
          source = undefined;
          continue;
        }
        const files = operands.filter((target) => !target.directory);
        if (stage.range) {
          const targets = files.length === 0 && source ? [{ absolute: source, directory: false }] : files;
          for (const target of targets)
            add({ ...target, focus: [stage.range(target.absolute)] });
          source = undefined;
          continue;
        }
        for (const target of files)
          add(target);
        source = files.length === 1 ? files[0].absolute : undefined;
      }
    }
  };
  visit(scanned, 0);
  for (const absolute of commandFilePaths(scanned, cwd))
    if (!views.has(absolute))
      views.set(absolute, { absolute, directory: false });
  return [...views.values()];
}

// ../agent-core/dist/checkout-hooks.js
import { spawnSync } from "node:child_process";
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
  const result = spawnSync("git", args, {
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
import { createHash as createHash3 } from "node:crypto";
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
  const named = base[KIBI_WORKSPACE_ARGUMENT];
  if (typeof named === "string" && named.trim().length > 0)
    return;
  return { ...base, [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot };
}
function effectiveKbOperation(operation, payload) {
  const write = operation === "kb_record" ? "kb_upsert" : operation;
  return write === "kb_upsert" && payload.dryRun === true ? "kb_validate_upsert" : write;
}
var TOOL_NAME_KEYS = ["toolName", "tool_name", "name"];
function extractKbMcpToolCall(toolName, toolInput) {
  const input = isRecord(toolInput) ? toolInput : {};
  let name = canonicalKbToolName(toolName) ?? readString(input, TOOL_NAME_KEYS);
  if (!name?.startsWith("kb_")) {
    const nested = input.arguments ?? input.args;
    const nestedTool = isRecord(nested) ? readString(nested, TOOL_NAME_KEYS) : undefined;
    return nestedTool?.startsWith("kb_") ? {
      toolName: effectiveKbOperation(nestedTool, nested),
      impactCheckRun: false,
      sourceFiles: []
    } : undefined;
  }
  const payload = readRecord(input, ["arguments", "args"]) ?? input;
  name = effectiveKbOperation(name, payload);
  const sourceFiles = readStringArray(payload, ["sourceFiles", "source_files"]);
  return {
    toolName: name,
    impactCheckRun: name === "kb_check" && (readBoolean(payload, ["changed"]) === true || readBoolean(payload, [
      "includeImpactDiagnostics",
      "include_impact_diagnostics"
    ]) === true && readBoolean(payload, [
      "includeWorkingTreeDiff",
      "include_working_tree_diff"
    ]) === true) && sourceFiles.length > 0,
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
var patchFileHeader = /^\*\*\* (?:Update|Add|Delete) File: (.+)/;
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
function extractPatchTexts(toolInput) {
  const fields = isRecord2(toolInput) ? toolInput : {};
  return patchTextKeys.map((key) => fields[key]).filter((value) => typeof value === "string");
}
function extractEditedPaths(toolInput) {
  const paths = extractExplicitPathFields(toolInput);
  if (isRecord2(toolInput)) {
    for (const key of patchTextKeys) {
      const value = toolInput[key];
      if (typeof value === "string") {
        paths.push(...extractPatchFilePaths(value));
      }
    }
  }
  return [...new Set(paths)];
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
  const extension = path3.extname(basename).toLowerCase();
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
function readText2(filePath) {
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
  const symbolsText = readText2(symbolsPath);
  const coordinatesText = readText2(coordinatesPath);
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
    const text = readText2(shardPath);
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
    const text = readText2(path4.join(workspaceRoot, ".kb/requirements", name));
    if (text === undefined || !text.includes("supersedes"))
      continue;
    for (const link of readSummaryHead(workspaceRoot, id, false).links ?? [])
      if (link.type === "supersedes")
        edges.push({ from: id, to: link.target });
  }
  for (const name of list(RELATIONSHIPS_DIR, ".yaml")) {
    const text = readText2(path4.join(workspaceRoot, RELATIONSHIPS_DIR, name));
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
    const match = /^(id|title|status|semantic_text):(.+)/.exec(line);
    if (match)
      fields[match[1]] = unquote3(match[2]);
  }
  if (!fields.id || !fields.title)
    return;
  const statement = fields.semantic_text?.replace(/''/g, "'");
  return {
    id: fields.id,
    title: fields.title,
    ...fields.status ? { status: fields.status } : {},
    ...statement && !/^[>|]/.test(statement) ? { statement } : {}
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
var NEGATION = /\b(?:not|never|no|none|without|cannot|nor)\b|n't\b/i;
var MIN_RESTATED_WORDS = 3;
function ruleWords(text) {
  const found = [
    ...words(text),
    ...text.match(/\d+(?:[.,]\d+)?/g) ?? []
  ].filter((word) => !FILLER_WORDS.has(word) && !REQUEST_FILLER_WORDS.has(word));
  return new Set(found);
}
function restatedRequirement(workspaceRoot, sentence) {
  const asked = ruleWords(sentence);
  if (asked.size < MIN_RESTATED_WORDS)
    return;
  const negated = NEGATION.test(sentence);
  const directory = path5.join(workspaceRoot, REQUIREMENTS_DIR);
  let names;
  try {
    names = fs4.readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return;
  }
  if (names.length > MAX_SCANNED)
    return;
  for (const name of names.sort()) {
    const head = readHead(path5.join(directory, name));
    if (head === undefined || isClosed(head))
      continue;
    if (RETIRED_STATUS2.test(String(head.status)))
      continue;
    const title = ruleWords(head.title);
    const clauses = [
      head.title,
      ...(head.statement ?? "").split(/(?<=[.;!?])\s+/)
    ].filter((clause) => clause.trim() !== "");
    for (const clause of clauses) {
      if (NEGATION.test(clause) !== negated)
        continue;
      const known = new Set([...title, ...ruleWords(clause)]);
      if ([...asked].every((word) => known.has(word)))
        return head;
    }
  }
  return;
}

// ../agent-core/dist/snippets.js
import { createHash as createHash2 } from "node:crypto";
import fs5 from "node:fs";
import path6 from "node:path";
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
    tests: true,
    moreIds: true
  },
  {
    requirements: 3,
    facts: MAX_GROUNDING,
    whyChars: MAX_WHY_CHARS,
    tests: true,
    moreIds: true
  },
  {
    requirements: 2,
    facts: 1,
    whyChars: MAX_WHY_CHARS,
    tests: true,
    moreIds: true
  },
  {
    requirements: 2,
    facts: 1,
    whyChars: SHORT_WHY_CHARS,
    tests: true,
    moreIds: true
  },
  {
    requirements: 1,
    facts: 1,
    whyChars: SHORT_WHY_CHARS,
    tests: true,
    moreIds: true
  },
  {
    requirements: 1,
    facts: 1,
    whyChars: SHORT_WHY_CHARS,
    tests: false,
    moreIds: true
  },
  {
    requirements: 1,
    facts: 1,
    whyChars: TIGHT_WHY_CHARS,
    tests: false,
    moreIds: true
  },
  {
    requirements: 1,
    facts: 1,
    whyChars: TIGHT_WHY_CHARS,
    tests: false,
    moreIds: false
  }
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
      const rest = requirementIds.slice(layout.requirements);
      lines.push(layout.moreIds ? `- Also linked (${rest.length} more): ${rest.join(", ")}; kb_query({sourceFile:${jsonString(relativePath)}, type:"req"}) lists them` : `- +${rest.length} more requirements: kb_query({sourceFile:${jsonString(relativePath)}, type:"req"})`);
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
function editKnowledgeContext(input) {
  const snippets = [];
  for (const relativePath of new Set(input.relativePaths)) {
    if (snippets.length >= (input.maxFiles ?? 3))
      break;
    const symbols = input.symbolsFor(relativePath);
    const snippet = fileKnowledgeSnippet({
      relativePath,
      symbols,
      surface: "edit",
      focus: input.focusFor?.(relativePath),
      summarize: input.summarize,
      maxChars: input.maxChars
    });
    const text = snippet ?? input.noteFor?.(relativePath);
    if (!text)
      continue;
    const key = `${String(input.sessionId)}\x00edit\x00${relativePath}`;
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
  const marker = path6.join(stateDir, "shown-snippets", createHash2("sha256").update(key).digest("hex").slice(0, 32));
  try {
    fs5.mkdirSync(path6.dirname(marker), { recursive: true });
    fs5.writeFileSync(marker, "", { flag: "wx" });
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
  const target = path7.resolve(absolutePath);
  const relevant = [];
  for (const patch of patches) {
    const sections = parsePatchSections(patch);
    if (sections === undefined)
      return false;
    relevant.push(...base === undefined ? sections : sections.filter((section) => path7.resolve(base, section.path) === target));
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
function ruleMatch(prompt, workspaceRoot) {
  const sentences = requestSentences(prompt);
  for (const [index, sentence] of sentences.entries()) {
    if (sentence.endsWith("?") && (!REQUEST_QUESTION.test(sentence) || ASKS_TO_BE_TOLD.test(sentence)))
      continue;
    if (workspaceRoot !== undefined && restatedRequirement(workspaceRoot, sentence) !== undefined)
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
function statedRule(prompt, workspaceRoot) {
  return ruleMatch(prompt, workspaceRoot)?.phrase;
}
var REASON_MARKER = /\b(?:because|so that)\b/i;
var MAX_REASON_CHARS2 = 200;
function statedReason(prompt, workspaceRoot) {
  const match = prompt === undefined ? undefined : ruleMatch(prompt, workspaceRoot);
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
var RECORD_FOLLOW_UP_LINE = "kb_record returns every step left before kb_check passes (nextActions) and every approval only the person can give (approvalsNeeded) at once: do the steps in this change, and put all the approvals to the person in one question, not one per check result.";
function captureReminder(rulePhrase) {
  return rulePhrase === undefined ? [
    "Kibi: this session changed source files and recorded nothing in the knowledge base.",
    `A decision the person stated or this change made (a rule, a limit, a default, who may do what) is recorded with kb_record (statement, why, who said it and the code that implements it) before the work is reported done; when there was none, the final report says so in one line. ${RECORD_FOLLOW_UP_LINE}`
  ].join(`
`) : [
    `Kibi: the person's request said "${rulePhrase}", this session changed source files, and nothing was recorded in the knowledge base.`,
    `Record the rule behind "${rulePhrase}" with kb_record (statement, why, who said it and the code that implements it) before the work is reported done, or say in the final report why "${rulePhrase}" is not a rule. ${RECORD_FOLLOW_UP_LINE}`
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
    RECORD_FOLLOW_UP_LINE,
    "Facts, decisions and other modeling go through kb_upsert."
  ].join(`
`);
}
function firmEditNotice(where, requirements) {
  const shown = requirements.slice(0, 2).map((summary) => summary.title ? `${summary.id}: ${summary.title}` : summary.id);
  const more = requirements.length > shown.length ? ` (+${requirements.length - shown.length} more)` : "";
  const one = requirements.length === 1;
  return [
    `Kibi: this edit changes ${where}, which implements ${one ? "a firm requirement" : "firm requirements"}, a rule the person set: ${shown.join("; ")}${more}.`,
    `Unless the edit keeps ${one ? "that rule" : "those rules"}, ask the person before making it and name the rule; change the requirement with kb_upsert in this change only when they say so. After the edit, record your verdict for each edited symbol with kb_review_firm_edit ("keeps" or "changes"; CLI: kibi review-firm-edit). kibi check --staged blocks the commit until each has a current keeps receipt. A receipt is your judgment, not the person's approval.`
  ].join(`
`);
}
var UNATTRIBUTED = "unattributed";
var UNATTRIBUTED_IDLE_MS = 2 * 60 * 60 * 1000;
var STALE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
function sessionKey(session) {
  return createHash3("sha256").update(session.sessionId?.trim() || UNATTRIBUTED).digest("hex").slice(0, 32);
}
function guardRoot(session) {
  if (!session.stateDir)
    throw new Error;
  return path7.join(session.stateDir, "decision-guard");
}
function sessionPath(session, name) {
  return path7.join(guardRoot(session), sessionKey(session), name);
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
    return fs6.readdirSync(dir).map((name) => path7.join(dir, name));
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
    const files = [...markerFiles(path7.join(root, own)), ...hostFiles];
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
    const dir = path7.join(root, key);
    if (!(newestOf(markerFiles(dir)) >= now - STALE_SESSION_MS)) {
      removeQuietly(dir);
    }
  }
  return dropped;
}
function writeMarker(file, content) {
  fs6.mkdirSync(path7.dirname(file), { recursive: true });
  fs6.writeFileSync(file, content);
}
function touchMarker(file, flag) {
  fs6.mkdirSync(path7.dirname(file), { recursive: true });
  fs6.closeSync(fs6.openSync(file, flag));
}
function readMarker(session, name) {
  return JSON.parse(String(fs6.readFileSync(sessionPath(session, name))));
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
    return fs6.existsSync(sessionPath(session, flag));
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
function recordRequest(session, prompt, options = {}) {
  const { now = Date.now(), workspaceRoot } = typeof options === "number" ? { now: options } : options;
  startDecisionSession(session, "prompt", { now });
  const rule = statedRule(prompt, workspaceRoot);
  try {
    writeMarker(sessionPath(session, "request-words.json"), JSON.stringify(requestTopicWords(prompt)));
  } catch {}
  if (rule !== undefined) {
    markDecisionFlag(session, "rule-prompt");
    try {
      writeMarker(sessionPath(session, "rule-phrase"), rule);
      writeMarker(sessionPath(session, "rule-reason"), statedReason(prompt, workspaceRoot) ?? "");
    } catch {}
  }
  return rule;
}
function sessionRuleReason(session) {
  let reason = "";
  try {
    reason = String(fs6.readFileSync(sessionPath(session, "rule-reason")));
  } catch {}
  return reason || undefined;
}
function sessionRulePhrase(session) {
  let phrase = "";
  try {
    phrase = String(fs6.readFileSync(sessionPath(session, "rule-phrase")));
  } catch {}
  return phrase || undefined;
}
function claimRuleCaptureTemplate(session, editingSource = false) {
  const phrase = sessionRulePhrase(session);
  if (phrase === undefined || !(editingSource || hasDecisionFlag(session, "source-edited")) || hasDecisionFlag(session, "kb-recorded") || !claimDecisionFlag(session, "capture-template"))
    return;
  return ruleCaptureTemplate(phrase, sessionRuleReason(session));
}
function requestWords(session) {
  try {
    return stringList(readMarker(session, "request-words.json"));
  } catch {
    return [];
  }
}
function claimCaptureReminder(session) {
  return hasDecisionFlag(session, "source-edited") && !hasDecisionFlag(session, "kb-recorded") && claimDecisionFlag(session, "capture-asked");
}
var SIGNOFF_LATEST_JSON = path7.join(".kb", "briefs", "signoff", "latest.json");
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
  const shown = mtimeMs(() => path7.join(workspaceRoot, SIGNOFF_LATEST_JSON));
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

// ../agent-core/dist/hook-input.js
function isRecord3(value) {
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
  if (!isRecord3(input)) {
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

// ../agent-core/dist/hook-usage-log.js
import { randomUUID as randomUUID4 } from "node:crypto";
import fs9 from "node:fs";
import path10 from "node:path";

// ../agent-core/dist/telemetry-signals.js
import { createHash as createHash4, randomUUID as randomUUID2 } from "node:crypto";
import fs7 from "node:fs";
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
function isRecord4(value) {
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
  if (/^skill$/i.test(String(toolName).trim()) && isRecord4(toolInput)) {
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
  return isRecord4(entry) && typeof entry.t === "number" && now - entry.t <= windowMs;
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
import { createHash as createHash5, randomUUID as randomUUID3 } from "node:crypto";
import fs8 from "node:fs";
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
    return fs8.realpathSync(directory);
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
      const manifest = JSON.parse(fs8.readFileSync(path9.join(current, "package.json"), "utf8"));
      if (manifest.name === KIBI_REPOSITORY_PACKAGE && fs8.existsSync(path9.join(current, "packages", "agent-core"))) {
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
    const parsed = JSON.parse(String(fs8.readFileSync(path9.join(telemetryDirectory(env), CONFIG_FILE))));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function writeTelemetryConfig(config, env) {
  const directory = telemetryDirectory(env);
  fs8.mkdirSync(directory, { recursive: true });
  fs8.writeFileSync(path9.join(directory, CONFIG_FILE), `${JSON.stringify(config, null, 2)}
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
    const parsed = JSON.parse(String(fs8.readFileSync(sessionMarkersPath(env))));
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
    fs8.mkdirSync(path9.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${randomUUID3()}.tmp`;
    fs8.writeFileSync(temporary, JSON.stringify(Object.fromEntries(kept)));
    fs8.renameSync(temporary, file);
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
    fs8.mkdirSync(path9.dirname(file), { recursive: true });
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
    const file = path9.join(directory, name);
    try {
      if (now - fs8.statSync(file).mtimeMs < STALE_CLAIM_MS)
        continue;
      const reclaimed = `${file}.${randomUUID3()}${SENDING_SUFFIX}`;
      fs8.renameSync(file, reclaimed);
      claimed.push(reclaimed);
    } catch {}
  }
  const queue = path9.join(directory, QUEUE_FILE);
  const target = path9.join(directory, `${QUEUE_FILE}.${process.pid}.${randomUUID3()}${SENDING_SUFFIX}`);
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
    const logPath = path10.join(row.workspaceRoot, ".kb", "usage.log");
    fs9.mkdirSync(path10.dirname(logPath), { recursive: true });
    fs9.appendFileSync(logPath, `${JSON.stringify(record)}
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
    const parsed = JSON.parse(String(fs9.readFileSync(packageJsonPath)));
    const version = parsed.version;
    if (typeof version === "string")
      return version;
  } catch {}
  return null;
}

// ../agent-core/dist/read-context.js
import { createHash as createHash6 } from "node:crypto";
import fs10 from "node:fs";
import path11 from "node:path";
var MAX_ROWS_PER_EVENT = 3;
var MAX_WHOLE_FILE_ROWS = 5;
var MAX_EVENT_CHARS = 700;
var MAX_WHOLE_FILE_EVENT_CHARS = 1100;
var MAX_SESSION_ROWS = 10;
var MAX_SESSION_CHARS = 2300;
var MAX_SEARCH_REQUIREMENTS = 6;
var MAX_SEARCH_FILES = 300;
var MAX_SEARCH_FILE_BYTES = 1024 * 1024;
var MAX_TITLE_SYMBOL = 60;
var MAX_BUSY_LINE = 600;
var HEADER = "Kibi requirements for the code in view:";
var HINT = `kb_query({id:"<id>", includeBody:true}) gives a requirement's full text and why it exists.`;
function truncate2(text, limit) {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}
function isCurrent(summarize, id) {
  const summary = summarize(id);
  return !isRetiredStatus(summary.status) && summary.supersededBy === undefined;
}
function isFirm(summarize, id) {
  return summarize(id).firmness === "firm";
}
function matchedSymbols(symbols, lines) {
  return focusedSymbols(symbols, lines.map((line) => ({ start: line, end: line }))).map((symbol) => ({
    symbol,
    count: lines.filter((line) => line >= Number(symbol.line) && line <= Number(symbol.endLine ?? symbol.line)).length
  })).sort((left, right) => right.count - left.count);
}
function rankedCandidates(view, summarize) {
  const ordered = view.matches !== undefined ? matchedSymbols(view.symbols, view.matches).map(({ symbol, count }) => ({
    symbol,
    weight: count
  })) : focusedSymbols(view.symbols, view.focus).map((symbol, index) => ({
    symbol,
    weight: -index
  }));
  const best = new Map;
  for (const { symbol, weight } of ordered) {
    for (const id of symbol.implements) {
      if (!isCurrent(summarize, id))
        continue;
      if (best.has(id))
        continue;
      best.set(id, {
        id,
        symbol: symbol.title,
        relativePath: view.relativePath,
        firmFocus: isFirm(summarize, id),
        weight
      });
    }
  }
  return [...best.values()].sort((left, right) => right.weight - left.weight || Number(right.firmFocus) - Number(left.firmFocus) || left.id.localeCompare(right.id)).map(({ weight: _weight, ...candidate }) => candidate);
}
function wholeFileCandidates(view, summarize) {
  const symbolsOf = new Map;
  for (const symbol of view.symbols)
    for (const id of symbol.implements) {
      if (!isCurrent(summarize, id))
        continue;
      symbolsOf.set(id, [...symbolsOf.get(id) ?? [], symbol.title]);
    }
  return [...symbolsOf.entries()].sort(([leftId, left], [rightId, right]) => right.length - left.length || Number(isFirm(summarize, rightId)) - Number(isFirm(summarize, leftId)) || leftId.localeCompare(rightId)).map(([id, symbols]) => ({
    id,
    symbol: symbols[0],
    relativePath: view.relativePath,
    firmFocus: false
  }));
}
function ledgerFile(stateDir, sessionKey) {
  const key = createHash6("sha256").update(String(sessionKey)).digest("hex").slice(0, 32);
  return path11.join(stateDir, "read-rows", `${key}.jsonl`);
}
function readLedger(stateDir, sessionKey) {
  const total = { rows: 0, chars: 0 };
  if (!stateDir)
    return total;
  let text;
  try {
    text = fs10.readFileSync(ledgerFile(stateDir, sessionKey), "utf8");
  } catch {
    return total;
  }
  for (const line of text.split(`
`)) {
    try {
      const entry = JSON.parse(line);
      total.rows += Number(entry.rows) || 0;
      total.chars += Number(entry.chars) || 0;
    } catch {}
  }
  return total;
}
function appendLedger(stateDir, sessionKey, entry) {
  if (!stateDir)
    return;
  const file = ledgerFile(stateDir, sessionKey);
  try {
    fs10.mkdirSync(path11.dirname(file), { recursive: true });
    fs10.appendFileSync(file, `${JSON.stringify(entry)}
`);
  } catch {}
}
function slotKey(sessionKey, ...parts) {
  return [String(sessionKey), "read-row", ...parts].join("\x00");
}
function slotTaken(stateDir, key) {
  if (!stateDir)
    return false;
  const marker = path11.join(stateDir, "shown-snippets", createHash6("sha256").update(key).digest("hex").slice(0, 32));
  return fs10.existsSync(marker);
}
function rowText(candidate, summarize, withPath) {
  const where = withPath ? `${truncate2(candidate.symbol, MAX_TITLE_SYMBOL)} (${candidate.relativePath})` : truncate2(candidate.symbol, MAX_TITLE_SYMBOL);
  return `- ${describeEntity(summarize(candidate.id))} — ${where}`;
}
function busyLine(view, ids) {
  const line = `- ${view.relativePath} implements ${ids.length} requirements: ${ids.join(", ")}; reading a line range narrows them to the code in view.`;
  return truncate2(line, MAX_BUSY_LINE);
}
function readContext(input) {
  const { summarize, stateDir, sessionKey } = input;
  const alreadyShown = input.alreadyShown ?? new Set;
  const ledger = readLedger(stateDir, sessionKey);
  if (ledger.rows >= MAX_SESSION_ROWS || ledger.chars >= MAX_SESSION_CHARS)
    return;
  const search = input.views.filter((view) => view.matches !== undefined);
  const reads = input.views.filter((view) => view.matches === undefined);
  const candidates = [];
  const busy = [];
  let wholeFile = false;
  if (search.length > 0) {
    const ranked = search.flatMap((view) => rankedCandidates(view, summarize).map((candidate, rank) => ({
      candidate,
      count: matchedSymbols(view.symbols, view.matches ?? []).find((entry) => entry.symbol.implements.includes(candidate.id))?.count ?? 0,
      rank
    }))).sort((left, right) => right.count - left.count || left.rank - right.rank);
    const distinct = new Set(ranked.map((entry) => entry.candidate.id));
    if (distinct.size <= MAX_SEARCH_REQUIREMENTS)
      candidates.push(...ranked.map((entry) => entry.candidate));
  }
  for (const view of reads) {
    if (view.focus !== undefined) {
      candidates.push(...rankedCandidates(view, summarize));
      continue;
    }
    const all = wholeFileCandidates(view, summarize);
    if (all.length <= MAX_WHOLE_FILE_ROWS) {
      wholeFile = wholeFile || all.length > 0;
      candidates.push(...all);
    } else
      busy.push({ view, ids: all.map((candidate) => candidate.id) });
  }
  const perEvent = wholeFile && search.length === 0 && !reads.some((view) => view.focus) ? MAX_WHOLE_FILE_ROWS : MAX_ROWS_PER_EVENT;
  const eventChars = perEvent === MAX_WHOLE_FILE_ROWS ? MAX_WHOLE_FILE_EVENT_CHARS : MAX_EVENT_CHARS;
  const hintKey = slotKey(sessionKey, "hint");
  const hint = slotTaken(stateDir, hintKey) ? undefined : HINT;
  const withPath = new Set(input.views.map((view) => view.relativePath)).size > 1;
  const lines = [HEADER];
  const ids = [];
  const paths = new Set;
  const seen = new Set;
  const fixed = (extra) => lines.join(`
`).length + extra;
  let rows = 0;
  for (const candidate of candidates) {
    if (rows >= perEvent || ledger.rows + rows >= MAX_SESSION_ROWS)
      break;
    if (seen.has(candidate.id))
      continue;
    seen.add(candidate.id);
    if (alreadyShown.has(candidate.id) && !candidate.firmFocus)
      continue;
    const row = rowText(candidate, summarize, withPath);
    const length = fixed(row.length + 1);
    if (length > eventChars || ledger.chars + length > MAX_SESSION_CHARS)
      continue;
    if (!claimSnippetSlot(stateDir, slotKey(sessionKey, candidate.id)))
      continue;
    lines.push(row);
    ids.push(candidate.id);
    paths.add(candidate.relativePath);
    rows++;
  }
  for (const { view, ids: busyIds } of busy) {
    if (ledger.rows + rows >= MAX_SESSION_ROWS)
      break;
    const line = busyLine(view, busyIds);
    const length = fixed(line.length + 1);
    if (length > MAX_WHOLE_FILE_EVENT_CHARS || ledger.chars + length > MAX_SESSION_CHARS)
      continue;
    if (!claimSnippetSlot(stateDir, slotKey(sessionKey, "busy", view.relativePath)))
      continue;
    lines.push(line);
    paths.add(view.relativePath);
    rows++;
  }
  if (rows === 0)
    return;
  const withHint = fixed((hint?.length ?? 0) + 1);
  if (hint && withHint <= eventChars && ledger.chars + withHint <= MAX_SESSION_CHARS && claimSnippetSlot(stateDir, hintKey))
    lines.push(hint);
  const text = lines.join(`
`);
  appendLedger(stateDir, sessionKey, { rows, chars: text.length });
  return { text, ids, paths: [...paths] };
}
function grepRegExp(grep) {
  const flags = grep.ignoreCase ? "i" : "";
  const literal = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let source;
  if (grep.fixed)
    source = literal(grep.pattern);
  else if (grep.basic) {
    source = "";
    for (let index = 0;index < grep.pattern.length; index++) {
      const char = grep.pattern[index];
      const next = grep.pattern[index + 1];
      if (char === "\\" && next !== undefined && "|()+?{}".includes(next)) {
        source += next;
        index++;
      } else if (char === "\\" && next !== undefined) {
        source += `\\${next}`;
        index++;
      } else if ("|()+?{}".includes(char))
        source += `\\${char}`;
      else
        source += char;
    }
  } else
    source = grep.pattern;
  if (grep.word)
    source = `\\b(?:${source})\\b`;
  try {
    return new RegExp(source, flags);
  } catch {
    return new RegExp(literal(grep.pattern), flags);
  }
}
function matchingLines(absolute, grep) {
  const pattern = grepRegExp(grep);
  const content = readText(absolute);
  if (content === undefined || content.length > MAX_SEARCH_FILE_BYTES)
    return [];
  const lines = [];
  for (const [index, line] of content.split(`
`).entries())
    if (pattern.test(line))
      lines.push(index + 1);
  return lines;
}
function linkedFilesUnder(files, relativeDirectory) {
  const prefix = relativeDirectory === "" ? "" : `${relativeDirectory}/`;
  return Object.keys(files).filter((file) => file.startsWith(prefix) && implementedRequirementIds(files[file] ?? []).length > 0).sort().slice(0, MAX_SEARCH_FILES);
}
function relativeTo(root, absolute) {
  const relative = path11.relative(root, absolute).split(path11.sep).join("/");
  if (relative.startsWith("..") || path11.isAbsolute(relative))
    return;
  return relative;
}
function resolveReadViews(reads, input) {
  const views = new Map;
  for (const read of reads) {
    const relative = relativeTo(input.workspaceRoot, read.absolute);
    if (relative === undefined)
      continue;
    if (read.grep) {
      const targets = read.directory ? linkedFilesUnder(input.files, relative) : [relative];
      for (const file of targets) {
        if (!input.isSource(file) || !(input.admits?.(file) ?? true))
          continue;
        const symbols = input.files[file] ?? [];
        if (implementedRequirementIds(symbols).length === 0)
          continue;
        const matches = matchingLines(path11.join(input.workspaceRoot, file), read.grep);
        if (matches.length === 0)
          continue;
        views.set(file, { relativePath: file, symbols, matches });
      }
      continue;
    }
    if (read.directory || !input.isSource(relative))
      continue;
    const symbols = input.files[relative] ?? [];
    if (implementedRequirementIds(symbols).length === 0)
      continue;
    if (views.has(relative))
      continue;
    views.set(relative, {
      relativePath: relative,
      symbols,
      ...read.focus ? { focus: read.focus } : {}
    });
  }
  return [...views.values()];
}
function hookReadRows(reads, input) {
  const views = resolveReadViews(reads, input);
  if (views.length === 0)
    return;
  const alreadyShown = new Set(input.shownIds ?? []);
  for (const view of views)
    if (input.shownPaths?.has(view.relativePath) || slotTaken(input.stateDir, `${String(input.sessionKey)}\x00edit\x00${view.relativePath}`))
      for (const id of implementedRequirementIds(view.symbols))
        alreadyShown.add(id);
  return readContext({
    views,
    summarize: input.summarize,
    stateDir: input.stateDir,
    sessionKey: input.sessionKey,
    alreadyShown
  });
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

// ../agent-core/dist/workspace-optin.js
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
function resolveKibiWorkspace(startDir, env = process.env) {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      const root = path12.resolve(value);
      return { root, optedIn: hasKibiManifest(root) };
    }
  }
  const start = path12.resolve(startDir?.trim() ? startDir : process.cwd());
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

// src/hook-state.ts
import { createHash as createHash7, randomUUID as randomUUID5 } from "node:crypto";
import fs12 from "node:fs";
import os2 from "node:os";
import path13 from "node:path";
var stateFileName = "hook-state.json";
var journalFileName = "hook-state.events.jsonl";
var maxDirtyPaths = 50;
var workspaceStateRoot = "workspaces";
function resolvePluginDataDir(explicit, env = process.env) {
  return explicit || env.PLUGIN_DATA?.trim() || env.CLAUDE_PLUGIN_DATA?.trim() || path13.join(os2.tmpdir(), `kibi-codex-${process.getuid?.() ?? "user"}`);
}
function resolveWorkspaceStateDir(pluginData, workspaceRoot) {
  if (!pluginData) {
    return;
  }
  const workspaceKey = createHash7("sha256").update(path13.resolve(workspaceRoot)).digest("hex");
  return path13.join(pluginData, workspaceStateRoot, workspaceKey);
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
  return path13.join(pluginData, stateFileName);
}
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeDirtyPath(dirtyPath) {
  return dirtyPath.trim().replaceAll("\\", "/");
}
function uniqueTempPath(pluginData) {
  return path13.join(pluginData, `${stateFileName}.${process.pid}.${Date.now()}.${randomUUID5()}.tmp`);
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
  return path13.join(pluginData, journalFileName);
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
    contents = fs12.readFileSync(journalPath(pluginData), "utf8");
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
  fs12.mkdirSync(pluginData, { recursive: true });
  fs12.appendFileSync(journalPath(pluginData), `${JSON.stringify(event)}
`, "utf8");
}
function loadHookState(pluginData) {
  if (!pluginData) {
    return emptyHookState();
  }
  try {
    return readJournal(pluginData, coerceHookState(JSON.parse(fs12.readFileSync(statePath(pluginData), "utf8"))));
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
  fs12.mkdirSync(pluginData, { recursive: true });
  const tempPath = uniqueTempPath(pluginData);
  fs12.writeFileSync(tempPath, `${JSON.stringify(boundedState)}
`);
  fs12.renameSync(tempPath, statePath(pluginData));
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

// src/messages.ts
var DIRECT_KB_EDIT_WARNING = "Avoid direct edits to .kb/. Use Kibi MCP tools for KB discovery and mutations so project memory stays valid.";
var CODEX_SESSION_NOTE = "Workflow guidance: the kibi-usage skill (kb_skills with action load, or `npx --no-install kibi skills load kibi-usage`).";
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
function postEditImpactNote(sourcePaths) {
  const sourceFiles = JSON.stringify(sourcePaths.slice(0, 10));
  return [
    `Kibi impact review: run kb_check({changed:true, sourceFiles:${sourceFiles}}) while this edit is fresh; it gives the commit gate's verdict.`,
    "Check whether the linked requirements, scenarios and tests still cover the changed behavior."
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
    `Run kb_check({changed:true, sourceFiles:${sourceFiles}}) before finishing; findings with blocks:"commit" stop the commit.`,
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
function shellReadRows(workspaceRoot, stateDir, input, trace) {
  const reads = shellToolReadViews(input.toolName, input.toolInput, input.cwd ?? workspaceRoot);
  if (reads.length === 0)
    return;
  const rows = hookReadRows(reads, {
    workspaceRoot,
    files: loadKnowledgeIndex(workspaceRoot, stateDir).files,
    isSource: (relativePath) => classifyPath(relativePath) === "source",
    summarize: createEntitySummarizer(workspaceRoot),
    stateDir,
    sessionKey: input.sessionId
  });
  if (!rows)
    return;
  trace.action = "read_snippet";
  trace.requirementIds = rows.ids;
  return rows.text;
}
function shellEditedPaths(workspaceRoot, input) {
  return shellToolEditPaths(input.toolName, input.toolInput, input.cwd ?? workspaceRoot).map((absolute) => canonicalizeWorkspacePath(workspaceRoot, {
    eventCwd: input.cwd,
    rawPath: absolute
  })?.workspaceRelative).filter((relative) => relative !== undefined);
}
function editTargets(workspaceRoot, input) {
  return extractEditedPaths(input.toolInput).map((rawPath) => canonicalizeWorkspacePath(workspaceRoot, {
    eventCwd: input.cwd,
    rawPath
  })).filter((target) => target !== undefined).map((target) => ({
    relative: target.workspaceRelative,
    absolute: target.absolute,
    base: input.cwd ?? workspaceRoot
  }));
}
function preEditContext(workspaceRoot, stateDir, input, env, trace = {}) {
  const targets = editTargets(workspaceRoot, input);
  const first = targets[0];
  if (first === undefined)
    return;
  const index = loadKnowledgeIndex(workspaceRoot, stateDir);
  trace.pathKind = classifyPath(first.relative);
  trace.requirementIds = implementedRequirementIds(index.files[first.relative] ?? []);
  const summarize = createEntitySummarizer(workspaceRoot);
  const session = { stateDir, sessionId: input.sessionId };
  const words = requestWords(session);
  const notice = firmNotice(workspaceRoot, targets, index.files, summarize, session, input, env);
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
function shellFirmNotice(workspaceRoot, stateDir, input, env) {
  const base = input.cwd ?? workspaceRoot;
  const targets = shellToolEditPaths(input.toolName, input.toolInput, base).map((rawPath) => canonicalizeWorkspacePath(workspaceRoot, {
    eventCwd: input.cwd,
    rawPath
  })).filter((target) => target !== undefined).map((target) => ({
    relative: target.workspaceRelative,
    absolute: target.absolute,
    base
  }));
  if (targets.length === 0)
    return;
  return firmNotice(workspaceRoot, targets, loadKnowledgeIndex(workspaceRoot, stateDir).files, createEntitySummarizer(workspaceRoot), { stateDir, sessionId: input.sessionId }, input, env);
}
function firmNotice(workspaceRoot, targets, files, summarize, session, input, env) {
  if (!confirmFirmEdits(env))
    return;
  const settled = settledFirmRequirements(session);
  for (const target of targets) {
    const focus = editFocus(target.absolute, input.toolInput);
    const { ids, symbol } = firmRequirementsTouched({
      symbols: files[target.relative] ?? [],
      focus,
      wholeFile: focus === undefined,
      absolutePath: target.absolute,
      summarize,
      confirmed: settled,
      commentOnly: removesOnlyDeadImplementsComments(target.absolute, input.toolInput, target.base)
    });
    if (ids.length === 0)
      continue;
    settleFirmRequirements(session, ids);
    return firmEditNotice(symbol ? `${symbol.title} in ${target.relative}` : target.relative, ids.map(summarize));
  }
  return;
}
function packageVersion() {
  return readPackageVersion(path14.join(path14.dirname(fileURLToPath2(import.meta.url)), "..", "package.json"));
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
function stopReminder(reason, stopHookActive) {
  return stopHookActive ? { continue: true, systemMessage: reason } : { continue: true, decision: "block", reason };
}
function postEditContext(stateDir, sessionId, sourcePaths, captureTemplate) {
  const fresh = sourcePaths.filter((sourcePath) => claimSnippetSlot(stateDir, `${sessionId ?? ""}\x00post-edit\x00${sourcePath}`));
  const notes = [
    ...fresh.length > 0 ? [postEditImpactNote(fresh)] : [],
    ...captureTemplate === undefined ? [] : [captureTemplate]
  ];
  if (notes.length === 0)
    return;
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: notes.join(`

`)
    }
  };
}
async function runHook(rawInput, environment = {}) {
  const startedAt = new Date;
  const input = parseHookInput(rawInput);
  const env = environment.env ?? process.env;
  const workspace = resolveKibiWorkspace(input.cwd ?? process.cwd());
  if (!workspace.optedIn) {
    return defaultResult();
  }
  const stateDir = resolveWorkspaceStateDir(resolvePluginDataDir(environment.pluginData, env), workspace.root);
  const trace = {};
  try {
    switch (input.event) {
      case "SessionStart": {
        trace.action = "session_start";
        startDecisionSession({ stateDir, sessionId: input.sessionId }, "startup");
        return {
          continue: true,
          hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: sessionBriefWith([
              CODEX_SESSION_NOTE,
              missingHooksNote(workspace.root) ?? ""
            ])
          }
        };
      }
      case "UserPromptSubmit": {
        const rule = recordRequest({ stateDir, sessionId: input.sessionId }, input.prompt ?? "", { workspaceRoot: workspace.root });
        trace.action = rule === undefined ? "prompt_silent" : "prompt_rule_note";
        if (rule === undefined)
          return defaultResult();
        return {
          continue: true,
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: rulePromptNote(rule, statedReason(input.prompt, workspace.root))
          }
        };
      }
      case "PreToolUse": {
        if (isKibiMcpToolName(input.toolName)) {
          const stamped = stampKibiWorkspace(input.toolName, input.toolInput, workspace.root);
          return stamped === undefined ? defaultResult() : {
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
          trace.action = "kb_direct_note";
          trace.pathKind = "kb";
          return { continue: true, systemMessage: DIRECT_KB_EDIT_WARNING };
        }
        let context;
        try {
          context = isKnownEditTool(input.toolName) ? preEditContext(workspace.root, stateDir, input, env, trace) : shellFirmNotice(workspace.root, stateDir, input, env) ?? shellReadRows(workspace.root, stateDir, input, trace);
        } catch {}
        if (isKnownEditTool(input.toolName) && trace.pathKind !== undefined) {
          trace.action = context ? "edit_snippet" : "edit_silent";
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
        const kbToolCall = extractKbMcpToolCall(input.toolName, input.toolInput);
        if (kbToolCall) {
          recordKbMcpTool(stateDir, kbToolCall.toolName, {
            impactCheckRun: kbToolCall.impactCheckRun,
            sourceFiles: kbToolCall.sourceFiles
          });
        }
        const shellEdits = shellEditedPaths(workspace.root, input);
        const dirtyPaths = [
          ...editTargets(workspace.root, input).map((target) => target.relative),
          ...shellEdits
        ].filter(isMeaningfulTrackedPath2);
        if (dirtyPaths.length > 0) {
          addDirtyPaths(stateDir, dirtyPaths);
        }
        const session = { stateDir, sessionId: input.sessionId };
        if ((isKnownEditTool(input.toolName) || shellEdits.length > 0) && dirtyPaths.some(isSourceImpactRelevantPath2)) {
          markDecisionFlag(session, "source-edited");
        }
        const kbOperation = kbToolCall ? kbToolCall.toolName : kbUsageTrace(input.toolName, input.toolInput)?.kbOperation;
        if (kbOperation === "kb_upsert") {
          markDecisionFlag(session, "kb-recorded");
          if (isRequirementUpsert(input.toolInput)) {
            markDecisionFlag(session, "requirement-recorded");
          }
        }
        if (isKnownEditTool(input.toolName)) {
          const note = postEditContext(stateDir, input.sessionId, dirtyPaths.filter(isSourceImpactRelevantPath2), dirtyPaths.some(isSourceImpactRelevantPath2) ? claimRuleCaptureTemplate(session) : undefined);
          if (note)
            return note;
        }
        return defaultResult();
      }
      case "Stop": {
        const state = loadHookState(stateDir);
        const uncheckedSourcePaths = state.dirtyPaths.filter(isSourceImpactRelevantPath2).filter((sourcePath) => !state.impactCheckedPaths.includes(sourcePath));
        const session = { stateDir, sessionId: input.sessionId };
        if (!input.stopHookActive && claimCaptureReminder(session)) {
          const reason = [
            captureReminder(sessionRulePhrase(session)),
            ...uncheckedSourcePaths.length > 0 ? [impactCheckReminder(uncheckedSourcePaths)] : []
          ].join(`
`);
          clearDirtyPaths(stateDir);
          trace.action = "stop_capture_reminder";
          return { continue: true, decision: "block", reason };
        }
        if (!input.stopHookActive && claimSignoffReminder(session, workspace.root)) {
          trace.action = "stop_signoff_reminder";
          return {
            continue: true,
            decision: "block",
            reason: signoffReminder()
          };
        }
        if (uncheckedSourcePaths.length > 0) {
          clearDirtyPaths(stateDir);
          trace.action = "stop_reminder";
          return stopReminder(impactCheckReminder(uncheckedSourcePaths), input.stopHookActive);
        }
        const freshnessPaths = state.dirtyPaths.filter((dirtyPath) => !isSourceImpactRelevantPath2(dirtyPath));
        if (freshnessPaths.length > 0) {
          clearDirtyPaths(stateDir);
          trace.action = "stop_freshness_reminder";
          return stopReminder(freshnessReminder(freshnessPaths), input.stopHookActive);
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
    appendHookUsage({
      host: "codex",
      packageVersion: packageVersion(),
      workspaceRoot: workspace.root,
      event: input.event,
      sessionId: input.sessionId,
      hostTool: input.toolName,
      trace,
      startedAt
    }, env);
    await finishHookTelemetry({
      event: input.event,
      workspaceRoot: workspace.root,
      sessionId: input.sessionId
    }, env);
  }
}
async function main() {
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}
`);
}
function isInvokedAsCli(argv1, moduleUrl) {
  const invokedPath = argv1 ? pathToFileURL(path14.resolve(argv1)).href : "";
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
var hookRunnerPath = fileURLToPath2(import.meta.url);
export {
  hookRunnerPath,
  isInvokedAsCli,
  main,
  runHook,
  runHookCli,
  runHookCliIfMain
};
