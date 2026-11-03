import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CommentAnalysisResult } from "../src/comment-analysis";
import type { RuntimeDegradedOverlay } from "../src/plugin-startup";
import {
  type KibiEventEnv,
  type SmartEnforcementState,
  handleFileLifecycleEvent,
  handleKbToolEvent,
  isKbToolEventType,
  kibiToolName,
} from "../src/smart-enforcement-events";
import type { WorkContext } from "../src/work-context-resolver";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-events-"));

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function write(relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

const TRACED = "// implements REQ-x\nexport function run() {}\n";
const FACT_COMMENT =
  "/*\n * The retry count is at most three and never negative.\n * It must be unique per job and the default is one.\n * This invariant always holds for every queue.\n */\n";
const ADR_COMMENT =
  "/*\n * We chose a queue because of the tradeoff in latency.\n * The design decision keeps the rationale explicit.\n * The constraint is documented here for the record.\n */\n";
const REQ_COMMENT =
  "/*\n * The system must retry and the user can cancel a job.\n * The service shall support a capability to pause.\n * It must support permission checks for each user.\n */\n";

write("src/traced.ts", TRACED);
write("src/untraced.ts", "export function run() {}\n");
write("src/fact.ts", `${FACT_COMMENT}${TRACED}`);
write("src/fact-two.ts", `${FACT_COMMENT}${TRACED}`);
write("src/adr.ts", `${ADR_COMMENT}${TRACED}`);
write("src/req.ts", `${REQ_COMMENT}${TRACED}`);
write(
  "src/short.ts",
  `/* The retry count is at most three, never more, always. */\n${TRACED}`,
);
write("src/notes.ts", "const x = 1;\n");
write("src/front.ts", `---\npriority: must\n---\n${TRACED}`);
write("README.md", "# readme\n");
write("tests/a.test.ts", TRACED);
write(
  ".kb/requirements/REQ-must.md",
  "---\nid: REQ-must\npriority: must\n---\n",
);
write(".kb/requirements/REQ-may.md", "---\nid: REQ-may\npriority: may\n---\n");
write(".kb/facts/FACT-a.md", "---\nid: FACT-a\n---\n");
write(".kb/scenarios/SCEN-a.md", "---\nid: SCEN-a\n---\n");
write(".kb/config.json", "{}\n");

type Call = [string, ...unknown[]];

interface Options {
  syncEnabled?: boolean;
  scheduler?: boolean;
  handles?: boolean;
  targetedChecks?: boolean;
  commentDetection?: boolean;
  minLines?: number;
  warnOnKbEdits?: boolean;
  degraded?: boolean;
  degradedMode?: string;
  mode?: string;
  overlay?: Partial<RuntimeDegradedOverlay>;
  cacheHit?: boolean;
  lint?: Array<{ category: string; message: string }>;
  input?: Partial<KibiEventEnv["input"]>;
}

function fakeEnv(options: Options = {}) {
  const calls: Call[] = [];
  const info: unknown[][] = [];
  const warn: unknown[][] = [];
  const pathKinds = new Map<string, string>();
  const context = {
    worktreeRoot: root,
    branch: "main",
    posture: "root_active",
  } as WorkContext;
  const state: SmartEnforcementState = {
    recentEditCount: 0,
    hasRecentKbEdit: false,
    recentCommentSuggestion: {
      suggestionType: "fact",
    } as CommentAnalysisResult,
    seenFingerprints: new Set(),
    lastRiskClass: null,
    lastRiskFilePath: null,
    lastRiskScopeKey: null,
  };
  const scheduler = {
    scheduleSync: (...args: unknown[]) => calls.push(["schedule", ...args]),
  };
  const env = {
    input: { worktree: root, directory: root, ...options.input },
    cfg: {
      sync: { enabled: options.syncEnabled ?? true },
      guidance: {
        warnOnKbEdits: options.warnOnKbEdits ?? true,
        commentDetection: {
          enabled: options.commentDetection ?? true,
          minLines: options.minLines ?? 2,
        },
        targetedChecks: { enabled: options.targetedChecks ?? true },
        smartEnforcement: { degradedMode: options.degradedMode ?? "warn-once" },
      },
    },
    cache: {
      isSatisfied: (key: unknown) => {
        calls.push(["isSatisfied", key]);
        return options.cacheHit ?? false;
      },
    },
    freshnessStore: {
      recordToolEvidence: (...args: unknown[]) =>
        calls.push(["evidence", ...args]),
    },
    fileFilter: {
      shouldHandleFile: (...args: unknown[]) => {
        calls.push(["shouldHandle", ...args]);
        return options.handles ?? true;
      },
    },
    log: {
      info: (...args: unknown[]) => info.push(args),
      warn: (...args: unknown[]) => warn.push(args),
    },
    rootWorkContext: context,
    state,
    resolveScopedWorkContext: () => context,
    getSessionEditState: () => ({
      recordEventHint: (...args: unknown[]) =>
        calls.push(["hint", args[0], args[1]]),
      reconcilePath: (...args: unknown[]) => calls.push(["reconcile", ...args]),
      getSessionEdits: () => ["edits"],
    }),
    getFileOperationState: () => ({
      recordLifecycle: (...args: unknown[]) =>
        calls.push(["lifecycle", args[0], args[1]]),
    }),
    getPathKindCache: () => pathKinds,
    getSchedulerForContext: () =>
      (options.scheduler ?? true) ? scheduler : null,
    normalizeSessionPath: (filePath: string) => filePath,
    resolveWorktreePath: (filePath: string, worktree: string) =>
      path.join(worktree, filePath),
    buildRiskPathScopeKey: (_context: unknown, filePath: string) =>
      `scope:${filePath}`,
    buildScopedCacheKey: (...args: unknown[]) => {
      calls.push(["cacheKey", ...args.slice(1)]);
      return "key";
    },
    readFileContent: (filePath: string, worktree: string) =>
      fs.readFileSync(path.join(worktree, filePath), "utf8"),
    updateRecentEditsFromSession: (...args: unknown[]) => {
      calls.push(["recent", ...args]);
      return [];
    },
    recordWarning: (...args: unknown[]) => calls.push(["warning", ...args]),
    getMaintenanceDegraded: () => options.degraded ?? false,
    getEffectiveMode: () => options.mode ?? "advisory",
    posture: { maintenanceDegraded: false, state: "root_active" },
    runtimeOverlay: { degraded: false, causes: [], ...options.overlay },
    lintRequirementDoc: (...args: unknown[]) => {
      calls.push(["lint", ...args]);
      return options.lint ?? [];
    },
  } as unknown as KibiEventEnv;
  return { env, calls, info, warn, state, pathKinds };
}

function edit(env: KibiEventEnv, file: string, type = "file.edited"): void {
  handleFileLifecycleEvent(env, { type, properties: { file } });
}

function named(calls: Call[], name: string): unknown[][] {
  return calls.filter((call) => call[0] === name).map((call) => call.slice(1));
}

function infoFor(info: unknown[][], message: string): unknown[] {
  return info.filter((args) => args[0] === message).map((args) => args[1]);
}

describe("kb tool events", () => {
  test.each([
    ["tool.execute.after", true],
    ["tool.executed", true],
    ["tool.call.completed", true],
    ["tool.Execute.after", true],
    ["tool.Call.completed", true],
    ["tool.other", false],
  ])("%s is a tool event: %p", (type, expected) => {
    expect(isKbToolEventType(type)).toBe(expected);
  });

  test.each([
    [["kb_search"], undefined],
    ["kibi_kb_search-x", undefined],
    ["kibi_kb_search", "kb_search"],
  ])("kibiToolName(%p) is %p", (name, expected) => {
    expect(kibiToolName(name)).toBe(expected);
  });

  test("evidence carries the session scope and is logged", () => {
    const { env, calls, info } = fakeEnv({
      input: { sessionId: "s1", agentIdentity: "agent" },
    });
    handleKbToolEvent(
      env,
      { type: "tool.execute.after", properties: { tool: "kb_status" } },
      "s1",
    );
    expect(named(calls, "evidence")).toStrictEqual([
      [
        {
          sessionId: "s1",
          agentIdentity: "agent",
          worktree: root,
          branch: "main",
          fingerprint: "s1-main",
        },
        "kb_status",
      ],
    ]);
    expect(info).toEqual([
      [
        "kb-freshness.tool-evidence",
        { event: "kb_freshness_tool_evidence", tool: "kb_status" },
      ],
    ]);
  });

  test("without a session the scope has defaults and no session id", () => {
    const { env, calls } = fakeEnv();
    handleKbToolEvent(
      env,
      {
        type: "tool.execute.after",
        properties: { tool: "kb_status", args: { dryRun: true } },
      },
      undefined,
    );
    handleKbToolEvent(
      env,
      { type: "tool.execute.after", properties: { tool: "edit" } },
      undefined,
    );
    expect(named(calls, "evidence")).toStrictEqual([
      [
        {
          agentIdentity: "unknown",
          worktree: root,
          branch: "main",
          fingerprint: "-main",
        },
        "kb_status",
      ],
    ]);
  });
});

describe("file lifecycle bookkeeping", () => {
  test.each([
    ["file.created", "created", "file.created"],
    ["file.edited", "edited", "file.edited"],
    ["file.changed", "edited", "file.edited"],
  ])("%s records %s and schedules %s", (type, lifecycle, reason) => {
    const { env, calls, pathKinds } = fakeEnv();
    edit(env, "src/traced.ts", type);
    expect(named(calls, "lifecycle")).toEqual([["src/traced.ts", lifecycle]]);
    expect(named(calls, "hint")).toEqual([["src/traced.ts", "code"]]);
    expect(named(calls, "reconcile")).toEqual([["src/traced.ts"]]);
    expect(named(calls, "recent")).toEqual([[["edits"]]]);
    expect(pathKinds.get("src/traced.ts")).toBe("code");
    expect(named(calls, "schedule")).toEqual([[reason, "src/traced.ts"]]);
  });

  test("a deleted file is tracked and scheduled", () => {
    const { env, calls, pathKinds } = fakeEnv();
    edit(env, ".kb/facts/FACT-a.md", "file.deleted");
    expect(named(calls, "lifecycle")).toEqual([
      [".kb/facts/FACT-a.md", "deleted"],
    ]);
    expect(pathKinds.get(".kb/facts/FACT-a.md")).toBe("fact");
    expect(named(calls, "hint")).toEqual([[".kb/facts/FACT-a.md", "fact"]]);
    expect(named(calls, "reconcile")).toEqual([[".kb/facts/FACT-a.md"]]);
    expect(named(calls, "recent")).toEqual([[["edits"]]]);
    expect(named(calls, "schedule")).toEqual([
      ["file.deleted", ".kb/facts/FACT-a.md"],
    ]);
    expect(named(calls, "cacheKey")).toEqual([]);
  });

  test.each([
    [{ syncEnabled: false }],
    [{ scheduler: false }],
    [{ handles: false }],
  ])("no sync is scheduled with %p", (options) => {
    for (const type of ["file.edited", "file.deleted"]) {
      const { env, calls } = fakeEnv({ ...options, targetedChecks: false });
      edit(env, "src/traced.ts", type);
      expect(named(calls, "schedule")).toEqual([]);
    }
  });

  test("an event without a file does nothing", () => {
    const { env, calls } = fakeEnv();
    handleFileLifecycleEvent(env, { type: "file.edited", properties: {} });
    expect(calls).toEqual([]);
  });
});

describe("risk classification log", () => {
  function riskLog(file: string, options: Options = {}) {
    const { env, info, state } = fakeEnv(options);
    edit(env, file);
    return { log: infoFor(info, "smart-enforcement.risk"), state };
  }

  test("the log carries the full classification", () => {
    const { log, state } = riskLog("src/traced.ts");
    expect(log).toEqual([
      {
        event: "smart_enforcement_risk",
        file: "src/traced.ts",
        path_kind: "code",
        risk_class: "behavior_candidate",
        posture_state: "root_active",
        maintenance_state: "maintenance_available",
        under_kb: false,
        has_must_priority: false,
        posture: "root_active",
        reason_code: "behavior_candidate",
        effective_mode: "advisory",
        static_degraded: false,
        runtime_degraded: false,
        merged_degraded: false,
        overlay_cause: null,
      },
    ]);
    expect(state.lastRiskClass).toBe("behavior_candidate");
    expect(state.lastRiskFilePath).toBe("src/traced.ts");
    expect(state.lastRiskScopeKey).toBe("scope:src/traced.ts");
  });

  test("a degraded workspace and its cause are reported", () => {
    const { log } = riskLog("src/traced.ts", {
      degraded: true,
      overlay: { degraded: true, primaryCause: "sync_disabled" },
    });
    expect(log[0]).toMatchObject({
      maintenance_state: "maintenance_degraded",
      runtime_degraded: true,
      merged_degraded: true,
      overlay_cause: "sync_disabled",
    });
  });

  test.each([
    [".kb/requirements/REQ-must.md", true, "req_policy_candidate"],
    [".kb/requirements/REQ-may.md", false, "req_policy_candidate"],
    ["src/front.ts", false, "behavior_candidate"],
  ])("%s has must priority: %p", (file, must, riskClass) => {
    expect(riskLog(file).log[0]).toMatchObject({
      has_must_priority: must,
      risk_class: riskClass,
    });
  });

  test("a durable comment makes traced code a traceability candidate", () => {
    expect(riskLog("src/fact.ts").log[0]).toMatchObject({
      risk_class: "traceability_candidate",
    });
  });

  test.each([
    ["detection is off", { commentDetection: false }],
    ["the comment is too short", { minLines: 5 }],
  ])("no comment counts when %s", (_name, options) => {
    const { log, state } = riskLog("src/fact.ts", options);
    expect(log[0]).toMatchObject({ risk_class: "behavior_candidate" });
    expect(state.recentCommentSuggestion).toBeNull();
  });
});

describe("targeted checks", () => {
  function scheduled(file: string, options: Options = {}) {
    const { env, calls, info } = fakeEnv(options);
    edit(env, file);
    return {
      schedules: named(calls, "schedule"),
      log: infoFor(info, "smart-enforcement.targeted-checks"),
      info,
    };
  }

  test("untraced code gets the traceability rule", () => {
    const { schedules, log, info } = scheduled("src/untraced.ts");
    expect(schedules).toEqual([
      ["file.edited", "src/untraced.ts"],
      [
        "smart-enforcement.traceability",
        "src/untraced.ts",
        ["symbol-traceability"],
      ],
    ]);
    expect(log).toEqual([
      {
        event: "smart_enforcement_targeted_checks",
        file: "src/untraced.ts",
        risk_class: "traceability_candidate",
        posture: "root_active",
        posture_state: "root_active",
        guidance_action: "targeted_checks",
        effective_mode: "advisory",
        rules: ["symbol-traceability"],
        static_degraded: false,
        runtime_degraded: false,
        merged_degraded: false,
        overlay_cause: null,
      },
    ]);
    expect(info).toContainEqual([
      "kibi-opencode: scheduling sync for src/untraced.ts",
    ]);
  });

  test.each([
    [
      ".kb/facts/FACT-a.md",
      ["required-fields", "no-dangling-refs", "strict-fact-shape"],
    ],
    [".kb/scenarios/SCEN-a.md", ["required-fields", "no-dangling-refs"]],
  ])("%s gets the structural rules", (file, rules) => {
    expect(scheduled(file).schedules).toEqual([
      ["file.edited", file],
      ["smart-enforcement.kb-doc", file, rules],
    ]);
  });

  test("structural rules need a handled file", () => {
    expect(
      scheduled(".kb/facts/FACT-a.md", { handles: false }).schedules,
    ).toEqual([]);
  });

  test.each([
    [{ degraded: true }],
    [{ overlay: { primaryCause: "sync_disabled" as const } }],
    [{ overlay: { primaryCause: "scheduler_unavailable" as const } }],
    [{ overlay: { primaryCause: "scheduler_sync_failed" as const } }],
    [{ overlay: { primaryCause: "scheduler_check_failed" as const } }],
    [{ targetedChecks: false }],
  ])("checks are blocked with %p", (options) => {
    expect(scheduled("src/untraced.ts", options).schedules).toEqual([
      ["file.edited", "src/untraced.ts"],
    ]);
  });

  test("a non-authoritative cause does not block checks", () => {
    expect(
      scheduled("src/untraced.ts", {
        overlay: { primaryCause: "non_authoritative_posture" },
      }).schedules,
    ).toHaveLength(2);
  });

  test("checks need sync and a scheduler", () => {
    expect(
      scheduled("src/untraced.ts", { syncEnabled: false }).schedules,
    ).toEqual([]);
    expect(scheduled("src/untraced.ts", { scheduler: false }).log).toEqual([]);
  });
});

describe("selection after classification", () => {
  test.each([["README.md"], ["tests/a.test.ts"], ["src/notes.ts"]])(
    "%s is safe and clears the comment suggestion",
    (file) => {
      const { env, calls, state, info } = fakeEnv();
      edit(env, file);
      expect(state.recentCommentSuggestion).toBeNull();
      expect(named(calls, "cacheKey")).toEqual([]);
      expect(infoFor(info, "smart-enforcement.cache")).toEqual([]);
    },
  );

  test("the cache key names the file, kind and class", () => {
    const { env, calls } = fakeEnv();
    edit(env, "src/traced.ts");
    expect(named(calls, "cacheKey")).toEqual([
      [
        "behavior_candidate",
        "code",
        ["src/traced.ts", "code", "behavior_candidate"],
      ],
    ]);
    expect(named(calls, "isSatisfied")).toEqual([["key"]]);
  });

  test.each([
    [true, "hit"],
    [false, "miss"],
  ])("a cache %p is logged as %s", (cacheHit, cacheState) => {
    const { env, info } = fakeEnv({ cacheHit });
    edit(env, "src/traced.ts");
    expect(infoFor(info, "smart-enforcement.cache")).toEqual([
      {
        event: "smart_enforcement_cache",
        cache_hit: cacheHit,
        cache_state: cacheState,
        file: "src/traced.ts",
        risk_class: "behavior_candidate",
        posture: "root_active",
        posture_state: "root_active",
      },
    ]);
  });

  test("a cache hit stops before suggestions", () => {
    const { env, calls } = fakeEnv({ cacheHit: true });
    edit(env, "src/fact.ts");
    expect(named(calls, "warning")).toEqual([]);
  });

  test.each([
    [true, true],
    [false, false],
  ])("a manual .kb edit with warnings %p", (warnOnKbEdits, warned) => {
    const { env, calls, state, warn } = fakeEnv({ warnOnKbEdits });
    edit(env, ".kb/config.json");
    expect(state.hasRecentKbEdit).toBe(true);
    expect(named(calls, "isSatisfied")).toEqual([]);
    expect(named(calls, "warning")).toEqual(
      warned
        ? [["kb-edit", ".kb/config.json", "Manual .kb edit: .kb/config.json"]]
        : [],
    );
    expect(warn).toEqual(
      warned ? [["kibi-opencode: .kb edit detected for .kb/config.json"]] : [],
    );
  });

  test("requirement lint runs only for requirements, even on a cache hit", () => {
    const lint = [{ category: "req-lint", message: "m" }];
    const { env, calls } = fakeEnv({ cacheHit: true, lint });
    edit(env, ".kb/requirements/REQ-may.md");
    edit(env, "src/traced.ts");
    expect(named(calls, "lint")).toEqual([
      [".kb/requirements/REQ-may.md", root],
    ]);
    expect(named(calls, "warning")).toEqual([
      ["req-lint", ".kb/requirements/REQ-may.md", "m"],
    ]);
  });
});

describe("degraded warnings", () => {
  const payload = (riskClass: string, file: string, cause?: string) => ({
    event: "smart_enforcement_degraded",
    file,
    risk_class: riskClass,
    posture: "root_active",
    posture_state: "root_active",
    maintenance_state: "maintenance_degraded",
    reason: cause ?? "non_authoritative_posture",
    reason_code: cause ?? "non_authoritative_posture",
    static_degraded: false,
    runtime_degraded: false,
    merged_degraded: true,
    overlay_cause: cause ?? null,
    effective_mode: "advisory",
  });

  test.each([
    ["kb_doc_structural", ".kb/facts/FACT-a.md"],
    ["req_policy_candidate", ".kb/requirements/REQ-may.md"],
  ])("%s warns once in warn-once mode", (riskClass, file) => {
    const { env, warn, info } = fakeEnv({ degraded: true });
    edit(env, file);
    expect(warn).toEqual([
      ["smart-enforcement.degraded", payload(riskClass, file)],
    ]);
    expect(infoFor(info, "smart-enforcement.degraded")).toEqual([]);
  });

  test("other modes log the warning as info with its cause", () => {
    const { env, warn, info } = fakeEnv({
      degraded: true,
      degradedMode: "structured-only",
      overlay: { primaryCause: "non_authoritative_posture" },
    });
    edit(env, ".kb/facts/FACT-a.md");
    expect(warn).toEqual([]);
    expect(infoFor(info, "smart-enforcement.degraded")).toEqual([
      payload(
        "kb_doc_structural",
        ".kb/facts/FACT-a.md",
        "non_authoritative_posture",
      ),
    ]);
  });

  test("nothing is logged when maintenance is available", () => {
    const { env, warn, info } = fakeEnv();
    edit(env, ".kb/facts/FACT-a.md");
    expect(warn).toEqual([]);
    expect(infoFor(info, "smart-enforcement.degraded")).toEqual([]);
  });
});

describe("requirement checks", () => {
  function requirement(file: string, options: Options = {}) {
    const { env, calls, info } = fakeEnv(options);
    edit(env, file);
    return {
      schedules: named(calls, "schedule"),
      log: infoFor(info, "smart-enforcement.targeted-checks"),
      info,
    };
  }

  const standard = [
    "required-fields",
    "no-dangling-refs",
    "strict-req-fact-pairing",
  ];

  test("a requirement gets the standard rules", () => {
    const file = ".kb/requirements/REQ-may.md";
    const { schedules, log } = requirement(file);
    expect(schedules).toEqual([
      ["file.edited", file],
      ["file.edited", file, standard],
    ]);
    expect(log).toEqual([
      {
        event: "smart_enforcement_targeted_checks",
        file,
        risk_class: "req_policy_candidate",
        posture: "root_active",
        posture_state: "root_active",
        guidance_action: "targeted_checks",
        effective_mode: "advisory",
        rules: standard,
        static_degraded: false,
        runtime_degraded: false,
        merged_degraded: false,
        overlay_cause: null,
      },
    ]);
  });

  test("a must requirement in strict mode gets elevated rules", () => {
    const file = ".kb/requirements/REQ-must.md";
    const { schedules, info } = requirement(file, { mode: "strict" });
    expect(schedules[1]).toEqual([
      "file.edited",
      file,
      [
        "required-fields",
        "no-dangling-refs",
        "must-priority-coverage",
        "strict-req-fact-pairing",
      ],
    ]);
    expect(info).toContainEqual([
      `kibi-opencode: must-priority requirement detected, scheduling elevated checks for ${file}`,
    ]);
  });

  test.each([
    [".kb/requirements/REQ-must.md", "advisory"],
    [".kb/requirements/REQ-may.md", "strict"],
  ])("%s in %s mode gets the standard rules", (file, mode) => {
    expect(requirement(file, { mode }).schedules[1]).toEqual([
      "file.edited",
      file,
      standard,
    ]);
  });

  test("without targeted checks the sync has no rules", () => {
    const file = ".kb/requirements/REQ-may.md";
    const { schedules, log } = requirement(file, { targetedChecks: false });
    expect(schedules).toEqual([
      ["file.edited", file],
      ["file.edited", file, undefined],
    ]);
    expect(log[0]).toMatchObject({ rules: [] });
  });

  test.each([
    [{ degraded: true }],
    [{ syncEnabled: false }],
    [{ scheduler: false }],
    [{ handles: false }],
  ])("no requirement checks with %p", (options) => {
    const { log } = requirement(".kb/requirements/REQ-may.md", options);
    expect(log).toEqual([]);
  });
});

describe("comment suggestions", () => {
  test.each([
    ["src/fact.ts", "fact", "long-comment-missed-fact"],
    ["src/adr.ts", "adr", "long-comment-missed-adr"],
    ["src/req.ts", "req", "missing-traceability"],
  ])("%s suggests %s once", (file, type, category) => {
    const { env, calls, warn, state } = fakeEnv();
    edit(env, file);
    edit(env, file);
    expect(state.recentCommentSuggestion?.suggestionType).toBe(type);
    const warnings = named(calls, "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.slice(0, 2)).toEqual([category, file]);
    expect(String(warnings[0]?.[2])).toBe(
      `Consider routing this ${type} knowledge to Kibi instead of inline comments: ${state.recentCommentSuggestion?.reasoning}`,
    );
    expect(warn).toEqual([
      [`kibi-opencode: detected durable ${type} knowledge in ${file}`],
    ]);
    expect([...state.seenFingerprints][0]).toBe(
      `scope:${file}:${type}:${state.recentCommentSuggestion?.fingerprint}`,
    );
  });

  test("the same comment in another file is suggested again", () => {
    const { env, calls } = fakeEnv();
    edit(env, "src/fact.ts");
    edit(env, "src/fact-two.ts");
    expect(named(calls, "warning")).toHaveLength(2);
  });

  test("code without a durable comment clears the suggestion", () => {
    const { env, state, calls } = fakeEnv();
    edit(env, "src/short.ts");
    expect(state.recentCommentSuggestion).toBeNull();
    expect(named(calls, "warning")).toEqual([]);
  });
});
