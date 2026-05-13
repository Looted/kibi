/**
 * Extra coverage tests for activation/briefs.ts
 *
 * Covers gating, in-memory dedupe, persistent dedupe, and the "Dismiss" flow
 */

import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "../shared/vscode-mock";

class FakeMemento {
  private store = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  update(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }

  keys(): readonly string[] {
    return Array.from(this.store.keys());
  }
}

beforeEach(() => {
  // Keep a fresh vscode mock state per-test
  resetVscodeMock();
});

afterEach(() => {
  mock.restore();
});

test("does not notify when shared brief policy disables briefs", async () => {
  // Arrange: mock vscode and the external brief-config loader to disable briefs
  mock.module("vscode", () => getVscodeMockModule());
  mock.module("kibi-cli/brief-config", () => ({
    loadBriefConfig: (_workspaceRoot: string) => ({
      briefs: { enabled: false, channels: { vscode: true } },
    }),
  }));

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const briefsDir = path.join(tmpDir, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });

  const briefPath = path.join(briefsDir, "1000_brief.json");
  fs.writeFileSync(
    briefPath,
    JSON.stringify({
      schemaVersion: "1.0",
      briefId: "brief-1",
      type: "success",
      sessionId: "s-1",
      branch: "develop",
      createdAt: new Date().toISOString(),
      unread: true,
      auditCursor: { lastTimestamp: "t", lastOperation: "sync", entryCount: 1, fileSize: 10 },
      summary: "Read me",
      counts: { requirementsAdded: 0, relationshipsAdded: 0, entitiesDeleted: 0 },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: { tldr: "", promptBlock: "", citations: [] },
      contentHash: "hash-1",
    }),
  );

  const context = { subscriptions: [], workspaceState: new FakeMemento() } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };

  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;

  // Act: register watcher (startup scan runs asynchronously)
  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "develop");
  // allow startup scan / async handlers to run
  await new Promise((r) => setTimeout(r, 0));

  // Assert: since policy disables briefs we should not show a toast or persist seen hash
  expect(showInfo).not.toHaveBeenCalled();
  expect(context.workspaceState.get(`kibi.briefs.seen::${tmpDir}::develop`)).toBeUndefined();

  // cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
  // dispose watcher
  result.dispose();
});

test("in-memory dedupe suppresses duplicate create/change events", async () => {
  mock.module("vscode", () => getVscodeMockModule());
  mock.module("kibi-cli/brief-config", () => ({
    loadBriefConfig: (_workspaceRoot: string) => ({
      briefs: { enabled: true, channels: { vscode: true } },
    }),
  }));

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const briefsDir = path.join(tmpDir, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });

  const briefPath = path.join(briefsDir, "1000_brief.json");
  fs.writeFileSync(
    briefPath,
    JSON.stringify({
      schemaVersion: "1.0",
      briefId: "brief-dup",
      type: "success",
      sessionId: "s-dup",
      branch: "develop",
      createdAt: new Date().toISOString(),
      unread: true,
      auditCursor: { lastTimestamp: "t", lastOperation: "sync", entryCount: 1, fileSize: 10 },
      summary: "Duplicate test",
      counts: { requirementsAdded: 0, relationshipsAdded: 0, entitiesDeleted: 0 },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: { tldr: "", promptBlock: "", citations: [] },
      contentHash: "dup-hash",
    }),
  );

  const context = { subscriptions: [], workspaceState: new FakeMemento() } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };

  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;
  showInfo.mockResolvedValue("Dismiss");

  // Ensure the mock's inferred return type is a list of Uri-like objects
  const findFilesMock = mock(async (_pattern: unknown) => [] as Array<{ fsPath: string }>);
  Object.assign(getVscodeMockModule().workspace as unknown as Record<string, unknown>, {
    findFiles: findFilesMock,
  });
  findFilesMock.mockResolvedValue([{ fsPath: briefPath }]);

  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "develop");
  // Emit two create events in quick succession
  const watcher = result.watcher as unknown as { emitCreate: (u: { fsPath: string }) => void };
  watcher.emitCreate({ fsPath: briefPath });
  watcher.emitCreate({ fsPath: briefPath });

  // allow handlers to run (give a small scheduling window)
  await new Promise((r) => setTimeout(r, 20));

  // showInformationMessage should have been called exactly once (in-memory dedupe)
  expect(showInfo).toHaveBeenCalledTimes(1);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});

