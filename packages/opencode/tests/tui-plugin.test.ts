import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Mock dependencies
mock.module("../src/idle-brief-reader.js", () => ({
  selectLatestPersistedBrief: mock(),
  markBriefTuiSeen: mock(),
}));

mock.module("../src/tui-brief-view-model.js", () => ({
  buildTuiBriefViewModel: mock(),
}));

const { selectLatestPersistedBrief, markBriefTuiSeen } = await import("../src/idle-brief-reader.js");
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

describe("TUI Plugin - contentHash tracking and auto-open", () => {
  const workspaceRoot = path.join(os.tmpdir(), `kibi-tui-test-coh-${Date.now()}`);
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  const tuiSeenPath = path.join(briefsDir, ".tui-seen.json");

  function writeBriefFile(filename: string, overrides: { contentHash?: string; unread?: boolean } = {}) {
    const envelope = {
      briefId: "b1",
      schemaVersion: "1.0",
      type: "success",
      sessionId: "s1",
      branch: "main",
      createdAt: "2026-01-01T00:00:00.000Z",
      unread: overrides.unread ?? true,
      auditCursor: { lastTimestamp: "2026-01-01T00:00:00.000Z", lastOperation: "write", entryCount: 1, fileSize: 1 },
      summary: "Summary",
      validation: { violations: [] as unknown[], count: 0, diagnostics: [] as unknown[] },
      contentHash: overrides.contentHash ?? "hash-abc",
      counts: { requirementsAdded: 0, relationshipsAdded: 0, entitiesDeleted: 0 },
      briefing: { tldr: "TLDR", promptBlock: "Prompt", citations: [] as unknown[], constraints: [] as unknown[], regressionRisks: [] as unknown[], missingEvidence: [] as unknown[] },
    };
    fs.writeFileSync(path.join(briefsDir, filename), JSON.stringify(envelope));
  }

  function readTuiSeen(): Record<string, string[]> {
    try {
      return JSON.parse(fs.readFileSync(tuiSeenPath, "utf-8"));
    } catch {
      return {};
    }
  }

  let mockApi: {
    route: { register: ReturnType<typeof mock>; navigate: ReturnType<typeof mock> };
    command: { register: ReturnType<typeof mock> };
    state: { path: { worktree: string }; vcs: { branch: string } };
    theme: { current: { error: string; accent: string; warning: string } };
  };

  beforeEach(() => {
    fs.mkdirSync(briefsDir, { recursive: true });
    mockApi = {
      route: { register: mock().mockReturnValue(() => {}), navigate: mock() },
      command: { register: mock().mockReturnValue(() => {}) },
      state: { path: { worktree: workspaceRoot }, vcs: { branch: "main" } },
      theme: { current: { error: "red", accent: "blue", warning: "yellow" } },
    };
  });

  afterEach(() => {
    mock.restore();
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  test("marks brief as TUI-seen when rendering an unread brief", async () => {
    writeBriefFile("100_brief.json", { unread: true, contentHash: "hash-unread" });

    await plugin.tui(mockApi as never, undefined, {} as never);
    const routes = mockApi.route.register.mock.calls[0][0] as Array<{ name: string; render: () => unknown }>;
    const briefRoute = routes.find((r) => r.name === "kibi.brief");
    briefRoute!.render();

    const seen = readTuiSeen();
    expect(seen.main).toContain("hash-unread");
  });

  test("does not mark as TUI-seen when brief is already read", async () => {
    writeBriefFile("100_brief.json", { unread: false, contentHash: "hash-read" });

    await plugin.tui(mockApi as never, undefined, {} as never);
    const routes = mockApi.route.register.mock.calls[0][0] as Array<{ name: string; render: () => unknown }>;
    const briefRoute = routes.find((r) => r.name === "kibi.brief");
    briefRoute!.render();

    const seen = readTuiSeen();
    expect(seen.main).toBeUndefined();
  });

  test("tracks contentHash and only marks new hashes as TUI-seen", async () => {
    writeBriefFile("100_brief.json", { unread: true, contentHash: "hash-aaa" });

    await plugin.tui(mockApi as never, undefined, {} as never);
    const routes = mockApi.route.register.mock.calls[0][0] as Array<{ name: string; render: () => unknown }>;
    const briefRoute = routes.find((r) => r.name === "kibi.brief");

    // First render: marks hash-aaa as seen
    briefRoute!.render();
    let seen = readTuiSeen();
    expect(seen.main).toContain("hash-aaa");

    // Second render with same hash: should not add duplicate
    briefRoute!.render();
    seen = readTuiSeen();
    const countAfterSecond = seen.main.filter((h) => h === "hash-aaa").length;
    expect(countAfterSecond).toBe(1);

    // Replace brief with newer one (higher timestamp)
    writeBriefFile("200_brief.json", { unread: true, contentHash: "hash-bbb" });
    briefRoute!.render();
    seen = readTuiSeen();
    expect(seen.main).toContain("hash-bbb");
    expect(seen.main).toContain("hash-aaa");
  });

  test("refresh command navigates to kibi.brief route", async () => {
    await plugin.tui(mockApi as never, undefined, {} as never);

    const commandCall = mockApi.command.register.mock.calls[0][0];
    const commands = commandCall();
    const refreshCmd = commands.find((c: { value: string }) => c.value === "kibi.refresh_brief");
    expect(refreshCmd).toBeDefined();

    refreshCmd.onSelect();
    expect(mockApi.route.navigate).toHaveBeenCalledWith("kibi.brief");
  });

  test("marks seen once per unique contentHash even with multiple renders", async () => {
    writeBriefFile("100_brief.json", { unread: true, contentHash: "hash-stable" });

    await plugin.tui(mockApi as never, undefined, {} as never);
    const routes = mockApi.route.register.mock.calls[0][0] as Array<{ name: string; render: () => unknown }>;
    const briefRoute = routes.find((r) => r.name === "kibi.brief");

    for (let i = 0; i < 5; i++) {
      briefRoute!.render();
    }

    const seen = readTuiSeen();
    const count = seen.main.filter((h) => h === "hash-stable").length;
    expect(count).toBe(1);
  });
});
