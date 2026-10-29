// implements REQ-kibi-anonymous-usage-telemetry
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CI_ENV_KEYS,
  DEFAULT_TELEMETRY_HOST,
  TEST_ENV_KEYS,
  flushTelemetry,
  hashTelemetryId,
  readTelemetryConfig,
  recordHookTelemetry,
  recordOperationTelemetry,
  setTelemetryPreference,
  takeTelemetryNotice,
  telemetryStatus,
} from "../src/usage-telemetry";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/**
 * An environment with its own state directory. The test runner sets
 * NODE_ENV=test on the process, which turns telemetry off, so `onByDefault`
 * clears it for the checks that need the outside-of-tests default.
 */
function telemetryEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-telemetry-"));
  temporaryRoots.push(directory);
  return { KIBI_TELEMETRY_DIR: directory, ...extra };
}

function onByDefault<T>(run: () => T): T {
  const names = [...CI_ENV_KEYS, ...TEST_ENV_KEYS].map(
    (key) => key.split("=")[0] as string,
  );
  const saved = new Map(names.map((name) => [name, process.env[name]]));
  for (const name of names) Reflect.deleteProperty(process.env, name);
  try {
    return run();
  } finally {
    for (const [name, value] of saved) {
      if (value !== undefined) process.env[name] = value;
    }
  }
}

/** Telemetry explicitly on, as `KIBI_TELEMETRY=1` sets it under a test runner. */
function enabledEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return telemetryEnv({ KIBI_TELEMETRY: "1", ...extra });
}

type Sent = { url: string; body: { api_key: string; batch: unknown[] } };

function recordingFetch(status = 200): {
  fetchImpl: typeof fetch;
  sent: Sent[];
} {
  const sent: Sent[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    return new Response("{}", { status });
  }) as unknown as typeof fetch;
  return { fetchImpl, sent };
}

const SOURCE = {
  packageName: "kibi-mcp",
  packageVersion: "9.9.9",
  host: "claude-code",
  sessionId: "session-secret-id",
};

const OPERATION = {
  interface: "mcp" as const,
  operation: "kb_search",
  status: "error" as const,
  durationMs: 41.6,
  errorCategory: "tool_timeout",
};

describe("anonymous usage telemetry switches", () => {
  test("is on by default and every opt-out wins", () => {
    onByDefault(() => {
      expect(telemetryStatus(telemetryEnv())).toMatchObject({
        enabled: true,
        reason: "on by default; anonymous, opt-out",
      });
      expect(telemetryStatus(telemetryEnv({ CI: "true" })).enabled).toBe(false);
    });
    // The test runner's own NODE_ENV=test turns it off as well.
    expect(telemetryStatus(telemetryEnv()).enabled).toBe(false);
    for (const off of [
      { KIBI_TELEMETRY: "0" },
      { KIBI_TELEMETRY: "false" },
      { DO_NOT_TRACK: "1" },
      { DO_NOT_TRACK: "1", KIBI_TELEMETRY: "1" },
      { KIBI_TELEMETRY: "0", CI: "true" },
      { CI: "true" },
      { CI: "1" },
      { GITHUB_ACTIONS: "true" },
      { GITLAB_CI: "true" },
      { BUILDKITE: "true" },
      { JENKINS_URL: "https://ci.example" },
      { TF_BUILD: "True" },
      { NODE_ENV: "test" },
      { JEST_WORKER_ID: "1" },
      { VITEST: "true" },
      { KIBI_TELEMETRY_KEY: "" },
    ]) {
      expect(telemetryStatus(telemetryEnv(off)).enabled).toBe(false);
    }
  });

  test("an explicit opt-in overrides the CI and test defaults", () => {
    expect(
      telemetryStatus(telemetryEnv({ CI: "true", KIBI_TELEMETRY: "1" }))
        .enabled,
    ).toBe(true);
    expect(
      telemetryStatus(telemetryEnv({ NODE_ENV: "test", KIBI_TELEMETRY: "1" }))
        .enabled,
    ).toBe(true);
  });

  test("kibi telemetry disable persists and drops queued events", async () => {
    const env = enabledEnv();
    recordOperationTelemetry(SOURCE, OPERATION, env);
    setTelemetryPreference("disabled", env);
    expect(telemetryStatus(env)).toMatchObject({
      enabled: false,
      reason: "disabled with `kibi telemetry disable`",
    });
    expect(fs.readdirSync(env.KIBI_TELEMETRY_DIR as string)).toEqual([
      "telemetry.json",
    ]);
    // A disabled install records and sends nothing.
    recordOperationTelemetry(SOURCE, OPERATION, env);
    const { fetchImpl, sent } = recordingFetch();
    expect(await flushTelemetry({ force: true, fetchImpl }, env)).toBe(0);
    expect(sent).toEqual([]);

    setTelemetryPreference("enabled", env);
    const { KIBI_TELEMETRY: _explicit, ...withoutExplicit } = env;
    onByDefault(() => {
      expect(telemetryStatus(withoutExplicit).enabled).toBe(true);
      // CI and test runs stay off even after `kibi telemetry enable`.
      expect(telemetryStatus({ ...withoutExplicit, CI: "true" }).enabled).toBe(
        false,
      );
    });
  });

  test("a CI or test marker on the process wins over an env object without it", () => {
    onByDefault(() => {
      process.env.GITHUB_ACTIONS = "true";
      try {
        expect(telemetryStatus(telemetryEnv())).toMatchObject({
          enabled: false,
          reason: "CI environment (GITHUB_ACTIONS)",
        });
      } finally {
        Reflect.deleteProperty(process.env, "GITHUB_ACTIONS");
      }
    });
  });

  test("the first-run notice is returned once and names the off switch", () => {
    const env = enabledEnv();
    const notice = takeTelemetryNotice(env);
    expect(notice).toContain("anonymous usage statistics");
    expect(notice).toContain("kibi telemetry disable");
    expect(notice).toContain("KIBI_TELEMETRY=0");
    expect(takeTelemetryNotice(env)).toBeNull();
    expect(takeTelemetryNotice(telemetryEnv({ KIBI_TELEMETRY: "0" }))).toBe(
      null,
    );
  });
});

