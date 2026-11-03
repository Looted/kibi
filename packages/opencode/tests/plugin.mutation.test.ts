import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { execSync } from "node:child_process";
import type { AutoUpdateInput, AutoUpdateResult } from "../src/auto-update.js";
import {
  buildDirtyRelevantFingerprint,
  buildEnforcementScopeKey,
} from "../src/enforcement-scope.js";
import { getGuidanceCache, resetGuidanceCache } from "../src/guidance-cache.js";
import { getKibiBootstrapCommandCapability } from "../src/kibi-bootstrap-capability.js";
import kibiOpencodePlugin, {
  type Hooks,
  lintRequirementDoc,
} from "../src/plugin.js";
import type {
  SchedulerOptions,
  SyncRunMetadata,
  SyncScheduler,
} from "../src/scheduler.js";
import { resetSessionTracker } from "../src/session-tracker.js";

type Body = Record<string, unknown> & { message?: string };

const globals = globalThis as typeof globalThis & {
  __kibi_test_scheduler_factory?: (options: SchedulerOptions) => SyncScheduler;
  __kibi_test_scheduler_factory_by_worktree?: Map<
    string,
    (options: SchedulerOptions) => SyncScheduler
  >;
  __kibi_test_schedule_startup_notify?: (
    callback: () => void,
    delayMs: number,
  ) => void;
  __kibi_test_auto_update_runner?: (
    input: AutoUpdateInput,
  ) => Promise<AutoUpdateResult>;
};

const tempDirs: string[] = [];

function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

interface SchedulerRecord {
  options: SchedulerOptions[];
  syncs: Array<[string, string | undefined, string[] | undefined]>;
}

let schedulers: SchedulerRecord;
let startupCallbacks: Array<{ callback: () => void; delayMs: number }>;

function installSchedulerFactory(): void {
  globals.__kibi_test_scheduler_factory = (options) => {
    schedulers.options.push(options);
    return {
      scheduleSync: (reason, filePath, checkRules) => {
        schedulers.syncs.push([reason, filePath, checkRules]);
      },
      onFileEdited: () => {},
      onToolExecuteAfter: () => {},
      flush: async () => {},
      dispose: () => {},
    } as SyncScheduler;
  };
}

beforeEach(() => {
  schedulers = { options: [], syncs: [] };
  startupCallbacks = [];
  resetGuidanceCache();
  resetSessionTracker();
  installSchedulerFactory();
  globals.__kibi_test_schedule_startup_notify = (callback, delayMs) => {
    startupCallbacks.push({ callback, delayMs });
  };
});

afterEach(() => {
  globals.__kibi_test_scheduler_factory = undefined;
  globals.__kibi_test_scheduler_factory_by_worktree = undefined;
  globals.__kibi_test_schedule_startup_notify = undefined;
  globals.__kibi_test_auto_update_runner = undefined;
});

afterAll(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

const KB_DIRS = [
  ".kb/requirements",
  ".kb/scenarios",
  ".kb/tests",
  ".kb/adr",
  ".kb/flags",
  ".kb/events",
  ".kb/facts",
  ".opencode",
  "src",
];

function workspace(config: Record<string, unknown> = {}): string {
  const dir = tempDir("kibi-plugin-mut-");
  execSync(
    "git init -q -b main && git config user.email t@e.st && git config user.name t",
    { cwd: dir },
  );
  for (const sub of KB_DIRS)
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  fs.writeFileSync(path.join(dir, ".kb/manifest.json"), "{}\n");
  fs.writeFileSync(path.join(dir, ".kb/symbols.yaml"), "[]\n");
  fs.writeFileSync(
    path.join(dir, ".opencode/kibi.json"),
    JSON.stringify(config),
  );
  return dir;
}

function write(dir: string, file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), content);
}

interface Started {
  hooks: Hooks;
  logs: Body[];
  dir: string;
  of: (message: string) => Body[];
  transform: (input?: unknown, system?: string[]) => Promise<string[]>;
  emit: (type: string, file?: string) => Promise<void>;
}

async function start(
  dir: string,
  extra: {
    withClient?: boolean;
    client?: Record<string, unknown>;
    sessionId?: string;
    agentIdentity?: string;
  } = {},
): Promise<Started> {
  const logs: Body[] = [];
  const client = {
    app: {
      log: async ({ body }: { body: Body }) => {
        logs.push(body);
      },
    },
    ...(extra.client ?? {}),
  };
  const hooks = await kibiOpencodePlugin({
    directory: dir,
    worktree: dir,
    ...(extra.sessionId !== undefined ? { sessionId: extra.sessionId } : {}),
    ...(extra.agentIdentity !== undefined
      ? { agentIdentity: extra.agentIdentity }
      : {}),
    ...(extra.withClient === false ? {} : { client: client as never }),
  });
  return {
    hooks,
    logs,
    dir,
    of: (message) => logs.filter((body) => body.message === message),
    transform: async (input = {}, system = []) => {
      const output = { system };
      await hooks["experimental.chat.system.transform"]?.(input, output);
      return output.system;
    },
    emit: async (type, file) => {
      await hooks.event?.({
        event: {
          type,
          ...(file !== undefined ? { properties: { file } } : {}),
        },
      });
    },
  };
}

