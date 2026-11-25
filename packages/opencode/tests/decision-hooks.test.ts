import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  captureReminder,
  ruleCaptureTemplate,
  rulePromptNote,
  signoffReminder,
} from "kibi-agent-core/decision-guard";
import {
  createDecisionHooks,
  decisionStateDir,
  messageText,
  toolReads,
} from "../src/decision-hooks";
import kibiOpencodePlugin from "../src/plugin.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function tempRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

function write(root: string, relative: string, content: string): void {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

/** A workspace whose computeTotal implements a firm (human-stated) rule. */
function linkedWorkspace(): string {
  const root = tempRoot("kibi-opencode-decisions-");
  write(root, ".kb/manifest.json", "{}\n");
  write(
    root,
    ".kb/symbols.yaml",
    [
      "symbols:",
      "  - id: SYM-computeTotal",
      "    title: computeTotal",
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
    "---\nid: REQ-checkout-rounding\ntitle: Checkout totals round to cents\nstatus: open\norigin:\n  kind: human\n  recorded_at: '2026-10-01T00:00:00Z'\n---\n",
  );
  write(root, "src/checkout.ts", "export const computeTotal = 1;\n");
  write(root, "src/other.ts", "export const other = 1;\n");
  return root;
}

function hooks(root: string, env: NodeJS.ProcessEnv = {}) {
  const prompts: [string, string][] = [];
  const decisions = createDecisionHooks({
    workspaceRoot: root,
    stateRoot: tempRoot("kibi-opencode-state-"),
    env,
    prompt: async (sessionId, text) => {
      prompts.push([sessionId, text]);
    },
  });
  return { decisions, prompts };
}

const text = (value: string) => [{ type: "text", text: value }];

describe("messageText", () => {
  test("joins the person's text parts and skips synthetic and other parts", () => {
    expect(
      messageText([
        { type: "text", text: "a" },
        { type: "text", text: "kibi", synthetic: true },
        { type: "file", text: "x" },
        null,
        { type: "text", text: "b" },
      ]),
    ).toBe("a\nb");
    expect(messageText("a")).toBe("");
  });
});

describe("decisionStateDir", () => {
  test("keys markers by the resolved workspace root", () => {
    expect(decisionStateDir("/w/a", "/s")).not.toBe(
      decisionStateDir("/w/b", "/s"),
    );
    expect(decisionStateDir("/w/a/../a", "/s")).toBe(
      decisionStateDir("/w/a", "/s"),
    );
    expect(decisionStateDir("/w/a")).toStartWith(os.tmpdir());
  });
});

describe("OpenCode decision hooks", () => {
  test("a rule prompt's note and capture template follow the first source edit", () => {
    const root = linkedWorkspace();
    const { decisions } = hooks(root, { KIBI_CONFIRM_FIRM_EDITS: "0" });
    decisions.chatMessage(
      "s1",
      text("Totals must not be rounded, because refunds drift."),
    );
    const edit = { filePath: path.join(root, "src/other.ts") };
    const note = decisions.afterTool("edit", "s1", edit) ?? "";
    expect(note).toStartWith(
      rulePromptNote("must not", "because refunds drift"),
    );
    expect(note).toContain(
      ruleCaptureTemplate("must not", "because refunds drift"),
    );
    expect(decisions.afterTool("edit", "s1", edit)).toBeUndefined();
  });

  test("a firm-rule edit is stopped once with the notice, then goes through", () => {
    const root = linkedWorkspace();
    const { decisions } = hooks(root);
    const args = { filePath: path.join(root, "src/checkout.ts") };
    expect(() => decisions.beforeTool("write", "s1", args)).toThrow(
      "Kibi: this edit changes src/checkout.ts, which implements a firm requirement, a rule the person set: REQ-checkout-rounding: Checkout totals round to cents.",
    );
    expect(() => decisions.beforeTool("write", "s1", args)).not.toThrow();
    expect(() => decisions.beforeTool("write", "s2", args)).toThrow();
    // Other files, other tools and an operator opt-out are left alone.
    expect(() =>
      decisions.beforeTool("write", "s3", {
        filePath: path.join(root, "src/other.ts"),
      }),
    ).not.toThrow();
    expect(() => decisions.beforeTool("read", "s3", args)).not.toThrow();
    expect(() => decisions.beforeTool(undefined, "s3", args)).not.toThrow();
    const off = hooks(root, { KIBI_CONFIRM_FIRM_EDITS: "off" }).decisions;
    expect(() => off.beforeTool("write", "s1", args)).not.toThrow();
  });

  test("a shell call that writes firm code in place is stopped once with the notice", () => {
    const root = linkedWorkspace();
    const { decisions } = hooks(root);
    expect(() =>
      decisions.beforeTool("bash", "s1", { command: "cat src/checkout.ts" }),
    ).not.toThrow();
    const sed = { command: "sed -i s/1/2/ src/checkout.ts" };
    expect(() => decisions.beforeTool("bash", "s1", sed)).toThrow(
      "Kibi: this edit changes src/checkout.ts, which implements a firm requirement",
    );
    expect(() => decisions.beforeTool("bash", "s1", sed)).not.toThrow();
  });

  test("an edit whose location is not found counts as touching the whole file", () => {
    const root = linkedWorkspace();
    const { decisions } = hooks(root);
    expect(() =>
      decisions.beforeTool("edit", "s1", {
        filePath: path.join(root, "src/checkout.ts"),
        oldString: "nowhere",
        newString: "x",
      }),
    ).toThrow("which implements a firm requirement");
  });

  test("idle asks once for the decision record after a source edit with nothing recorded", async () => {
    const root = linkedWorkspace();
    const { decisions, prompts } = hooks(root, {
      KIBI_CONFIRM_FIRM_EDITS: "0",
    });
    decisions.chatMessage("s1", text("Guests should never see totals."));
    decisions.afterTool("bash", "s1", {
      command: "sed -i 's/1/2/' src/other.ts",
    });
    await decisions.sessionIdle("s1");
    await decisions.sessionIdle("s1");
    await decisions.sessionIdle(undefined);
    expect(prompts).toEqual([["s1", captureReminder("should never")]]);
  });

  test("a kb_upsert keeps idle from asking, and a requirement write asks for signoff", async () => {
    const root = linkedWorkspace();
    const { decisions, prompts } = hooks(root);
    decisions.afterTool("write", "s1", {
      filePath: path.join(root, "src/other.ts"),
    });
    decisions.afterTool("kibi_kb_upsert", "s1", {
      type: "req",
      id: "REQ-x",
      properties: {},
    });
    await decisions.sessionIdle("s1");
    expect(prompts).toEqual([["s1", signoffReminder()]]);
    expect(decisions.afterTool(undefined, "s1", {})).toBeUndefined();
  });

  test("a rule recorded through the CLI or under any server key is counted", async () => {
    const root = linkedWorkspace();
    for (const [tool, args] of [
      [
        "bash",
        { command: "printf '{}' | npx --no-install kibi record --input -" },
      ],
      [
        "kibi-mcp_kb_record",
        { statement: "s", why: "w", saidBy: "user", code: [] },
      ],
      ["mykb_kb_upsert", { type: "symbol", id: "SYM-x", properties: {} }],
    ] as const) {
      const { decisions, prompts } = hooks(root);
      decisions.chatMessage("s1", text("Guests should never see totals."));
      decisions.afterTool("write", "s1", {
        filePath: path.join(root, "src/other.ts"),
      });
      decisions.afterTool(tool, "s1", args);
      await decisions.sessionIdle("s1");
      // Recorded: no capture request (a recorded rule asks for signoff).
      expect(prompts.map(([, prompt]) => prompt)).not.toContain(
        captureReminder("should never"),
      );
      expect(prompts.length).toBeLessThanOrEqual(1);
    }
  });

  test("no prompt function means no idle follow-up", async () => {
    const root = linkedWorkspace();
    const decisions = createDecisionHooks({
      workspaceRoot: root,
      stateRoot: tempRoot("kibi-opencode-state-"),
    });
    decisions.afterTool("write", "s1", {
      filePath: path.join(root, "src/other.ts"),
    });
    await expect(decisions.sessionIdle("s1")).resolves.toBeUndefined();
    decisions.chatMessage("s1", text("   "));
    decisions.chatMessage("s1", undefined);
  });
});

describe("OpenCode read, grep and bash rows", () => {
  test("a read of linked code shows its requirement once per session", () => {
    const root = linkedWorkspace();
    const { decisions } = hooks(root);
    const read = { filePath: "src/checkout.ts" };
    const note = decisions.afterTool("read", "s1", read) ?? "";
    expect(note).toStartWith("Kibi requirements for the code in view:");
    expect(note).toContain("REQ-checkout-rounding");
    expect(decisions.afterTool("read", "s1", read)).toBeUndefined();
    expect(decisions.afterTool("read", "s2", read)).toContain(
      "REQ-checkout-rounding",
    );
    expect(
      decisions.afterTool("read", undefined, { filePath: "src/other.ts" }),
    ).toBeUndefined();
  });

  test("grep and bash reads show rows; glob and unreadable input show none", () => {
    const root = linkedWorkspace();
    write(
      root,
      ".kb/symbol-coordinates.yaml",
      "coordinates:\n  SYM-computeTotal:\n    sourceLine: 1\n    sourceEndLine: 1\n",
    );
    const { decisions } = hooks(root);
    expect(
      decisions.afterTool("grep", "g1", { pattern: "computeTotal" }),
    ).toContain("REQ-checkout-rounding");
    expect(
      decisions.afterTool("bash", "b1", {
        command: "sed -n '1,1p' src/checkout.ts",
      }),
    ).toContain("REQ-checkout-rounding");
    expect(
      decisions.afterTool("glob", "c1", { pattern: "**/*.ts" }),
    ).toBeUndefined();
    expect(
      decisions.afterTool("grep", "d1", {
        pattern: "computeTotal",
        include: "*.md",
      }),
    ).toBeUndefined();
    // A tool input that cannot be read leaves the output as it is.
    const broken = {
      get filePath(): string {
        throw new Error("unreadable");
      },
    };
    expect(decisions.afterTool("read", "e1", broken)).toBeUndefined();
  });

  test("toolReads reads each tool's arguments", () => {
    const root = linkedWorkspace();
    const absolute = path.join(root, "src/checkout.ts");
    expect(toolReads(root, "read", { filePath: "src/checkout.ts" })).toEqual({
      reads: [{ absolute, directory: false }],
    });
    expect(
      toolReads(root, "read", { filePath: absolute, offset: 5, limit: 10 }),
    ).toEqual({
      reads: [{ absolute, directory: false, focus: [{ start: 5, end: 14 }] }],
    });
    expect(toolReads(root, "read", { filePath: absolute, offset: 0 })).toEqual({
      reads: [{ absolute, directory: false, focus: [{ start: 1, end: 2000 }] }],
    });
    expect(toolReads(root, "read", { filePath: absolute, limit: 3 })).toEqual({
      reads: [{ absolute, directory: false, focus: [{ start: 1, end: 3 }] }],
    });
    expect(toolReads(root, "read", {})).toEqual({ reads: [] });
    expect(toolReads(root, "read", null)).toEqual({ reads: [] });
    expect(toolReads(root, "grep", { pattern: "" })).toEqual({ reads: [] });
    expect(
      toolReads(root, "grep", { pattern: "x", path: "src" }).reads[0],
    ).toMatchObject({ absolute: path.join(root, "src"), directory: true });
    expect(toolReads(root, "glob", { pattern: "*" })).toEqual({ reads: [] });
  });
});

describe("the plugin's decision hooks", () => {
  test("wire the message, tool and idle hooks in a workspace that adopted Kibi", async () => {
    const root = linkedWorkspace();
    const prompts: unknown[] = [];
    const hooks = await kibiOpencodePlugin({
      directory: root,
      worktree: root,
      client: {
        app: { log: async () => {} },
        session: {
          prompt: async (payload) => {
            prompts.push(payload);
          },
        },
      },
    });
    await hooks["chat.message"]?.(
      { sessionID: "ses-d" },
      { parts: text("Guests should never see totals.") },
    );
    const args = { filePath: path.join(root, "src/checkout.ts") };
    await expect(
      hooks["tool.execute.before"]?.(
        { tool: "write", sessionID: "ses-d" },
        { args },
      ),
    ).rejects.toThrow("which implements a firm requirement");
    const output = { output: "Wrote file." };
    await hooks["tool.execute.after"]?.(
      { tool: "write", sessionID: "ses-d", args },
      output,
    );
    expect(output.output).toStartWith(
      `Wrote file.\n\n${rulePromptNote("should never")}`,
    );
    const empty: { output?: unknown } = {};
    await hooks["tool.execute.after"]?.(
      { tool: "write", sessionID: "ses-e", args },
      empty,
    );
    expect(empty.output).toBeUndefined();
    await hooks.event?.({
      event: { type: "session.idle", properties: { sessionID: "ses-d" } },
    });
    await hooks.event?.({ event: { type: "session.idle" } });
    expect(prompts).toEqual([
      {
        path: { id: "ses-d" },
        body: {
          parts: [{ type: "text", text: captureReminder("should never") }],
        },
      },
    ]);
  });

  test("register no decision hooks in a workspace without Kibi", async () => {
    const root = tempRoot("kibi-opencode-plain-");
    const hooks = await kibiOpencodePlugin({
      directory: root,
      worktree: root,
      client: { app: { log: async () => {} } },
    });
    expect(hooks["chat.message"]).toBeUndefined();
    expect(hooks["tool.execute.before"]).toBeUndefined();
  });
});
