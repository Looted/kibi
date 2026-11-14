import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  HOOK_ACTION_SKILL_LOADED,
  appendHookUsage,
  kbUsageTrace,
} from "../src/hook-usage-log";
import {
  KIBI_SKILL_NAMES,
  RELATIONSHIP_COUNT_BUCKETS,
  RESULT_COUNT_BUCKETS,
  RETRY_WINDOW_MS,
  SEARCH_REPEAT_WINDOW_MS,
  SKILL_WINDOW_MS,
  SMALL_COUNT_BUCKETS,
  countBucket,
  kibiSkillLoad,
  kibiStackFrames,
  recallOperation,
  rememberSkillLoad,
  telemetryCrash,
  telemetryField,
  telemetryRootError,
  telemetryRule,
} from "../src/telemetry-signals";
import {
  flushTelemetry,
  recordOperationTelemetry,
  rememberTelemetrySkillLoad,
} from "../src/usage-telemetry";

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

function enabledEnv(): NodeJS.ProcessEnv {
  return { KIBI_TELEMETRY_DIR: tempDir("kibi-signals-"), KIBI_TELEMETRY: "1" };
}

async function sent(
  env: NodeJS.ProcessEnv,
): Promise<Record<string, unknown>[]> {
  const batches: { batch: { properties: Record<string, unknown> }[] }[] = [];
  const fetchImpl = (async (_url: string, init?: RequestInit) => {
    batches.push(JSON.parse(String(init?.body)));
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  await flushTelemetry({ force: true, fetchImpl }, env);
  return batches.flatMap((body) => body.batch.map((event) => event.properties));
}

describe("bucketed counts and fixed vocabulary", () => {
  test("counts are sent as ranges, never exactly", () => {
    expect(
      [0, 1, 2, 5, 6, 10, 11, 900].map((count) =>
        countBucket(count, RESULT_COUNT_BUCKETS),
      ),
    ).toEqual(["0", "1", "2-5", "2-5", "6-10", "6-10", "11+", "11+"]);
    expect(
      [0, 1, 3, 7].map((count) =>
        countBucket(count, RELATIONSHIP_COUNT_BUCKETS),
      ),
    ).toEqual(["0", "1", "2-5", "6+"]);
    expect(
      [1, 2, 3, 4, 40].map((count) => countBucket(count, SMALL_COUNT_BUCKETS)),
    ).toEqual(["1", "2", "3", "4+", "4+"]);
    expect(countBucket(undefined, SMALL_COUNT_BUCKETS)).toBeNull();
    expect(countBucket(-1, SMALL_COUNT_BUCKETS)).toBeNull();
    expect(countBucket(Number.NaN, SMALL_COUNT_BUCKETS)).toBeNull();
    expect(countBucket(0, SMALL_COUNT_BUCKETS)).toBeNull();
  });

  test("rules are short identifiers and fields are dotted schema paths", () => {
    expect(telemetryRule("additionalProperties")).toBe("additionalproperties");
    expect(telemetryRule("must be a string")).toBe("other");
    expect(telemetryRule(undefined)).toBeNull();
    expect(telemetryRule("  ")).toBeNull();
    expect(telemetryField("relationships.*.type")).toBe("relationships.*.type");
    expect(telemetryField("sourceFile")).toBe("sourceFile");
    expect(telemetryField("status value")).toBe("other");
    expect(telemetryField("a.b.c.d.e.f.g")).toBe("other");
    expect(telemetryField("/home/alice")).toBe("other");
    expect(telemetryField(undefined)).toBeNull();
  });
});

describe("crash frames", () => {
  const stack = [
    "TypeError: Cannot read properties of undefined (reading 'x') at /home/alice/secret",
    "    at Object.parse (node:internal/json:1:1)",
    "    at readManifest (/home/alice/project/node_modules/kibi-cli/dist/extractors/manifest.js:120:9)",
    "    at async syncCommand (file:///home/alice/project/node_modules/kibi-cli/dist/commands/sync.js:40:3)",
    "    at userPlugin (/home/alice/project/plugins/secret-plugin.js:4:2)",
    "    at /home/user/kibi/packages/cli/src/cli.ts:10:1",
    "    at deeper (/home/user/kibi/packages/cli/src/never.ts:1:1)",
  ].join("\n");

  test("keep only frames inside Kibi's own packages, without paths or lines", () => {
    expect(kibiStackFrames(stack)).toEqual([
      "kibi-cli/dist/extractors/manifest#readManifest",
      "kibi-cli/dist/commands/sync#syncCommand",
      "kibi-cli/src/cli#anonymous",
    ]);
    expect(kibiStackFrames(undefined)).toEqual([]);
    expect(
      kibiStackFrames("Error\n    at elsewhere (/srv/app/index.js:1:1)"),
    ).toEqual([]);
    expect(
      kibiStackFrames("Error\n    at f (/x/packages/my-app/src/index.ts:1:1)"),
    ).toEqual([]);
  });

  test("fingerprint a crash by its class and Kibi frames", () => {
    const error = Object.assign(new TypeError("boom /home/alice"), { stack });
    const crash = telemetryCrash(error, "TypeError");
    expect(crash.frame).toBe("kibi-cli/dist/extractors/manifest#readManifest");
    expect(crash.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(telemetryCrash(error, "TypeError")).toEqual(crash);
    expect(telemetryCrash(error, "RangeError").fingerprint).not.toBe(
      crash.fingerprint,
    );
    expect(
      telemetryCrash({ stack: "Error\n    at x (/srv/a.js:1:1)" }, null),
    ).toEqual({ frame: null, fingerprint: null });
    expect(telemetryCrash("boom", null)).toEqual({
      frame: null,
      fingerprint: null,
    });
  });

  test("a plain wrapper's crash is located at its cause", () => {
    const cause = Object.assign(new TypeError("boom"), { stack });
    const wrapper = new Error("Upsert execution failed: boom", { cause });
    expect(telemetryCrash(wrapper, "TypeError")).toEqual(
      telemetryCrash(cause, "TypeError"),
    );
  });
});

describe("wrapped errors", () => {
  test("a plain wrapper without a code stands for its cause", () => {
    const cause = new TypeError("boom");
    const wrapper = new Error("P: boom", { cause });
    expect(telemetryRootError(wrapper)).toBe(cause);
    const twice = new Error("Q: P: boom", { cause: wrapper });
    expect(telemetryRootError(twice)).toBe(cause);
    const coded = Object.assign(new Error("enoent"), { code: "ENOENT" });
    expect(telemetryRootError(new Error("P: enoent", { cause: coded }))).toBe(
      coded,
    );
  });

  test("a coded, classed or causeless error is its own root", () => {
    const coded = Object.assign(new Error("P"), {
      code: "ENGINE_START_FAILED",
      cause: new TypeError("x"),
    });
    expect(telemetryRootError(coded)).toBe(coded);
    const classed = new RangeError("P", { cause: new TypeError("x") });
    expect(telemetryRootError(classed)).toBe(classed);
    const blank = Object.assign(new Error("P", { cause: new TypeError("x") }), {
      code: "",
    });
    expect(telemetryRootError(blank)).toBeInstanceOf(TypeError);
    const plain = new Error("P");
    expect(telemetryRootError(plain)).toBe(plain);
    const primitive = new Error("P", { cause: "text" });
    expect(telemetryRootError(primitive)).toBe(primitive);
    expect(telemetryRootError("boom")).toBe("boom");
    expect(telemetryRootError(null)).toBeNull();
  });

  test("a cause chain is followed at most five links", () => {
    let error: Error = new TypeError("bottom");
    const chain: Error[] = [error];
    for (let index = 0; index < 6; index += 1) {
      error = new Error(`wrap ${index}`, { cause: error });
      chain.push(error);
    }
    expect(telemetryRootError(error)).toBe(chain[1]);
  });
});

describe("Kibi skill loads", () => {
  test("are recognised from skill tools and SKILL.md paths in any host", () => {
    expect(kibiSkillLoad("Skill", { skill: "kibi-usage" })).toBe("kibi-usage");
    expect(kibiSkillLoad("skill", { name: "kibi:kibi-freshness" })).toBe(
      "kibi-freshness",
    );
    expect(kibiSkillLoad("Skill", { skill: "kibi-private-thing" })).toBe(
      "other",
    );
    expect(kibiSkillLoad("Skill", { skill: "pdf" })).toBeUndefined();
    expect(
      kibiSkillLoad("Read", {
        file_path: "/home/alice/repo/.claude/skills/kibi-decisions/SKILL.md",
      }),
    ).toBe("kibi-decisions");
    expect(
      kibiSkillLoad("exec_command", {
        cmd: ["bash", "-lc", "cat .agents/skills/kibi-traceability/SKILL.md"],
      }),
    ).toBe("kibi-traceability");
    expect(kibiSkillLoad("Read", { file_path: "src/kibi-usage.ts" })).toBe(
      undefined,
    );
    expect(kibiSkillLoad(undefined, undefined)).toBeUndefined();
  });

  test("a hook that sees one marks the workspace for later CLI and MCP events", async () => {
    const env = enabledEnv();
    const workspace = tempDir("kibi-skill-ws-");
    const trace = kbUsageTrace("Skill", { skill: "kibi-usage" });
    expect(trace).toEqual({
      action: HOOK_ACTION_SKILL_LOADED,
      skill: "kibi-usage",
    });
    appendHookUsage(
      {
        host: "claude-code",
        workspaceRoot: workspace,
        event: "PreToolUse",
        sessionId: undefined,
        hostTool: "Skill",
        trace: trace ?? {},
        startedAt: new Date(),
      },
      env,
    );
    const source = { packageName: "kibi-cli", packageVersion: "1.0.0" };
    const base = {
      interface: "cli" as const,
      operation: "upsert",
      status: "success" as const,
      durationMs: 1,
    };
    const linked = path.join(tempDir("kibi-skill-link-"), "ws");
    fs.symlinkSync(workspace, linked);
    recordOperationTelemetry(
      { ...source, workspaceRoot: workspace },
      base,
      env,
    );
    recordOperationTelemetry({ ...source, workspaceRoot: linked }, base, env);
    recordOperationTelemetry(
      { ...source, workspaceRoot: path.join(workspace, "packages", "x") },
      base,
      env,
    );
    recordOperationTelemetry(
      { ...source, workspaceRoot: tempDir("kibi-other-ws-") },
      base,
      env,
    );
    const [hook, inside, throughLink, subdirectory, elsewhere] =
      await sent(env);
    expect(hook).toMatchObject({
      hook_action: "skill_loaded",
      skill: "kibi-usage",
    });
    expect(inside?.skill_loaded_before).toBe(true);
    expect(throughLink?.skill_loaded_before).toBe(true);
    // Callers resolve the workspace root; a subdirectory key is not it.
    expect(subdirectory?.skill_loaded_before).toBe(false);
    expect(elsewhere?.skill_loaded_before).toBe(false);
    expect(JSON.stringify([hook, inside, elsewhere])).not.toContain(workspace);
  });

  test("a skill loaded in a parent directory does not count for a workspace below it", async () => {
    const env = enabledEnv();
    const home = tempDir("kibi-skill-home-");
    const repo = path.join(home, "code", "repo");
    fs.mkdirSync(repo, { recursive: true });
    const source = { packageName: "kibi-mcp", packageVersion: "1.0.0" };
    recordOperationTelemetry(
      { ...source, workspaceRoot: home },
      {
        interface: "mcp",
        operation: "kb_skills",
        status: "success",
        durationMs: 1,
        signals: { skillLoad: true },
      },
      env,
    );
    const status = {
      interface: "mcp" as const,
      operation: "kb_status",
      status: "success" as const,
      durationMs: 1,
    };
    recordOperationTelemetry({ ...source, workspaceRoot: repo }, status, env);
    recordOperationTelemetry({ ...source, workspaceRoot: home }, status, env);
    // A path that does not exist keys by itself, not with every other one.
    const missing = path.join(home, "missing-a");
    rememberTelemetrySkillLoad(missing, env);
    recordOperationTelemetry(
      { ...source, workspaceRoot: path.join(home, "missing-b") },
      status,
      env,
    );
    recordOperationTelemetry(
      { ...source, workspaceRoot: missing },
      status,
      env,
    );
    const events = await sent(env);
    expect(events.map((event) => event.skill_loaded_before)).toEqual([
      false,
      false,
      true,
      false,
      true,
    ]);
  });

  test("a successful CLI or MCP skill load marks the workspace too", async () => {
    const env = enabledEnv();
    const loaded = tempDir("kibi-skill-load-ws-");
    const failed = tempDir("kibi-skill-fail-ws-");
    const source = { packageName: "kibi-mcp", packageVersion: "1.0.0" };
    const load = {
      interface: "mcp" as const,
      operation: "kb_skills",
      durationMs: 1,
      signals: { skillLoad: true },
    };
    const upsert = {
      interface: "mcp" as const,
      operation: "kb_upsert",
      status: "success" as const,
      durationMs: 1,
    };
    recordOperationTelemetry(
      { ...source, workspaceRoot: failed },
      { ...load, status: "error", errorCategory: "skill_not_found" },
      env,
    );
    recordOperationTelemetry(
      { ...source },
      { ...load, status: "success" },
      env,
    );
    recordOperationTelemetry(
      { ...source, workspaceRoot: loaded },
      { ...load, status: "success" },
      env,
    );
    recordOperationTelemetry({ ...source, workspaceRoot: loaded }, upsert, env);
    recordOperationTelemetry({ ...source, workspaceRoot: failed }, upsert, env);
    // A successful call that loads no skill marks nothing.
    const other = tempDir("kibi-skill-none-ws-");
    recordOperationTelemetry({ ...source, workspaceRoot: other }, upsert, env);
    recordOperationTelemetry({ ...source, workspaceRoot: other }, upsert, env);
    const events = await sent(env);
    expect(events.map((event) => event.skill_loaded_before)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(JSON.stringify(events)).not.toContain(loaded);
  });
});

describe("recent calls", () => {
  test("count retries on the same entity until one succeeds", () => {
    const directory = tempDir("kibi-recall-");
    const call = (outcome: string, now: number) =>
      recallOperation(
        directory,
        { retryHash: "h1", workspaceHashes: [], outcome },
        now,
      );
    expect(call("rejected", 1000)).toMatchObject({
      attempt: 1,
      priorOutcome: null,
    });
    expect(call("rejected", 2000)).toMatchObject({
      attempt: 2,
      priorOutcome: "rejected",
    });
    expect(call("success", 3000)).toMatchObject({
      attempt: 3,
      priorOutcome: "rejected",
    });
    expect(call("rejected", 4000)).toMatchObject({
      attempt: 1,
      priorOutcome: "success",
    });
    // Outside the window the entity starts over.
    expect(call("rejected", 4000 + 11 * 60 * 1000)).toMatchObject({
      attempt: 1,
      priorOutcome: null,
    });
    expect(
      recallOperation(
        directory,
        { retryHash: "h2", workspaceHashes: [], outcome: "success" },
        5000,
      ),
    ).toMatchObject({ attempt: 1, priorOutcome: null, searchRepeat: null });
  });

  test("a search within two minutes of another is a repeat", () => {
    const directory = tempDir("kibi-recall-");
    const search = (now: number) =>
      recallOperation(
        directory,
        { searchHash: "s", workspaceHashes: [], outcome: "success" },
        now,
      ).searchRepeat;
    expect(search(0)).toBe(false);
    expect(search(1000)).toBe(true);
    expect(search(1000 + SEARCH_REPEAT_WINDOW_MS + 1)).toBe(false);
    expect(
      recallOperation(directory, { workspaceHashes: [], outcome: "success" })
        .searchRepeat,
    ).toBeNull();
  });

  test("skill markers expire and a broken file is ignored", () => {
    const directory = tempDir("kibi-recall-");
    rememberSkillLoad(directory, "w", 0);
    const seen = (now: number) =>
      recallOperation(
        directory,
        { workspaceHashes: ["w"], outcome: "success" },
        now,
      ).skillLoadedBefore;
    expect(seen(SKILL_WINDOW_MS - 1)).toBe(true);
    expect(seen(SKILL_WINDOW_MS + 1)).toBe(false);
    fs.writeFileSync(path.join(directory, "telemetry-recent.json"), "{oops");
    expect(seen(0)).toBe(false);
    fs.writeFileSync(
      path.join(directory, "telemetry-recent.json"),
      JSON.stringify({ calls: [{ k: 1 }], skills: "x" }),
    );
    expect(seen(0)).toBe(false);
  });
});

describe("sent signals", () => {
  test("an operation event carries sanitized signals and no raw input", async () => {
    const env = enabledEnv();
    const workspace = tempDir("kibi-signal-ws-");
    const source = {
      packageName: "kibi-mcp",
      packageVersion: "1.0.0",
      workspaceRoot: workspace,
    };
    const upsert = (status: "success" | "error", category?: string) =>
      recordOperationTelemetry(
        source,
        {
          interface: "mcp",
          operation: "kb_upsert",
          status,
          durationMs: 1,
          errorCategory: category,
          signals: {
            dryRun: false,
            relationshipCount: 3,
            retryKey: "req\0REQ-secret",
            issues: [
              { rule: "enum", field: "status" },
              { rule: "required", field: "title" },
            ],
          },
        },
        env,
      );
    upsert("error", "entity_validation_failed");
    upsert("success");
    recordOperationTelemetry(
      source,
      {
        interface: "mcp",
        operation: "kb_search",
        status: "success",
        durationMs: 1,
        signals: {
          search: true,
          resultCount: 0,
          abstained: true,
          hintsShown: false,
        },
      },
      env,
    );
    const crash = Object.assign(new TypeError("at /home/alice"), {
      stack:
        "TypeError: x\n    at run (/home/alice/node_modules/kibi-mcp/dist/server.js:1:1)",
    });
    recordOperationTelemetry(
      source,
      {
        interface: "mcp",
        operation: "kb_status",
        status: "error",
        durationMs: 1,
        errorCategory: "handler_error",
        errorClass: "TypeError",
        signals: { error: crash },
      },
      env,
    );
    recordOperationTelemetry(
      source,
      {
        interface: "mcp",
        operation: "kb_check",
        status: "error",
        durationMs: 1,
        errorCategory: "check_violations",
        signals: { error: crash },
      },
      env,
    );
    const [refused, written, search, failed, rejected] = await sent(env);
    expect(refused).toMatchObject({
      status: "rejected",
      dry_run: false,
      relationship_count: "2-5",
      validation_rule: "enum",
      validation_field: "status",
      issue_count: "2",
      attempt: "1",
      prior_outcome: null,
      skill_loaded_before: false,
    });
    expect(written).toMatchObject({
      status: "success",
      attempt: "2",
      prior_outcome: "rejected",
      validation_rule: "enum",
    });
    expect(search).toMatchObject({
      result_count: "0",
      abstained: true,
      hints_shown: false,
      search_repeat: false,
      attempt: null,
      dry_run: null,
      issue_count: null,
      validation_rule: null,
    });
    expect(failed).toMatchObject({
      status: "error",
      crash_frame: "kibi-mcp/dist/server#run",
    });
    expect(String(failed?.crash_fingerprint)).toMatch(/^[0-9a-f]{16}$/);
    expect(rejected).toMatchObject({
      status: "rejected",
      crash_frame: null,
      crash_fingerprint: null,
    });
    const payload = JSON.stringify([
      refused,
      written,
      search,
      failed,
      rejected,
    ]);
    expect(payload).not.toContain("REQ-secret");
    expect(payload).not.toContain("alice");
    expect(payload).not.toContain(workspace);
  });
});

describe("signal edges", () => {
  test("windows, skill names and count edges are fixed", () => {
    expect([RETRY_WINDOW_MS, SEARCH_REPEAT_WINDOW_MS, SKILL_WINDOW_MS]).toEqual(
      [600_000, 120_000, 1_800_000],
    );
    expect([...KIBI_SKILL_NAMES]).toEqual([
      "kibi-bootstrap",
      "kibi-commit-review",
      "kibi-decisions",
      "kibi-freshness",
      "kibi-provable-code",
      "kibi-traceability",
      "kibi-usage",
    ]);
    expect(countBucket(2.9, SMALL_COUNT_BUCKETS)).toBe("2");
    expect(countBucket(-0.5, RELATIONSHIP_COUNT_BUCKETS)).toBeNull();
  });

  test("field paths keep their limits", () => {
    expect(telemetryField(" status ")).toBe("status");
    expect(telemetryField("   ")).toBeNull();
    expect(telemetryField("a.b.c.d.e.f")).toBe("a.b.c.d.e.f");
    const longest = `${"a".repeat(59)}.${"b".repeat(60)}`;
    expect(telemetryField(longest)).toBe(longest);
    expect(telemetryField(`${longest}c`)).toBe("other");
    expect(telemetryField("status.bad key")).toBe("other");
    expect(telemetryField("bad key.status")).toBe("other");
  });

  test("stack frames are parsed strictly", () => {
    const frames = (...lines: string[]) =>
      kibiStackFrames(["Error: x", ...lines].join("\n"));
    const at = (fn: string, file: string) => `    at ${fn} (${file})`;
    expect(frames(at("f", "node_modules/kibi-cli/dist/a.js:1:1"))).toEqual([
      "kibi-cli/dist/a#f",
    ]);
    expect(
      frames(at("f", "C:\\Users\\a\\node_modules\\kibi-cli\\dist\\b.js:3:4")),
    ).toEqual(["kibi-cli/dist/b#f"]);
    expect(frames(at("f", "/n/node_modules/kibi-cli/dist/c.js:12"))).toEqual([
      "kibi-cli/dist/c#f",
    ]);
    expect(frames(at("f", "/n/node_modules/kibi-cli/dist/d.js:1:23"))).toEqual([
      "kibi-cli/dist/d#f",
    ]);
    expect(
      frames(at("f", "/home/a:1/node_modules/kibi-cli/dist/e.js:3:4")),
    ).toEqual(["kibi-cli/dist/e#f"]);
    expect(
      frames(
        at("f", "/n/node_modules/kibi-cli/dist/vendor.js/inner.js:1:1"),
        at("g", "/n/node_modules/kibi-cli/dist/m.mjs:1:1"),
        at("h", "/n/node_modules/kibi-cli/dist/c.cts:1:1"),
      ),
    ).toEqual([
      "kibi-cli/dist/vendor.js/inner#f",
      "kibi-cli/dist/m#g",
      "kibi-cli/dist/c#h",
    ]);
    expect(
      frames(
        at("f", "/n/node_modules/kibi-cli/dist/we ird.js:1:1"),
        at("f", "/n/node_modules/kibi-cli/a/b/c/d/e/f/g/h/i.js:1:1"),
        at("f", "/n/node_modules/kibi-cli/../../etc/x.js:1:1"),
      ),
    ).toEqual([]);
    expect(
      frames(at("f", "/n/node_modules/kibi-cli/a/b/c/d/e/f/g/h.js:1:1")),
    ).toEqual(["kibi-cli/a/b/c/d/e/f/g/h#f"]);
    // The first line is the message, even when it looks like a frame.
    expect(
      kibiStackFrames(at("leak", "/n/node_modules/kibi-cli/dist/l.js:1:1")),
    ).toEqual([]);
    const deep = Array.from({ length: 64 }, () => "    at x (node:fs:1:1)");
    expect(
      frames(...deep, at("late", "/n/node_modules/kibi-cli/dist/z.js:1:1")),
    ).toEqual([]);
    expect(
      frames(
        "    flat foo (/n/node_modules/kibi-cli/dist/a.js:1:1)",
        "    ... 3 more",
        "",
        "    at  spaced  (/n/node_modules/kibi-cli/dist/s.js:1:1)",
        "    at myasync foo (/n/node_modules/kibi-cli/dist/t.js:1:1)",
      ),
    ).toEqual(["kibi-cli/dist/s#spaced", "kibi-cli/dist/t#anonymous"]);
    expect(
      frames(
        at("[x]foo", "/n/node_modules/kibi-cli/dist/a.js:1:1"),
        at("foo[x]", "/n/node_modules/kibi-cli/dist/a.js:1:1"),
        "    at /n/node_modules/kibi-cli/dist/u.js:1:1",
      ),
    ).toEqual([
      "kibi-cli/dist/a#anonymous",
      "kibi-cli/dist/a#anonymous",
      "kibi-cli/dist/u#anonymous",
    ]);
  });

  test("a crash fingerprint hashes the class and the frames", () => {
    const error = {
      stack: "Error\n    at f (/n/node_modules/kibi-cli/dist/a.js:1:1)",
    };
    expect(telemetryCrash(error, "TypeError")).toEqual({
      frame: "kibi-cli/dist/a#f",
      fingerprint: "63760572989c2bc1",
    });
    expect(telemetryCrash(error, null).fingerprint).toBe("ebe6974ba747576a");
    expect(
      telemetryCrash(
        {
          stack: `${error.stack}\n    at g (/n/node_modules/kibi-cli/dist/b.js:1:1)`,
        },
        null,
      ).fingerprint,
    ).toBe("d224cfc4c333b5a0");
    expect(telemetryCrash(null, null)).toEqual({
      frame: null,
      fingerprint: null,
    });
    expect(telemetryCrash(undefined, null).frame).toBeNull();
  });

  test("skill tools and SKILL.md paths are matched exactly", () => {
    expect(kibiSkillLoad(" Skill ", { skill: "kibi-usage" })).toBe(
      "kibi-usage",
    );
    expect(kibiSkillLoad("Skill", { command: "kibi-usage" })).toBe(
      "kibi-usage",
    );
    expect(kibiSkillLoad("Skill", { skill: " Kibi-Usage " })).toBe(
      "kibi-usage",
    );
    expect(kibiSkillLoad("SkillX", { skill: "kibi-usage" })).toBeUndefined();
    expect(kibiSkillLoad("MySkill", { skill: "kibi-usage" })).toBeUndefined();
    expect(kibiSkillLoad("Read", { skill: "kibi-usage" })).toBeUndefined();
    expect(kibiSkillLoad("Skill", ["kibi-usage"])).toBeUndefined();
    expect(kibiSkillLoad("Skill", undefined)).toBeUndefined();
    expect(kibiSkillLoad("Skill", { skill: "xkibi-usage" })).toBeUndefined();
    expect(kibiSkillLoad("Skill", { skill: "kibi-usage!" })).toBeUndefined();
    expect(kibiSkillLoad("Read", "kibi-usage/SKILL.md")).toBe("kibi-usage");
    expect(kibiSkillLoad("Read", "kibi-usage/SKILL.mdx")).toBeUndefined();
    expect(
      kibiSkillLoad("Read", { a: { b: { c: "kibi-usage/SKILL.md" } } }),
    ).toBe("kibi-usage");
    expect(
      kibiSkillLoad("Read", { a: { b: { c: { d: "kibi-usage/SKILL.md" } } } }),
    ).toBeUndefined();
    expect(kibiSkillLoad("Read", { a: 5, b: null, c: true })).toBeUndefined();
    const many = Array.from({ length: 60 }, (_, index) =>
      index === 55 ? "kibi-usage/SKILL.md" : "x",
    );
    expect(kibiSkillLoad("Read", many)).toBeUndefined();
    expect(kibiSkillLoad("Read", many.slice(10))).toBe("kibi-usage");
  });

  test("stored entries outside their shape or window are dropped", () => {
    const directory = tempDir("kibi-recall-");
    const file = path.join(directory, "telemetry-recent.json");
    const now = 50 * RETRY_WINDOW_MS;
    fs.writeFileSync(
      file,
      JSON.stringify({
        calls: [
          null,
          { k: "h", t: String(now), o: "rejected" },
          { k: "h", t: now },
          { k: "h", t: now - RETRY_WINDOW_MS - 1, o: "rejected" },
          { k: "h", t: now - RETRY_WINDOW_MS, o: "rejected" },
        ],
        skills: [
          null,
          { w: "w", t: String(now) },
          { w: "w", t: now - SKILL_WINDOW_MS },
        ],
      }),
    );
    expect(
      recallOperation(
        directory,
        { retryHash: "h", workspaceHashes: ["w"], outcome: "rejected" },
        now,
      ),
    ).toEqual({
      attempt: 2,
      priorOutcome: "rejected",
      searchRepeat: null,
      skillLoadedBefore: true,
    });
    fs.writeFileSync(file, "null");
    expect(
      recallOperation(directory, { workspaceHashes: [], outcome: "success" }),
    ).toMatchObject({ attempt: null, skillLoadedBefore: false });
  });

  test("the store keeps the newest 200 entries of each list", () => {
    const directory = tempDir("kibi-recall-");
    for (let index = 0; index < 205; index += 1) {
      rememberSkillLoad(directory, `w${index}`, 1000);
      recallOperation(
        directory,
        { retryHash: `h${index}`, workspaceHashes: [], outcome: "success" },
        1000,
      );
    }
    const stored = JSON.parse(
      fs.readFileSync(path.join(directory, "telemetry-recent.json"), "utf8"),
    );
    expect(stored.calls).toHaveLength(200);
    expect(stored.calls[0].k).toBe("h5");
    expect(stored.skills).toHaveLength(200);
    expect(stored.skills.at(-1).w).toBe("w204");
  });

  test("search repeats count from the earlier search's time", () => {
    const directory = tempDir("kibi-recall-");
    const search = (now: number) =>
      recallOperation(
        directory,
        { searchHash: "s", workspaceHashes: [], outcome: "success" },
        now,
      ).searchRepeat;
    const start = 10 * SEARCH_REPEAT_WINDOW_MS;
    expect(search(start)).toBe(false);
    expect(search(start + SEARCH_REPEAT_WINDOW_MS)).toBe(true);
  });
});

describe("signal scope", () => {
  const source = { packageName: "kibi-cli", packageVersion: "1.0.0" };
  const call = (
    env: NodeJS.ProcessEnv,
    workspaceRoot: string,
    signals: Record<string, unknown>,
  ) =>
    recordOperationTelemetry(
      { ...source, workspaceRoot },
      {
        interface: "cli",
        operation: "upsert",
        status: "error",
        durationMs: 1,
        errorCategory: "entity_validation_failed",
        signals,
      },
      env,
    );

  test("retries and repeated searches count per workspace", async () => {
    const env = enabledEnv();
    const first = tempDir("kibi-ws-a-");
    const second = tempDir("kibi-ws-b-");
    call(env, first, { retryKey: "req\0REQ-1" });
    call(env, second, { retryKey: "req\0REQ-1" });
    call(env, first, { search: true });
    call(env, second, { search: true });
    const events = await sent(env);
    expect(events.map((event) => event.attempt)).toEqual([
      "1",
      "1",
      null,
      null,
    ]);
    expect(events.map((event) => event.search_repeat)).toEqual([
      null,
      null,
      false,
      false,
    ]);
  });

  test("skill markers are only kept while telemetry is on, and only for skill loads", async () => {
    const off = {
      KIBI_TELEMETRY_DIR: tempDir("kibi-off-"),
      KIBI_TELEMETRY: "0",
    };
    rememberTelemetrySkillLoad(tempDir("kibi-ws-"), off);
    expect(fs.readdirSync(off.KIBI_TELEMETRY_DIR)).toEqual([]);
    const env = enabledEnv();
    const workspace = tempDir("kibi-ws-");
    appendHookUsage(
      {
        host: "claude-code",
        workspaceRoot: workspace,
        event: "PreToolUse",
        sessionId: undefined,
        hostTool: "Read",
        trace: { action: "read_silent" },
        startedAt: new Date(),
      },
      env,
    );
    call(env, workspace, {});
    const events = await sent(env);
    expect(events.at(-1)?.skill_loaded_before).toBe(false);
  });
});
