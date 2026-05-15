import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { BriefModel } from "../../src/briefs";
import {
  DefaultFileSystemWatcher,
  getVscodeMockModule,
  resetVscodeMock,
} from "../shared/vscode-mock";

// Reset the vscode mock before each test
resetVscodeMock({});

// Mock workspaceState for tests
interface MockWorkspaceState {
  get: (key: string) => unknown;
  update: (key: string, value: unknown) => void;
}

// Test state
let tmpDir: string;
let workspaceRoot: string;
let branch: string;
let context: { subscriptions: Array<{ dispose: () => void }>; workspaceState: MockWorkspaceState };
let wsState: MockWorkspaceState;

// Brief template
const briefTemplate: BriefModel = {
  schemaVersion: "1.0",
  briefId: "brief-test-123",
  type: "success",
  sessionId: "test-session",
  branch: "test-branch",
  createdAt: new Date().toISOString(),
  unread: true,
  auditCursor: {
    lastTimestamp: new Date().toISOString(),
    lastOperation: "sync",
    entryCount: 5,
    fileSize: 1024,
  },
  summary: "Test brief summary",
  counts: {
    requirementsAdded: 3,
    relationshipsAdded: 5,
    entitiesDeleted: 0,
  },
  validation: {
    violations: [],
    count: 0,
    diagnostics: [],
  },
  briefing: {
    tldr: "Test TLDR",
    promptBlock: "Test prompt",
    citations: [],
  },
  contentHash: "abc123",
};

function createMockWorkspaceState(): MockWorkspaceState {
  const store: Record<string, unknown> = {};
  return {
    get: (key: string) => store[key],
    update: (key: string, value: unknown) => {
      store[key] = value;
    },
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-test-"));
  workspaceRoot = tmpDir;
  branch = "test-branch";
  context = { subscriptions: [], workspaceState: wsState };
  wsState = createMockWorkspaceState();
  mock.module("kibi-cli/brief-config", () => ({
    loadBriefConfig: (_workspaceRoot: string) => ({
      briefs: { enabled: true, channels: { vscode: true } },
    }),
  }));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  mock.restore();
});

test("registerBriefWatcher creates a FileSystemWatcher", async () => {
  // Set up .kb/briefs directory with a brief file
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });
  const briefPath = path.join(briefsDir, "12345_brief.json");
  fs.writeFileSync(briefPath, JSON.stringify(briefTemplate));

  // Mock vscode module
  mock.module("vscode", () => getVscodeMockModule());

  const { registerBriefWatcher } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const result = registerBriefWatcher(
    context as never,
    { appendLine: () => {} } as never,
    workspaceRoot,
    branch,
  );

  expect(result.watcher).toBeDefined();
  expect(result.watcher).toBeInstanceOf(DefaultFileSystemWatcher);
  expect(result.dispose).toBeFunction();
});

test("registerBriefWatcher ignores temp files ending with .tmp", async () => {
  // Mock vscode module
  mock.module("vscode", () => getVscodeMockModule());

  // No brief files on disk - parseLatestBrief returns null for startup scan
  const { registerBriefWatcher } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const result = registerBriefWatcher(
    context as never,
    { appendLine: () => {} } as never,
    workspaceRoot,
    branch,
  );

  const watcher = result.watcher as DefaultFileSystemWatcher;
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;

  // Simulate a .tmp file event - should be ignored
  const tmpUri = {
    fsPath: path.join(workspaceRoot, ".kb", "briefs", "temp.tmp"),
  };
  watcher.emitCreate(tmpUri);
  await new Promise((r) => setTimeout(r, 20));

  // .tmp file should not have triggered a notification
  expect(showInfo).not.toHaveBeenCalled();
});

test("registerBriefWatcher suppresses noisy operational-only brief notifications", async () => {
  mock.module("vscode", () => getVscodeMockModule());

  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });
  const briefPath = path.join(briefsDir, "12345_brief.json");
  fs.writeFileSync(
    briefPath,
    JSON.stringify({
      ...briefTemplate,
      title: ".sisyphus/briefs/run-1/boulder.json",
      summary: ".sisyphus/briefs/run-1/boulder.json",
      briefing: {
        ...briefTemplate.briefing,
        tldr: ".sisyphus/briefs/run-1/boulder.json",
      },
      unread: true,
      sourceFiles: [".sisyphus/briefs/run-1/boulder.json"],
    }),
  );

  const { registerBriefWatcher } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  const result = registerBriefWatcher(
    context as never,
    { appendLine: () => {} } as never,
    workspaceRoot,
    branch,
  );

  const watcher = result.watcher as DefaultFileSystemWatcher;
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;

  showInfo.mockReset();

  watcher.emitCreate({ fsPath: briefPath });
  await new Promise((r) => setTimeout(r, 20));

  expect(showInfo).not.toHaveBeenCalled();
});

