import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { checkCommand } from "../../../src/commands/check.js";
import { EngineClient } from "../../../src/engine.js";
import { PrologProcess } from "../../../src/prolog.js";
import * as executor from "../../../src/public/operations/check-executor.js";
import { EVIDENCE_FLOOR_RULE } from "../../../src/public/operations/evidence-floor.js";
import {
  nodeFilesystem,
  nodeGit,
} from "../../../src/public/operations/node-ports.js";
import * as detached from "../../../src/runtime/detached-snapshot.js";
import * as autoCompile from "../../../src/utils/auto-compile.js";
import * as resolver from "../../../src/utils/branch-resolver.js";
import * as cleanup from "../../../src/utils/prolog-cleanup.js";

type Spy = { mockRestore(): void };
const spies: Spy[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

let events: string[] = [];
let logs: string[] = [];
let errors: string[] = [];
let warnings: string[] = [];
let attachAnswer: { success: boolean; error?: string } = { success: true };
let checkResult: unknown = {};
let checkCalls: unknown[][] = [];
let attachment: Record<string, unknown> = {};

beforeEach(() => {
  events = [];
  logs = [];
  errors = [];
  warnings = [];
  attachAnswer = { success: true };
  checkResult = { structuredContent: { violations: [] } };
  checkCalls = [];
  attachment = {
    kbBranch: "main",
    gitBranch: "main",
    storePath: "/store/main",
    migrationRequired: false,
  };
  spies.push(
    spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    }),
    spyOn(console, "error").mockImplementation((message: unknown) => {
      errors.push(String(message));
    }),
    spyOn(console, "warn").mockImplementation((message: unknown) => {
      warnings.push(String(message));
    }),
    spyOn(resolver, "resolveReadBranchAttachment").mockImplementation(
      (root) => {
        events.push(`resolve ${root}`);
        return attachment as never;
      },
    ),
    spyOn(detached, "refreshDetachedSnapshot").mockImplementation(
      async (root, value) => {
        events.push(`refresh ${root} ${value === attachment}`);
        return undefined as never;
      },
    ),
    spyOn(autoCompile, "ensureBranchStoreCompiled").mockImplementation(
      async (root, value, options) => {
        events.push(
          `compile ${root} ${value === attachment} ${JSON.stringify(options)}`,
        );
        return undefined as never;
      },
    ),
    spyOn(EngineClient.prototype, "start").mockImplementation(async function (
      this: EngineClient,
    ) {
      events.push("engine start");
    }),
    spyOn(EngineClient.prototype, "terminate").mockImplementation(async () => {
      events.push("engine terminate");
    }),
    spyOn(EngineClient.prototype, "query").mockImplementation(async (goal) => {
      events.push(`engine query ${goal}`);
      return { success: true, bindings: { From: "engine" } } as never;
    }),
    spyOn(EngineClient.prototype, "queryEntities").mockImplementation(
      async function (this: EngineClient, request) {
        events.push(`engine entities ${JSON.stringify(request)}`);
        return { entities: [], count: 0 } as never;
      },
    ),
    spyOn(EngineClient.prototype, "invalidateCache").mockImplementation(() => {
      events.push("engine invalidate");
    }),
    spyOn(PrologProcess.prototype, "start").mockImplementation(async function (
      this: PrologProcess,
    ) {
      const { timeout } = this as unknown as { timeout: number };
      events.push(`prolog start ${timeout}`);
    }),
    spyOn(PrologProcess.prototype, "terminate").mockImplementation(async () => {
      events.push("prolog terminate");
    }),
    spyOn(PrologProcess.prototype, "query").mockImplementation(async (goal) => {
      events.push(`prolog query ${goal}`);
      return String(goal).startsWith("kb_attach")
        ? (attachAnswer as never)
        : ({ success: true, bindings: { From: "prolog" } } as never);
    }),
    spyOn(PrologProcess.prototype, "invalidateCache").mockImplementation(() => {
      events.push("prolog invalidate");
    }),
    spyOn(cleanup, "safeCleanupProlog").mockImplementation(async (value) => {
      events.push(`cleanup ${value === null ? "none" : "prolog"}`);
    }),
    spyOn(executor, "executeCheck").mockImplementation(async (...args) => {
      checkCalls.push(args);
      events.push("execute");
      return checkResult as never;
    }),
  );
});

