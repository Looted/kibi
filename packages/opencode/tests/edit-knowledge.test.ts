/// <reference types="bun-types" />
// implements REQ-opencode-kibi-plugin-v1
import { afterEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { recordOpencodeToolTelemetry } from "../src/hook-telemetry";
import kibiOpencodePlugin from "../src/index";
import { buildPrompt } from "../src/prompt";

const supportedCapability = {
  supported: true,
  pluginVersion: "test",
} as const;

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

/** Workspace whose checkout code implements a grounded requirement. */
function linkedWorkspace(requirementStatus = "open"): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-edit-"));
  roots.push(root);
  write(
    root,
    ".kb/symbols.yaml",
    [
      "symbols:",
      "  - id: SYM-computeTotal",
      "    sourceFile: src/checkout.ts",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-checkout-rounding",
      "",
    ].join("\n"),
  );
  write(
    root,
    ".kb/requirements/REQ-checkout-rounding.md",
    `---\nid: REQ-checkout-rounding\ntitle: Checkout totals round to cents\nstatus: ${requirementStatus}\nlinks:\n  - type: requires_property\n    target: FACT-total-rounding-cents\n  - type: constrains\n    target: FACT-checkout-total\n  - ADR-money-as-decimal\n---\n`,
  );
  write(
    root,
    ".kb/facts/FACT-total-rounding-cents.md",
    "---\nid: FACT-total-rounding-cents\ntitle: Totals round half up to two decimals\nstatus: active\n---\n",
  );
  write(
    root,
    ".kb/adr/ADR-money-as-decimal.md",
    "---\nid: ADR-money-as-decimal\ntitle: Money is computed as decimal cents\nstatus: accepted\n---\n",
  );
  write(root, "src/checkout.ts", "export const total = 1;\n");
  return root;
}

function editPrompt(root: string): string {
  return buildPrompt(
    {
      recentEdits: [{ path: "src/checkout.ts", kind: "code" }],
      focusEdit: { path: "src/checkout.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      workspaceRoot: root,
      branch: "edit-knowledge-test",
    },
    supportedCapability,
  );
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

describe("edit guidance grounding", () => {
  test("names what the linked requirement must keep true and the decision behind it", () => {
    const prompt = editPrompt(linkedWorkspace());

    assert.match(prompt, /- Existing Kibi links: REQ-checkout-rounding\n/);
    assert.ok(
      prompt.includes(
        "- REQ-checkout-rounding must keep true: FACT-total-rounding-cents: Totals round half up to two decimals +1. Decision: ADR-money-as-decimal: Money is computed as decimal cents.",
      ),
      prompt,
    );
    // The grounding bullet stays inside the prompt's word budget.
    assert.ok(wordCount(prompt) <= 120, `${wordCount(prompt)} words`);
  });

  test("a superseded requirement is not presented as something to keep true", () => {
    const prompt = editPrompt(linkedWorkspace("superseded"));

    assert.match(prompt, /- Existing Kibi links: REQ-checkout-rounding/);
    assert.ok(!prompt.includes("must keep true"), prompt);
    assert.ok(!prompt.includes("Decision:"), prompt);
  });
});

describe("opt-in tool telemetry", () => {
  const optedIn = { KIBI_DIAGNOSTIC_MODE: "1" };

  function usageRows(root: string): Record<string, unknown>[] {
    const logPath = path.join(root, ".kb", "usage.log");
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  function record(
    root: string,
    tool: string,
    args: Record<string, unknown>,
    env: NodeJS.ProcessEnv,
  ): void {
    recordOpencodeToolTelemetry(
      {
        worktree: root,
        tool,
        args,
        sessionId: "ses-1",
        startedAt: new Date(),
      },
      env,
    );
  }

  test("records lookups and the requirements an edited file implements", () => {
    const root = linkedWorkspace();
    record(root, "kibi_kb_search", { query: "rounding" }, optedIn);
    record(root, "bash", { command: "npx kibi query --input -" }, optedIn);
    record(
      root,
      "edit",
      { filePath: path.join(root, "src/checkout.ts") },
      optedIn,
    );
    record(root, "read", { filePath: "src/checkout.ts" }, optedIn);

    const rows = usageRows(root);
    assert.deepEqual(
      rows.map((row) => [
        row.hook_action,
        row.kb_operation,
        row.path,
        row.requirement_ids,
      ]),
      [
        ["kb_usage", "kb_search", null, []],
        ["kb_usage", "kb_query", null, []],
        ["edited", null, "src/checkout.ts", ["REQ-checkout-rounding"]],
      ],
    );
    assert.equal(rows[2]?.interface, "hook");
    assert.equal(rows[2]?.host, "opencode");
    assert.equal(rows[2]?.session_id, "ses-1");
  });

  test("writes nothing unless the operator opted in", () => {
    const root = linkedWorkspace();
    record(root, "edit", { filePath: "src/checkout.ts" }, {});
    assert.deepEqual(usageRows(root), []);
  });

  test("the plugin records tool calls through its tool.execute.after hook", async () => {
    const root = linkedWorkspace();
    const previous = process.env.KIBI_DIAGNOSTIC_MODE;
    process.env.KIBI_DIAGNOSTIC_MODE = "1";
    try {
      const hooks = await kibiOpencodePlugin({
        directory: root,
        worktree: root,
        client: { app: { log: async () => {} } },
      });
      await hooks["tool.execute.after"]?.({
        tool: "kibi_kb_query",
        sessionID: "ses-plugin",
        args: { sourceFile: "src/checkout.ts" },
      });
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_DIAGNOSTIC_MODE");
      } else {
        process.env.KIBI_DIAGNOSTIC_MODE = previous;
      }
    }

    assert.deepEqual(
      usageRows(root).map((row) => [
        row.hook_action,
        row.kb_operation,
        row.session_id,
      ]),
      [["kb_usage", "kb_query", "ses-plugin"]],
    );
  });
});
