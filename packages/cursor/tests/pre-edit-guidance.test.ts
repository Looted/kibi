import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { preEditGuidance } from "../src/guidance.js";
import { runHook } from "../src/hook-runner.js";
import { getSourceLinkedRequirementIds } from "../src/source-linked-requirements.js";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function createWorkspace(symbolsManifest?: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cursor-pre-edit-"));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
  if (symbolsManifest !== undefined) {
    fs.writeFileSync(path.join(root, ".kb", "symbols.yaml"), symbolsManifest);
  }
  return root;
}

function tempDir(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(directory);
  return directory;
}

function writeKb(root: string, relativePath: string, content: string): void {
  const target = path.join(root, ".kb", relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function usageRows(root: string): Record<string, unknown>[] {
  const logPath = path.join(root, ".kb", "usage.log");
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

const MANIFEST = `symbols:
  - id: SYM-checkout-total
    sourceFile: src/checkout.ts
    relationships:
      - type: implements
        target: REQ-checkout-total
      - type: covered_by
        target: TEST-checkout-total
      - type: executable_for
        target: TEST-checkout-total
  - id: SYM-checkout-legacy
    sourceFile: src/checkout.ts
    links:
      - REQ-checkout-legacy
  - id: SYM-checkout-test
    sourceFile: src/checkout.test.ts
    relationships:
      - type: executable_for
        target: TEST-checkout-total
  - id: SYM-unrelated
    sourceFile: src/other.ts
    relationships:
      - type: implements
        target: REQ-other
`;

describe("source-linked requirement resolution", () => {
  test("uses only implements relationships as requirement ownership", () => {
    const root = createWorkspace(MANIFEST);
    expect(getSourceLinkedRequirementIds(root, "src/checkout.ts")).toEqual([
      "REQ-checkout-total",
    ]);
  });

  test("does not infer requirement ownership from generic legacy links", () => {
    const root = createWorkspace(`symbols:
  - id: SYM-checkout-legacy
    sourceFile: src/checkout.ts
    links:
      - REQ-checkout-legacy
`);
    expect(getSourceLinkedRequirementIds(root, "src/checkout.ts")).toEqual([]);
  });

  test("parses quoted YAML scalar paths and relationship targets", () => {
    const root = createWorkspace(`symbols:
  - id: SYM-checkout-total
    sourceFile: "src/checkout: totals.ts"
    relationships:
      - type: "implements"
        target: 'REQ-checkout-total'
`);
    expect(
      getSourceLinkedRequirementIds(root, "src/checkout: totals.ts"),
    ).toEqual(["REQ-checkout-total"]);
  });

  test("resolves absolute edit paths against the workspace", () => {
    const root = createWorkspace(MANIFEST);
    expect(
      getSourceLinkedRequirementIds(root, path.join(root, "src/other.ts")),
    ).toEqual(["REQ-other"]);
  });

  test("returns nothing for unlinked files and a missing manifest", () => {
    const linked = createWorkspace(MANIFEST);
    expect(getSourceLinkedRequirementIds(linked, "src/new.ts")).toEqual([]);

    const bare = createWorkspace();
    expect(getSourceLinkedRequirementIds(bare, "src/checkout.ts")).toEqual([]);
  });

  test("reuses a size-and-mtime keyed index until the manifest changes", () => {
    const root = createWorkspace(MANIFEST);
    const cacheDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-cursor-index-"),
    );
    tempRoots.push(cacheDir);

    expect(
      getSourceLinkedRequirementIds(root, "src/checkout.ts", cacheDir),
    ).toEqual(["REQ-checkout-total"]);
    const cachePath = path.join(cacheDir, "cursor-knowledge-index.json");
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    cached.index.files["src/checkout.ts"][0].implements = ["REQ-from-cache"];
    fs.writeFileSync(cachePath, JSON.stringify(cached));

    expect(
      getSourceLinkedRequirementIds(root, "src/checkout.ts", cacheDir),
    ).toEqual(["REQ-from-cache"]);

    fs.appendFileSync(path.join(root, ".kb", "symbols.yaml"), "\n# changed\n");
    expect(
      getSourceLinkedRequirementIds(root, "src/checkout.ts", cacheDir),
    ).toEqual(["REQ-checkout-total"]);
  });
});

describe("pre-edit guidance content", () => {
  const context = {
    cwd: "/repo",
    hasKibi: true,
    mcpState: "observed" as const,
    workspaceTrusted: true,
  };

  test("asks for retrieval before the edit and names linked requirements", () => {
    const guidance = preEditGuidance("/repo/src/checkout.ts", {
      ...context,
      linkedRequirementIds: ["REQ-checkout-total"],
    });
    expect(guidance).toContain("REQ-checkout-total");
    expect(guidance).toContain("before changing behavior here");
    expect(guidance).not.toContain("After editing");
  });

  test("asks for discovery when the file owns no requirement yet", () => {
    const guidance = preEditGuidance("/repo/src/new.ts", context);
    expect(guidance).toContain("no linked requirement");
    expect(guidance).toContain("kb_search");
  });

  test("does not describe test-only traceability as requirement ownership", () => {
    const root = createWorkspace(MANIFEST);
    const linkedRequirementIds = getSourceLinkedRequirementIds(
      root,
      "src/checkout.test.ts",
    );
    const guidance = preEditGuidance("/repo/src/checkout.test.ts", {
      ...context,
      linkedRequirementIds,
    });

    expect(linkedRequirementIds).toEqual([]);
    expect(guidance).toContain("no linked requirement");
    expect(guidance).toContain("kb_search");
    expect(guidance).not.toContain("TEST-checkout-total");
    expect(guidance).not.toContain("implements TEST");
  });

  test("falls back to discovery when only legacy links are present", () => {
    const root = createWorkspace(`symbols:
  - id: SYM-checkout-legacy
    sourceFile: src/checkout.ts
    links:
      - REQ-checkout-legacy
`);
    const guidance = preEditGuidance("/repo/src/checkout.ts", {
      ...context,
      linkedRequirementIds: getSourceLinkedRequirementIds(
        root,
        "src/checkout.ts",
      ),
    });

    expect(guidance).toContain("no linked requirement");
    expect(guidance).toContain("kb_search");
    expect(guidance).not.toContain("REQ-checkout-legacy");
  });

  test("stays quiet for documentation and untracked paths", () => {
    expect(preEditGuidance("/repo/docs/guide.md", context)).toBeUndefined();
    expect(preEditGuidance("/repo/untracked.bin", context)).toBeUndefined();
    expect(
      preEditGuidance("/repo/src/a.ts", { ...context, hasKibi: false }),
    ).toBeUndefined();
  });
});

describe("preToolUse emits guidance before the edit is written", () => {
  test("guides an edit-like tool once per path without blocking it", async () => {
    const cwd = createWorkspace(MANIFEST);
    const pluginData = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-cursor-data-"),
    );
    tempRoots.push(pluginData);

    const payload = {
      hook_event_name: "preToolUse",
      cwd,
      tool_name: "Write",
      tool_input: { file_path: "src/checkout.ts" },
    };

    const first = await runHook(payload, { pluginData });
    expect(first.permission).toBe("allow");
    expect(first.agent_message).toContain(
      "Kibi knowledge for src/checkout.ts (symbol manifest):\n- REQ-checkout-total — SYM-checkout-total",
    );
    expect(first.agent_message).toContain("Kibi pre-edit guidance");
    expect(first.agent_message).toContain("before changing behavior here");
    // Tests appear as coverage evidence, never as owned requirements.
    expect(first.agent_message).toContain("Covered by: TEST-checkout-total.");
    expect(first.agent_message).not.toContain("implements TEST");
    expect(first.agent_message).not.toContain("REQ-checkout-legacy");

    expect(await runHook(payload, { pluginData })).toStrictEqual({});
  });

  test("stays quiet for read tools, untracked paths, and unbootstrapped workspaces", async () => {
    const cwd = createWorkspace(MANIFEST);
    const pluginData = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-cursor-data-"),
    );
    tempRoots.push(pluginData);

    expect(
      await runHook(
        {
          hook_event_name: "preToolUse",
          cwd,
          tool_name: "Read",
          tool_input: { file_path: "src/checkout.ts" },
        },
        { pluginData },
      ),
    ).toStrictEqual({});

    expect(
      await runHook(
        {
          hook_event_name: "preToolUse",
          cwd,
          tool_name: "Write",
          tool_input: { file_path: "package.json" },
        },
        { pluginData },
      ),
    ).toStrictEqual({});

    const bare = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cursor-bare-"));
    tempRoots.push(bare);
    expect(
      await runHook(
        {
          hook_event_name: "preToolUse",
          cwd: bare,
          tool_name: "Write",
          tool_input: { file_path: "src/checkout.ts" },
        },
        { pluginData },
      ),
    ).toStrictEqual({});
  });

  test("names what the lead requirement must keep true and the decision behind it", async () => {
    const cwd = createWorkspace(MANIFEST);
    writeKb(
      cwd,
      "requirements/REQ-checkout-total.md",
      "---\nid: REQ-checkout-total\ntitle: Checkout totals round to cents\nstatus: open\nlinks:\n  - type: constrains\n    target: FACT-checkout-total\n  - type: requires_property\n    target: FACT-total-rounding-cents\n  - ADR-money-as-decimal\n---\n",
    );
    writeKb(
      cwd,
      "facts/FACT-total-rounding-cents.md",
      "---\nid: FACT-total-rounding-cents\ntitle: Totals round half up to two decimals\nstatus: active\n---\n",
    );
    writeKb(
      cwd,
      "adr/ADR-money-as-decimal.md",
      "---\nid: ADR-money-as-decimal\ntitle: Money is computed as decimal cents\nstatus: accepted\n---\n",
    );

    const result = await runHook(
      {
        hook_event_name: "preToolUse",
        cwd,
        tool_name: "StrReplace",
        tool_input: { file_path: "src/checkout.ts" },
      },
      { pluginData: tempDir("kibi-cursor-data-") },
    );

    expect(result.agent_message).toContain(
      "- REQ-checkout-total: Checkout totals round to cents — SYM-checkout-total",
    );
    expect(result.agent_message).toContain(
      "REQ-checkout-total must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.",
    );
    expect(result.agent_message).toContain(
      "Decision: ADR-money-as-decimal: Money is computed as decimal cents.",
    );
  });

  test("a retired lead requirement is not presented as something to keep true", async () => {
    const cwd = createWorkspace(MANIFEST);
    writeKb(
      cwd,
      "requirements/REQ-checkout-total.md",
      "---\nid: REQ-checkout-total\ntitle: Totals truncate\nstatus: superseded\nlinks:\n  - type: constrains\n    target: FACT-checkout-total\n  - ADR-money-as-decimal\n---\n",
    );

    const result = await runHook(
      {
        hook_event_name: "preToolUse",
        cwd,
        tool_name: "Write",
        tool_input: { file_path: "src/checkout.ts" },
      },
      { pluginData: tempDir("kibi-cursor-data-") },
    );

    expect(result.agent_message).toContain(
      "- REQ-checkout-total (superseded): Totals truncate",
    );
    expect(result.agent_message).not.toContain("must keep true");
    expect(result.agent_message).not.toContain("Decision:");
  });

  test("a read of a linked file shows its requirements without edit grounding", async () => {
    const cwd = createWorkspace(MANIFEST);
    writeKb(
      cwd,
      "requirements/REQ-checkout-total.md",
      "---\nid: REQ-checkout-total\ntitle: Checkout totals round to cents\nstatus: open\nlinks:\n  - type: constrains\n    target: FACT-checkout-total\n---\n",
    );

    const result = await runHook(
      {
        hook_event_name: "beforeReadFile",
        cwd,
        file_path: "src/checkout.ts",
      },
      { pluginData: tempDir("kibi-cursor-data-") },
    );

    expect(result.permission).toBe("allow");
    expect(result.agent_message).toContain(
      "- REQ-checkout-total: Checkout totals round to cents — SYM-checkout-total",
    );
    expect(result.agent_message).not.toContain("must keep true");
  });

  test("still warns on direct .kb edits instead of guiding", async () => {
    const cwd = createWorkspace(MANIFEST);
    const pluginData = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-cursor-data-"),
    );
    tempRoots.push(pluginData);

    const result = await runHook(
      {
        hook_event_name: "preToolUse",
        cwd,
        tool_name: "Write",
        tool_input: { file_path: `${cwd}/.kb/requirements/REQ-a.md` },
      },
      { pluginData },
    );
    expect(result.agent_message).toContain(
      "Do not read or edit `.kb/` files directly",
    );
  });
});

