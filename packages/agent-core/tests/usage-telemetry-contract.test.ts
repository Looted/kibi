import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CI_ENV_KEYS,
  DEFAULT_TELEMETRY_HOST,
  DEFAULT_TELEMETRY_KEY,
  TELEMETRY_DOCS_URL,
  TEST_ENV_KEYS,
  clearTelemetryQueue,
  detectTelemetryHost,
  detectTelemetrySession,
  flushTelemetry,
  hashTelemetryId,
  moduleFileFromUrl,
  readTelemetryConfig,
  recordHookTelemetry,
  recordOperationTelemetry,
  rememberHookSession,
  setTelemetryPreference,
  takeTelemetryNotice,
  telemetryCategory,
  telemetryChannel,
  telemetryDirectory,
  telemetryStatus,
  workspaceSessionHash,
} from "../src/usage-telemetry";

const roots: string[] = [];
afterEach(() => {
  setSystemTime();
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function tempDir(prefix = "kibi-tel-c-"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(dir);
  return dir;
}

function env(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { KIBI_TELEMETRY_DIR: tempDir(), KIBI_TELEMETRY: "1", ...extra };
}

const dir = (e: NodeJS.ProcessEnv) => e.KIBI_TELEMETRY_DIR as string;
const queueFile = (e: NodeJS.ProcessEnv) =>
  path.join(dir(e), "telemetry-queue.jsonl");
const sessionsFile = (e: NodeJS.ProcessEnv) =>
  path.join(dir(e), "telemetry-sessions.json");

function queued(e: NodeJS.ProcessEnv): Array<Record<string, unknown>> {
  if (!fs.existsSync(queueFile(e))) return [];
  return fs
    .readFileSync(queueFile(e), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function props(e: NodeJS.ProcessEnv): Record<string, unknown> {
  return queued(e).at(-1)?.properties as Record<string, unknown>;
}

const SOURCE = { packageName: "kibi-cli" };
const OP = {
  interface: "cli" as const,
  operation: "search",
  status: "success" as const,
  durationMs: 1,
};

/** Run with the process free of CI and test markers. */
function outsideTests<T>(run: () => T): T {
  const names = [
    ...[...CI_ENV_KEYS, ...TEST_ENV_KEYS].map(
      (key) => key.split("=")[0] as string,
    ),
  ];
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

type Call = { url: string; init: RequestInit };
function fakeFetch(
  respond: (call: Call) => Promise<Response> | Response = () =>
    new Response("{}"),
) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    return respond(call);
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function writeQueue(e: NodeJS.ProcessEnv, lines: readonly string[]) {
  fs.mkdirSync(dir(e), { recursive: true });
  fs.writeFileSync(queueFile(e), lines.map((line) => `${line}\n`).join(""));
}

const event = (timestamp: string, name = "kibi_operation") =>
  JSON.stringify({ event: name, timestamp, properties: {} });

describe("constants", () => {
  test("public host, docs and key", () => {
    expect(DEFAULT_TELEMETRY_HOST).toBe("https://eu.i.posthog.com");
    expect(TELEMETRY_DOCS_URL).toBe(
      "https://looted.github.io/kibi/guide/telemetry.html",
    );
    expect(DEFAULT_TELEMETRY_KEY).toStartWith("phc_");
  });

  test("hashTelemetryId is a salted sha256 prefix", () => {
    expect(hashTelemetryId("abc")).toBe(
      createHash("sha256")
        .update("kibi-telemetry\0abc")
        .digest("hex")
        .slice(0, 16),
    );
  });
});

describe("switches and reasons", () => {
  test("every flag spelling", () => {
    for (const value of ["1", "true", " YES ", "on"]) {
      expect(telemetryStatus(env({ KIBI_TELEMETRY: value })).reason).toBe(
        "KIBI_TELEMETRY=1",
      );
    }
    for (const value of ["0", "false", "no", " Off "]) {
      expect(telemetryStatus(env({ KIBI_TELEMETRY: value }))).toMatchObject({
        enabled: false,
        reason: "KIBI_TELEMETRY=0",
      });
    }
    expect(
      telemetryStatus(env({ KIBI_TELEMETRY: "1", DO_NOT_TRACK: "yes" })),
    ).toMatchObject({ enabled: false, reason: "DO_NOT_TRACK=1" });
  });

  test("a blank key means no key; the key is trimmed when sent", async () => {
    for (const key of ["", "  "]) {
      expect(telemetryStatus(env({ KIBI_TELEMETRY_KEY: key }))).toMatchObject({
        enabled: false,
        reason: "no telemetry key",
      });
    }
    const e = env({
      KIBI_TELEMETRY_KEY: " k1 ",
      KIBI_TELEMETRY_HOST: " http://h.test// ",
    });
    recordOperationTelemetry(SOURCE, OP, e);
    const { fetchImpl, calls } = fakeFetch();
    expect(await flushTelemetry({ force: true, fetchImpl }, e)).toBe(1);
    expect(calls[0]?.url).toBe("http://h.test/batch/");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toStrictEqual({
      "content-type": "application/json",
    });
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.api_key).toBe("k1");
    expect(body.historical_migration).toBe(false);
    expect(body.batch).toHaveLength(1);
  });

  test("the default host and key are used when unset or blank", async () => {
    const e = env({ KIBI_TELEMETRY_HOST: "  " });
    recordOperationTelemetry(SOURCE, OP, e);
    const { fetchImpl, calls } = fakeFetch();
    await flushTelemetry({ force: true, fetchImpl }, e);
    expect(calls[0]?.url).toBe(`${DEFAULT_TELEMETRY_HOST}/batch/`);
    expect(JSON.parse(String(calls[0]?.init.body)).api_key).toBe(
      DEFAULT_TELEMETRY_KEY,
    );
  });

  test("CI and test markers, outside the test runner", () => {
    outsideTests(() => {
      const base = { KIBI_TELEMETRY_DIR: tempDir(), HOME: "/home/someone" };
      expect(telemetryStatus(base).reason).toBe(
        "on by default; anonymous, opt-out",
      );
      expect(telemetryStatus({ ...base, CI: " " }).enabled).toBe(true);
      expect(telemetryStatus({ ...base, CI: "false" }).enabled).toBe(true);
      expect(telemetryStatus({ ...base, CI: "yes" }).reason).toBe(
        "CI environment (CI)",
      );
      expect(telemetryStatus({ ...base, NODE_ENV: "production" }).enabled).toBe(
        true,
      );
      expect(telemetryStatus({ ...base, NODE_ENV: " test " }).reason).toBe(
        "test environment (NODE_ENV=test)",
      );
      expect(telemetryStatus({ ...base, VITEST: "1" }).reason).toBe(
        "test environment (VITEST)",
      );
      expect(telemetryStatus({ ...base, NODE_ENV: "test" }).enabled).toBe(
        false,
      );
      expect(telemetryStatus({ ...base, CI: "yes" }).enabled).toBe(false);
      setTelemetryPreference("enabled", base);
      expect(telemetryStatus(base).reason).toBe(
        "enabled with `kibi telemetry enable`",
      );
    });
  });

  test("sandboxed homes: under the temp directory, but not the directory itself", () => {
    outsideTests(() => {
      const base = { KIBI_TELEMETRY_DIR: tempDir() };
      const reason = "sandboxed home in the temp directory (harness run)";
      expect(
        telemetryStatus({ ...base, HOME: path.join(tempDir(), "missing") })
          .reason,
      ).toBe(reason);
      expect(telemetryStatus({ ...base, HOME: os.tmpdir() }).enabled).toBe(
        true,
      );
      expect(telemetryStatus({ ...base, USERPROFILE: tempDir() }).reason).toBe(
        reason,
      );
      const cwd = process.cwd();
      process.chdir(tempDir());
      try {
        expect(telemetryStatus({ ...base, HOME: "  " }).enabled).toBe(true);
      } finally {
        process.chdir(cwd);
      }
    });
  });
});

describe("config and preference", () => {
  test("non-object configs read as empty", () => {
    for (const text of ["null", '"str"', "3"]) {
      const e = env();
      fs.writeFileSync(path.join(dir(e), "telemetry.json"), text);
      expect(readTelemetryConfig(e)).toStrictEqual({});
      expect(telemetryStatus(e).enabled).toBe(true);
      setTelemetryPreference("enabled", e);
      expect(
        JSON.parse(
          fs.readFileSync(path.join(dir(e), "telemetry.json"), "utf8"),
        ),
      ).toStrictEqual({ preference: "enabled" });
    }
  });

  test("enabling keeps the queue; a malformed install id is replaced", () => {
    const e = env();
    writeQueue(e, [event(new Date().toISOString())]);
    setTelemetryPreference("enabled", e);
    expect(fs.existsSync(queueFile(e))).toBe(true);
    for (const installId of [5, ""]) {
      fs.writeFileSync(
        path.join(dir(e), "telemetry.json"),
        JSON.stringify({ installId }),
      );
      recordOperationTelemetry(SOURCE, OP, e);
      expect(props(e).distinct_id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  test("the notice text, and none when the config cannot be written", () => {
    const e = env();
    expect(takeTelemetryNotice(e)).toBe(
      [
        "Kibi collects anonymous usage statistics (operation names, durations, error categories and versions) to improve Kibi.",
        "It never sends code, file paths, queries, KB content or repository names.",
        `Turn it off with \`kibi telemetry disable\` or KIBI_TELEMETRY=0. Details: ${TELEMETRY_DOCS_URL}`,
      ].join("\n"),
    );
    const blocker = path.join(tempDir(), "file");
    fs.writeFileSync(blocker, "");
    expect(
      takeTelemetryNotice({ KIBI_TELEMETRY: "1", KIBI_TELEMETRY_DIR: blocker }),
    ).toBeNull();
  });
});

describe("directories", () => {
  test("explicit, XDG, home and Windows locations", () => {
    expect(telemetryDirectory({ KIBI_TELEMETRY_DIR: " /x " })).toBe("/x");
    expect(
      telemetryDirectory({ KIBI_TELEMETRY_DIR: "  ", XDG_STATE_HOME: " /s " }),
    ).toBe(path.join("/s", "kibi"));
    expect(telemetryDirectory({ XDG_STATE_HOME: "  ", HOME: "/h" })).toBe(
      path.join("/h", ".local", "state", "kibi"),
    );
    expect(telemetryDirectory({ LOCALAPPDATA: "/l", HOME: "/h" })).toBe(
      path.join("/h", ".local", "state", "kibi"),
    );
    const platform = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
      expect(telemetryDirectory({ LOCALAPPDATA: "/l", HOME: "/h" })).toBe(
        path.join("/l", "kibi"),
      );
      expect(telemetryDirectory({ HOME: "/h" })).toBe(
        path.join("/h", ".local", "state", "kibi"),
      );
    } finally {
      Object.defineProperty(
        process,
        "platform",
        platform as PropertyDescriptor,
      );
    }
  });
});

describe("host, session and channel", () => {
  test("host names collapse separators and trim edges", () => {
    expect(detectTelemetryHost({ KIBI_HOST: "Claude  Code" })).toBe(
      "claude-code",
    );
    expect(detectTelemetryHost({ KIBI_HOST: " (x) " })).toBe("x");
    expect(
      detectTelemetryHost({ KIBI_HOST: "  ", KIBI_MCP_HOST: "cursor" }),
    ).toBe("cursor");
    expect(detectTelemetryHost({ KIBI_MCP_HOST: "  ", CLAUDECODE: "1" })).toBe(
      "claude-code",
    );
    expect(
      detectTelemetrySession({
        KIBI_SESSION_ID: "  ",
        CLAUDE_CODE_SESSION_ID: "s",
      }),
    ).toBe("s");
  });

  test("event fields: host, remote, lib and runtime", () => {
    const e = env({ CODESPACES: "true", KIBI_HOST: "cursor" });
    recordOperationTelemetry({ ...SOURCE, host: "  " }, OP, e);
    expect(props(e)).toMatchObject({
      $lib: "kibi",
      host: "cursor",
      remote: true,
      runtime: "bun",
      runtime_version: process.versions.node.split(".")[0],
      package_version: null,
    });
    const quiet = env({ GITPOD_WORKSPACE_ID: "  " });
    recordOperationTelemetry({ ...SOURCE, host: " Open Code " }, OP, quiet);
    expect(props(quiet)).toMatchObject({ host: "open-code", remote: false });
    const unknown = env();
    recordOperationTelemetry(SOURCE, OP, unknown);
    expect(props(unknown).host).toBe("unknown");
    const gitpod = env({ GITPOD_WORKSPACE_ID: "w" });
    recordOperationTelemetry(SOURCE, OP, gitpod);
    expect(props(gitpod).remote).toBe(true);
  });

  test("a blank session id falls back to the environment's", () => {
    const e = env({ KIBI_SESSION_ID: "env-session" });
    recordOperationTelemetry({ ...SOURCE, sessionId: "  " }, OP, e);
    expect(props(e).session).toBe(hashTelemetryId("env-session"));
  });

  test("blank channel variables, module URLs and the checkout cache", () => {
    const root = tempDir();
    fs.writeFileSync(path.join(root, "package.json"), '{"name":"kibi"}');
    const file = path.join(root, "packages", "x", "a.js");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "");
    // Named kibi but without the agent-core workspace: not a checkout.
    expect(
      telemetryChannel({ KIBI_TELEMETRY_CHANNEL: "  " }, file),
    ).toStrictEqual({
      channel: "release",
      source: "installed",
    });
    const other = tempDir();
    fs.writeFileSync(path.join(other, "package.json"), '{"name":"other"}');
    fs.mkdirSync(path.join(other, "packages", "agent-core"), {
      recursive: true,
    });
    const otherFile = path.join(other, "a.js");
    fs.writeFileSync(otherFile, "");
    expect(telemetryChannel({}, otherFile).channel).toBe("release");

    const checkout = tempDir();
    fs.writeFileSync(path.join(checkout, "package.json"), '{"name":"kibi"}');
    fs.mkdirSync(path.join(checkout, "packages", "agent-core"), {
      recursive: true,
    });
    const inside = path.join(checkout, "b.js");
    fs.writeFileSync(inside, "");
    expect(telemetryChannel({}, inside).channel).toBe("source");
    fs.rmSync(path.join(checkout, "package.json"));
    // Answered from the cache for the life of the process.
    expect(telemetryChannel({}, inside).channel).toBe("source");

    expect(
      moduleFileFromUrl(() => new URL("file:///tmp/a.js")),
    ).toBeUndefined();
    expect(telemetryChannel({}, null)).toStrictEqual({
      channel: "release",
      source: "installed",
    });
    // This suite runs from the checkout, so the default module is a source run.
    expect(telemetryStatus(env()).channel).toBe("source");
    const e = env();
    recordOperationTelemetry(SOURCE, OP, e);
    expect(props(e).channel).toBe("source");
  });
});

describe("session markers", () => {
  const T0 = new Date("2026-01-01T00:00:00Z");
  const HALF_HOUR = 30 * 60 * 1000;

  test("stored under hashed workspace keys, from the trimmed session id", () => {
    const e = env();
    rememberHookSession("/w", "  ", e);
    expect(fs.existsSync(sessionsFile(e))).toBe(false);
    setSystemTime(T0);
    rememberHookSession("/w", " s1 ", e);
    const key = hashTelemetryId(`workspace\0${path.resolve("/w")}`);
    expect(JSON.parse(fs.readFileSync(sessionsFile(e), "utf8"))).toStrictEqual({
      [key]: { session: hashTelemetryId("s1"), at: T0.getTime() },
    });
  });

  test("markers expire after exactly half an hour", () => {
    const e = env();
    setSystemTime(T0);
    rememberHookSession("/w", "s1", e);
    setSystemTime(new Date(T0.getTime() + HALF_HOUR));
    expect(workspaceSessionHash("/w/sub", e)).toBe(hashTelemetryId("s1"));
    rememberHookSession("/other", "s2", e);
    expect(
      Object.keys(JSON.parse(fs.readFileSync(sessionsFile(e), "utf8"))),
    ).toHaveLength(2);
    setSystemTime(new Date(T0.getTime() + HALF_HOUR + 1));
    expect(workspaceSessionHash("/w", e)).toBeUndefined();
    rememberHookSession("/third", "s3", e);
    const kept = JSON.parse(fs.readFileSync(sessionsFile(e), "utf8"));
    expect(Object.keys(kept)).toHaveLength(2);
    expect(
      kept[hashTelemetryId(`workspace\0${path.resolve("/w")}`)],
    ).toBeUndefined();
  });

  test("malformed markers are dropped or ignored", () => {
    const e = env();
    setSystemTime(T0);
    const key = hashTelemetryId(`workspace\0${path.resolve("/w")}`);
    fs.writeFileSync(
      sessionsFile(e),
      JSON.stringify({
        a: null,
        b: { at: "x" },
        [key]: { session: 1, at: T0.getTime() },
      }),
    );
    expect(workspaceSessionHash("/w", e)).toBeUndefined();
    fs.writeFileSync(
      sessionsFile(e),
      JSON.stringify({ [key]: { session: "h", at: "now" } }),
    );
    expect(workspaceSessionHash("/w", e)).toBeUndefined();
    fs.writeFileSync(
      sessionsFile(e),
      JSON.stringify({ [key]: { session: "h", at: String(T0.getTime()) } }),
    );
    expect(workspaceSessionHash("/w", e)).toBeUndefined();
    fs.writeFileSync(
      sessionsFile(e),
      JSON.stringify({ a: null, b: { at: "x" } }),
    );
    rememberHookSession("/w", "s", e);
    expect(
      Object.keys(JSON.parse(fs.readFileSync(sessionsFile(e), "utf8"))),
    ).toEqual([key]);
    for (const text of ["null", '"str"']) {
      fs.writeFileSync(sessionsFile(e), text);
      expect(() => rememberHookSession("/w", "s", e)).not.toThrow();
      expect(workspaceSessionHash("/w", e)).toBe(hashTelemetryId("s"));
    }
  });

  test("only the 200 newest markers are kept", () => {
    const e = env();
    setSystemTime(T0);
    const markers: Record<string, { session: string; at: number }> = {};
    for (let index = 0; index < 200; index++) {
      markers[`old${index}`] = {
        session: "x",
        at: T0.getTime() - 1000 + index,
      };
    }
    fs.writeFileSync(sessionsFile(e), JSON.stringify(markers));
    rememberHookSession("/w", "s", e);
    const kept = JSON.parse(fs.readFileSync(sessionsFile(e), "utf8"));
    expect(Object.keys(kept)).toHaveLength(200);
    expect(kept.old0).toBeUndefined();
    expect(kept.old199).toBeDefined();
    expect(
      kept[hashTelemetryId(`workspace\0${path.resolve("/w")}`)],
    ).toBeDefined();
  });
});

describe("queue", () => {
  test("hooks queue nothing when off; missing hook fields are null", () => {
    const off = env({ KIBI_TELEMETRY: "0" });
    recordHookTelemetry(SOURCE, { hookEvent: "e", hookAction: "a" }, off);
    expect(queued(off)).toEqual([]);
    const on = env();
    recordHookTelemetry(SOURCE, { hookEvent: "e", hookAction: "a" }, on);
    expect(props(on)).toMatchObject({
      hook_event: "e",
      hook_action: "a",
      path_kind: null,
      kb_operation: null,
      kb_used_before: null,
      requirement_count: null,
    });
    expect(telemetryCategory(" Tool_Timeout ")).toBe("tool_timeout");
  });

  test("the queue stops growing past 1 MiB", () => {
    const e = env();
    fs.writeFileSync(queueFile(e), "x".repeat(1024 * 1024));
    recordOperationTelemetry(SOURCE, OP, e);
    expect(fs.statSync(queueFile(e)).size).toBeGreaterThan(1024 * 1024);
    const grown = fs.statSync(queueFile(e)).size;
    recordOperationTelemetry(SOURCE, OP, e);
    expect(fs.statSync(queueFile(e)).size).toBe(grown);
  });

  test("clearing removes the queue, sessions and claimed batches only", () => {
    const e = env();
    for (const name of [
      "telemetry-queue.jsonl",
      "telemetry-sessions.json",
      "a.sending",
      ".sendingx",
      "telemetry.json",
    ]) {
      fs.writeFileSync(path.join(dir(e), name), "");
    }
    clearTelemetryQueue(e);
    expect(fs.readdirSync(dir(e)).sort()).toEqual([
      ".sendingx",
      "telemetry.json",
    ]);
    expect(() =>
      clearTelemetryQueue({ KIBI_TELEMETRY_DIR: path.join(dir(e), "missing") }),
    ).not.toThrow();
  });
});

describe("flushing", () => {
  const T0 = new Date("2026-01-01T00:00:00Z");
  const at = (ms: number) => new Date(T0.getTime() + ms).toISOString();

  test("nothing is sent when off", async () => {
    setSystemTime(T0);
    const e = env({ KIBI_TELEMETRY: "0" });
    writeQueue(e, [event(at(0))]);
    const { fetchImpl, calls } = fakeFetch();
    expect(await flushTelemetry({ force: true, fetchImpl }, e)).toBe(0);
    expect(calls).toEqual([]);
  });

  test("a flush is due at five minutes, at 20 events, or on a torn first line", async () => {
    setSystemTime(T0);
    const { fetchImpl, calls } = fakeFetch();
    const young = env();
    writeQueue(young, [event(at(-(5 * 60 * 1000 - 1)))]);
    expect(await flushTelemetry({ fetchImpl }, young)).toBe(0);
    const due = env();
    writeQueue(due, [event(at(-5 * 60 * 1000))]);
    expect(await flushTelemetry({ fetchImpl }, due)).toBe(1);
    const many = env();
    writeQueue(
      many,
      Array.from({ length: 20 }, () => event(at(0))),
    );
    expect(await flushTelemetry({ fetchImpl }, many)).toBe(20);
    const torn = env();
    writeQueue(torn, ["{torn", event(at(0))]);
    expect(await flushTelemetry({ fetchImpl }, torn)).toBe(1);
    expect(calls).toHaveLength(3);
  });

  test("a blank or missing queue is not due and is left alone", async () => {
    const { fetchImpl, calls } = fakeFetch();
    const blank = env();
    fs.writeFileSync(queueFile(blank), "\n \n");
    expect(await flushTelemetry({ fetchImpl }, blank)).toBe(0);
    expect(fs.existsSync(queueFile(blank))).toBe(true);
    const missing = env();
    const stale = path.join(dir(missing), "x.sending");
    fs.writeFileSync(stale, `${event(new Date().toISOString())}\n`);
    fs.utimesSync(stale, new Date(0), new Date(0));
    expect(await flushTelemetry({ fetchImpl }, missing)).toBe(0);
    expect(fs.existsSync(stale)).toBe(true);
    expect(calls).toEqual([]);
    expect(
      await flushTelemetry(
        { force: true, fetchImpl },
        {
          KIBI_TELEMETRY: "1",
          KIBI_TELEMETRY_DIR: path.join(dir(missing), "none"),
        },
      ),
    ).toBe(0);
  });

  test("events older than a week or with bad timestamps are dropped", async () => {
    setSystemTime(T0);
    const week = 7 * 24 * 60 * 60 * 1000;
    const e = env();
    writeQueue(e, [
      event(at(-week), "kept"),
      event(at(-week - 1), "old"),
      event("not a date", "bad"),
      "",
    ]);
    const { fetchImpl, calls } = fakeFetch();
    expect(await flushTelemetry({ force: true, fetchImpl }, e)).toBe(1);
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.batch.map((item: { event: string }) => item.event)).toEqual([
      "kept",
    ]);
    expect(fs.readdirSync(dir(e))).toEqual([]);

    const empty = env();
    writeQueue(empty, [event("bad")]);
    const second = fakeFetch();
    expect(
      await flushTelemetry({ force: true, fetchImpl: second.fetchImpl }, empty),
    ).toBe(0);
    expect(second.calls).toEqual([]);
    expect(fs.readdirSync(dir(empty))).toEqual([]);
  });

  test("batches claimed ten minutes ago or more are reclaimed and sent", async () => {
    setSystemTime(T0);
    const e = env();
    const stale = path.join(dir(e), "a.sending");
    const fresh = path.join(dir(e), "b.sending");
    const other = path.join(dir(e), "c.txt");
    for (const file of [stale, fresh, other]) {
      fs.writeFileSync(file, `${event(at(0), path.basename(file))}\n`);
    }
    const tenMinutes = 10 * 60 * 1000;
    fs.utimesSync(
      stale,
      new Date(T0.getTime() - tenMinutes),
      new Date(T0.getTime() - tenMinutes),
    );
    fs.utimesSync(
      fresh,
      new Date(T0.getTime() - tenMinutes + 1000),
      new Date(T0.getTime() - tenMinutes + 1000),
    );
    fs.utimesSync(other, new Date(0), new Date(0));
    const { fetchImpl, calls } = fakeFetch();
    expect(await flushTelemetry({ force: true, fetchImpl }, e)).toBe(1);
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.batch.map((item: { event: string }) => item.event)).toEqual([
      "a.sending",
    ]);
    expect(fs.readdirSync(dir(e)).sort()).toEqual(["b.sending", "c.txt"]);
  });

  test("5xx keeps the events, 4xx drops them", async () => {
    for (const [status, kept] of [
      [500, 1],
      [499, 0],
    ] as const) {
      const e = env();
      writeQueue(e, [event(new Date().toISOString())]);
      const { fetchImpl } = fakeFetch(() => new Response("{}", { status }));
      expect(await flushTelemetry({ force: true, fetchImpl }, e)).toBe(0);
      expect(queued(e)).toHaveLength(kept);
      expect(
        fs.readdirSync(dir(e)).filter((name) => name.endsWith(".sending")),
      ).toEqual([]);
    }
  });

  test("the send is aborted after the timeout, and only then", async () => {
    const e = env();
    writeQueue(e, [event(new Date().toISOString())]);
    const hanging = fakeFetch(
      ({ init }) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new Error("abort")),
          );
        }),
    );
    expect(
      await flushTelemetry(
        { force: true, timeoutMs: 5, fetchImpl: hanging.fetchImpl },
        e,
      ),
    ).toBe(0);
    expect(queued(e)).toHaveLength(1);

    const slow = fakeFetch(async ({ init }) => {
      await Bun.sleep(20);
      return init.signal?.aborted
        ? new Response("{}", { status: 503 })
        : new Response("{}");
    });
    expect(
      await flushTelemetry({ force: true, fetchImpl: slow.fetchImpl }, e),
    ).toBe(1);

    writeQueue(e, [event(new Date().toISOString())]);
    const quick = fakeFetch();
    expect(
      await flushTelemetry(
        { force: true, timeoutMs: 5, fetchImpl: quick.fetchImpl },
        e,
      ),
    ).toBe(1);
    await Bun.sleep(20);
    expect(quick.calls[0]?.init.signal?.aborted).toBe(false);
  });
});
