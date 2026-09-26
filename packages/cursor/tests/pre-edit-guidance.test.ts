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
    expect(first.agent_message).toContain("Kibi pre-edit guidance");
    expect(first.agent_message).toContain("REQ-checkout-total");
    expect(first.agent_message).not.toContain("TEST-checkout-total");
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