describe("branch attachment", () => {
  test("the engine hosts the attached branch", async () => {
    expect(await checkCommand({})).toEqual({ exitCode: 0 });
    const cwd = process.cwd();
    expect(events).toEqual([
      `resolve ${cwd}`,
      `compile ${cwd} true {"name":"kb_check"}`,
      "engine start",
      "execute",
      "engine terminate",
      "cleanup none",
    ]);
    expect(warnings).toEqual([]);
    const [options, ports, config] = checkCalls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(options).toStrictEqual({});
    expect(config).toEqual({
      collectFullQualityDiagnosticsForExplicitRules: true,
      branchStoreAttached: true,
    });
    expect(ports.workspaceRoot).toBe(cwd);
    expect(ports.git).toBe(nodeGit);
    expect(ports.fs).toBe(nodeFilesystem);
    expect((ports.signal as AbortSignal).aborted).toBe(false);
    const before = Date.now();
    const now = (ports.clock as () => Date)().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  test("the engine is the prolog port, entities included", async () => {
    await checkCommand({});
    const ports = checkCalls[0]?.[1] as {
      prolog: Record<string, (...args: unknown[]) => unknown>;
    };
    events = [];
    expect(await ports.prolog.query?.("goal(X)")).toEqual({
      success: true,
      bindings: { From: "engine" },
    });
    expect(
      await ports.prolog.queryEntities?.({ id: "REQ-1", limit: 1, offset: 0 }),
    ).toEqual({ entities: [], count: 0 });
    expect(await ports.prolog.nextSolution?.()).toBeNull();
    ports.prolog.invalidateCache?.();
    await ports.prolog.save?.();
    expect(events).toEqual([
      "engine query goal(X)",
      'engine entities {"id":"REQ-1","limit":1,"offset":0}',
      "engine invalidate",
      "engine query kb_save",
    ]);
  });

  test("an empty store path reads the attached branch", async () => {
    expect(await checkCommand({ kbPath: "" })).toEqual({ exitCode: 0 });
    expect(events).toContain("engine start");
    expect(checkCalls[0]?.[2]).toMatchObject({ branchStoreAttached: true });
  });

  test("a resolution error is reported", async () => {
    attachment = { error: "Not a git repository" };
    expect(await checkCommand({})).toEqual({ exitCode: 1 });
    expect(errors).toEqual(["Error: Not a git repository"]);
    expect(events).toEqual([`resolve ${process.cwd()}`, "cleanup none"]);
  });

  test("a detached head refreshes its read-only snapshot", async () => {
    attachment = { ...attachment, readOnly: { notice: "Detached HEAD" } };
    expect(await checkCommand({})).toEqual({ exitCode: 0 });
    expect(warnings).toEqual(["[KIBI] Detached HEAD"]);
    expect(events.slice(0, 3)).toEqual([
      `resolve ${process.cwd()}`,
      `refresh ${process.cwd()} true`,
      `compile ${process.cwd()} true {"name":"kb_check"}`,
    ]);
  });

  test("a legacy attachment warns before reading", async () => {
    attachment = {
      ...attachment,
      gitBranch: "feature/x",
      kbBranch: "feature-x",
      migrationRequired: true,
    };
    expect(await checkCommand({})).toEqual({ exitCode: 0 });
    expect(warnings).toEqual([
      "Warning: reading legacy KB attachment feature/x -> feature-x; migrate before writes or sync.",
    ]);
  });

  test("the engine is opened on the resolved branch", async () => {
    attachment = { ...attachment, kbBranch: "topic" };
    const seen: unknown[] = [];
    const start = spyOn(EngineClient.prototype, "start").mockImplementation(
      async function (this: EngineClient) {
        seen.push(this);
      },
    );
    spies.push(start);
    await checkCommand({});
    const client = seen[0] as Record<string, unknown>;
    expect(JSON.stringify(client)).toContain("topic");
    expect(JSON.stringify(client)).toContain(process.cwd());
  });
});

describe("explicit store", () => {
  test("a one-shot process attaches the store", async () => {
    expect(
      await checkCommand({ kbPath: "/tmp/it's kb", rules: " a, ,b ,," }),
    ).toEqual({ exitCode: 0 });
    expect(events).toEqual([
      "prolog start 120000",
      "prolog query kb_attach('/tmp/it''s kb')",
      "execute",
      "cleanup prolog",
    ]);
    const [options, ports, config] = checkCalls[0] as [
      Record<string, unknown>,
      { prolog: Record<string, (...args: unknown[]) => unknown> },
      Record<string, unknown>,
    ];
    expect(options).toStrictEqual({ rules: ["a", "b"] });
    expect(config).toEqual({
      collectFullQualityDiagnosticsForExplicitRules: true,
      branchStoreAttached: false,
    });
    expect("queryEntities" in ports.prolog).toBe(false);
    events = [];
    expect(await ports.prolog.query?.("g")).toEqual({
      success: true,
      bindings: { From: "prolog" },
    });
    ports.prolog.invalidateCache?.();
    await ports.prolog.save?.();
    expect(events).toEqual([
      "prolog query g",
      "prolog invalidate",
      "prolog query kb_save",
    ]);
  });

  test("an attach failure stops the check", async () => {
    attachAnswer = { success: false, error: "no store" };
    expect(await checkCommand({ kbPath: "/kb" })).toEqual({ exitCode: 1 });
    expect(errors).toEqual(["Error: Failed to attach KB: no store"]);
    expect(events).toEqual([
      "prolog start 120000",
      "prolog query kb_attach('/kb')",
      "prolog terminate",
      "cleanup prolog",
    ]);
  });

  test("fresh evidence is requested only when set", async () => {
    await checkCommand({ kbPath: "/kb", freshEvidence: true });
    await checkCommand({ kbPath: "/kb", freshEvidence: false });
    expect(checkCalls.map((call) => call[0])).toStrictEqual([
      { freshEvidence: true },
      {},
    ]);
  });

  test("a thrown non-error is reported as text", async () => {
    spies.push(
      spyOn(executor, "executeCheck").mockImplementation(async () => {
        throw "plain failure";
      }),
    );
    expect(await checkCommand({ kbPath: "/kb" })).toEqual({ exitCode: 1 });
    expect(errors).toEqual(["Error: plain failure"]);
  });
});

describe("result rendering", () => {
  const violation = (extra: Record<string, unknown> = {}) => ({
    rule: "required-fields",
    entityId: "REQ-1",
    description: "Missing required field: title",
    suggestion: "Add title",
    ...extra,
  });
  const quality = {
    severity: "warning",
    id: "q1",
    message: "Weak",
    blocking: false,
    suggestion: "Improve",
  };
  const QUALITY_TEXT =
    "Quality diagnostics (1):\n[WARNING q1] Weak\n  Blocking: no\n  Suggestion: Improve";

  test("json output carries the result", async () => {
    checkResult = {
      structuredContent: {
        violations: [violation()],
        qualityDiagnostics: [quality],
      },
    };
    expect(await checkCommand({ kbPath: "/kb", format: "json" })).toEqual({
      exitCode: 1,
    });
    expect(logs.map((line) => JSON.parse(line))).toEqual([
      {
        structuredContent: {
          violations: [violation()],
          count: 1,
          diagnostics: [],
          qualityDiagnostics: [quality],
        },
      },
    ]);
  });

  test("json output without content passes", async () => {
    checkResult = {};
    expect(await checkCommand({ kbPath: "/kb", format: "json" })).toEqual({
      exitCode: 0,
    });
    expect(JSON.parse(logs[0] as string)).toEqual({
      structuredContent: {
        violations: [],
        count: 0,
        diagnostics: [],
        qualityDiagnostics: [],
      },
    });
  });

  test("a clean result prints its quality diagnostics", async () => {
    checkResult = { structuredContent: { qualityDiagnostics: [quality] } };
    expect(await checkCommand({ kbPath: "/kb" })).toEqual({ exitCode: 0 });
    expect(logs).toEqual([
      "✓ No violations found. KB is valid.",
      "",
      QUALITY_TEXT,
    ]);
  });

  test("a clean result without diagnostics prints one line", async () => {
    expect(await checkCommand({ kbPath: "/kb" })).toEqual({ exitCode: 0 });
    expect(logs).toEqual(["✓ No violations found. KB is valid."]);
  });

  test("violations are listed by source, with fixes on request", async () => {
    checkResult = {
      structuredContent: {
        violations: [
          violation({ source: "docs/reqs/req-one.md" }),
          violation({ entityId: "REQ-2", suggestion: undefined }),
          violation({ entityId: "REQ-3", source: "docs/REQ-3.md" }),
        ],
        qualityDiagnostics: [quality],
      },
    };
    expect(await checkCommand({ kbPath: "/kb", fix: true })).toEqual({
      exitCode: 1,
    });
    expect(logs).toEqual([
      "Found 3 violation(s):",
      "",
      "[required-fields] req-one",
      "  Entity: REQ-1",
      "  Source: docs/reqs/req-one.md",
      "  Missing required field: title",
      "  Suggestion: Add title",
      "",
      "[required-fields] REQ-2",
      "  Missing required field: title",
      "",
      "[required-fields] REQ-3",
      "  Source: docs/REQ-3.md",
      "  Missing required field: title",
      "  Suggestion: Add title",
      "",
      QUALITY_TEXT,
      "",
    ]);
  });

  test("suggestions show only for evidence-floor findings by default", async () => {
    checkResult = {
      structuredContent: {
        violations: [
          violation(),
          violation({ rule: EVIDENCE_FLOOR_RULE, suggestion: "Add proof" }),
        ],
      },
    };
    expect(await checkCommand({ kbPath: "/kb" })).toEqual({ exitCode: 1 });
    expect(logs).toEqual([
      "Found 2 violation(s):",
      "",
      "[required-fields] REQ-1",
      "  Missing required field: title",
      "",
      `[${EVIDENCE_FLOOR_RULE}] REQ-1`,
      "  Missing required field: title",
      "  Suggestion: Add proof",
      "",
    ]);
  });
});