test("persistent dedupe (workspaceState) prevents repeat notifications", async () => {
  mock.module("vscode", () => getVscodeMockModule());
  mock.module("kibi-cli/brief-config", () => ({
    loadBriefConfig: (_workspaceRoot: string) => ({
      briefs: { enabled: true, channels: { vscode: true } },
    }),
  }));

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const briefsDir = path.join(tmpDir, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });

  const briefPath = path.join(briefsDir, "1000_brief.json");
  fs.writeFileSync(
    briefPath,
    JSON.stringify({
      schemaVersion: "1.0",
      briefId: "brief-persist",
      type: "success",
      sessionId: "s-persist",
      branch: "develop",
      createdAt: new Date().toISOString(),
      unread: true,
      auditCursor: { lastTimestamp: "t", lastOperation: "sync", entryCount: 1, fileSize: 10 },
      summary: "Persisted test",
      counts: { requirementsAdded: 0, relationshipsAdded: 0, entitiesDeleted: 0 },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: { tldr: "", promptBlock: "", citations: [] },
      contentHash: "persist-hash",
    }),
  );

  const m = new FakeMemento();
  // Simulate previously seen contentHash stored in workspace state
  await m.update(`kibi.briefs.seen::${tmpDir}::develop`, "persist-hash");

  const context = { subscriptions: [], workspaceState: m } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };

  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;

  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "develop");
  const watcher = result.watcher as unknown as { emitCreate: (u: { fsPath: string }) => void };
  watcher.emitCreate({ fsPath: briefPath });

  await new Promise((r) => setTimeout(r, 20));

  expect(showInfo).not.toHaveBeenCalled();

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});

test("Dismiss selection marks brief as read without opening document", async () => {
  mock.module("vscode", () => getVscodeMockModule());
  mock.module("kibi-cli/brief-config", () => ({
    loadBriefConfig: (_workspaceRoot: string) => ({
      briefs: { enabled: true, channels: { vscode: true } },
    }),
  }));

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const briefsDir = path.join(tmpDir, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });

  const briefPath = path.join(briefsDir, "1000_brief.json");
  fs.writeFileSync(
    briefPath,
    JSON.stringify({
      schemaVersion: "1.0",
      briefId: "brief-dismiss",
      type: "success",
      sessionId: "s-dismiss",
      branch: "develop",
      createdAt: new Date().toISOString(),
      unread: true,
      auditCursor: { lastTimestamp: "t", lastOperation: "sync", entryCount: 1, fileSize: 10 },
      summary: "Dismiss test",
      counts: { requirementsAdded: 0, relationshipsAdded: 0, entitiesDeleted: 0 },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: { tldr: "", promptBlock: "", citations: [] },
      contentHash: "dismiss-hash",
    }),
  );

  const context = { subscriptions: [], workspaceState: new FakeMemento() } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };

  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;
  showInfo.mockResolvedValue("Dismiss");

  // Ensure the mock's inferred return type is a list of Uri-like objects
  const findFilesMock2 = mock(async (_pattern: unknown) => [] as Array<{ fsPath: string }>);
  Object.assign(getVscodeMockModule().workspace as unknown as Record<string, unknown>, {
    findFiles: findFilesMock2,
  });
  findFilesMock2.mockResolvedValue([{ fsPath: briefPath }]);

  const showTextDocument = getVscodeMockModule().window.showTextDocument as ReturnType<typeof mock>;

  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "develop");
  const watcher = result.watcher as unknown as { emitCreate: (u: { fsPath: string }) => void };
  watcher.emitCreate({ fsPath: briefPath });

  await new Promise((r) => setTimeout(r, 0));

  // Document should not have been opened (Dismiss) but file unread flag should be cleared
  expect(showTextDocument).not.toHaveBeenCalled();
  const updated = JSON.parse(fs.readFileSync(briefPath, "utf-8"));
  expect(updated.unread).toBe(false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});