describe("lintRequirementDoc", () => {
  function lint(
    content: string,
    file = "REQ-1.md",
  ): ReturnType<typeof lintRequirementDoc> {
    const dir = tempDir("kibi-lint-");
    fs.writeFileSync(path.join(dir, file), content);
    return lintRequirementDoc(file, dir);
  }

  test("flags an embedded scenario with the exact message", () => {
    expect(lint("Given a user\nwhen they log in\nthen it works")).toStrictEqual(
      [
        {
          category: "embedded-scenario-in-req",
          message:
            "Requirement file REQ-1.md appears to contain embedded scenario (Given/When/Then). Consider extracting to a separate SCEN entity.",
        },
      ],
    );
  });

  test("needs whitespace after each scenario keyword", () => {
    expect(lint("givenX whenY thenZ")).toStrictEqual([]);
    expect(lint("given x whenY then")).toStrictEqual([]);
    expect(lint("GIVEN\tx WHEN\ny THEN")).toHaveLength(1);
  });

  test.each([
    ["assert it"],
    ["we verify this"],
    ["is expected  to work"],
    ["should\treturn ok"],
    ["ASSERT"],
  ])("flags embedded test wording in %p", (text) => {
    expect(lint(text)).toStrictEqual([
      {
        category: "embedded-test-in-req",
        message:
          "Requirement file REQ-1.md appears to contain embedded test assertions. Consider extracting to a separate TEST entity.",
      },
    ]);
  });

  test.each([["asserting"], ["expectedto"], ["shouldreturn"], ["reverify"]])(
    "ignores test words inside other words in %p",
    (text) => {
      expect(lint(text)).toStrictEqual([]);
    },
  );

  test("reports more than fifty content lines", () => {
    const body = Array.from({ length: 50 }, (_, i) => `line ${i}`);
    const longText = [...body, "a---", "b#"].join("\n");
    expect(lint(longText)).toStrictEqual([
      {
        category: "missing-traceability",
        message:
          "Requirement file REQ-1.md is very long (52 content lines). Consider splitting into multiple requirements or extracting scenarios/tests.",
      },
    ]);
  });

  test("fifty content lines with frontmatter, headings and blanks stay quiet", () => {
    const body = Array.from({ length: 50 }, (_, i) => `line ${i}`);
    const text = [
      "---",
      "id: x",
      "---",
      "# Title",
      "",
      "   ",
      "\t",
      ...body.slice(1),
    ].join("\n");
    expect(lint(text)).toStrictEqual([]);
    const exact = Array.from({ length: 50 }, (_, i) => `l${i}`).join("\n");
    expect(lint(exact)).toStrictEqual([]);
    expect(lint(`${exact}\nmore`)).toHaveLength(1);
  });

  test("reports every finding together", () => {
    const body = Array.from({ length: 51 }, (_, i) => `x${i}`).join("\n");
    const found = lint(`given a when b then c assert\n${body}`).map(
      (w) => w.category,
    );
    expect(found).toEqual([
      "embedded-scenario-in-req",
      "embedded-test-in-req",
      "missing-traceability",
    ]);
  });

  test("resolves the file against the worktree", () => {
    const dir = tempDir("kibi-lint-rel-");
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "r.md"), "assert");
    expect(lintRequirementDoc("sub/r.md", dir)).toHaveLength(1);
    expect(
      lintRequirementDoc(path.join(dir, "sub", "r.md"), "/nonexistent"),
    ).toHaveLength(1);
  });

  test("a missing file yields no warnings", () => {
    expect(
      lintRequirementDoc("missing.md", tempDir("kibi-lint-none-")),
    ).toStrictEqual([]);
  });
});

describe("plugin hook registration", () => {
  test("registers the config hook exactly when the host supports the command", async () => {
    const run = await start(workspace());
    const supported = getKibiBootstrapCommandCapability().supported;
    expect("config" in run.hooks).toBe(supported);
    if (supported) {
      const configInput: Record<string, unknown> = {};
      await run.hooks.config?.(configInput);
      expect(Object.keys(configInput.command as object)).toContain(
        "kibi-bootstrap",
      );
    }
  });

  test.each([
    ["auto", true, true],
    ["system-transform", true, false],
    ["chat-params", false, true],
    ["compat", false, false],
  ])(
    "hook mode %p registers transform=%p and chat.params=%p",
    async (hookMode, transform, params) => {
      const run = await start(workspace({ prompt: { hookMode } }));
      expect("experimental.chat.system.transform" in run.hooks).toBe(transform);
      expect("chat.params" in run.hooks).toBe(params);
      expect(typeof run.hooks.event).toBe("function");
      expect(typeof run.hooks["tool.execute.after"]).toBe("function");
    },
  );

  test("a disabled prompt registers neither prompt hook", async () => {
    const run = await start(workspace({ prompt: { enabled: false } }));
    expect("experimental.chat.system.transform" in run.hooks).toBe(false);
    expect("chat.params" in run.hooks).toBe(false);
  });

  test("chat.params logs its passive role only in auto mode", async () => {
    const auto = await start(workspace());
    await auto.hooks["chat.params"]?.({}, {});
    expect(
      auto.of(
        "kibi-opencode: chat.params hook active (prompt injection via system.transform)",
      ),
    ).toHaveLength(1);

    const params = await start(
      workspace({ prompt: { hookMode: "chat-params" } }),
    );
    const before = params.logs.length;
    await params.hooks["chat.params"]?.({}, {});
    expect(params.logs.length).toBe(before);
  });

  test("logs setup completion once", async () => {
    const run = await start(workspace());
    expect(run.of("kibi-opencode: setup complete")).toHaveLength(1);
  });

  test("a missing tool call still records nothing and resolves", async () => {
    const run = await start(workspace());
    await expect(
      run.hooks["tool.execute.after"]?.(undefined),
    ).resolves.toBeUndefined();
    await expect(
      run.hooks["tool.execute.after"]?.({
        tool: "read",
        sessionID: "s",
        args: {},
      }),
    ).resolves.toBeUndefined();
  });
});