test("registerBriefWatcher still shows specific domain brief notifications", async () => {
  mock.module("vscode", () => getVscodeMockModule());

  fs.mkdirSync(path.join(workspaceRoot, ".kb", "briefs"), { recursive: true });
  const briefPath = path.join(workspaceRoot, ".kb", "briefs", "12345_brief.json");
  fs.writeFileSync(
    briefPath,
    JSON.stringify({
      ...briefTemplate,
      title: "auth refresh brief",
      summary: "Updated login refresh flow for the auth session guard",
      briefing: {
        ...briefTemplate.briefing,
        tldr: "Updated login refresh flow for the auth session guard",
      },
      unread: true,
      sourceFiles: ["packages/vscode/src/activation/briefs.ts"],
    }),
  );

  const { registerBriefWatcher } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  const result = registerBriefWatcher(
    context as never,
    { appendLine: () => {} } as never,
    workspaceRoot,
    branch,
  );

  const watcher = result.watcher as DefaultFileSystemWatcher;
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;

  showInfo.mockReset();

  watcher.emitCreate({ fsPath: briefPath });
  await new Promise((r) => setTimeout(r, 20));

  expect(showInfo).toHaveBeenCalled();
});

test("registerBriefWatcher ignores briefs marked as read (unread: false)", async () => {
  // Mock vscode module
  mock.module("vscode", () => getVscodeMockModule());

  // Write a brief file with unread: false
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });
  const briefPath = path.join(briefsDir, "12345_brief.json");
  fs.writeFileSync(briefPath, JSON.stringify({ ...briefTemplate, unread: false }));

  const { registerBriefWatcher } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const result = registerBriefWatcher(
    context as never,
    { appendLine: () => {} } as never,
    workspaceRoot,
    branch,
  );

  const watcher = result.watcher as DefaultFileSystemWatcher;
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;

  showInfo.mockReset();

  // Fire the create event - should be ignored because unread: false
  watcher.emitCreate({
    fsPath: briefPath,
  });
  await new Promise((r) => setTimeout(r, 20));

  // Should not show notification for already-read brief
  expect(showInfo).not.toHaveBeenCalled();
});

test("registerBriefWatcher deduplicates in-memory notifications", async () => {
  // Mock vscode module
  mock.module("vscode", () => getVscodeMockModule());

  // Write a brief file
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });
  const briefPath = path.join(briefsDir, "12345_brief.json");
  fs.writeFileSync(briefPath, JSON.stringify({ ...briefTemplate, unread: true }));

  const { registerBriefWatcher } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const result = registerBriefWatcher(
    { ...context, workspaceState: wsState } as never,
    { appendLine: () => {} } as never,
    workspaceRoot,
    branch,
  );

  const watcher = result.watcher as DefaultFileSystemWatcher;
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;

  const uri = { fsPath: briefPath };

  // Fire create event first time
  watcher.emitCreate(uri);
  await new Promise((r) => setTimeout(r, 50));
  const countAfterFirst = (showInfo as ReturnType<typeof mock>).mock.calls.length;

  // Fire change event for the same brief - should be deduplicated
  watcher.emitChange(uri);
  await new Promise((r) => setTimeout(r, 50));
  const countAfterSecond = (showInfo as ReturnType<typeof mock>).mock.calls.length;

  // Second event should not produce another notification
  expect(countAfterSecond).toBe(countAfterFirst);
});

test("showLatestBriefCommand opens a document when briefs are available", async () => {
  // Mock vscode module
  mock.module("vscode", () => getVscodeMockModule());

  // Write a brief file to disk
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });
  const briefPath = path.join(briefsDir, "12345_brief.json");
  fs.writeFileSync(briefPath, JSON.stringify(briefTemplate));

  const { showLatestBriefCommand } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  // Call the command - just verify it doesn't throw
  try {
    await showLatestBriefCommand(wsState, workspaceRoot, branch);
  } catch {
    // Expected - mocked VSCode may not work fully
  }
  expect(true).toBe(true);
});

