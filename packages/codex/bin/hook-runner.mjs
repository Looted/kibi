#!/usr/bin/env node

// src/hook-runner.ts
import path3 from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// src/hook-input.ts
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
function parseHookInput(input) {
  if (!isRecord(input)) {
    return { event: "" };
  }
  const event = readString(input, ["event", "hook_event", "hookEvent", "name"]) ?? "";
  const cwd = readString(input, [
    "cwd",
    "current_working_directory",
    "workspace"
  ]);
  const toolName = readString(input, ["toolName", "tool_name", "tool"]);
  const toolInput = input.toolInput ?? input.tool_input ?? input.input;
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
  if (trimmed.length === 0) {
    return {};
  }
  return JSON.parse(trimmed);
}

// src/hook-state.ts
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
var stateFileName = "hook-state.json";
var journalFileName = "hook-state.events.jsonl";
var maxDirtyPaths = 50;
var workspaceStateRoot = "workspaces";
function resolveWorkspaceStateDir(pluginData, workspaceRoot) {
  if (!pluginData) {
    return;
  }
  const workspaceKey = createHash("sha256").update(path.resolve(workspaceRoot)).digest("hex");
  return path.join(pluginData, workspaceStateRoot, workspaceKey);
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
  return path.join(pluginData, stateFileName);
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeDirtyPath(dirtyPath) {
  return dirtyPath.trim().replaceAll("\\", "/");
}
function uniqueTempPath(pluginData) {
  return path.join(pluginData, `${stateFileName}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`);
}
function mergeDirtyPaths(existingPaths, dirtyPaths) {
  const merged = [...existingPaths, ...dirtyPaths].map(normalizeDirtyPath).filter((dirtyPath) => dirtyPath.length > 0);
  return {
    ...emptyHookState(),
    dirtyPaths: [...new Set(merged)].slice(-maxDirtyPaths)
  };
}
function coerceHookState(value) {
  if (!isRecord2(value) || !Array.isArray(value.dirtyPaths)) {
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
  return path.join(pluginData, journalFileName);
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
    contents = fs.readFileSync(journalPath(pluginData), "utf8");
  } catch {
    return initialState;
  }
  return contents.split(`
`).reduce((state, line) => {
    if (line.trim().length === 0)
      return state;
    try {
      const value = JSON.parse(line);
      if (!isRecord2(value) || typeof value.kind !== "string")
        return state;
      if (value.kind === "clear")
        return applyJournalEvent(state, { kind: "clear" });
      if (value.kind === "replace" && isRecord2(value.state)) {
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
  fs.mkdirSync(pluginData, { recursive: true });
  fs.appendFileSync(journalPath(pluginData), `${JSON.stringify(event)}
`, "utf8");
}
function loadHookState(pluginData) {
  if (!pluginData) {
    return emptyHookState();
  }
  try {
    return readJournal(pluginData, coerceHookState(JSON.parse(fs.readFileSync(statePath(pluginData), "utf8"))));
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
  fs.mkdirSync(pluginData, { recursive: true });
  const tempPath = uniqueTempPath(pluginData);
  fs.writeFileSync(tempPath, `${JSON.stringify(boundedState)}
`);
  fs.renameSync(tempPath, statePath(pluginData));
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
    if (isRecord3(value)) {
      return value;
    }
  }
  return;
}
function extractKbMcpToolCall(toolName, toolInput) {
  const directToolName = toolName?.trim();
  let normalizedToolName = directToolName?.startsWith("kb_") ? directToolName : undefined;
  if (!isRecord3(toolInput)) {
    return normalizedToolName ? { toolName: normalizedToolName, impactCheckRun: false, sourceFiles: [] } : undefined;
  }
  normalizedToolName ??= readString2(toolInput, [
    "toolName",
    "tool_name",
    "name"
  ]);
  if (!normalizedToolName?.startsWith("kb_")) {
    return;
  }
  const args = readRecord(toolInput, ["arguments", "args"]);
  const payload = args ?? toolInput;
  const sourceFiles = readStringArray(payload, ["sourceFiles", "source_files"]);
  const impactCheckRun = normalizedToolName === "kb_check" && readBoolean(payload, [
    "includeImpactDiagnostics",
    "include_impact_diagnostics"
  ]) === true && readBoolean(payload, [
    "includeWorkingTreeDiff",
    "include_working_tree_diff"
  ]) === true && sourceFiles.length > 0;
  return { toolName: normalizedToolName, impactCheckRun, sourceFiles };
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
var sourceExtensions = new Set([
  ".c",
  ".cc",
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
  ".vue"
]);
var documentationExtensions = new Set([".md", ".mdx", ".rst", ".txt"]);
var CANONICAL_KB_KNOWLEDGE_LANES = new Set([
  "requirements",
  "scenarios",
  "tests",
  "facts",
  "adr",
  "flags",
  "events"
]);
var CANONICAL_KB_KNOWLEDGE_FILES = new Set([
  "symbols.yaml",
  "symbol-coordinates.yaml"
]);
function isCanonicalKbKnowledgePath(segments) {
  if (segments[0] !== ".kb") {
    return false;
  }
  const lane = segments[1];
  if (lane === undefined) {
    return false;
  }
  return CANONICAL_KB_KNOWLEDGE_FILES.has(lane) || CANONICAL_KB_KNOWLEDGE_LANES.has(lane);
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizePath(candidate) {
  return candidate.trim().replaceAll("\\", "/");
}
function pathSegments(candidate) {
  return normalizePath(candidate).split("/").filter(Boolean);
}
function collectPathValues(value, output) {
  if (typeof value === "string") {
    const normalized = normalizePath(value);
    if (normalized.length > 0) {
      output.push(normalized);
    }
    return;
  }
  if (!Array.isArray(value)) {
    return;
  }
  for (const item of value) {
    collectPathValues(item, output);
  }
}
function visitExplicitPathFields(value, output) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitExplicitPathFields(item, output);
    }
    return;
  }
  if (!isRecord4(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (explicitPathKeys.has(key.toLowerCase())) {
      collectPathValues(child, output);
    }
    visitExplicitPathFields(child, output);
  }
}
function extractExplicitPathFields(input) {
  const paths = [];
  visitExplicitPathFields(input, paths);
  return [...new Set(paths)];
}
function isDirectKbPath(candidate) {
  return pathSegments(candidate).includes(".kb");
}
function isMeaningfulTrackedPath(candidate) {
  const normalized = normalizePath(candidate);
  const segments = pathSegments(normalized);
  if (segments.includes("dist")) {
    return false;
  }
  if (segments.includes(".kb")) {
    return isCanonicalKbKnowledgePath(segments);
  }
  const basename = segments.at(-1) ?? "";
  const extension = basename.includes(".") ? `.${basename.split(".").at(-1) ?? ""}` : "";
  if (segments.includes("docs") || segments.includes("documentation")) {
    return documentationExtensions.has(extension);
  }
  if (basename === "README.md") {
    return true;
  }
  if (segments.includes("src") || segments.includes("tests") || segments.includes("test")) {
    return sourceExtensions.has(extension) || documentationExtensions.has(extension);
  }
  return false;
}
function isSourceImpactRelevantPath(candidate) {
  const normalized = normalizePath(candidate);
  const segments = pathSegments(normalized);
  if (segments.includes(".kb") || segments.includes("dist") || segments.includes("tests") || segments.includes("test") || segments.includes("docs") || segments.includes("documentation")) {
    return false;
  }
  const basename = segments.at(-1) ?? "";
  const extension = basename.includes(".") ? `.${basename.split(".").at(-1) ?? ""}` : "";
  return segments.includes("src") && sourceExtensions.has(extension);
}

// src/workspace-optin.ts
import fs2 from "node:fs";
import path2 from "node:path";
var KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT"
];
function nextAncestorDirectory(current) {
  const parent = path2.dirname(current);
  return parent === current ? undefined : parent;
}
function hasKibiManifest(directory) {
  return fs2.existsSync(path2.join(directory, ".kb", "manifest.json"));
}
function hasGitBoundary(directory) {
  return fs2.existsSync(path2.join(directory, ".git"));
}
function resolutionFor(root) {
  return { root, optedIn: hasKibiManifest(root) };
}
function resolveKibiWorkspace(startDir, env = process.env) {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      return resolutionFor(path2.resolve(value));
    }
  }
  let current = path2.resolve(startDir && startDir.trim().length > 0 ? startDir : process.cwd());
  while (current !== undefined) {
    if (hasKibiManifest(current)) {
      return { root: current, optedIn: true };
    }
    if (hasGitBoundary(current)) {
      return { root: current, optedIn: false };
    }
    current = nextAncestorDirectory(current);
  }
  return resolutionFor(path2.resolve(startDir ?? process.cwd()));
}

// src/hook-runner.ts
var editableTools = new Set(["Edit", "MultiEdit", "Write", "apply_patch"]);
function defaultResult() {
  return { continue: true };
}
function isEditLikeTool(toolName) {
  return toolName === undefined || editableTools.has(toolName);
}
async function runHook(rawInput, environment = {}) {
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
      const explicitPaths = extractExplicitPathFields(input.toolInput);
      const hasDirectKbEdit = isEditLikeTool(input.toolName) && explicitPaths.some(isDirectKbPath);
      if (hasDirectKbEdit) {
        return { continue: true, systemMessage: DIRECT_KB_EDIT_WARNING };
      }
      return defaultResult();
    }
    case "PostToolUse": {
      const kbToolCall = extractKbMcpToolCall(input.toolName, input.toolInput);
      if (kbToolCall) {
        recordKbMcpTool(stateDir, kbToolCall.toolName, {
          impactCheckRun: kbToolCall.impactCheckRun,
          sourceFiles: kbToolCall.sourceFiles
        });
      }
      const dirtyPaths = extractExplicitPathFields(input.toolInput).filter(isMeaningfulTrackedPath);
      if (dirtyPaths.length > 0) {
        addDirtyPaths(stateDir, dirtyPaths);
      }
      return defaultResult();
    }
    case "Stop": {
      const state = loadHookState(stateDir);
      const uncheckedSourcePaths = state.dirtyPaths.filter(isSourceImpactRelevantPath).filter((sourcePath) => !state.impactCheckedPaths.includes(sourcePath));
      if (uncheckedSourcePaths.length > 0) {
        clearDirtyPaths(stateDir);
        return {
          continue: true,
          systemMessage: impactCheckReminder(uncheckedSourcePaths)
        };
      }
      const freshnessPaths = state.dirtyPaths.filter((dirtyPath) => !isSourceImpactRelevantPath(dirtyPath));
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
  const invokedPath = argv1 ? pathToFileURL(path3.resolve(argv1)).href : "";
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
  runHookCliIfMain,
  runHookCli,
  runHook,
  main,
  isInvokedAsCli,
  hookRunnerPath
};