describe("anonymous usage telemetry events", () => {
  test("sends only summary fields, a hashed session and a stable install id", async () => {
    const env = enabledEnv();
    recordOperationTelemetry(SOURCE, OPERATION, env);
    recordHookTelemetry(
      SOURCE,
      {
        hookEvent: "PostToolUse",
        hookAction: "edited",
        pathKind: "source",
        kbUsedBefore: true,
        requirementCount: 2,
      },
      env,
    );
    const { fetchImpl, sent } = recordingFetch();
    expect(await flushTelemetry({ force: true, fetchImpl }, env)).toBe(2);

    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe(`${DEFAULT_TELEMETRY_HOST}/batch/`);
    expect(sent[0]?.body.api_key).toStartWith("phc_");
    const [operation, hook] = sent[0]?.body.batch as {
      event: string;
      properties: Record<string, unknown>;
    }[];
    const installId = readTelemetryConfig(env).installId;
    expect(operation?.event).toBe("kibi_operation");
    expect(operation?.properties).toMatchObject({
      distinct_id: installId,
      $process_person_profile: false,
      $geoip_disable: true,
      package: "kibi-mcp",
      package_version: "9.9.9",
      host: "claude-code",
      session: hashTelemetryId("session-secret-id"),
      interface: "mcp",
      operation: "kb_search",
      status: "error",
      duration_ms: 42,
      error_category: "tool_timeout",
    });
    expect(Object.keys(operation?.properties ?? {}).sort()).toEqual(
      [
        "$geoip_disable",
        "$lib",
        "$process_person_profile",
        "arch",
        "distinct_id",
        "duration_ms",
        "error_category",
        "exit_code",
        "host",
        "interface",
        "operation",
        "os",
        "package",
        "package_version",
        "runtime",
        "runtime_version",
        "session",
        "status",
      ].sort(),
    );
    expect(hook?.event).toBe("kibi_hook");
    expect(hook?.properties).toMatchObject({
      distinct_id: installId,
      hook_event: "PostToolUse",
      hook_action: "edited",
      path_kind: "source",
      kb_used_before: true,
      requirement_count: 2,
    });
    expect(JSON.stringify(sent)).not.toContain("session-secret-id");
  });

  test("waits for a batch unless forced", async () => {
    const env = enabledEnv();
    recordOperationTelemetry(SOURCE, OPERATION, env);
    const { fetchImpl, sent } = recordingFetch();
    expect(await flushTelemetry({ fetchImpl }, env)).toBe(0);
    expect(sent).toEqual([]);
    for (let index = 0; index < 19; index += 1) {
      recordOperationTelemetry(SOURCE, OPERATION, env);
    }
    expect(await flushTelemetry({ fetchImpl }, env)).toBe(20);
    expect(await flushTelemetry({ force: true, fetchImpl }, env)).toBe(0);
  });

  test("keeps events for the next flush when the send fails, and drops rejected ones", async () => {
    const env = enabledEnv();
    recordOperationTelemetry(SOURCE, OPERATION, env);
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await flushTelemetry({ force: true, fetchImpl: failing }, env)).toBe(
      0,
    );
    const server = recordingFetch(503);
    expect(
      await flushTelemetry({ force: true, fetchImpl: server.fetchImpl }, env),
    ).toBe(0);
    const ok = recordingFetch();
    expect(
      await flushTelemetry({ force: true, fetchImpl: ok.fetchImpl }, env),
    ).toBe(1);

    recordOperationTelemetry(SOURCE, OPERATION, env);
    const rejected = recordingFetch(400);
    await flushTelemetry({ force: true, fetchImpl: rejected.fetchImpl }, env);
    expect(
      await flushTelemetry({ force: true, fetchImpl: ok.fetchImpl }, env),
    ).toBe(0);
  });

  test("records nothing when telemetry is off", async () => {
    const env = enabledEnv({ DO_NOT_TRACK: "1" });
    recordOperationTelemetry(SOURCE, OPERATION, env);
    expect(fs.readdirSync(env.KIBI_TELEMETRY_DIR as string)).toEqual([]);
  });
});
