import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { SyntaxStyle } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import {
  SIGNOFF_DIR,
  readLatestSignoff,
  setup,
  signoffToast,
  tui,
} from "../src/tui";

const roots: string[] = [];
const realCwd = process.cwd();

afterEach(() => {
  process.chdir(realCwd);
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function workspace(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-tui-mut-"));
  roots.push(root);
  return root;
}

function writeJson(root: string, view: unknown): void {
  const directory = path.join(root, SIGNOFF_DIR);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "latest.json"), JSON.stringify(view));
}

/** Captures the poll callback instead of starting a real interval. */
function captureInterval() {
  const ticks: Array<() => void> = [];
  const set = spyOn(globalThis, "setInterval").mockImplementation(((
    fn: () => void,
  ) => {
    ticks.push(fn);
    return { unref() {} } as unknown as ReturnType<typeof setInterval>;
  }) as unknown as typeof setInterval);
  const clear = spyOn(globalThis, "clearInterval").mockImplementation(() => {});
  return {
    ticks,
    restore() {
      set.mockRestore();
      clear.mockRestore();
    },
  };
}

describe("readLatestSignoff and signoffToast", () => {
  test("a view without markdown reads as empty text", () => {
    const root = workspace();
    writeJson(root, { kind: "summary", requirements: [] });
    expect(readLatestSignoff(root)).toEqual({
      kind: "summary",
      count: 0,
      open: 0,
      markdown: "",
    });
  });

  test("answered and single open decisions", () => {
    expect(
      signoffToast({ kind: "questions", count: 2, open: 0, markdown: "" }),
    ).toEqual({
      title: "Kibi decisions",
      message: "Every decision is answered.",
      variant: "info",
    });
    expect(
      signoffToast({ kind: "questions", count: 2, open: 1, markdown: "" }),
    ).toEqual({
      title: "Kibi decisions",
      message:
        "1 decision waits for your answer. Type /kibi-signoff to read it.",
      variant: "warning",
    });
  });
});

describe("tui", () => {
  test("toasts each new view and stops on dispose", async () => {
    const root = workspace();
    process.chdir(root);
    const interval = captureInterval();
    const toasts: unknown[] = [];
    let dispose: (() => void) | undefined;
    try {
      await tui(
        {
          ui: { toast: (toast: unknown) => toasts.push(toast) },
          lifecycle: {
            onDispose: (fn: () => void) => {
              dispose = fn;
            },
          },
        } as never,
        {} as never,
        {} as never,
      );
      writeJson(root, { kind: "summary", requirements: [{}] });
      interval.ticks[0]?.();
      expect(toasts).toEqual([
        {
          title: "Kibi signoff",
          message:
            "Signoff summary ready: 1 requirement. Type /kibi-signoff to read it.",
          variant: "info",
        },
      ]);
      expect(typeof dispose).toBe("function");
      dispose?.();
    } finally {
      interval.restore();
    }
  });
});

describe("setup", () => {
  test("renders fences, shows decisions or a placeholder, and toasts", async () => {
    const root = workspace();
    process.chdir(root);
    const interval = captureInterval();
    const renderers: Array<(token: unknown, node: unknown) => unknown> = [];
    const alerts: unknown[] = [];
    const toasts: unknown[] = [];
    let run: (() => Promise<void>) | undefined;
    const testRenderer = await createTestRenderer({ width: 40, height: 8 });
    try {
      const cleanup = setup({
        renderer: testRenderer.renderer,
        markdown: {
          registerCodeBlockRenderer: (
            _fence: string,
            render: (token: unknown, node: unknown) => unknown,
          ) => {
            renderers.push(render);
            return undefined;
          },
        },
        keymap: {
          layer: (factory: () => { commands: Array<{ run: () => never }> }) => {
            run = factory().commands[0]?.run;
          },
        },
        ui: {
          toast: { show: (toast: unknown) => toasts.push(toast) },
          dialog: { alert: async (options: unknown) => alerts.push(options) },
        },
      });
      const card = renderers[0]?.(
        { lang: "kibi-signoff", text: "## Hi" },
        {
          syntaxStyle: SyntaxStyle.create(
            testRenderer.renderer.nativeScene as never,
          ),
          conceal: true,
        },
      );
      expect(card).toBeDefined();

      await run?.();
      writeJson(root, { kind: "questions", questions: [{}] });
      await run?.();
      interval.ticks[0]?.();
      cleanup();
      expect(alerts).toEqual([
        {
          title: "Kibi requirements signoff",
          message:
            "No signoff view yet. The agent writes one with kibi signoff.",
        },
        {
          title: "Kibi decisions",
          message:
            "No signoff view yet. The agent writes one with kibi signoff.",
        },
      ]);
      expect(toasts).toHaveLength(1);
    } finally {
      interval.restore();
      await testRenderer.dispose();
    }
  });
});
