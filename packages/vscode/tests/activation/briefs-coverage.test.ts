/**
 * Extra coverage tests for activation/briefs.ts
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

function createBrief(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0",
    briefId: "brief-1",
    type: "success",
    sessionId: "session-1",
    branch: "main",
    createdAt: new Date().toISOString(),
    unread: true,
    auditCursor: {
      lastTimestamp: "t",
      lastOperation: "sync",
      entryCount: 1,
      fileSize: 10,
    },
    summary: "Read me",
    counts: { requirementsAdded: 0, relationshipsAdded: 0, entitiesDeleted: 0 },
    validation: { violations: [], count: 0, diagnostics: [] },
    briefing: { tldr: "", promptBlock: "", citations: [] },
    contentHash: "hash-1",
    ...overrides,
  };
}

function writeBriefFile(
  workspaceRoot: string,
  filename: string,
  overrides: Record<string, unknown> = {},
): string {
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });
  const briefPath = path.join(briefsDir, filename);
  fs.writeFileSync(briefPath, JSON.stringify(createBrief(overrides)));
  return briefPath;
}

function installUriParseMock() {
  Object.assign(getVscodeMockModule().Uri as unknown as Record<string, unknown>, {
    parse: (value: string) => ({
      scheme: "kibi-brief",
      path: value,
      fsPath: value,
      toString: () => value,
    }),
  });
}

beforeEach(() => {
  resetVscodeMock();
  mock.module("kibi-cli/brief-config", () => ({
    loadBriefConfig: (_workspaceRoot: string) => ({
      briefs: { enabled: true, channels: { vscode: true } },
    }),
  }));
});

afterEach(() => {
  mock.restore();
});

test("ignores temp files ending with .tmp", async () => {
  mock.module("vscode", () => getVscodeMockModule());

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const context = { subscriptions: [], workspaceState: new FakeMemento() } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };

  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;
  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "main");
  const watcher = result.watcher as unknown as { emitCreate: (u: { fsPath: string }) => void };

  watcher.emitCreate({ fsPath: path.join(tmpDir, ".kb", "briefs", "ignored.tmp") });
  await new Promise((r) => setTimeout(r, 10));

  expect(showInfo).not.toHaveBeenCalled();
  expect(context.workspaceState.keys()).toEqual([]);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});

test("returns early when no latest brief exists", async () => {
  mock.module("vscode", () => getVscodeMockModule());

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const context = { subscriptions: [], workspaceState: new FakeMemento() } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };

  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;
  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "main");
  const watcher = result.watcher as unknown as { emitCreate: (u: { fsPath: string }) => void };

  watcher.emitCreate({ fsPath: path.join(tmpDir, ".kb", "briefs", "1000_brief.json") });
  await new Promise((r) => setTimeout(r, 10));

  expect(showInfo).not.toHaveBeenCalled();

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});

test("does not notify when shared brief policy disables vscode channel", async () => {
  resetVscodeMock();
  mock.module("vscode", () => getVscodeMockModule());
  mock.module("kibi-cli/brief-config", () => ({
    loadBriefConfig: (_workspaceRoot: string) => ({
      briefs: { enabled: true, channels: { vscode: false } },
    }),
  }));

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  writeBriefFile(tmpDir, "1000_brief.json");
  const context = { subscriptions: [], workspaceState: new FakeMemento() } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;

  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "main");
  await new Promise((r) => setTimeout(r, 10));

  expect(showInfo).not.toHaveBeenCalled();
  expect(context.workspaceState.get(`kibi.briefs.seen::${tmpDir}::main`)).toBeUndefined();

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});

test("persistent dedupe returns early when content hash was already seen", async () => {
  mock.module("vscode", () => getVscodeMockModule());

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const workspaceState = new FakeMemento();
  await workspaceState.update(`kibi.briefs.seen::${tmpDir}::main`, "already-seen");
  const context = { subscriptions: [], workspaceState } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;
  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "main");

  const briefPath = writeBriefFile(tmpDir, "1000_brief.json", {
    contentHash: "already-seen",
  });
  const watcher = result.watcher as unknown as { emitCreate: (u: { fsPath: string }) => void };
  watcher.emitCreate({ fsPath: briefPath });
  await new Promise((r) => setTimeout(r, 10));

  expect(showInfo).not.toHaveBeenCalled();

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});

test("startup scan and follow-up file event are deduped in memory", async () => {
  mock.module("vscode", () => getVscodeMockModule());

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const briefPath = writeBriefFile(tmpDir, "1000_brief.json", {
    contentHash: "memory-dedupe-hash",
  });
  const context = { subscriptions: [], workspaceState: new FakeMemento() } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;
  showInfo.mockResolvedValue(undefined);

  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "main");
  await new Promise((r) => setTimeout(r, 10));

  const watcher = result.watcher as unknown as { emitCreate: (u: { fsPath: string }) => void };
  watcher.emitCreate({ fsPath: briefPath });
  await new Promise((r) => setTimeout(r, 10));

  expect(showInfo).toHaveBeenCalledTimes(1);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});

test("Dismiss selection marks brief as read without opening document", async () => {
  mock.module("vscode", () => getVscodeMockModule());

  const briefsModule = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const briefPath = writeBriefFile(tmpDir, "1000_brief.json", {
    briefId: "brief-dismiss",
    contentHash: "dismiss-hash",
  });
  const findFilesMock = mock(async (_pattern: unknown) => [] as Array<{ fsPath: string }>);
  Object.assign(getVscodeMockModule().workspace as unknown as Record<string, unknown>, {
    findFiles: findFilesMock,
  });
  findFilesMock.mockResolvedValue([{ fsPath: briefPath }]);

  const context = { subscriptions: [], workspaceState: new FakeMemento() } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;
  showInfo.mockResolvedValue("Dismiss");
  const showTextDocument = getVscodeMockModule().window.showTextDocument as ReturnType<typeof mock>;

  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "main");
  await new Promise((r) => setTimeout(r, 20));

  expect(showTextDocument).not.toHaveBeenCalled();
  expect(JSON.parse(fs.readFileSync(briefPath, "utf-8")).unread).toBe(false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});

test("View Brief selection opens latest brief and skips invalid JSON while marking read", async () => {
  resetVscodeMock();
  installUriParseMock();
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
  const invalidPath = path.join(briefsDir, "0500_brief.json");
  fs.writeFileSync(invalidPath, "{not-json");
  const briefPath = writeBriefFile(tmpDir, "1000_brief.json", {
    briefId: "brief-view",
    contentHash: "view-hash",
  });

  const findFilesMock = mock(async (_pattern: unknown) => [] as Array<{ fsPath: string }>);
  Object.assign(getVscodeMockModule().workspace as unknown as Record<string, unknown>, {
    findFiles: findFilesMock,
  });
  findFilesMock.mockResolvedValue([{ fsPath: invalidPath }, { fsPath: briefPath }]);

  const context = { subscriptions: [], workspaceState: new FakeMemento() } as {
    subscriptions: unknown[];
    workspaceState: FakeMemento;
  };
  const output = { appendLine: mock((_m: string) => {}) } as { appendLine: (m: string) => void };
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;
  showInfo.mockResolvedValue("View Brief");
  const openTextDocument = getVscodeMockModule().workspace.openTextDocument as ReturnType<typeof mock>;
  const showTextDocument = getVscodeMockModule().window.showTextDocument as ReturnType<typeof mock>;

  const result = briefsModule.registerBriefWatcher(context, output, tmpDir, "main");
  await new Promise((r) => setTimeout(r, 20));

  expect(showInfo).toHaveBeenCalledTimes(1);
  expect(openTextDocument).toHaveBeenCalledTimes(1);
  expect(showTextDocument).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fs.readFileSync(briefPath, "utf-8")).unread).toBe(false);
  expect(context.workspaceState.get<string>(`kibi.briefs.seen::${tmpDir}::main`)).toBe("view-hash");

  fs.rmSync(tmpDir, { recursive: true, force: true });
  result.dispose();
});

test("showLatestBriefCommand shows empty-state message when no brief exists", async () => {
  resetVscodeMock();
  installUriParseMock();
  mock.module("vscode", () => getVscodeMockModule());

  const { showLatestBriefCommand } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const workspaceState = new FakeMemento();
  const showInfo = getVscodeMockModule().window.showInformationMessage as ReturnType<typeof mock>;

  await showLatestBriefCommand(workspaceState as never, tmpDir, "main");

  expect(showInfo).toHaveBeenCalledWith("No Kibi briefs available for this branch.");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("showLatestBriefCommand opens latest brief and marks it read", async () => {
  resetVscodeMock();
  installUriParseMock();
  mock.module("vscode", () => getVscodeMockModule());

  const { showLatestBriefCommand } = await import(
    `../../src/activation/briefs?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-"));
  const briefsDir = path.join(tmpDir, ".kb", "briefs");
  fs.mkdirSync(briefsDir, { recursive: true });
  fs.writeFileSync(path.join(briefsDir, "0100_brief.json"), "{bad-json");
  const briefPath = writeBriefFile(tmpDir, "1000_brief.json", {
    briefId: "brief-command",
    contentHash: "command-hash",
  });

  const workspaceState = new FakeMemento();
  const openTextDocument = getVscodeMockModule().workspace.openTextDocument as ReturnType<typeof mock>;
  const showTextDocument = getVscodeMockModule().window.showTextDocument as ReturnType<typeof mock>;

  await showLatestBriefCommand(workspaceState as never, tmpDir, "main");

  expect(openTextDocument).toHaveBeenCalledTimes(1);
  expect(showTextDocument).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fs.readFileSync(briefPath, "utf-8")).unread).toBe(false);
  expect(workspaceState.get<string>(`kibi.briefs.seen::${tmpDir}::main`)).toBe("command-hash");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