describe("plugin sync scheduling", () => {
  test("reuses the startup scheduler for edits in the worktree", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    await run.emit("file.edited", "src/a.ts");
    expect(schedulers.options).toHaveLength(1);
    expect(schedulers.options[0]?.worktree).toBe(dir);
    expect(schedulers.syncs.length).toBeGreaterThan(0);
    expect(schedulers.syncs.every(([, file]) => file === "src/a.ts")).toBe(
      true,
    );
  });

  test("schedules nothing when sync is disabled", async () => {
    const dir = workspace({ sync: { enabled: false } });
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    expect(schedulers.options).toHaveLength(0);
    expect(schedulers.syncs).toHaveLength(0);
  });

  test("events other than file lifecycle and KB tools do nothing", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    const before = run.logs.length;
    await run.emit("file.renamed", "src/a.ts");
    await run.emit("session.idle");
    expect(run.logs.length).toBe(before);
    expect(schedulers.syncs).toHaveLength(0);
  });

  function nestedRepo(dir: string): string {
    const nested = path.join(dir, "nested");
    fs.mkdirSync(path.join(nested, "src"), { recursive: true });
    execSync(
      "git init -q -b feature && git config user.email t@e.st && git config user.name t",
      { cwd: nested },
    );
    write(nested, "src/n.ts", "export const n = 1;\n");
    return nested;
  }

  test("creates one scheduler per nested worktree", async () => {
    const dir = workspace();
    const nested = nestedRepo(dir);
    const run = await start(dir);
    await run.emit("file.edited", path.join(nested, "src/n.ts"));
    await run.emit("file.edited", path.join(nested, "src/n.ts"));
    expect(schedulers.options.map((o) => o.worktree)).toEqual([dir, nested]);
  });

  test("an unavailable nested scheduler latches the degraded state", async () => {
    const dir = workspace();
    const nested = nestedRepo(dir);
    globals.__kibi_test_scheduler_factory_by_worktree = new Map([
      [
        nested,
        () => {
          throw new Error("no scheduler");
        },
      ],
    ]);
    const run = await start(dir);
    await run.emit("file.edited", path.join(nested, "src/n.ts"));
    const degraded = run.of("smart-enforcement.degraded");
    expect(degraded.map((b) => b.overlay_cause)).toEqual([
      "scheduler_unavailable",
    ]);
  });

  const meta = (over: Partial<SyncRunMetadata>): SyncRunMetadata =>
    ({
      reason: "file.edited",
      exitCode: 0,
      durationMs: 0,
      ...over,
    }) as SyncRunMetadata;

  test("a nested scheduler's failed run latches the degraded state", async () => {
    const dir = workspace();
    const nested = nestedRepo(dir);
    const run = await start(dir);
    await run.emit("file.edited", path.join(nested, "src/n.ts"));
    const nestedOptions = schedulers.options[1];
    nestedOptions?.onRunComplete?.(meta({ exitCode: 0 }));
    expect(run.of("smart-enforcement.degraded")).toHaveLength(0);
    nestedOptions?.onRunComplete?.(meta({ exitCode: 0, checkExitCode: 2 }));
    expect(
      run.of("smart-enforcement.degraded").map((b) => b.overlay_cause),
    ).toEqual(["scheduler_check_failed"]);
  });
});

describe("plugin system transform", () => {
  const guidanceLog = (run: Started): Body | undefined =>
    run.of("smart-enforcement.guidance").at(-1);

  test("leaves a system prompt that already carries the sentinel alone", async () => {
    const run = await start(workspace());
    const system = await run.transform({}, [
      "before <!-- kibi-opencode --> after",
    ]);
    expect(system).toEqual(["before <!-- kibi-opencode --> after"]);
    expect(run.of("smart-enforcement.guidance")).toHaveLength(0);
  });

  test("an idle session gets only the sentinel and a skip log", async () => {
    const run = await start(workspace());
    expect(await run.transform(null, ["host"])).toEqual([
      "host",
      "<!-- kibi-opencode -->",
    ]);
    expect(guidanceLog(run)).toStrictEqual({
      service: "kibi-opencode",
      level: "info",
      message: "smart-enforcement.guidance",
      event: "smart_enforcement_guidance",
      emitted: false,
      posture: "root_active",
      posture_state: "root_active",
      guidance_action: "skip",
      risk_class: null,
      recent_edits: 0,
      static_degraded: false,
      runtime_degraded: false,
      merged_degraded: false,
      overlay_cause: null,
    });
    expect(run.of("smart-enforcement.completion-reminder")).toHaveLength(0);
  });

  test("counts recent edits up to five", async () => {
    const dir = workspace();
    const run = await start(dir);
    const counts: unknown[] = [];
    for (let i = 0; i < 7; i++) {
      write(dir, `src/f${i}.ts`, `export const v = ${i};\n`);
      await run.emit("file.edited", `src/f${i}.ts`);
      write(dir, `src/f${i}.ts`, `export const v = ${i + 100};\n`);
      await run.transform();
      counts.push(guidanceLog(run)?.recent_edits);
    }
    expect(counts).toEqual([0, 1, 2, 3, 4, 5, 5]);
  });

  test("an edited source file emits guidance with its reminders and logs", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    const [guidance] = await run.transform();
    expect(guidance).toContain("📝 **Code changes detected**");
    expect(guidance).toContain('kb_check({sourceFiles:["src/a.ts"]');
    expect(guidanceLog(run)).toMatchObject({
      emitted: true,
      guidance_action: "emit",
      risk_class: "traceability_candidate",
    });
    expect(run.of("smart-enforcement.completion-reminder")).toStrictEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "smart-enforcement.completion-reminder",
        event: "smart_enforcement_completion_reminder",
        risk_class: "traceability_candidate",
        posture: "root_active",
        posture_state: "root_active",
        guidance_action: "completion_reminder",
        reminder: "kb_check",
        static_degraded: false,
        runtime_degraded: false,
        merged_degraded: false,
        overlay_cause: null,
      },
    ]);
    expect(run.of("smart-enforcement.file-operation-reminder")).toStrictEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "smart-enforcement.file-operation-reminder",
        event: "smart_enforcement_file_operation_reminder",
        file: "src/a.ts",
        lifecycle: "edited",
        posture_state: "root_active",
        risk_class: "traceability_candidate",
      },
    ]);
  });
});

