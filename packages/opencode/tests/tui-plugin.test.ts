import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Mock dependencies
mock.module("../src/idle-brief-reader.js", () => ({
  selectLatestPersistedBrief: mock(),
}));

mock.module("../src/tui-brief-view-model.js", () => ({
  buildTuiBriefViewModel: mock(),
}));

const { selectLatestPersistedBrief } = await import("../src/idle-brief-reader.js");
const { buildTuiBriefViewModel } = await import("../src/tui-brief-view-model.js");
const { default: plugin } = await import("../dist/tui.js");

// Mock JSX factory
type JsxChild = string | number | boolean | null | undefined | Record<string, unknown>;
(globalThis as unknown as { h: (tag: unknown, props: unknown, ...children: JsxChild[]) => unknown }).h = (
  tag,
  props,
  ...children
) => ({ tag, props, children });
(globalThis as unknown as { Fragment: string }).Fragment = "Fragment";

describe("TUI Plugin", () => {
  const workspaceRoot = path.join(os.tmpdir(), `kibi-tui-test-${Date.now()}`);
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  let mockApi: {
    route: { register: ReturnType<typeof mock>; navigate: ReturnType<typeof mock> };
    command: { register: ReturnType<typeof mock> };
    state: { path: { worktree: string }; vcs: { branch: string } };
    theme: { current: { error: string; accent: string; warning: string } };
  };

  beforeEach(() => {
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.mkdirSync(briefsDir, { recursive: true });
    fs.writeFileSync(
      path.join(briefsDir, "123_brief.json"),
      JSON.stringify({
        briefId: "123",
        schemaVersion: "1.0",
        type: "success",
        sessionId: "session-1",
        branch: "main",
        createdAt: "2026-01-01T00:00:00.000Z",
        unread: true,
        auditCursor: {
          lastTimestamp: "2026-01-01T00:00:00.000Z",
          lastOperation: "write",
          entryCount: 1,
          fileSize: 1,
        },
        summary: "Summary",
        validation: { violations: [], count: 0, diagnostics: [] },
        contentHash: "hash-123",
        counts: { requirementsAdded: 0, relationshipsAdded: 0, entitiesDeleted: 0 },
        briefing: {
          tldr: "TLDR",
          promptBlock: "Prompt",
          citations: [],
        },
      }),
    );
    mockApi = {
      route: {
        register: mock().mockReturnValue(() => {}),
        navigate: mock(),
      },
      command: {
        register: mock().mockReturnValue(() => {}),
      },
      state: {
        path: {
          worktree: workspaceRoot,
        },
        vcs: {
          branch: "main",
        },
      },
      theme: {
        current: {
          error: "red",
          accent: "blue",
          warning: "yellow"
        }
      }
    };
  });

  afterEach(() => {
    mock.restore();
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  test("registers kibi.brief route and command", async () => {
    await plugin.tui(mockApi as never, undefined, {} as never);

    expect(mockApi.route.register).toHaveBeenCalled();
    expect(mockApi.command.register).toHaveBeenCalled();

    const commandCall = mockApi.command.register.mock.calls[0][0];
    const commands = commandCall();
    expect(commands[0].value).toBe("kibi.open_latest_brief");
    
    // Trigger command should navigate
    commands[0].onSelect();
    expect(mockApi.route.navigate).toHaveBeenCalledWith("kibi.brief");
  });
  
  test("route render works when brief exists", async () => {
    await plugin.tui(mockApi as never, undefined, {} as never);
    const routes = mockApi.route.register.mock.calls[0][0] as Array<{ name: string; render: () => unknown }>;
    const kibiBriefRoute = routes.find((r) => r.name === "kibi.brief");
    expect(kibiBriefRoute).toBeDefined();
    const rendered = kibiBriefRoute?.render();
    expect(rendered).toBeDefined();
  });
});
