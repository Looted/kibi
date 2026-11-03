// implements REQ-claude-hook-usage-telemetry-v2, REQ-kibi-telemetry-acceptance-gate-v2
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  HOOK_ACTION_EDITED,
  HOOK_ACTION_KB_USAGE,
  appendHookUsage,
  appendHookUsageRows,
  editTraces,
  finishHookTelemetry,
  hookTelemetryEnabled,
  hookTracesWanted,
  kbUsageTrace,
  readPackageVersion,
} from "../src/hook-usage-log";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function tempDir(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

/** Telemetry on (explicitly) with a private queue; no key means no sending. */
function telemetryOn(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    KIBI_TELEMETRY_DIR: tempDir("kibi-hook-telemetry-"),
    KIBI_TELEMETRY: "1",
    KIBI_TELEMETRY_KEY: "test-key",
    KIBI_TELEMETRY_HOST: "http://127.0.0.1:9",
    ...extra,
  };
}

function queued(env: NodeJS.ProcessEnv): Record<string, unknown>[] {
  const file = path.join(
    env.KIBI_TELEMETRY_DIR as string,
    "telemetry-queue.jsonl",
  );
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function usageLog(workspace: string): Record<string, unknown>[] {
  const file = path.join(workspace, ".kb", "usage.log");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

const baseRow = (workspaceRoot: string) => ({
  host: "claude-code",
  workspaceRoot,
  event: "PostToolUse",
  sessionId: "session-1",
  hostTool: "Edit",
  startedAt: new Date(Date.now() - 50),
});

describe("opt-in switches", () => {
  test("diagnostic mode accepts 1 and true only", () => {
    expect(hookTelemetryEnabled({ KIBI_DIAGNOSTIC_MODE: " 1 " })).toBe(true);
    expect(hookTelemetryEnabled({ KIBI_DIAGNOSTIC_MODE: "TRUE" })).toBe(true);
    expect(hookTelemetryEnabled({ KIBI_DIAGNOSTIC_MODE: "yes" })).toBe(false);
    expect(hookTelemetryEnabled({ KIBI_DIAGNOSTIC_MODE: "0" })).toBe(false);
    expect(hookTelemetryEnabled({})).toBe(false);
  });

  test("traces are wanted for either diagnostics or telemetry", () => {
    const off = { KIBI_TELEMETRY: "0" };
    expect(hookTracesWanted(off)).toBe(false);
    expect(hookTracesWanted({ ...off, KIBI_DIAGNOSTIC_MODE: "1" })).toBe(true);
    expect(hookTracesWanted(telemetryOn())).toBe(true);
  });
});

describe("appendHookUsage", () => {
  test("a trace without an action records nothing", () => {
    const workspace = tempDir("kibi-hook-ws-");
    const env = telemetryOn({ KIBI_DIAGNOSTIC_MODE: "1" });
    appendHookUsage({ ...baseRow(workspace), trace: {} }, env);
    expect(queued(env)).toEqual([]);
    expect(usageLog(workspace)).toEqual([]);
  });

  test("the anonymous event names the adapter package", () => {
    const workspace = tempDir("kibi-hook-ws-");
    const env = telemetryOn();
    appendHookUsage(
      {
        ...baseRow(workspace),
        trace: { action: "edited", pathKind: "source" },
      },
      env,
    );
    appendHookUsage(
      {
        ...baseRow(workspace),
        host: "cursor",
        trace: { action: "kb_usage", kbOperation: "kb_search" },
      },
      env,
    );
    appendHookUsage(
      {
        ...baseRow(workspace),
        host: "cursor",
        packageName: "custom-adapter",
        trace: { action: "edited", requirementIds: ["R1", "R2"] },
      },
      env,
    );
    const properties = queued(env).map(
      (event) => event.properties as Record<string, unknown>,
    );
    expect(properties.map((p) => p.package)).toEqual([
      "kibi-claude",
      "kibi-cursor",
      "custom-adapter",
    ]);
    expect(properties[2]?.requirement_count).toBe(2);
    expect(properties[0]?.requirement_count).toBeNull();
    // Without diagnostics no usage.log row is written.
    expect(usageLog(workspace)).toEqual([]);
  });

  test("diagnostic mode writes the detailed usage.log row", () => {
    const workspace = tempDir("kibi-hook-ws-");
    const env = { KIBI_TELEMETRY: "0", KIBI_DIAGNOSTIC_MODE: "1" };
    const startedAt = new Date(Date.now() - 1000);
    appendHookUsage(
      {
        ...baseRow(workspace),
        packageVersion: "1.2.3",
        startedAt,
        trace: {
          action: "edited",
          path: "src/a.ts",
          pathKind: "source",
          requirementIds: ["R1"],
          kbOperation: "kb_query",
          kbUsedBefore: false,
        },
      },
      env,
    );
    appendHookUsage(
      {
        ...baseRow(workspace),
        sessionId: undefined,
        hostTool: undefined,
        trace: { action: "kb_usage" },
      },
      env,
    );
    const [full, sparse] = usageLog(workspace);
    expect(full?.request_id).toMatch(/^hook-[0-9a-f-]{36}$/);
    expect(full?.duration_ms as number).toBeGreaterThanOrEqual(1000);
    expect(full?.duration_ms as number).toBeLessThan(60_000);
    expect(Date.parse(full?.timestamp as string)).toBeGreaterThan(
      startedAt.getTime(),
    );
    const {
      request_id: _id,
      duration_ms: _d,
      timestamp: _t,
      ...rest
    } = full as Record<string, unknown>;
    expect(rest).toStrictEqual({
      tool: "hook_PostToolUse",
      interface: "hook",
      host: "claude-code",
      package_version: "1.2.3",
      workspace_root: workspace,
      session_id: "session-1",
      hook_event: "PostToolUse",
      host_tool: "Edit",
      hook_action: "edited",
      path: "src/a.ts",
      path_kind: "source",
      requirement_ids: ["R1"],
      kb_operation: "kb_query",
      kb_used_before: false,
      status: "success",
    });
    expect(sparse).toMatchObject({
      package_version: null,
      session_id: null,
      host_tool: null,
      path: null,
      path_kind: null,
      requirement_ids: [],
      kb_operation: null,
      kb_used_before: null,
    });
    expect(
      fs.readFileSync(path.join(workspace, ".kb", "usage.log"), "utf8"),
    ).toEndWith("}\n");
  });

  test("an unwritable workspace never throws", () => {
    const file = path.join(tempDir("kibi-hook-file-"), "not-a-dir");
    fs.writeFileSync(file, "");
    expect(() =>
      appendHookUsage(
        { ...baseRow(file), trace: { action: "edited" } },
        { KIBI_TELEMETRY: "0", KIBI_DIAGNOSTIC_MODE: "1" },
      ),
    ).not.toThrow();
  });
});

describe("traces", () => {
  test("kb usage traces only for Kibi operations", () => {
    expect(kbUsageTrace("mcp__kibi__kb_search", {})).toEqual({
      action: HOOK_ACTION_KB_USAGE,
      kbOperation: "kb_search",
    });
    expect(kbUsageTrace("Read", { file_path: "a.ts" })).toBeUndefined();
    expect(HOOK_ACTION_KB_USAGE).toBe("kb_usage");
    expect(HOOK_ACTION_EDITED).toBe("edited");
  });

  test("edit traces skip other paths and dedupe", () => {
    const asked: string[] = [];
    const traces = editTraces(
      [
        "src/a.ts",
        "docs/x.md",
        "src/a.ts",
        ".kb/requirements/r.md",
        "tests/a.test.ts",
      ],
      (relativePath) => {
        asked.push(relativePath);
        return [`REQ-${relativePath}`];
      },
    );
    expect(traces).toStrictEqual([
      {
        action: "edited",
        path: "src/a.ts",
        pathKind: "source",
        requirementIds: ["REQ-src/a.ts"],
      },
      {
        action: "edited",
        path: ".kb/requirements/r.md",
        pathKind: "kb",
        requirementIds: [],
      },
      {
        action: "edited",
        path: "tests/a.test.ts",
        pathKind: "test",
        requirementIds: ["REQ-tests/a.test.ts"],
      },
    ]);
    expect(asked).toEqual(["src/a.ts", "tests/a.test.ts"]);
    expect(editTraces([], () => [])).toStrictEqual([]);
  });

  test("rows are appended only when traces are wanted", () => {
    const workspace = tempDir("kibi-hook-ws-");
    const row = baseRow(workspace);
    appendHookUsageRows(row, [{ action: "edited" }], { KIBI_TELEMETRY: "0" });
    expect(usageLog(workspace)).toEqual([]);
    appendHookUsageRows(row, [{ action: "edited" }, { action: "kb_usage" }], {
      KIBI_TELEMETRY: "0",
      KIBI_DIAGNOSTIC_MODE: "1",
    });
    expect(usageLog(workspace).map((r) => r.hook_action)).toEqual([
      "edited",
      "kb_usage",
    ]);
  });
});

describe("finishHookTelemetry", () => {
  async function sendsOn(event: string): Promise<boolean> {
    const received: unknown[] = [];
    const server = Bun.serve({
      port: 0,
      fetch: async (request) => {
        received.push(await request.json());
        return new Response("{}");
      },
    });
    try {
      const env = telemetryOn({
        KIBI_TELEMETRY_HOST: `http://127.0.0.1:${server.port}`,
      });
      const workspace = tempDir("kibi-hook-ws-");
      appendHookUsage(
        { ...baseRow(workspace), trace: { action: "edited" } },
        env,
      );
      await finishHookTelemetry(
        { event, workspaceRoot: workspace, sessionId: "s" },
        env,
      );
      return received.length > 0;
    } finally {
      server.stop(true);
    }
  }

  test("turn and session ends flush the queue at once", async () => {
    expect(await sendsOn("Stop")).toBe(true);
    expect(await sendsOn("SessionEnd")).toBe(true);
    expect(await sendsOn("session_end")).toBe(true);
    expect(await sendsOn("PostToolUse")).toBe(false);
    expect(await sendsOn("stopped")).toBe(false);
  });

  test("missing workspace or session skips the session marker; never throws", async () => {
    const env = telemetryOn();
    await finishHookTelemetry(
      { event: "Stop", workspaceRoot: undefined, sessionId: "s" },
      env,
    );
    await finishHookTelemetry(
      { event: "Stop", workspaceRoot: "/tmp", sessionId: undefined },
      env,
    );
    expect(
      fs.existsSync(
        path.join(env.KIBI_TELEMETRY_DIR as string, "telemetry-sessions.json"),
      ),
    ).toBe(false);
    await finishHookTelemetry(
      { event: "Stop", workspaceRoot: "/tmp", sessionId: "s" },
      env,
    );
    expect(
      fs.existsSync(
        path.join(env.KIBI_TELEMETRY_DIR as string, "telemetry-sessions.json"),
      ),
    ).toBe(true);
    await expect(
      finishHookTelemetry(
        {
          event: undefined as never,
          workspaceRoot: undefined,
          sessionId: undefined,
        },
        env,
      ),
    ).resolves.toBeUndefined();
  });
});

describe("readPackageVersion", () => {
  test("reads a string version or returns null", () => {
    const dir = tempDir("kibi-hook-pkg-");
    const write = (name: string, content: string) => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, content);
      return file;
    };
    expect(readPackageVersion(write("a.json", '{"version":"1.2.3"}'))).toBe(
      "1.2.3",
    );
    expect(readPackageVersion(write("b.json", '{"version":3}'))).toBeNull();
    expect(readPackageVersion(write("c.json", '{"name":"x"}'))).toBeNull();
    expect(readPackageVersion(write("d.json", "null"))).toBeNull();
    expect(readPackageVersion(write("e.json", '"1.2.3"'))).toBeNull();
    expect(readPackageVersion(write("f.json", "{bad"))).toBeNull();
    expect(readPackageVersion(path.join(dir, "missing.json"))).toBeNull();
  });
});
