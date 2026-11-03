// implements REQ-kibi-telemetry-agent-signals
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
  RELATIONSHIP_COUNT_BUCKETS,
  RESULT_COUNT_BUCKETS,
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
  telemetryRule,
} from "../src/telemetry-signals";
import {
  flushTelemetry,
  recordOperationTelemetry,
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
    const [hook, inside, elsewhere] = await sent(env);
    expect(hook).toMatchObject({
      hook_action: "skill_loaded",
      skill: "kibi-usage",
    });
    expect(inside?.skill_loaded_before).toBe(true);
    expect(elsewhere?.skill_loaded_before).toBe(false);
    expect(JSON.stringify([hook, inside, elsewhere])).not.toContain(workspace);
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
