// implements REQ-claude-code-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  appendHookUsage,
  appendHookUsageRows,
  editTraces,
  kbUsageTrace,
} from "../src/hook-usage-log";
import * as agentCore from "../src/index";
import { hostKbOperation, kibiCliOperation } from "../src/kb-mcp-tools";
import type { EntitySummary, IndexedSymbol } from "../src/knowledge-index";
import { extractEditedPaths, extractPatchFilePaths } from "../src/path-policy";
import {
  MAX_SNIPPET_CHARS,
  claimSnippetSlot,
  createEntitySummarizer,
  editFocus,
  editKnowledgeContext,
  fileKnowledgeSnippet,
  requirementGroundingLines,
} from "../src/snippets";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function tempDir(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(directory);
  return directory;
}

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

const SUMMARIES: Record<string, EntitySummary> = {
  "REQ-rounding": {
    id: "REQ-rounding",
    title: "Checkout totals round to cents",
    status: "open",
    links: [
      { type: "constrains", target: "FACT-total" },
      { type: "requires_property", target: "FACT-cents" },
      { type: "requires_rule", target: "FACT-rule" },
      { type: "relates_to", target: "ADR-decimal" },
      { type: "relates_to", target: "SCEN-rounding" },
    ],
  },
  "REQ-old": {
    id: "REQ-old",
    title: "Totals truncate",
    status: "superseded",
    links: [
      { type: "constrains", target: "FACT-total" },
      { type: "relates_to", target: "ADR-decimal" },
    ],
  },
  "FACT-cents": { id: "FACT-cents", title: "Totals round half up" },
  "ADR-decimal": { id: "ADR-decimal", title: "Money is decimal cents" },
};

const summarize = (id: string): EntitySummary => SUMMARIES[id] ?? { id };

const SYMBOLS: IndexedSymbol[] = [
  {
    id: "SYM-total",
    title: "computeTotal",
    line: 3,
    endLine: 7,
    implements: ["REQ-rounding"],
    coveredBy: ["TEST-rounding"],
    executableFor: [],
  },
  {
    id: "SYM-format",
    title: "formatTotal",
    line: 9,
    endLine: 11,
    implements: ["REQ-old"],
    coveredBy: [],
    executableFor: [],
  },
];

describe("requirement grounding", () => {
  test("names the linked facts and the decision behind a current requirement", () => {
    expect(requirementGroundingLines("REQ-rounding", summarize)).toEqual([
      "REQ-rounding must keep true: FACT-total; FACT-cents: Totals round half up +1.",
      "Decision: ADR-decimal: Money is decimal cents.",
    ]);
    expect(
      requirementGroundingLines("REQ-rounding", summarize, { maxFacts: 1 }),
    ).toEqual([
      "REQ-rounding must keep true: FACT-total +2.",
      "Decision: ADR-decimal: Money is decimal cents.",
    ]);
  });

  test("a retired or ungrounded requirement contributes nothing", () => {
    expect(requirementGroundingLines("REQ-old", summarize)).toEqual([]);
    expect(requirementGroundingLines("REQ-unknown", summarize)).toEqual([]);
  });
});