describe("opt-in hook telemetry", () => {
  const optedIn = { KIBI_DIAGNOSTIC_MODE: "1" };

  async function post(
    cwd: string,
    pluginData: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    env: NodeJS.ProcessEnv,
  ) {
    return runHook(
      {
        hook_event_name: "postToolUse",
        conversation_id: "conv-1",
        cwd,
        tool_name: toolName,
        tool_input: toolInput,
      },
      { pluginData, env },
    );
  }

  test("records lookups and requirement-linked edits for the lookup-before-edit metric", async () => {
    const cwd = createWorkspace(MANIFEST);
    const pluginData = tempDir("kibi-cursor-data-");

    await post(cwd, pluginData, "MCP:kb_search", { query: "totals" }, optedIn);
    await post(
      cwd,
      pluginData,
      "Shell",
      { command: "npx --no-install kibi query --input -" },
      optedIn,
    );
    await post(
      cwd,
      pluginData,
      "Write",
      { file_path: "src/checkout.ts" },
      optedIn,
    );
    await post(cwd, pluginData, "Write", { file_path: "src/new.ts" }, optedIn);
    await post(cwd, pluginData, "Write", { file_path: "docs/a.md" }, optedIn);

    const rows = usageRows(cwd);
    expect(
      rows.map((row) => [
        row.hook_action,
        row.kb_operation,
        row.path,
        row.requirement_ids,
      ]),
    ).toEqual([
      ["kb_usage", "kb_search", null, []],
      ["kb_usage", "kb_query", null, []],
      ["edited", null, "src/checkout.ts", ["REQ-checkout-total"]],
      ["edited", null, "src/new.ts", []],
    ]);
    expect(rows[2]).toMatchObject({
      interface: "hook",
      host: "cursor",
      session_id: "conv-1",
      host_tool: "Write",
      path_kind: "source",
    });
  });

  test("writes nothing unless the operator opted in", async () => {
    const cwd = createWorkspace(MANIFEST);
    const pluginData = tempDir("kibi-cursor-data-");
    await post(cwd, pluginData, "MCP:kb_search", { query: "totals" }, {});
    await post(cwd, pluginData, "Write", { file_path: "src/checkout.ts" }, {});
    expect(usageRows(cwd)).toEqual([]);
  });
});