describe("plugin file-operation reminders", () => {
  function linkE2e(dir: string, files: string[]): void {
    write(
      dir,
      ".kb/symbols.yaml",
      [
        "symbols:",
        ...files.flatMap((file, i) => [
          `  - id: SYM-${i}`,
          `    title: s${i}`,
          `    sourceFile: ${file}`,
          "    relationships:",
          "      - type: covered_by",
          "        target: TEST-e2e",
        ]),
        "",
      ].join("\n"),
    );
    write(dir, ".kb/tests/TEST-e2e.md", "---\ntags:\n  - e2e\n---\n");
  }

  const reminderLogs = (run: Started) =>
    run.logs.filter(
      (b) =>
        b.message === "smart-enforcement.file-operation-reminder" ||
        b.message === "smart-enforcement.e2e-reminder",
    );

  test("shows the lifecycle and e2e reminders for an edit once", async () => {
    const dir = workspace();
    linkE2e(dir, ["src/a.ts"]);
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    const [first] = await run.transform();
    expect(first).toContain("This file has existing e2e coverage.");
    expect(first).toContain("Edited source file detected.");
    expect(reminderLogs(run)).toStrictEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "smart-enforcement.file-operation-reminder",
        event: "smart_enforcement_file_operation_reminder",
        file: "src/a.ts",
        lifecycle: "edited",
        posture_state: "root_active",
        risk_class: "traceability_candidate",
      },
      {
        service: "kibi-opencode",
        level: "info",
        message: "smart-enforcement.e2e-reminder",
        event: "smart_enforcement_e2e_reminder",
        file: "src/a.ts",
        lifecycle: "edited",
        signal_level: "exact",
        posture_state: "root_active",
        risk_class: "traceability_candidate",
      },
    ]);
    expect(await run.transform()).toEqual(["<!-- kibi-opencode -->"]);
    expect(reminderLogs(run)).toHaveLength(2);
  });

  test("shows the delete reminders for a deleted focus file once", async () => {
    const dir = workspace();
    linkE2e(dir, ["src/d.ts"]);
    write(dir, "src/d.ts", "export const d = 1;\n");
    const run = await start(dir);
    fs.rmSync(path.join(dir, "src/d.ts"));
    await run.emit("file.deleted", "src/d.ts");
    const [first] = await run.transform({ filePath: "src/d.ts" });
    expect(first).toContain("This file has existing e2e coverage.");
    expect(reminderLogs(run).map((b) => [b.message, b.lifecycle])).toEqual([
      ["smart-enforcement.file-operation-reminder", "deleted"],
      ["smart-enforcement.e2e-reminder", "deleted"],
    ]);
    const [second] = await run.transform({ filePath: "src/d.ts" });
    expect(second).not.toContain("This file has existing e2e coverage.");
    expect(reminderLogs(run)).toHaveLength(2);
  });

  test("a shown edit reminder is not repeated for a later edit of the same file", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    await run.transform();
    expect(reminderLogs(run).map((b) => b.message)).toEqual([
      "smart-enforcement.file-operation-reminder",
    ]);
    write(dir, "src/a.ts", "export const a = 3;\n");
    await run.emit("file.edited", "src/a.ts");
    const [again] = await run.transform();
    expect(again).not.toContain("Edited source file detected.");
    expect(reminderLogs(run)).toHaveLength(1);
  });
});

describe("plugin degraded advisory", () => {
  test("warn-once shows the maintenance advisory on the first prompt only", async () => {
    const run = await start(workspace({ sync: { enabled: false } }));
    const [first] = await run.transform();
    const [second] = await run.transform();
    expect(first).toContain("Maintenance degraded");
    expect(second).not.toContain("Maintenance degraded");
    expect(run.of("smart-enforcement.guidance").at(0)).toMatchObject({
      static_degraded: false,
      runtime_degraded: true,
      merged_degraded: true,
      overlay_cause: "sync_disabled",
    });
  });

  test("structured-only never shows the maintenance advisory", async () => {
    const run = await start(
      workspace({
        sync: { enabled: false },
        guidance: { smartEnforcement: { degradedMode: "structured-only" } },
      }),
    );
    const [first] = await run.transform();
    expect(first).not.toContain("Maintenance degraded");
  });

  test("a healthy workspace shows no maintenance advisory", async () => {
    const run = await start(workspace());
    const [first] = await run.transform();
    expect(first).not.toContain("Maintenance degraded");
  });

  test("a degraded workspace logs no completion reminder", async () => {
    const dir = workspace({ sync: { enabled: false } });
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    await run.transform();
    await run.transform();
    expect(run.of("smart-enforcement.completion-reminder")).toHaveLength(0);
  });

  test("a disabled completion reminder logs none", async () => {
    const dir = workspace({
      guidance: { smartEnforcement: { completionReminder: false } },
    });
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    const [guidance] = await run.transform();
    expect(guidance).toContain("Code changes detected");
    expect(run.of("smart-enforcement.completion-reminder")).toHaveLength(0);
  });
});