describe("shared file knowledge snippet", () => {
  test("edits add the lead requirement's grounding; reads do not", () => {
    const edit = fileKnowledgeSnippet({
      relativePath: "src/checkout.ts",
      symbols: SYMBOLS,
      surface: "edit",
      focus: [{ start: 4, end: 4 }],
      summarize,
    });
    expect(edit?.split("\n")).toEqual([
      "Kibi knowledge for src/checkout.ts (symbol manifest):",
      "- REQ-rounding: Checkout totals round to cents — computeTotal",
      "- REQ-old (superseded): Totals truncate — formatTotal",
      "REQ-rounding must keep true: FACT-total; FACT-cents: Totals round half up +1.",
      "Decision: ADR-decimal: Money is decimal cents.",
      "Covered by: TEST-rounding.",
      "The edit is inside computeTotal, which implements REQ-rounding.",
      'Next layer: kb_query({id:"REQ-rounding"}) returns full requirement text; kb_search({query:"<topic>", sourceLocations:[{path:"src/checkout.ts", symbol:"computeTotal"}]}) answers with governing requirements, facts, decisions, and tests.',
      'Behavior changes here are traced to these requirements; kb_check({sourceFiles:["src/checkout.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.',
    ]);

    const read = fileKnowledgeSnippet({
      relativePath: "src/checkout.ts",
      symbols: SYMBOLS,
      surface: "read",
      summarize,
    });
    expect(read).toContain("- REQ-rounding: Checkout totals round to cents");
    expect(read).not.toContain("must keep true");
    expect(read).not.toContain("Decision:");
  });

  test("a superseded lead requirement gets no grounding lines", () => {
    const snippet = fileKnowledgeSnippet({
      relativePath: "src/checkout.ts",
      symbols: SYMBOLS,
      surface: "edit",
      focus: [{ start: 10, end: 10 }],
      summarize,
    });
    expect(snippet).toContain("- REQ-old (superseded): Totals truncate");
    expect(snippet).not.toContain("must keep true");
    expect(snippet).not.toContain("Decision:");
  });

  test("each host's size budget caps the snippet", () => {
    const capped = fileKnowledgeSnippet({
      relativePath: "src/checkout.ts",
      symbols: SYMBOLS,
      surface: "edit",
      summarize,
      maxChars: 120,
    });
    expect(capped?.length).toBe(120);
    expect(capped?.endsWith("…")).toBe(true);
    const full = fileKnowledgeSnippet({
      relativePath: "src/checkout.ts",
      symbols: SYMBOLS,
      surface: "edit",
      summarize,
    });
    expect(full?.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);
  });

  test("files with no relationships get no snippet", () => {
    expect(
      fileKnowledgeSnippet({
        relativePath: "src/a.ts",
        symbols: [],
        surface: "edit",
        summarize,
      }),
    ).toBeUndefined();
  });

  test("entity summaries are read from the workspace once per entity", () => {
    const root = tempDir("kibi-agent-core-summaries-");
    write(
      root,
      ".kb/requirements/REQ-a.md",
      "---\nid: REQ-a\ntitle: First title\nstatus: open\n---\n",
    );
    const summarizeWorkspace = createEntitySummarizer(root);
    expect(summarizeWorkspace("REQ-a").title).toBe("First title");
    write(
      root,
      ".kb/requirements/REQ-a.md",
      "---\nid: REQ-a\ntitle: Second title\nstatus: open\n---\n",
    );
    expect(summarizeWorkspace("REQ-a").title).toBe("First title");
  });

  test("edit focus locates old_string and oldString needles", () => {
    const root = tempDir("kibi-agent-core-focus-");
    write(root, "a.ts", "one\ntwo\nthree\nfour\n");
    const file = path.join(root, "a.ts");
    expect(editFocus(file, { old_string: "two\nthree" })).toEqual([
      { start: 2, end: 3 },
    ]);
    expect(editFocus(file, { edits: [{ oldString: "four" }] })).toEqual([
      { start: 4, end: 4 },
    ]);
    expect(editFocus(file, { old_string: "missing" })).toBeUndefined();
    expect(editFocus(file, {})).toBeUndefined();
  });
});

describe("once-per-session edit context", () => {
  test("a slot is claimed once per key; without state every call is first", () => {
    const stateDir = tempDir("kibi-agent-core-slots-");
    expect(claimSnippetSlot(stateDir, "s1:a")).toBe(true);
    expect(claimSnippetSlot(stateDir, "s1:a")).toBe(false);
    expect(claimSnippetSlot(stateDir, "s2:a")).toBe(true);
    expect(claimSnippetSlot(undefined, "s1:a")).toBe(true);
  });

  test("describes each linked file once per session, at most maxFiles per call", () => {
    const stateDir = tempDir("kibi-agent-core-edit-context-");
    const input = {
      relativePaths: ["src/a.ts", "src/unlinked.ts", "src/b.ts", "src/c.ts"],
      symbolsFor: (relativePath: string) =>
        relativePath === "src/unlinked.ts" ? [] : SYMBOLS,
      summarize,
      stateDir,
      sessionId: "s1",
      maxFiles: 2,
    };
    const first = editKnowledgeContext(input);
    expect(first?.match(/^Kibi knowledge for /gm)).toHaveLength(2);
    expect(first).toContain("Kibi knowledge for src/a.ts");
    expect(first).toContain("Kibi knowledge for src/b.ts");
    expect(first).toContain("REQ-rounding must keep true");

    const second = editKnowledgeContext(input);
    expect(second).toContain("Kibi knowledge for src/c.ts");
    expect(second).not.toContain("src/a.ts");
    expect(editKnowledgeContext(input)).toBeUndefined();
    expect(editKnowledgeContext({ ...input, sessionId: "s2" })).toContain(
      "Kibi knowledge for src/a.ts",
    );
  });
});

