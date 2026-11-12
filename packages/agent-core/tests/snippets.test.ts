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
  describeEntity,
  editFocus,
  editKnowledgeContext,
  editKnowledgeUpdate,
  factClaimSentence,
  fileKnowledgeSnippet,
  requirementGroundingLines,
  unownedSourceNote,
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
  "FACT-total": {
    id: "FACT-total",
    title: "checkout.total subject",
    claim: { factKind: "subject", subjectKey: "checkout.total" },
  },
  "FACT-cents": {
    id: "FACT-cents",
    title: "Totals round half up",
    claim: {
      factKind: "property_value",
      subjectKey: "checkout.total",
      propertyKey: "rounding_mode",
      operator: "eq",
      values: ["half_up"],
      claimText: "Checkout totals must round half up",
    },
  },
  "FACT-rule": {
    id: "FACT-rule",
    claim: {
      factKind: "rule",
      claimText: "A total is rounded once, after tax.",
    },
  },
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
      "REQ-rounding must keep true: Checkout totals: rounding mode must be half_up; A total is rounded once, after tax.",
      "Decision: ADR-decimal: Money is decimal cents.",
    ]);
    expect(
      requirementGroundingLines("REQ-rounding", summarize, { maxFacts: 1 }),
    ).toEqual([
      "REQ-rounding must keep true: Checkout totals: rounding mode must be half_up +1 more.",
      "Decision: ADR-decimal: Money is decimal cents.",
    ]);
  });

  test("a fact with no claim falls back to the statement, else shows nothing", () => {
    const local = (id: string): EntitySummary =>
      ({
        "REQ-stated": {
          id: "REQ-stated",
          title: "Totals",
          statement: "Totals are rounded once.",
          links: [{ type: "constrains", target: "FACT-none" }],
        },
        "REQ-bare": {
          id: "REQ-bare",
          title: "Totals",
          links: [{ type: "constrains", target: "FACT-none" }],
        },
      })[id] ?? { id };
    expect(requirementGroundingLines("REQ-stated", local)).toEqual([
      "REQ-stated must keep true: Totals are rounded once.",
    ]);
    expect(requirementGroundingLines("REQ-bare", local)).toEqual([]);
  });

  test("a retired or ungrounded requirement contributes nothing", () => {
    expect(requirementGroundingLines("REQ-old", summarize)).toEqual([]);
    expect(requirementGroundingLines("REQ-unknown", summarize)).toEqual([]);
  });

  test("shows the modeled claim with its operator and members, never fact IDs", () => {
    const root = tempDir("kibi-grounding-claim-");
    write(
      root,
      ".kb/requirements/REQ-GREET.md",
      "---\ntitle: The greet function must never call console.log\nstatus: open\nsemantic_text: The greet function must never call console.log.\nlinks:\n  - type: constrains\n    target: FACT-SUBJECT-933e16874642\n  - type: requires_property\n    target: FACT-PROP-402ceeb6f19a\n---\nThe greet function must never call console.log.\n",
    );
    write(
      root,
      ".kb/facts/FACT-SUBJECT-933e16874642.md",
      "---\ntitle: the.greet.function subject\nstatus: active\nfact_kind: subject\nsubject_key: the.greet.function\nclaim_text: The greet function must never call console.log\n---\n",
    );
    write(
      root,
      ".kb/facts/FACT-PROP-402ceeb6f19a.md",
      "---\ntitle: the.greet.function calls\nstatus: active\nfact_kind: property_value\nsubject_key: the.greet.function\nproperty_key: calls\noperator: excludes\nvalue_type: set\nvalue_set:\n  - console.log\n  - eval\ncanonical_key: the.greet.function.calls.excludes.console.log\nclaim_key: CLAIM-36FB2A9E9A14F5B1\nclaim_text: The greet function must never call console.log\n---\n",
    );
    const lines = requirementGroundingLines(
      "REQ-GREET",
      createEntitySummarizer(root),
    );
    expect(lines).toEqual([
      "REQ-GREET must keep true: The greet function must not call console.log or eval.",
    ]);
    expect(lines.join("\n")).not.toContain("FACT-");
  });

  test("completes a title an older Kibi cut at a dot inside a name", () => {
    const root = tempDir("kibi-grounding-title-");
    write(
      root,
      ".kb/requirements/REQ-GREET.md",
      "---\ntitle: The greet function must never call console\nstatus: open\nfirmness: default\nsemantic_text: The greet function must never call console.log. It logs nothing.\n---\n",
    );
    write(
      root,
      ".kb/requirements/REQ-plain.md",
      "---\ntitle: Totals round\nstatus: open\nfirmness: default\nsemantic_text: Totals round. Always.\n---\n",
    );
    const summarizeRoot = createEntitySummarizer(root);
    expect(describeEntity(summarizeRoot("REQ-GREET"))).toBe(
      "REQ-GREET: The greet function must never call console.log",
    );
    expect(describeEntity(summarizeRoot("REQ-plain"))).toBe(
      "REQ-plain: Totals round",
    );
  });

  test("reads set members, scalar values and wrapped claim text from a fact", () => {
    const root = tempDir("kibi-grounding-fields-");
    write(
      root,
      ".kb/facts/FACT-port.md",
      "---\ntitle: server port\nfact_kind: property_value\nsubject_key: server\nproperty_key: listen_port\noperator: gte\nvalue_int: 1024\nclaim_text: >-\n  The server must listen on port\n  1024 or above\n---\n",
    );
    write(
      root,
      ".kb/facts/FACT-env.md",
      "---\nfact_kind: property_value\nsubject_key: server.environment\nproperty_key: reads\noperator: subset_of\nvalue_set: [PORT, HOST]\n---\n",
    );
    const summarizeRoot = createEntitySummarizer(root);
    expect(summarizeRoot("FACT-port").claim).toEqual({
      factKind: "property_value",
      subjectKey: "server",
      propertyKey: "listen_port",
      operator: "gte",
      values: ["1024"],
      claimText: "The server must listen on port 1024 or above",
    });
    expect(factClaimSentence(summarizeRoot("FACT-port"))).toBe(
      "The server: listen port must be at least 1024",
    );
    expect(factClaimSentence(summarizeRoot("FACT-env"))).toBe(
      "server environment may read only PORT or HOST",
    );
  });

  test("falls back to the requirement's own statement when no fact reads as a claim", () => {
    const root = tempDir("kibi-grounding-statement-");
    write(
      root,
      ".kb/requirements/REQ-cut.md",
      "---\ntitle: Cut\nstatus: open\nlinks:\n  - type: constrains\n    target: FACT-subject-only\n---\n# Heading\n\nThe matcher in src/match.c must never call malloc.\nIt runs in a signal handler.\n\n## Context\n\nReason not stated.\n",
    );
    write(
      root,
      ".kb/facts/FACT-subject-only.md",
      "---\ntitle: matcher subject\nfact_kind: subject\nsubject_key: matcher\n---\n",
    );
    expect(
      requirementGroundingLines("REQ-cut", createEntitySummarizer(root)),
    ).toEqual([
      "REQ-cut must keep true: The matcher in src/match.c must never call malloc. It runs in a signal handler.",
    ]);
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
      "REQ-rounding must keep true: Checkout totals: rounding mode must be half_up; A total is rounded once, after tax.",
      "Decision: ADR-decimal: Money is decimal cents.",
      "Covered by: TEST-rounding.",
      "The edit is inside computeTotal, which implements REQ-rounding.",
      'Next layer: kb_query({id:"REQ-rounding", includeBody:true}) returns the full requirement text and why it exists; kb_search({query:"<topic>", sourceLocations:[{path:"src/checkout.ts", symbol:"computeTotal"}]}) answers with governing requirements, facts, decisions, and tests.',
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

describe("edit update after a shown snippet", () => {
  test("names the edited symbol, the lead requirement's grounding and the impact check only", () => {
    const text = editKnowledgeUpdate({
      relativePath: "src/checkout.ts",
      symbols: SYMBOLS,
      surface: "edit",
      focus: [{ start: 4, end: 4 }],
      summarize,
    });
    expect(text?.split("\n")).toEqual([
      "Kibi: this edit to src/checkout.ts is inside computeTotal, which implements REQ-rounding.",
      "REQ-rounding must keep true: Checkout totals: rounding mode must be half_up; A total is rounded once, after tax.",
      "Decision: ADR-decimal: Money is decimal cents.",
      'Behavior changes here are traced to these requirements; kb_check({sourceFiles:["src/checkout.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.',
    ]);
  });

  test("without a located edit it names the requirements the file implements", () => {
    const text = editKnowledgeUpdate({
      relativePath: "src/checkout.ts",
      symbols: SYMBOLS,
      surface: "edit",
      summarize,
    });
    expect(text).toStartWith(
      "Kibi: this edit to src/checkout.ts changes code that implements REQ-rounding, REQ-old.",
    );
    expect(text).toContain("REQ-rounding must keep true:");
    expect(text).not.toContain("Kibi knowledge for");
  });

  test("a file linking no requirement yields nothing, or only the symbol the edit lands in", () => {
    const unowned = [{ ...SYMBOLS[0], implements: [] } as IndexedSymbol];
    expect(
      editKnowledgeUpdate({
        relativePath: "src/x.ts",
        symbols: unowned,
        surface: "edit",
        summarize,
      }),
    ).toBeUndefined();
    expect(
      editKnowledgeUpdate({
        relativePath: "src/x.ts",
        symbols: unowned,
        surface: "edit",
        focus: [{ start: 4, end: 4 }],
        summarize,
      }),
    ).toBe("Kibi: this edit to src/x.ts is inside computeTotal.");
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

  test("a file without a snippet gets the host's note once per session", () => {
    const stateDir = tempDir("kibi-agent-core-edit-note-");
    const input = {
      relativePaths: ["src/unlinked.ts", "src/a.ts"],
      symbolsFor: (relativePath: string) =>
        relativePath === "src/a.ts" ? SYMBOLS : [],
      summarize,
      stateDir,
      sessionId: "s1",
      noteFor: (relativePath: string) =>
        relativePath.endsWith(".ts")
          ? unownedSourceNote(relativePath)
          : undefined,
    };
    const first = editKnowledgeContext(input) ?? "";
    expect(first).toStartWith(
      "Kibi: no symbol in src/unlinked.ts is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.\nNo requirement title matches this file, so nothing recorded is known to cover it.\nkb_search(",
    );
    expect(first).toContain("\n\nKibi knowledge for src/a.ts");
    expect(editKnowledgeContext(input)).toBeUndefined();
    expect(
      editKnowledgeContext({ ...input, relativePaths: ["docs/x.md"] }),
    ).toBeUndefined();
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
