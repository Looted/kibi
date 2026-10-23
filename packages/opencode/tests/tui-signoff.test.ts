import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { SyntaxStyle } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import {
  SIGNOFF_DIR,
  readLatestSignoff,
  renderSignoffBlock,
  setup,
  signoffToast,
  watchSignoff,
} from "../src/tui";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-tui-signoff-"));
  roots.push(root);
  return root;
}

function writeView(root: string, view: unknown, markdown: string): void {
  const directory = path.join(root, SIGNOFF_DIR);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "latest.json"), JSON.stringify(view));
  writeFileSync(path.join(directory, "latest.md"), markdown);
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("signoff views in the OpenCode TUI", () => {
  // implements REQ-kibi-signoff-views
  test("reads the latest questions view and counts open decisions", () => {
    const root = workspace();
    expect(readLatestSignoff(root)).toBeUndefined();
    writeView(
      root,
      {
        kind: "questions",
        questions: [
          { statement: "A" },
          { statement: "B", answer: "yes" },
          { statement: "C", answer: " " },
        ],
      },
      "## Decisions to confirm: 2 open, 1 answered\n",
    );
    const latest = readLatestSignoff(root);
    expect(latest).toEqual({
      kind: "questions",
      count: 3,
      open: 2,
      markdown: "## Decisions to confirm: 2 open, 1 answered\n",
    });
    expect(latest && signoffToast(latest)).toEqual({
      title: "Kibi decisions",
      message:
        "2 decisions wait for your answer. Type /kibi-signoff to read them.",
      variant: "warning",
    });
  });

  test("announces a summary with its requirement count", () => {
    expect(
      signoffToast({ kind: "summary", count: 1, open: 0, markdown: "" }),
    ).toEqual({
      title: "Kibi signoff",
      message:
        "Signoff summary ready: 1 requirement. Type /kibi-signoff to read it.",
      variant: "info",
    });
  });

  test("calls back when kibi signoff writes a new view", async () => {
    const root = workspace();
    const seen: number[] = [];
    const stop = watchSignoff(root, (latest) => seen.push(latest.count), 10);
    writeView(root, { kind: "summary", requirements: [{}, {}] }, "");
    await new Promise((resolve) => setTimeout(resolve, 60));
    stop();
    expect(seen).toEqual([2]);
  });

  test("v2 setup registers both fences and the /kibi-signoff command", async () => {
    const root = workspace();
    writeView(
      root,
      { kind: "summary", requirements: [{}] },
      "## Requirements signoff: 1 new\n",
    );
    const fences: string[] = [];
    const alerts: { title: string; message: string }[] = [];
    let layer:
      | {
          commands?: readonly {
            slash?: { name: string };
            run: () => unknown;
          }[];
        }
      | undefined;
    const cwd = process.cwd();
    process.chdir(root);
    try {
      const cleanup = setup({
        renderer: {},
        markdown: {
          registerCodeBlockRenderer: (language: string) => {
            fences.push(language);
            return () => {};
          },
        },
        keymap: {
          layer: (factory: () => typeof layer) => {
            layer = factory();
          },
        },
        ui: {
          toast: { show: () => {} },
          dialog: {
            alert: async (options: { title: string; message: string }) => {
              alerts.push(options);
            },
          },
        },
      });
      const command = layer?.commands?.[0];
      expect(command?.slash?.name).toBe("kibi-signoff");
      await command?.run();
      cleanup();
    } finally {
      process.chdir(cwd);
    }
    expect(fences).toEqual(["kibi-signoff", "kibi-questions"]);
    expect(alerts).toEqual([
      {
        title: "Kibi requirements signoff",
        message: "## Requirements signoff: 1 new",
      },
    ]);
  });

  test("renders a signoff fence as a framed Markdown card, not code", async () => {
    const setupRenderer = await createTestRenderer({ width: 60, height: 12 });
    try {
      const { renderer } = setupRenderer;
      const card = renderSignoffBlock(
        renderer,
        {
          lang: "kibi-questions",
          text: "## Decisions to confirm: 1 open\n\n> Refunds need approval.",
        },
        {
          syntaxStyle: SyntaxStyle.create(renderer.nativeScene as never),
          conceal: true,
        },
      );
      renderer.root.add(card);
      const frame = await setupRenderer.waitForFrame((text) =>
        text.includes("Refunds need approval."),
      );
      expect(frame).toContain("Kibi decisions");
      expect(frame).toContain("Decisions to confirm: 1 open");
      expect(frame).toContain("Refunds need approval.");
      expect(frame).not.toContain("```");
    } finally {
      await setupRenderer.dispose();
    }
  });
});