describe("plugin startup notification", () => {
  function toastClient(toasts: unknown[]) {
    return {
      tui: {
        toast: async (payload: unknown) => {
          toasts.push(payload);
        },
      },
    };
  }

  const runStartup = async (): Promise<void> => {
    expect(startupCallbacks.map((c) => c.delayMs)).toEqual([2000]);
    startupCallbacks[0]?.callback();
    await new Promise((resolve) => setTimeout(resolve, 20));
  };

  test("schedules nothing without a client", async () => {
    await start(workspace(), { withClient: false });
    expect(startupCallbacks).toHaveLength(0);
  });

  test("defaults to a two second timer", async () => {
    globals.__kibi_test_schedule_startup_notify = undefined;
    const timers = spyOn(globalThis, "setTimeout");
    try {
      await start(workspace());
      expect(timers.mock.calls.some(([, delay]) => delay === 2000)).toBe(true);
      const call = timers.mock.calls.find(([, delay]) => delay === 2000);
      clearTimeout(
        timers.mock.results[timers.mock.calls.indexOf(call as never)]?.value,
      );
    } finally {
      timers.mockRestore();
    }
  });

  test("toasts the start with known versions and runs the update check", async () => {
    const toasts: unknown[] = [];
    const inputs: AutoUpdateInput[] = [];
    globals.__kibi_test_auto_update_runner = async (input) => {
      inputs.push(input);
      return { status: "disabled" };
    };
    const dir = workspace();
    await start(dir, { client: toastClient(toasts) });
    await runStartup();
    expect(toasts).toHaveLength(1);
    expect((toasts[0] as { message: string }).message).toMatch(
      /^kibi-opencode started \(opencode v/,
    );
    expect(inputs).toEqual([{ directory: dir, enabled: true }]);
  });

  test("a disabled startup toast and a degraded workspace both stay quiet", async () => {
    const quiet: unknown[] = [];
    await start(workspace({ ux: { toastStartup: false } }), {
      client: toastClient(quiet),
    });
    globals.__kibi_test_auto_update_runner = async () => ({
      status: "disabled",
    });
    await runStartup();
    expect(quiet).toEqual([]);

    startupCallbacks = [];
    const degraded: unknown[] = [];
    await start(workspace({ sync: { enabled: false }, autoUpdate: false }), {
      client: toastClient(degraded),
    });
    await runStartup();
    expect(degraded).toEqual([]);
  });

  test.each([
    [new Error("boom"), "boom"],
    ["plain", "plain"],
  ])("logs a rejected update check (%p)", async (reason, message) => {
    globals.__kibi_test_auto_update_runner = () => Promise.reject(reason);
    const run = await start(workspace({ ux: { toastStartup: false } }));
    await runStartup();
    expect(run.of("auto-update: background update check failed")).toStrictEqual(
      [
        {
          service: "kibi-opencode",
          level: "info",
          message: "auto-update: background update check failed",
          error: message,
        },
      ],
    );
  });

  test("the built-in update check reports a newer pinned release", async () => {
    const toasts: unknown[] = [];
    const dir = workspace();
    write(
      dir,
      "opencode.json",
      JSON.stringify({ plugin: ["kibi-opencode@0.0.1"] }),
    );
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (async () =>
        new Response(JSON.stringify({ latest: "999.0.0" }), {
          status: 200,
        })) as unknown as typeof fetch,
    );
    try {
      const run = await start(dir, { client: toastClient(toasts) });
      await runStartup();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const pinned = run.logs.filter((b) =>
        String(b.message).includes("999.0.0 is available"),
      );
      expect(pinned).toHaveLength(1);
      const current = String(pinned[0]?.message).match(
        /pinned to (\S+)\.$/,
      )?.[1];
      expect(current).not.toBe("0.0.1");
      expect(toasts).toContainEqual({
        variant: "info",
        title: "Kibi OpenCode",
        message: pinned[0]?.message,
        duration: 8000,
      });
      expect(
        run.of("auto-update: exact semver pin detected, skipping install"),
      ).toHaveLength(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("the built-in update notice skips the toast when startup toasts are off", async () => {
    const toasts: unknown[] = [];
    const dir = workspace({ ux: { toastStartup: false } });
    write(
      dir,
      "opencode.json",
      JSON.stringify({ plugin: ["kibi-opencode@0.0.1"] }),
    );
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (async () =>
        new Response(JSON.stringify({ latest: "999.0.0" }), {
          status: 200,
        })) as unknown as typeof fetch,
    );
    try {
      const run = await start(dir, { client: toastClient(toasts) });
      await runStartup();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(
        run.logs.filter((b) =>
          String(b.message).includes("999.0.0 is available"),
        ),
      ).toHaveLength(1);
      expect(toasts).toEqual([]);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe("plugin transform focus selection", () => {
  async function created(files: string[]): Promise<Started> {
    const dir = workspace();
    const run = await start(dir);
    for (const file of files) {
      write(dir, file, `export const v = "${file}";\n`);
      await run.emit("file.created", file);
    }
    return run;
  }

  const reminded = (run: Started) =>
    run.of("smart-enforcement.file-operation-reminder").map((b) => b.file);

  test.each([
    ["focusFilePath", { focusFilePath: "src/x.ts", filePath: "src/y.ts" }],
    ["filePath", { filePath: "src/x.ts", path: "src/y.ts" }],
    ["path", { path: "src/x.ts", file: "src/y.ts" }],
    ["file", { file: "src/x.ts", focusEdit: { path: "src/y.ts" } }],
    [
      "focusEdit.path",
      { focusEdit: { path: "src/x.ts", filePath: "src/y.ts" } },
    ],
    ["focusEdit.filePath", { focusEdit: { filePath: "src/x.ts" } }],
  ])("reads the focus file from %s first", async (_field, input) => {
    const run = await created(["src/x.ts", "src/y.ts"]);
    await run.transform(input);
    expect(reminded(run)).toEqual(["src/x.ts"]);
  });

  test("normalizes an absolute focus path inside the worktree", async () => {
    const run = await created(["src/x.ts", "src/y.ts"]);
    await run.transform({ filePath: path.join(run.dir, "src/x.ts") });
    expect(reminded(run)).toEqual(["src/x.ts"]);
  });

  test.each([
    ["an empty path", { filePath: "" }],
    ["a non-string path", { filePath: 42 }],
    ["a null focus edit", { focusEdit: null }],
    ["a primitive input", "src/x.ts"],
    ["no input", undefined],
  ])("%s falls back to the session focus edit", async (_name, input) => {
    const run = await created(["src/x.ts", "src/y.ts"]);
    write(run.dir, "src/y.ts", "export const v = 2;\n");
    await run.transform(input);
    expect(reminded(run)).toEqual(["src/y.ts"]);
  });

  test("a focus path outside the worktree stays absolute", async () => {
    const outside = tempDir("kibi-outside-");
    const file = path.join(outside, "o.ts");
    fs.writeFileSync(file, "export const o = 1;\n");
    const dir = workspace();
    const run = await start(dir);
    await run.emit("file.created", file);
    await run.transform({ filePath: file });
    expect(run.of("smart-enforcement.risk").map((b) => b.file)).toContain(file);
  });
});

describe("plugin hard mode", () => {
  let bin: string;
  const originalPath = process.env.PATH;

  beforeEach(() => {
    bin = tempDir("kibi-fake-bin-");
    fs.writeFileSync(
      path.join(bin, "kibi"),
      '#!/bin/sh\nexit "${KIBI_FAKE_EXIT:-0}"\n',
      { mode: 0o755 },
    );
    process.env.PATH = `${bin}:${originalPath}`;
  });

  afterEach(() => {
    process.env.PATH = originalPath;
    Reflect.deleteProperty(process.env, "KIBI_FAKE_EXIT");
  });

  async function until(check: () => boolean): Promise<void> {
    for (let i = 0; i < 100 && !check(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  async function hardEdit(): Promise<Started> {
    const dir = workspace({ guidance: { smartEnforcement: { mode: "hard" } } });
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    return run;
  }

  test("blocks on a checkpoint, consumes the gate and logs the passed run", async () => {
    const run = await hardEdit();
    const [blocked] = await run.transform();
    expect(blocked).toContain("🛑 Kibi hard gate blocked");
    expect(blocked).toContain("Reason: checkpoint_required.");
    const consumed = run.of("smart-enforcement.hard-gate-consumed");
    expect(consumed).toHaveLength(1);
    const fingerprint = consumed[0]?.fingerprint;
    expect(typeof fingerprint).toBe("string");
    expect(consumed[0]).toStrictEqual({
      service: "kibi-opencode",
      level: "info",
      message: "smart-enforcement.hard-gate-consumed",
      event: "smart_enforcement_hard_gate_consumed",
      file: "src/a.ts",
      fingerprint,
      posture_state: "root_active",
      risk_class: "traceability_candidate",
    });
    await until(() => run.of("smart-enforcement.checkpoint").length > 0);
    expect(run.of("smart-enforcement.checkpoint")).toStrictEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "smart-enforcement.checkpoint",
        event: "smart_enforcement_checkpoint",
        fingerprint,
        result: "passed",
        reason: undefined,
      },
    ]);
    const [after] = await run.transform();
    expect(after).not.toContain("hard gate blocked");
    expect(run.of("smart-enforcement.hard-gate-consumed")).toHaveLength(1);
    expect(run.of("smart-enforcement.degraded")).toHaveLength(0);
  });

  test("a failed checkpoint run latches nothing for its sync", async () => {
    process.env.KIBI_FAKE_EXIT = "1";
    const run = await hardEdit();
    await run.transform();
    await until(() => run.of("smart-enforcement.checkpoint").length > 0);
    const [logged] = run.of("smart-enforcement.checkpoint");
    expect(logged?.result).not.toBe("passed");
    expect(typeof logged?.reason).toBe("string");
    expect(run.of("smart-enforcement.degraded")).toHaveLength(0);
  });

  test("advisory mode never blocks", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    const [guidance] = await run.transform();
    expect(guidance).not.toContain("hard gate");
    expect(run.of("smart-enforcement.hard-gate-consumed")).toHaveLength(0);
  });
});

describe("plugin freshness and risk focus", () => {
  async function edited(
    extra: Parameters<typeof start>[1] = {},
  ): Promise<Started> {
    const dir = workspace();
    const run = await start(dir, extra);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    return run;
  }

  const tool = (run: Started, name: string) =>
    run.hooks.event?.({
      event: { type: "tool.execute.after", properties: { tool: name } },
    });

  test("asks for KB evidence for the focus file and lists the changed paths", async () => {
    const run = await edited();
    write(run.dir, "src/b.ts", "export const b = 1;\n");
    const [guidance] = await run.transform({ filePath: "src/b.ts" });
    expect(guidance).toContain(
      "🧠 **Kibi freshness required**\nChanged: `src/a.ts`, `src/b.ts`\n",
    );
  });

  test.each([[undefined], ["session-1"]])(
    "KB updates and a check in session %p satisfy freshness",
    async (sessionId) => {
      const run = await edited(sessionId === undefined ? {} : { sessionId });
      await tool(run, "kb_search");
      await tool(run, "kb_upsert");
      await tool(run, "kb_check");
      const [guidance] = await run.transform({ filePath: "src/a.ts" });
      expect(guidance).not.toContain("Kibi freshness required");
    },
  );

  test("a lockfile focus needs no KB evidence", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "bun.lock", "lock\n");
    const [guidance] = await run.transform({ filePath: "bun.lock" });
    expect(guidance).not.toContain("Kibi freshness required");
  });

  test("no focus file asks for no KB evidence", async () => {
    const run = await edited();
    const [guidance] = await run.transform();
    expect(guidance).not.toContain("Kibi freshness required");
  });

  test("re-derives the risk class when the focus moves to another file", async () => {
    const run = await edited();
    await run.transform({ filePath: "src/a.ts" });
    expect(run.of("smart-enforcement.guidance").at(-1)?.risk_class).toBe(
      "traceability_candidate",
    );
    write(run.dir, "docs/x.md", "# Notes\n");
    await run.transform({ filePath: "docs/x.md" });
    expect(run.of("smart-enforcement.guidance").at(-1)?.risk_class).toBe(
      "safe_docs_only",
    );
  });

  test("classifies an eventless focus file", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "src/new.ts", "export const n = 1;\n");
    const [guidance] = await run.transform({ filePath: "src/new.ts" });
    expect(run.of("smart-enforcement.guidance").at(-1)?.risk_class).toBe(
      "traceability_candidate",
    );
    expect(guidance).toContain("Changed: `src/new.ts`");
  });

  test("a deleted file deleted again gets no second reminder", async () => {
    const dir = workspace();
    write(dir, "src/d.ts", "export const d = 1;\n");
    const run = await start(dir);
    fs.rmSync(path.join(dir, "src/d.ts"));
    await run.emit("file.deleted", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    await run.emit("file.deleted", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    expect(run.of("smart-enforcement.file-operation-reminder")).toHaveLength(1);
  });

  test("an event path with a leading ./ gets the source edit reminder", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "./src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    const [guidance] = await run.transform();
    expect(guidance).toContain("Edited source file detected.");
  });

  test("a relative focus path is kept as given whatever the process directory", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "src/x.ts", "export const x = 1;\n");
    await run.emit("file.created", "src/x.ts");
    const cwd = process.cwd();
    process.chdir(path.join(dir, "src"));
    try {
      await run.transform({ filePath: "src/x.ts" });
    } finally {
      process.chdir(cwd);
    }
    expect(
      run.of("smart-enforcement.file-operation-reminder").map((b) => b.file),
    ).toEqual(["src/x.ts"]);
  });
});

describe("plugin guidance cache keys", () => {
  async function cacheKeys(
    mode: string,
  ): Promise<{ keys: unknown[]; dir: string }> {
    const cache = getGuidanceCache();
    const spy = spyOn(cache, "isSatisfied");
    try {
      const dir = workspace({ guidance: { smartEnforcement: { mode } } });
      const run = await start(dir, {
        sessionId: "s-1",
        agentIdentity: "agent-1",
      });
      write(dir, "src/a.ts", "export const a = 1;\n");
      await run.emit("file.edited", "src/a.ts");
      return { keys: spy.mock.calls.map(([key]) => key), dir };
    } finally {
      spy.mockRestore();
    }
  }

  test("advisory keys carry no scope", async () => {
    const { keys, dir } = await cacheKeys("advisory");
    expect(keys).toContainEqual({
      workspaceRoot: dir,
      branch: "main",
      posture: "root_active",
      riskClass: "traceability_candidate",
      fileBucket: "code",
    });
    expect(keys.some((key) => "scopeKey" in (key as object))).toBe(false);
  });

  test("hard keys carry the session scope", async () => {
    const { keys, dir } = await cacheKeys("hard");
    expect(keys).toContainEqual({
      workspaceRoot: dir,
      branch: "main",
      posture: "root_active",
      riskClass: "traceability_candidate",
      fileBucket: "code",
      scopeKey: buildEnforcementScopeKey({
        sessionId: "s-1",
        agentIdentity: "agent-1",
        worktreeRoot: dir,
        branch: "main",
        dirtyRelevantFingerprint: buildDirtyRelevantFingerprint([
          "src/a.ts",
          "code",
          "traceability_candidate",
        ]),
      }),
    });
  });
});

describe("plugin reminder and gate lifecycles", () => {
  const originalPath = process.env.PATH;

  afterEach(() => {
    process.env.PATH = originalPath;
  });

  function linkE2e(dir: string, file: string): void {
    write(
      dir,
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-0",
        "    title: s0",
        `    sourceFile: ${file}`,
        "    relationships:",
        "      - type: covered_by",
        "        target: TEST-e2e",
        "",
      ].join("\n"),
    );
    write(dir, ".kb/tests/TEST-e2e.md", "---\ntags:\n  - e2e\n---\n");
  }

  function fakeKibi(): void {
    const bin = tempDir("kibi-fake-bin-");
    fs.writeFileSync(path.join(bin, "kibi"), "#!/bin/sh\nexit 0\n", {
      mode: 0o755,
    });
    process.env.PATH = `${bin}:${originalPath}`;
  }

  async function until(check: () => boolean): Promise<void> {
    for (let i = 0; i < 100 && !check(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  test("a file recreated after its delete reminder gets a create reminder", async () => {
    const dir = workspace();
    write(dir, "src/d.ts", "export const d = 1;\n");
    const run = await start(dir);
    fs.rmSync(path.join(dir, "src/d.ts"));
    await run.emit("file.deleted", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    write(dir, "src/d.ts", "export const d = 2;\n");
    await run.emit("file.created", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    expect(
      run
        .of("smart-enforcement.file-operation-reminder")
        .map((b) => b.lifecycle),
    ).toEqual(["deleted", "created"]);
  });

  test("a passed checkpoint keeps a later edit of the file quiet", async () => {
    fakeKibi();
    const dir = workspace({ guidance: { smartEnforcement: { mode: "hard" } } });
    linkE2e(dir, "src/a.ts");
    const run = await start(dir);
    const edit = async (value: number) => {
      write(dir, "src/a.ts", `export const a = ${value};\n`);
      await run.emit("file.edited", "src/a.ts");
      write(dir, "src/a.ts", `export const a = ${value + 100};\n`);
    };
    await edit(1);
    await run.transform();
    await until(() => run.of("smart-enforcement.checkpoint").length > 0);
    await edit(2);
    const [after] = await run.transform();
    expect(after).not.toContain("hard gate blocked");
    expect(after).not.toContain("Edited source file detected");
    expect(run.of("smart-enforcement.hard-gate-consumed")).toHaveLength(1);
    expect(run.of("smart-enforcement.file-operation-reminder")).toHaveLength(0);
    expect(run.of("smart-enforcement.e2e-reminder")).toHaveLength(0);
  });

  test("a new lifecycle after a passed checkpoint blocks again", async () => {
    fakeKibi();
    const dir = workspace({ guidance: { smartEnforcement: { mode: "hard" } } });
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    await run.transform();
    await until(() => run.of("smart-enforcement.checkpoint").length > 0);
    write(dir, "src/a.ts", "export const a = 3;\n");
    await run.emit("file.created", "src/a.ts");
    const [blocked] = await run.transform();
    expect(blocked).toContain("🛑 Kibi hard gate blocked");
    expect(run.of("smart-enforcement.hard-gate-consumed")).toHaveLength(2);
  });

  test("a gated delete followed by a create blocks again", async () => {
    fakeKibi();
    const dir = workspace({ guidance: { smartEnforcement: { mode: "hard" } } });
    linkE2e(dir, "src/d.ts");
    write(dir, "src/d.ts", "export const d = 1;\n");
    const run = await start(dir);
    fs.rmSync(path.join(dir, "src/d.ts"));
    await run.emit("file.deleted", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    await until(() => run.of("smart-enforcement.checkpoint").length > 0);
    write(dir, "src/d.ts", "export const d = 2;\n");
    await run.emit("file.created", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    expect(run.of("smart-enforcement.hard-gate-consumed")).toHaveLength(2);
  });

  test("each lifecycle change of a gated file blocks again", async () => {
    fakeKibi();
    const dir = workspace({ guidance: { smartEnforcement: { mode: "hard" } } });
    write(dir, "src/d.ts", "export const d = 1;\n");
    const run = await start(dir);
    const checkpoints = (count: number) =>
      until(() => run.of("smart-enforcement.checkpoint").length >= count);
    fs.rmSync(path.join(dir, "src/d.ts"));
    await run.emit("file.deleted", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    await checkpoints(1);
    write(dir, "src/d.ts", "export const d = 2;\n");
    await run.emit("file.created", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    await checkpoints(2);
    await run.emit("file.deleted", "src/d.ts");
    const [last] = await run.transform({ filePath: "src/d.ts" });
    expect(last).toContain("🛑 Kibi hard gate blocked");
    expect(run.of("smart-enforcement.hard-gate-consumed")).toHaveLength(3);
  });

  test.each([
    ["edited", "src/a.ts"],
    ["deleted", "src/d.ts"],
  ])(
    "a passed checkpoint for an %s file leaves nothing pending",
    async (kind, file) => {
      fakeKibi();
      const dir = workspace({
        guidance: { smartEnforcement: { mode: "hard" } },
      });
      linkE2e(dir, file);
      write(dir, file, "export const v = 1;\n");
      const run = await start(dir);
      if (kind === "deleted") {
        fs.rmSync(path.join(dir, file));
      } else {
        write(dir, file, "export const v = 2;\n");
      }
      await run.emit(`file.${kind}`, file);
      await run.transform({ filePath: file });
      await until(() => run.of("smart-enforcement.checkpoint").length > 0);
      await run.transform({ filePath: file });
      await run.transform({ filePath: file });
      expect(run.of("smart-enforcement.file-operation-reminder")).toHaveLength(
        0,
      );
      expect(run.of("smart-enforcement.e2e-reminder")).toHaveLength(0);
      expect(run.of("smart-enforcement.hard-gate-consumed")).toHaveLength(1);
    },
  );

  test("a passed delete checkpoint keeps a repeated delete quiet", async () => {
    fakeKibi();
    const dir = workspace({ guidance: { smartEnforcement: { mode: "hard" } } });
    write(dir, "src/d.ts", "export const d = 1;\n");
    const run = await start(dir);
    fs.rmSync(path.join(dir, "src/d.ts"));
    await run.emit("file.deleted", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    await until(() => run.of("smart-enforcement.checkpoint").length > 0);
    await run.emit("file.deleted", "src/d.ts");
    const [after] = await run.transform({ filePath: "src/d.ts" });
    expect(after).not.toContain("Deleted file");
    expect(run.of("smart-enforcement.file-operation-reminder")).toHaveLength(0);
    expect(run.of("smart-enforcement.hard-gate-consumed")).toHaveLength(1);
  });
});

describe("plugin reminder bookkeeping", () => {
  function linkE2e(dir: string, file: string): void {
    write(
      dir,
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-0",
        "    title: s0",
        `    sourceFile: ${file}`,
        "    relationships:",
        "      - type: covered_by",
        "        target: TEST-e2e",
        "",
      ].join("\n"),
    );
    write(dir, ".kb/tests/TEST-e2e.md", "---\ntags:\n  - e2e\n---\n");
  }

  const reminderLogs = (run: Started) =>
    run.logs
      .filter(
        (b) =>
          b.message === "smart-enforcement.file-operation-reminder" ||
          b.message === "smart-enforcement.e2e-reminder",
      )
      .map((b) => b.message);

  test("a docs edit with e2e coverage shows only the e2e reminder, once", async () => {
    const dir = workspace();
    linkE2e(dir, "docs/x.md");
    const run = await start(dir);
    const edit = async (text: string) => {
      write(dir, "docs/x.md", `# ${text}\n`);
      await run.emit("file.edited", "docs/x.md");
      write(dir, "docs/x.md", `# ${text}!\n`);
    };
    await edit("one");
    const [first] = await run.transform({ filePath: "docs/x.md" });
    expect(first).toContain("This file has existing e2e coverage.");
    expect(reminderLogs(run)).toEqual(["smart-enforcement.e2e-reminder"]);
    await edit("two");
    await run.transform({ filePath: "docs/x.md" });
    expect(reminderLogs(run)).toEqual(["smart-enforcement.e2e-reminder"]);
  });

  test("a code edit with e2e coverage is not reminded again on the next edit", async () => {
    const dir = workspace();
    linkE2e(dir, "src/a.ts");
    const run = await start(dir);
    const edit = async (value: number) => {
      write(dir, "src/a.ts", `export const a = ${value};\n`);
      await run.emit("file.edited", "src/a.ts");
      write(dir, "src/a.ts", `export const a = ${value + 100};\n`);
    };
    await edit(1);
    await run.transform();
    await edit(2);
    await run.transform();
    expect(reminderLogs(run)).toEqual([
      "smart-enforcement.file-operation-reminder",
      "smart-enforcement.e2e-reminder",
    ]);
  });

  test("a docs edit keeps its pending reminder until it has text", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "docs/x.md", "# one\n");
    await run.emit("file.edited", "docs/x.md");
    write(dir, "docs/x.md", "# two\n");
    await run.transform({ filePath: "docs/x.md" });
    expect(reminderLogs(run)).toEqual([]);
    linkE2e(dir, "docs/x.md");
    await run.transform({ filePath: "docs/x.md" });
    expect(reminderLogs(run)).toEqual(["smart-enforcement.e2e-reminder"]);
  });

  test("an eventless focus file records guidance a later edit finds cached", async () => {
    const dir = workspace();
    const run = await start(dir);
    write(dir, "src/new.ts", "export const n = 1;\n");
    await run.transform({ filePath: "src/new.ts" });
    write(dir, "src/new.ts", "export const n = 2;\n");
    await run.emit("file.edited", "src/new.ts");
    expect(run.of("smart-enforcement.cache").map((b) => b.cache_hit)).toEqual([
      true,
    ]);
  });

  test("keeps session edits apart per worktree", async () => {
    const dir = workspace();
    const nested = path.join(dir, "nested");
    fs.mkdirSync(path.join(nested, "src"), { recursive: true });
    execSync(
      "git init -q -b main && git config user.email t@e.st && git config user.name t",
      { cwd: nested },
    );
    const run = await start(dir);
    write(dir, "src/a.ts", "export const a = 1;\n");
    await run.emit("file.edited", "src/a.ts");
    write(dir, "src/a.ts", "export const a = 2;\n");
    write(nested, "src/n.ts", "export const n = 1;\n");
    const [guidance] = await run.transform({
      filePath: path.join(nested, "src/n.ts"),
    });
    expect(guidance).toContain("Changed: ");
    expect(guidance).not.toContain("`src/a.ts`");
  });
});

describe("plugin reminders folded into source links", () => {
  test("a delete reminder shown through the source links stays pending", async () => {
    const dir = workspace();
    write(
      dir,
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-0",
        "    title: s0",
        "    sourceFile: src/d.ts",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-one",
        "      - type: covered_by",
        "        target: TEST-e2e",
        "",
      ].join("\n"),
    );
    write(dir, ".kb/tests/TEST-e2e.md", "---\ntags:\n  - e2e\n---\n");
    write(
      dir,
      ".kb/requirements/REQ-one.md",
      "---\nid: REQ-one\ntitle: One\nstatus: active\n---\nThe system shall work.\n",
    );
    write(dir, "src/d.ts", "export const d = 1;\n");
    const run = await start(dir);
    await run.emit("file.edited", "src/d.ts");
    fs.rmSync(path.join(dir, "src/d.ts"));
    await run.emit("file.deleted", "src/d.ts");
    const [first] = await run.transform({ filePath: "src/d.ts" });
    expect(first).toContain("- Existing Kibi links: REQ-one");
    expect(first).not.toContain("Deleted file had linked Kibi entities");
    await run.emit("file.deleted", "src/d.ts");
    await run.transform({ filePath: "src/d.ts" });
    expect(
      run.of("smart-enforcement.e2e-reminder").map((b) => b.lifecycle),
    ).toEqual(["deleted", "deleted"]);
    expect(run.of("smart-enforcement.file-operation-reminder")).toHaveLength(0);
  });
});
