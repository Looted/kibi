/// <reference path="../../../types/bun-test.d.ts" />
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as idleBriefRuntimeModule from "../src/idle-brief-runtime";
import { resolveAuditLogPath } from "../src/idle-brief-paths";
import {
  deletePendingBriefMarkers,
  loadPendingBriefMarkers,
} from "../src/utils/brief-marker";
import type { PluginInput } from "../src/plugin";

describe.serial("idle brief pending markers", () => {
  let tmpDir: string;
  let worktree: string;
  let freshPluginCounter = 0;

  const makeInput = (overrides: Partial<PluginInput> = {}): PluginInput => ({
    directory: tmpDir,
    worktree,
    project: undefined,
    $: undefined,
    client: undefined,
    ...overrides,
  });

  beforeEach(() => {
    process.env.KIBI_OPENCODE_IDLE_BRIEF_DELAY_MS = "0";
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-idle-brief-marker-"));
    worktree = tmpDir;
  });

  afterEach(() => {
    process.env.KIBI_BRANCH = "";
    process.env.KIBI_OPENCODE_IDLE_BRIEF_DELAY_MS = "";
    const schedulerFactoryGlobals = globalThis as typeof globalThis & {
      __kibi_test_scheduler_factory?: unknown;
      __kibi_test_scheduler_factory_by_worktree?: Map<string, unknown>;
    };
    schedulerFactoryGlobals.__kibi_test_scheduler_factory = undefined;
    schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree?.delete(
      tmpDir,
    );
    mock.restore();
    mock.clearAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads matching-branch marker IDs, dedupes them, and reports malformed markers", () => {
    const pendingDir = path.join(tmpDir, ".kb", "briefs", "pending");
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.writeFileSync(
      path.join(pendingDir, "001-main.json"),
      JSON.stringify({
        sessionId: "session-a",
        timestamp: 1,
        branch: "main",
        operation: "upsert",
        entityIds: ["REQ-002", "REQ-001", "REQ-002"],
        relationships: [],
      }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(pendingDir, "002-feature.json"),
      JSON.stringify({
        sessionId: "session-b",
        timestamp: 2,
        branch: "feature",
        operation: "upsert",
        entityIds: ["REQ-999"],
        relationships: [],
      }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(pendingDir, "003-main.json"),
      JSON.stringify({
        sessionId: "session-c",
        timestamp: 3,
        branch: "main",
        operation: "delete",
        entityIds: ["REQ-003"],
        relationships: [{ from: "SYM-X", to: "REQ-003", type: "implements" }],
      }),
      "utf8",
    );
    fs.writeFileSync(path.join(pendingDir, "004-malformed.json"), "{not-json", "utf8");
    fs.writeFileSync(
      path.join(pendingDir, "005-invalid.json"),
      JSON.stringify({ branch: "main", entityIds: "REQ-404" }),
      "utf8",
    );

    const result = loadPendingBriefMarkers(tmpDir, "main");

    assert.deepEqual(result.entityIds, ["REQ-002", "REQ-001", "REQ-003"]);
    assert.deepEqual(
      result.markerPaths.map((filePath: string) => path.basename(filePath)),
      ["001-main.json", "003-main.json"],
    );
    expect(
      result.issues.map((issue: { filePath: string; reason: string }) => ({
        file: path.basename(issue.filePath),
        reason: issue.reason,
      })),
    ).toEqual([
      { file: "004-malformed.json", reason: "parse" },
      { file: "005-invalid.json", reason: "schema" },
    ]);
  });

  it("deletes consumed marker files and ignores missing files", async () => {
    const pendingDir = path.join(tmpDir, ".kb", "briefs", "pending");
    fs.mkdirSync(pendingDir, { recursive: true });
    const keptPath = path.join(pendingDir, "keep.json");
    const deletedPath = path.join(pendingDir, "delete.json");
    fs.writeFileSync(keptPath, "{}", "utf8");
    fs.writeFileSync(deletedPath, "{}", "utf8");

    const result = await deletePendingBriefMarkers([
      deletedPath,
      path.join(pendingDir, "missing.json"),
    ]);

    assert.equal(fs.existsSync(deletedPath), false);
    assert.equal(fs.existsSync(keptPath), true);
    expect(result).toEqual({ deletedCount: 1, issues: [] });
  });

  it("merges pending marker entity IDs into idle brief inputs and deletes consumed markers after success", async () => {
    process.env.KIBI_BRANCH = "main";
    setupAuthoritativeWorkspace(tmpDir);
    installNoopScheduler(tmpDir);
    writePluginConfig(tmpDir, {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: true },
      ux: { toastStartup: false },
      guidance: {
        commentDetection: { enabled: false },
        smartEnforcement: {
          completionReminder: false,
        },
      },
    });

    const pendingDir = path.join(tmpDir, ".kb", "briefs", "pending");
    fs.mkdirSync(pendingDir, { recursive: true });
    const consumedMarkerPath = path.join(pendingDir, "001-consume.json");
    const otherBranchMarkerPath = path.join(pendingDir, "002-other-branch.json");
    const malformedMarkerPath = path.join(pendingDir, "003-malformed.json");
    fs.writeFileSync(
      consumedMarkerPath,
      JSON.stringify({
        sessionId: "session-main",
        timestamp: 1,
        branch: "main",
        operation: "upsert",
        entityIds: ["REQ-MARKER-2", "REQ-MARKER-1", "REQ-MARKER-2"],
        relationships: [],
      }),
      "utf8",
    );
    fs.writeFileSync(
      otherBranchMarkerPath,
      JSON.stringify({
        sessionId: "session-feature",
        timestamp: 2,
        branch: "feature",
        operation: "upsert",
        entityIds: ["REQ-OTHER-BRANCH"],
        relationships: [],
      }),
      "utf8",
    );
    fs.writeFileSync(malformedMarkerPath, "{bad-json", "utf8");

    writeRelationshipAuditEntry(tmpDir, "main", {
      timestamp: "2026-04-25T09:30:00+00:00",
      from: "SYM-BASELINE",
      to: "REQ-BASELINE",
      entityId: "SYM-BASELINE->REQ-BASELINE",
    });

    const generateSpy = spyOn(idleBriefRuntimeModule, "generateIdleBrief");
    generateSpy.mockImplementation(async () => ({
      success: true,
      briefPath: null,
      envelope: null,
    }));

    const plugin = await loadFreshPlugin();
    const hooks = await plugin(
      makeInput({
        client: {
          app: {
            log: async () => {},
          },
        },
        sessionId: "session-marker-idle",
      }),
    );

    assert.ok(hooks.event);
    const eventHook = hooks.event as (input: {
      event: { type: string; properties: Record<string, unknown> };
    }) => Promise<void>;

    writeRelationshipAuditEntry(tmpDir, "main", {
      timestamp: "2026-04-25T10:00:00+00:00",
      from: "SYM-001",
      to: "REQ-MARKER-1",
      entityId: "SYM-001->REQ-MARKER-1",
    });

    await eventHook({
      event: {
        type: "session.idle",
        properties: {},
      },
    });

    await waitForCondition(() => generateSpy.mock.calls.length === 1);
    await waitForCondition(() => !fs.existsSync(consumedMarkerPath));

    const options = generateSpy.mock.calls[0]?.[4] as
      | { sourceFiles?: string[]; changedEntityIds?: string[] }
      | undefined;
    assert.ok(options);
    assert.deepEqual(options?.sourceFiles, ["REQ-MARKER-2", "REQ-MARKER-1"]);
    assert.deepEqual(options?.changedEntityIds, ["REQ-MARKER-2", "REQ-MARKER-1"]);
    assert.equal(fs.existsSync(consumedMarkerPath), false);
    assert.equal(fs.existsSync(otherBranchMarkerPath), true);
    assert.equal(fs.existsSync(malformedMarkerPath), true);
  });

  function setupAuthoritativeWorkspace(workspaceDir: string): void {
    const kbDir = path.join(workspaceDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify(
        {
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            flags: "documentation/flags/**/*.md",
            events: "documentation/events/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        },
        null,
        2,
      ),
    );

    const docDirs = [
      "documentation/requirements",
      "documentation/scenarios",
      "documentation/tests",
      "documentation/adr",
      "documentation/flags",
      "documentation/events",
      "documentation/facts",
    ];
    for (const dir of docDirs) {
      fs.mkdirSync(path.join(workspaceDir, dir), { recursive: true });
    }
    fs.writeFileSync(path.join(workspaceDir, "documentation", "symbols.yaml"), "[]");
  }

  function writePluginConfig(
    workspaceDir: string,
    config: Record<string, unknown>,
  ): void {
    const opencodeDir = path.join(workspaceDir, ".opencode");
    fs.mkdirSync(opencodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(opencodeDir, "kibi.json"),
      JSON.stringify(config, null, 2),
    );
  }

  function installNoopScheduler(workspaceDir: string): void {
    const schedulerFactoryGlobals = globalThis as typeof globalThis & {
      __kibi_test_scheduler_factory?: (...args: unknown[]) => unknown;
      __kibi_test_scheduler_factory_by_worktree?: Map<
        string,
        (...args: unknown[]) => unknown
      >;
    };
    const schedulerFactory = () => ({
      scheduleSync: () => {},
      onFileEdited: () => {},
      onToolExecuteAfter: () => {},
      flush: async () => {},
      dispose: () => {},
    });
    schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree ??=
      new Map();
    schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree.set(
      workspaceDir,
      schedulerFactory,
    );
    schedulerFactoryGlobals.__kibi_test_scheduler_factory = schedulerFactory;
  }

  function writeRelationshipAuditEntry(
    workspaceDir: string,
    branch: string,
    entry: { timestamp: string; entityId: string; from: string; to: string },
  ): void {
    const auditPath = resolveAuditLogPath(workspaceDir, branch);
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    fs.writeFileSync(
      auditPath,
      `changeset('${entry.timestamp}',upsert_rel,'${entry.entityId}',rel-[from='${entry.from}',to='${entry.to}']).\n`,
      "utf8",
    );
  }

  async function waitForCondition(
    predicate: () => boolean,
    attempts = 25,
  ): Promise<void> {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (predicate()) {
        return;
      }
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    assert.fail("Timed out waiting for idle marker async work");
  }

  async function loadFreshPlugin() {
    freshPluginCounter += 1;
    const mod = await import(`../src/index.ts?idle-brief-marker=${freshPluginCounter}`);
    return mod.default;
  }
});