describe("edit paths and Kibi operations", () => {
  test("apply_patch envelopes name the files they touch", () => {
    const patch = [
      "*** Begin Patch",
      "*** Update File: src/a.ts",
      "@@",
      "-a",
      "+b",
      "*** Add File: src/new.ts",
      "+x",
      "*** Delete File: src\\old.ts",
      "*** End Patch",
    ].join("\n");
    expect(extractPatchFilePaths(patch)).toEqual([
      "src/a.ts",
      "src/new.ts",
      "src/old.ts",
    ]);
    expect(extractEditedPaths({ command: patch })).toEqual([
      "src/a.ts",
      "src/new.ts",
      "src/old.ts",
    ]);
    expect(
      extractEditedPaths({ filePath: "src/x.ts", patchText: patch }),
    ).toEqual(["src/x.ts", "src/a.ts", "src/new.ts", "src/old.ts"]);
    expect(extractEditedPaths({ command: "echo hi" })).toEqual([]);
  });

  test("Kibi operations are recognized through MCP and the project-local CLI", () => {
    expect(kibiCliOperation("npx --no-install kibi search --input -")).toBe(
      "kb_search",
    );
    expect(kibiCliOperation("bunx kibi kb-query --input -")).toBe("kb_query");
    expect(kibiCliOperation("kibi doctor")).toBeUndefined();
    expect(hostKbOperation("mcp__kibi__kb_search", {})).toBe("kb_search");
    expect(hostKbOperation("MCP:kb_query", {})).toBe("kb_query");
    expect(hostKbOperation("kibi_kb_search", {})).toBe("kb_search");
    expect(hostKbOperation("Bash", { command: "kibi query --input -" })).toBe(
      "kb_query",
    );
    expect(hostKbOperation("Shell", { command: "kibi check" })).toBe(
      "kb_check",
    );
    // A patch that mentions the CLI is an edit, not a lookup.
    expect(
      hostKbOperation("apply_patch", { command: "+ run kibi search" }),
    ).toBeUndefined();
    expect(hostKbOperation("Read", { file_path: "a.ts" })).toBeUndefined();
  });
});

describe("shared hook telemetry rows", () => {
  const optedIn = { KIBI_DIAGNOSTIC_MODE: "true" };

  function rows(root: string): Record<string, unknown>[] {
    const logPath = path.join(root, ".kb", "usage.log");
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  test("lookups and edited files become hook rows only when opted in", () => {
    const root = tempDir("kibi-agent-core-usage-");
    const base = {
      host: "test-host",
      packageVersion: "1.2.3",
      workspaceRoot: root,
      event: "PostToolUse",
      sessionId: "session-a",
      hostTool: "Edit",
      startedAt: new Date(),
    };
    const lookup = kbUsageTrace("mcp__kibi__kb_search", {});
    expect(lookup).toBeDefined();
    const traces = [
      ...(lookup ? [lookup] : []),
      ...editTraces(
        ["src/a.ts", "docs/guide.md", ".kb/requirements/REQ-a.md", "src/a.ts"],
        (relativePath) => (relativePath === "src/a.ts" ? ["REQ-a"] : []),
      ),
    ];

    appendHookUsageRows(base, traces, {});
    expect(rows(root)).toEqual([]);

    appendHookUsageRows(base, traces, optedIn);
    const written = rows(root);
    expect(
      written.map((row) => [
        row.hook_action,
        row.kb_operation,
        row.path,
        row.path_kind,
        row.requirement_ids,
      ]),
    ).toEqual([
      ["kb_usage", "kb_search", null, null, []],
      ["edited", null, "src/a.ts", "source", ["REQ-a"]],
      ["edited", null, ".kb/requirements/REQ-a.md", "kb", []],
    ]);
    expect(written[1]).toMatchObject({
      interface: "hook",
      host: "test-host",
      package_version: "1.2.3",
      session_id: "session-a",
      tool: "hook_PostToolUse",
      host_tool: "Edit",
      status: "success",
    });
  });

  test("a trace without an action records nothing", () => {
    const root = tempDir("kibi-agent-core-usage-empty-");
    appendHookUsage(
      {
        host: "test-host",
        workspaceRoot: root,
        event: "PreToolUse",
        sessionId: undefined,
        hostTool: undefined,
        trace: {},
        startedAt: new Date(),
      },
      optedIn,
    );
    expect(rows(root)).toEqual([]);
    expect(kbUsageTrace("Read", {})).toBeUndefined();
  });

  test("the package entry re-exports the shared snippet and telemetry surface", () => {
    expect(agentCore.fileKnowledgeSnippet).toBe(fileKnowledgeSnippet);
    expect(agentCore.requirementGroundingLines).toBe(requirementGroundingLines);
    expect(agentCore.appendHookUsage).toBe(appendHookUsage);
    expect(agentCore.hostKbOperation).toBe(hostKbOperation);
  });
});