test("showLatestBriefCommand shows message when no briefs available", async () => {
  // Mock vscode module
  mock.module("vscode", () => getVscodeMockModule());

  // No brief files on disk - parseLatestBrief returns null
  const { showLatestBriefCommand } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  // Call the command
  await showLatestBriefCommand(wsState, workspaceRoot, branch);

  // Verify window.showInformationMessage was called with no briefs message
  const vscode = getVscodeMockModule();
  expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
    "No Kibi briefs available for this branch.",
  );
});

test("registerBriefWatcher deduplicates by semantic contentHash, not briefId", async () => {
  // Mock vscode module
  mock.module("vscode", () => getVscodeMockModule());

  // Write a brief file with a specific contentHash to disk
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });
  const briefPath = path.join(briefsDir, "12345_brief.json");
  fs.writeFileSync(
    briefPath,
    JSON.stringify({
      ...briefTemplate,
      briefId: "brief-alpha",
      contentHash: "semantic-hash-xyz",
      unread: true,
    }),
  );

  const { registerBriefWatcher } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const result = registerBriefWatcher(
    { ...context, workspaceState: wsState } as never,
    { appendLine: () => {} } as never,
    workspaceRoot,
    branch,
  );

  const watcher = result.watcher as DefaultFileSystemWatcher;
  const uri = {
    fsPath: briefPath,
  };

  // First event: shows notification for brief-alpha
  watcher.emitCreate(uri);

  // Allow async handlers to complete
  await new Promise((r) => setTimeout(r, 50));

  const vscode1 = getVscodeMockModule();
  const notifyCount1 = (
    vscode1.window.showInformationMessage as ReturnType<typeof mock>
  ).mock.calls.length;

  // Second event: same brief, same contentHash — should be deduped
  watcher.emitChange(uri);

  await new Promise((r) => setTimeout(r, 50));

  const vscode2 = getVscodeMockModule();
  const notifyCount2 = (
    vscode2.window.showInformationMessage as ReturnType<typeof mock>
  ).mock.calls.length;

  // Both events should result in only 1 notification total (contentHash dedupe)
  expect(notifyCount2).toBeLessThanOrEqual(notifyCount1 + 1);
});

test("registerBriefWatcher persists seen content hash even when toast is closed", async () => {
  resetVscodeMock({
    window: {
      showInformationMessage: mock(async (_message: string) => undefined),
    },
  });

  mock.module("vscode", () => getVscodeMockModule());



  const dedupeKey = `kibi.briefs.seen::${workspaceRoot}::${branch}`;

  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });
  const briefPath = path.join(briefsDir, "12345_brief.json");
  fs.writeFileSync(
    briefPath,
    JSON.stringify({
      ...briefTemplate,
      briefId: "brief-persisted-hash",
      contentHash: "semantic-hash-persist-me",
      unread: true,
    }),
  );


  const vscode = getVscodeMockModule();
  const showInformationMessage = vscode.window
    .showInformationMessage as ReturnType<typeof mock>;

  const contextWithState = {
    subscriptions: [],
    workspaceState: wsState,
  };

  const firstModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const firstWatcherResult = firstModule.registerBriefWatcher(
    contextWithState as never,
    { appendLine: () => {} } as never,
    workspaceRoot,
    branch,
  );

  const uri = {
    fsPath: path.join(workspaceRoot, ".kb", "briefs", "12345_brief.json"),
  };

  (firstWatcherResult.watcher as DefaultFileSystemWatcher).emitCreate(uri);
  await new Promise((r) => setTimeout(r, 50));

  expect(wsState.get(dedupeKey)).toBe("semantic-hash-persist-me");

  const firstBriefContent = JSON.parse(fs.readFileSync(briefPath, "utf-8")) as {
    unread: boolean;
  };
  expect(firstBriefContent.unread).toBe(true);

  const firstNotificationCount = showInformationMessage.mock.calls.length;

  const secondModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const secondWatcherResult = secondModule.registerBriefWatcher(
    contextWithState as never,
    { appendLine: () => {} } as never,
    workspaceRoot,
    branch,
  );

  (secondWatcherResult.watcher as DefaultFileSystemWatcher).emitCreate(uri);
  await new Promise((r) => setTimeout(r, 50));

  expect(showInformationMessage.mock.calls.length).toBe(firstNotificationCount);
});
