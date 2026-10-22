import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

type Listener = () => Promise<void> | void;

let commandHandler: (() => void) | undefined;
let changeListener: Listener | undefined;
let createListener: Listener | undefined;
let panels: { webview: { html: string }; reveal: () => void }[] = [];
let choice: string | undefined;
const messages: string[] = [];

function installMock(): void {
  resetVscodeMock({
    commands: {
      registerCommand: mock((_id: string, handler: () => void) => {
        commandHandler = handler;
        return { dispose() {} };
      }),
    },
    workspace: {
      createFileSystemWatcher: mock(() => ({
        onDidCreate: (listener: Listener) => {
          createListener = listener;
        },
        onDidChange: (listener: Listener) => {
          changeListener = listener;
        },
        dispose() {},
      })),
    },
    window: {
      showInformationMessage: mock(async (message: string) => {
        messages.push(message);
        return choice;
      }),
      createWebviewPanel: mock(() => {
        const panel = {
          webview: { html: "" },
          reveal: () => {},
          onDidDispose: () => ({ dispose() {} }),
        };
        panels.push(panel);
        return panel;
      }),
    },
  });
  mock.module("vscode", () => ({
    ...getVscodeMockModule(),
    ViewColumn: { Beside: -2 },
  }));
}

installMock();

const { registerSignoff, signoffAnnouncement } = await import(
  "../src/activation/signoff"
);

let root: string;

function writeLatest(view: unknown, html = "<html>signoff</html>"): void {
  const directory = path.join(root, ".kb", "briefs", "signoff");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "latest.json"), JSON.stringify(view));
  fs.writeFileSync(path.join(directory, "latest.html"), html);
}

beforeEach(() => {
  installMock();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vscode-signoff-"));
  commandHandler = undefined;
  changeListener = undefined;
  createListener = undefined;
  panels = [];
  choice = undefined;
  messages.length = 0;
});

afterAll(() => {
  mock.restore();
});

describe("requirements signoff view", () => {
  // implements REQ-kibi-signoff-views
  test("announces open decisions and summaries, not answered questions", () => {
    expect(
      signoffAnnouncement(
        JSON.stringify({
          kind: "questions",
          questions: [{ statement: "a" }, { statement: "b", answer: "yes" }],
        }),
      ),
    ).toEqual({
      message: "Kibi: 1 decision waits for your answer.",
      openLabel: "Show decisions",
    });
    expect(
      signoffAnnouncement(
        JSON.stringify({ kind: "questions", questions: [{ answer: "no" }] }),
      ),
    ).toBeUndefined();
    expect(
      signoffAnnouncement(
        JSON.stringify({ kind: "summary", requirements: [{}, {}] }),
      ),
    ).toEqual({
      message: "Kibi: requirements signoff ready (2 requirements).",
      openLabel: "Show signoff",
    });
    expect(signoffAnnouncement("{not json")).toBeUndefined();
  });

  test("opens the latest page in a webview when the person accepts", async () => {
    const context = { subscriptions: [] as unknown[] };
    const output = { appendLine: mock(() => {}) };
    registerSignoff(context as never, output as never, root);
    expect(context.subscriptions).toHaveLength(2);

    writeLatest({ kind: "summary", requirements: [{}] }, "<html>v1</html>");
    choice = "Show signoff";
    await createListener?.();
    expect(messages).toEqual([
      "Kibi: requirements signoff ready (1 requirement).",
    ]);
    expect(panels).toHaveLength(1);
    expect(panels[0]?.webview.html).toBe("<html>v1</html>");

    // An open panel refreshes in place instead of announcing again.
    writeLatest({ kind: "summary", requirements: [{}] }, "<html>v2</html>");
    await changeListener?.();
    expect(messages).toHaveLength(1);
    expect(panels[0]?.webview.html).toBe("<html>v2</html>");
  });

  test("the command shows a placeholder before any view exists", () => {
    const context = { subscriptions: [] as unknown[] };
    registerSignoff(context as never, { appendLine: () => {} } as never, root);
    commandHandler?.();
    expect(panels[0]?.webview.html).toContain("No signoff view yet");
  });
});
