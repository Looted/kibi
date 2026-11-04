import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  type EvaluatedRun,
  PROVE_PROGRESS_FILE,
  attachCertificates,
  buildCommandRunArtifacts,
  commandEnvironment,
  describeWorkspaceDrift,
  narrowedPlaywrightCommand,
  parseIntegrationSelector,
  partitionArtifactPath,
  proveCommand,
  readCertificateDir,
  readCommandAttribution,
  readProveProgress,
  readTestReceiptStates,
  resumableIntegrations,
  runChild,
  testId,
} from "../../src/commands/prove.js";
import type { IngestProofResult } from "../../src/operations/proof/ingest-proof.js";
import {
  type ProofRunAttribution,
  attributeCommandRun,
} from "../../src/proof/command-test-report.js";
import type { ProofIntegration } from "../../src/proof/integrations.js";
import * as integrationsModule from "../../src/proof/integrations.js";
import * as junitAdapter from "../../src/proof/producers/junit-adapter.js";
import * as tapAdapter from "../../src/proof/producers/tap-adapter.js";
import * as discovery from "../../src/public/operations/discovery-entities.js";
import * as prologJson from "../../src/public/operations/prolog-json.js";
import type {
  OperationContext,
  OperationRuntime,
} from "../../src/public/operations/runtime-types.js";
import * as reporting from "../../src/public/operations/specs/reporting.js";
import {
  PROOF_INTEGRATION_VERSION,
  PROOF_RUN_VERSION,
  type ProofRunArtifact,
  proofRunArtifactErrors,
} from "../../src/public/proof-protocol.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";
import * as telemetry from "../../src/usage-telemetry.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

// `kibi prove` against a scripted runtime: its pure helpers, the producer
// process wrapper, and the command's selection, evidence and summary paths.

let restores: Array<() => void>;
let root: string;

beforeEach(() => {
  restores = [];
  root = createTempDir("kibi-prove-mut-");
});

afterEach(() => {
  for (const restore of restores.reverse()) restore();
  removeTempDir(root);
});

const SNAPSHOT = "a".repeat(64);

type Change = {
  path: string;
  status: string;
  snapshotRelevant: boolean;
};

function snapshotWith(changes: Change[] | undefined) {
  return {
    available: true as const,
    snapshot: {
      version: "kibi.workspace-snapshot.v2",
      hash: SNAPSHOT,
      dirty: true,
      fileCount: 1,
      ...(changes === undefined ? {} : { changes }),
    },
  } as never;
}

describe("workspace drift", () => {
  test("names an unavailable snapshot", () => {
    expect(
      describeWorkspaceDrift({ available: false, error: "x" } as never),
    ).toBe(" (workspace snapshot unavailable)");
  });

  test("explains a drift git does not show", () => {
    const quiet =
      " (git reported no workspace changes; the hash drift may come from file content that git treats as unchanged)";
    expect(describeWorkspaceDrift(snapshotWith(undefined))).toBe(quiet);
    expect(describeWorkspaceDrift(snapshotWith([]))).toBe(quiet);
  });

  test("lists relevant changes first and defaults the status", () => {
    expect(
      describeWorkspaceDrift(
        snapshotWith([
          { path: "ignored.md", status: "M", snapshotRelevant: false },
          { path: "a.ts", status: " A ", snapshotRelevant: true },
          { path: "b.ts", status: "  ", snapshotRelevant: true },
        ]),
      ),
    ).toBe("; changed: A a.ts, M b.ts");
  });

  test("falls back to receipt-only changes", () => {
    expect(
      describeWorkspaceDrift(
        snapshotWith([{ path: "r.md", status: "D", snapshotRelevant: false }]),
      ),
    ).toBe("; changed: D r.md");
  });

  test("caps the list at ten paths", () => {
    const changes = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        path: `f${index}`,
        status: "M",
        snapshotRelevant: true,
      }));
    const ten = Array.from({ length: 10 }, (_, index) => `M f${index}`);
    expect(describeWorkspaceDrift(snapshotWith(changes(10)))).toBe(
      `; changed: ${ten.join(", ")}`,
    );
    expect(describeWorkspaceDrift(snapshotWith(changes(12)))).toBe(
      `; changed: ${ten.join(", ")} (+2 more)`,
    );
  });
});

describe("integration selectors", () => {
  test("reads a comma-separated list", () => {
    expect(parseIntegrationSelector(undefined, "--x")).toEqual(new Set());
    expect(parseIntegrationSelector("  ", "--x")).toEqual(new Set());
    expect(parseIntegrationSelector(" a, b ,a", "--x")).toEqual(
      new Set(["a", "b"]),
    );
  });

  test("refuses a blank item", () => {
    expect(() => parseIntegrationSelector("a, ,b", "--flag")).toThrow(
      /^prove: --flag contains an empty integration id$/,
    );
  });

  test("names a test by its id", () => {
    expect(testId({ id: 5 })).toBe("5");
  });
});

describe("producer process", () => {
  test("refuses an empty command", async () => {
    await expect(runChild([], root, process.env)).rejects.toThrow(
      /^prove: integration command argv must be non-empty$/,
    );
  });

  test("runs in the workspace with the given environment", async () => {
    const out = path.join(root, "out.txt");
    const code = await runChild(
      [
        process.execPath,
        "-e",
        `require("node:fs").writeFileSync(${JSON.stringify(out)}, process.cwd() + "|" + process.env.PROVE_MUT); process.exit(3)`,
      ],
      root,
      { ...process.env, PROVE_MUT: "yes" },
    );
    expect(code).toBe(3);
    expect(readFileSync(out).toString()).toBe(`${root}|yes`);
  });

  test("reports a signalled producer as exit 1 and removes its handlers", async () => {
    const before = ["SIGINT", "SIGTERM", "SIGHUP"].map((signal) =>
      process.listenerCount(signal),
    );
    const code = await runChild(
      [process.execPath, "-e", "process.kill(process.pid, 'SIGKILL')"],
      root,
      process.env,
    );
    expect(code).toBe(1);
    expect(
      ["SIGINT", "SIGTERM", "SIGHUP"].map((signal) =>
        process.listenerCount(signal),
      ),
    ).toEqual(before);
  });

  test("rejects when the command cannot start", async () => {
    const before = process.listenerCount("SIGINT");
    await expect(
      runChild(["kibi-no-such-command-xyz"], root, process.env),
    ).rejects.toThrow();
    expect(process.listenerCount("SIGINT")).toBe(before);
  });

  test("removes its signal handlers when the producer cannot start", async () => {
    const signals = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
    const before = signals.map((signal) => process.listenerCount(signal));
    const spawn = spyOn(childProcess, "spawn").mockImplementation((() => {
      const child = Object.assign(new EventEmitter(), { pid: 1 });
      queueMicrotask(() => child.emit("error", new Error("no such file")));
      return child;
    }) as never);
    restores.push(() => spawn.mockRestore());
    await expect(runChild(["run"], root, {})).rejects.toThrow("no such file");
    expect(signals.map((signal) => process.listenerCount(signal))).toEqual(
      before,
    );
  });

  test("starts the producer in its own process group", async () => {
    const spawn = spyOn(childProcess, "spawn").mockImplementation(((
      command: string,
      args: string[],
      options: Record<string, unknown>,
    ) => {
      const child = new EventEmitter() as EventEmitter & { pid: number };
      child.pid = 4242;
      queueMicrotask(() => child.emit("close", 0));
      expect([command, args, options]).toEqual([
        "run",
        ["a", "b"],
        {
          cwd: root,
          env: { X: "1" },
          shell: false,
          stdio: "inherit",
          detached: process.platform !== "win32",
        },
      ]);
      return child;
    }) as never);
    restores.push(() => spawn.mockRestore());
    expect(await runChild(["run", "a", "b"], root, { X: "1" })).toBe(0);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["SIGINT", 130],
    ["SIGTERM", 143],
    ["SIGHUP", 143],
  ] as const)("forwards %s to the producer group", async (signal, status) => {
    const kills: unknown[][] = [];
    const exits: unknown[] = [];
    let child!: EventEmitter & { pid: number; kill: (s: string) => void };
    const spawn = spyOn(childProcess, "spawn").mockImplementation((() => {
      child = Object.assign(new EventEmitter(), {
        pid: 4242,
        kill: (s: string) => kills.push(["child", s]),
      });
      return child;
    }) as never);
    const kill = spyOn(process, "kill").mockImplementation(((
      pid: number,
      s: string,
    ) => {
      kills.push([pid, s]);
      return true;
    }) as never);
    const exit = spyOn(process, "exit").mockImplementation(((code: number) => {
      exits.push(code);
    }) as never);
    restores.push(
      () => spawn.mockRestore(),
      () => kill.mockRestore(),
      () => exit.mockRestore(),
    );
    const running = runChild(["run"], root, {});
    process.emit(signal, signal);
    child.emit("close", 7);
    expect(await running).toBe(7);
    expect(kills).toEqual([[-4242, signal]]);
    expect(exits).toEqual([status]);
  });

  test("ignores a producer that already exited", async () => {
    const exits: unknown[] = [];
    let child!: EventEmitter & { pid: number };
    const spawn = spyOn(childProcess, "spawn").mockImplementation((() => {
      child = Object.assign(new EventEmitter(), { pid: 4242 });
      return child;
    }) as never);
    const kill = spyOn(process, "kill").mockImplementation((() => {
      throw new Error("ESRCH");
    }) as never);
    const exit = spyOn(process, "exit").mockImplementation(((code: number) => {
      exits.push(code);
    }) as never);
    restores.push(
      () => spawn.mockRestore(),
      () => kill.mockRestore(),
      () => exit.mockRestore(),
    );
    const running = runChild(["run"], root, {});
    process.emit("SIGTERM", "SIGTERM");
    child.emit("close", null);
    expect(await running).toBe(1);
    expect(exits).toEqual([143]);
  });

  test("signals the child itself without a process group", async () => {
    const kills: unknown[][] = [];
    let child!: EventEmitter;
    const platform = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { value: "win32" });
    restores.push(() =>
      Object.defineProperty(
        process,
        "platform",
        platform as PropertyDescriptor,
      ),
    );
    const spawn = spyOn(childProcess, "spawn").mockImplementation(((
      _command: string,
      _args: string[],
      options: { detached: boolean },
    ) => {
      child = Object.assign(new EventEmitter(), {
        pid: 4242,
        kill: (s: string) => kills.push(["child", s, options.detached]),
      });
      return child;
    }) as never);
    const kill = spyOn(process, "kill").mockImplementation(((
      pid: number,
      s: string,
    ) => {
      kills.push([pid, s]);
      return true;
    }) as never);
    const exit = spyOn(process, "exit").mockImplementation((() => {}) as never);
    restores.push(
      () => spawn.mockRestore(),
      () => kill.mockRestore(),
      () => exit.mockRestore(),
    );
    const running = runChild(["run"], root, {});
    process.emit("SIGINT", "SIGINT");
    child.emit("close", 0);
    await running;
    expect(kills).toEqual([["child", "SIGINT", false]]);
  });

  test("signals the child itself when it has no pid", async () => {
    const kills: unknown[][] = [];
    let child!: EventEmitter;
    const spawn = spyOn(childProcess, "spawn").mockImplementation((() => {
      child = Object.assign(new EventEmitter(), {
        pid: undefined,
        kill: (s: string) => kills.push(["child", s]),
      });
      return child;
    }) as never);
    const exit = spyOn(process, "exit").mockImplementation((() => {}) as never);
    restores.push(
      () => spawn.mockRestore(),
      () => exit.mockRestore(),
    );
    const running = runChild(["run"], root, {});
    process.emit("SIGHUP", "SIGHUP");
    child.emit("close", 0);
    await running;
    expect(kills).toEqual([["child", "SIGHUP"]]);
  });
});

describe("producer environment", () => {
  test("adds the proof run variables to the process environment", () => {
    const env = commandEnvironment(
      { id: "web", producer: "command", command: [] },
      ["a", "b"],
      SNAPSHOT,
      "/ws",
      ["T-1", "T-2"],
      "/ws/out.json",
    );
    expect(env.PATH).toBe(process.env.PATH);
    expect(
      Object.fromEntries(
        Object.entries(env).filter(([key]) => key.startsWith("KIBI_PROOF_")),
      ),
    ).toEqual({
      KIBI_PROOF_RUN: "1",
      KIBI_PROOF_OUTPUT: "/ws/out.json",
      KIBI_PROOF_SNAPSHOT: SNAPSHOT,
      KIBI_PROOF_COMMAND_ARGV: '["a","b"]',
      KIBI_PROOF_INTEGRATION: "web",
      KIBI_PROOF_WORKSPACE: "/ws",
      KIBI_PROOF_TEST_IDS: '["T-1","T-2"]',
    });
  });
});

describe("progress", () => {
  const write = (body: unknown) =>
    writeFileSync(
      path.join(root, PROVE_PROGRESS_FILE),
      typeof body === "string" ? body : JSON.stringify(body),
    );
  const valid = {
    version: "kibi.prove-progress.v1",
    snapshot: "s",
    ingested: { web: ["T-1"] },
  };

  test("reads a valid record", async () => {
    expect(PROVE_PROGRESS_FILE).toBe("prove-progress.json");
    write(valid);
    expect(await readProveProgress(root)).toEqual(valid as never);
  });

  test.each([
    ["missing", undefined],
    ["unparsable", "{"],
    ["another version", { ...valid, version: "v0" }],
    ["a non-string snapshot", { ...valid, snapshot: 1 }],
    ["a null inventory", { ...valid, ingested: null }],
    ["a scalar inventory", { ...valid, ingested: "web" }],
  ])("treats a %s record as no progress", async (_label, body) => {
    if (body !== undefined) write(body);
    expect(await readProveProgress(root)).toBeNull();
  });

  test("resumes only integrations done for every selected test", () => {
    const progress = {
      version: "kibi.prove-progress.v1" as const,
      snapshot: "s",
      ingested: { done: ["T-1", "T-2"], partial: ["T-1"], empty: [] },
    };
    const groups = new Map([
      ["done", [{ id: "T-1" }, { id: "T-2" }]],
      ["partial", [{ id: "T-1" }, { id: "T-3" }]],
      ["empty", []],
      ["absent", [{ id: "T-1" }]],
      ["none", []],
    ]);
    expect(resumableIntegrations(progress, "s", groups)).toEqual(
      new Set(["done"]),
    );
    expect(resumableIntegrations(progress, "other", groups)).toEqual(new Set());
    expect(resumableIntegrations(null, "s", groups)).toEqual(new Set());
  });
});

describe("playwright narrowing", () => {
  const bound = (id: string, ...files: unknown[]) => ({
    id,
    proof_bindings: files.map((file) =>
      file === null || typeof file !== "object" ? { source_file: file } : file,
    ),
  });

  test.each([
    [["playwright", "test"]],
    [["npx", "node_modules/.bin/playwright", "test"]],
    [["C:\\bin\\playwright.cjs", "test"]],
    [["/bin/playwright.js", "test", "--x"]],
  ])("narrows %p to the bound spec files", (command) => {
    expect(
      narrowedPlaywrightCommand(command, [
        bound("T-1", "b.spec.ts", "a.spec.ts"),
        bound("T-2", "a.spec.ts"),
      ]),
    ).toEqual({
      argv: [...command, "a.spec.ts", "b.spec.ts"],
      narrowed: true,
    });
  });

  test.each([
    [["myplaywright", "test"]],
    [["playwright", "show-report"]],
    [["playwright.mjs", "test"]],
    [["playwright"]],
  ])("leaves %p unchanged", (command) => {
    expect(narrowedPlaywrightCommand(command, [bound("T-1", "a.ts")])).toEqual({
      argv: command,
      narrowed: false,
      reason:
        "the command is not a direct `playwright test` invocation; narrow it from KIBI_PROOF_SOURCE_FILES",
    });
  });

  test.each([
    ["no bindings", { id: "T-2" }],
    ["unbound entries", bound("T-2", "", 5, null, { other: 1 })],
    ["a scalar binding list", { id: "T-2", proof_bindings: "a.ts" }],
    ["a null entry", { id: "T-2", proof_bindings: [null] }],
  ])("runs everything when a test has %s", (_label, test) => {
    expect(
      narrowedPlaywrightCommand(
        ["playwright", "test"],
        [bound("T-1", "a.ts"), test],
      ),
    ).toEqual({
      argv: ["playwright", "test"],
      narrowed: false,
      reason: "test T-2 has no proof_bindings[].source_file",
    });
  });

  test("does not change the given command", () => {
    const command = ["playwright", "test"];
    narrowedPlaywrightCommand(command, [bound("T-1", "a.ts")]);
    expect(command).toEqual(["playwright", "test"]);
  });
});

describe("receipt states", () => {
  function context(): OperationContext {
    return {
      workspaceRoot: root,
      signal: new AbortController().signal,
      clock: () => new Date("2026-08-13T00:00:00Z"),
      prolog: { query: async () => ({ success: true, bindings: {} }) },
    } as unknown as OperationContext;
  }

  function spyQuery(payload: unknown) {
    const goals: string[] = [];
    const query = spyOn(prologJson, "runOperationJsonQuery").mockImplementation(
      (async (_prolog: unknown, file: string, goal: string, label: string) => {
        goals.push(`${file}|${goal}|${label}`);
        return payload;
      }) as never,
    );
    restores.push(() => query.mockRestore());
    return goals;
  }

  test("asks for per-contract states at the current snapshot", async () => {
    const bindings = spyOn(
      reporting,
      "perContractTestBindings",
    ).mockImplementation((async () => "_{t:1}") as never);
    const mode = spyOn(reporting, "currentProofBindingMode").mockImplementation(
      (() => "legacy_mode") as never,
    );
    restores.push(
      () => bindings.mockRestore(),
      () => mode.mockRestore(),
    );
    const goals = spyQuery({ states: { "T-1": "passed", "T-2": "stale" } });
    const ctx = {
      ...context(),
      git: {
        workspaceSnapshot: async () => ({ hash: "abc" }),
      },
    } as unknown as OperationContext;
    expect(await readTestReceiptStates(ctx)).toEqual(
      new Map([
        ["T-1", "passed"],
        ["T-2", "stale"],
      ]),
    );
    expect(goals).toEqual([
      "discovery.pl|discovery:test_receipt_states_json(per_contract, _{t:1}, 'abc', '2026-08-13T00:00:00.000Z', 604800, JsonString)|prove --stale",
    ]);
  });

  test("falls back to the current binding mode without a snapshot", async () => {
    const bindings = spyOn(
      reporting,
      "perContractTestBindings",
    ).mockImplementation((async () => null) as never);
    const mode = spyOn(reporting, "currentProofBindingMode").mockImplementation(
      (() => "legacy_mode") as never,
    );
    restores.push(
      () => bindings.mockRestore(),
      () => mode.mockRestore(),
    );
    const goals = spyQuery({});
    expect(await readTestReceiptStates(context())).toEqual(new Map());
    expect(goals).toEqual([
      "discovery.pl|discovery:test_receipt_states_json(legacy_mode, _{}, 'unknown', '2026-08-13T00:00:00.000Z', 604800, JsonString)|prove --stale",
    ]);
  });
});

describe("certificates", () => {
  test("reads the JSON certificates of a run in name order", async () => {
    expect(await readCertificateDir(path.join(root, "missing"))).toEqual([]);
    for (const name of ["m", "z", "a", "q", "b"])
      writeFileSync(path.join(root, `${name}.json`), `{"test_id":"${name}"}`);
    writeFileSync(path.join(root, "notes.txt"), "{");
    expect(await readCertificateDir(root)).toEqual(
      ["a", "b", "m", "q", "z"].map((name) => ({ test_id: name })),
    );
  });

  test.each([
    ["{", "certificate c.json is not valid JSON"],
    ["[1]", "certificate c.json is not a JSON object"],
    ["null", "certificate c.json is not a JSON object"],
    ["3", "certificate c.json is not a JSON object"],
  ])("refuses %p", async (body, message) => {
    writeFileSync(path.join(root, "c.json"), body);
    await expect(readCertificateDir(root)).rejects.toThrow(
      new RegExp(`^${message.replaceAll(".", "\\.")}$`),
    );
  });

  const artifact = (name: string, certificates?: unknown[]) =>
    ({
      name,
      ...(certificates === undefined ? {} : { certificates }),
    }) as unknown as ProofRunArtifact;

  test("returns the run unchanged without certificates", () => {
    const run: EvaluatedRun = { artifacts: [] };
    expect(attachCertificates(run, [])).toBe(run);
  });

  test("gives each artifact its own tests' certificates", () => {
    const run: EvaluatedRun = {
      artifacts: [
        { artifact: artifact("one", [{ old: 1 }]), testIds: ["A"] },
        { artifact: artifact("two"), testIds: ["B", "C"] },
        { artifact: artifact("three"), testIds: ["D"] },
      ],
      wholeRun: artifact("whole"),
      attribution: { attribution: "per_test", partitions: [], failedSteps: [] },
    };
    const certificates = [{ test_id: "A" }, { test_id: "C" }, {}];
    expect(attachCertificates(run, certificates)).toEqual({
      artifacts: [
        {
          artifact: artifact("one", [{ old: 1 }, { test_id: "A" }]),
          testIds: ["A"],
        },
        { artifact: artifact("two", [{ test_id: "C" }]), testIds: ["B", "C"] },
        { artifact: artifact("three"), testIds: ["D"] },
      ],
      wholeRun: artifact("whole", [{ test_id: "A" }, { test_id: "C" }]),
      attribution: { attribution: "per_test", partitions: [], failedSteps: [] },
    });
  });

  test("keeps a run without a whole-run artifact without one", () => {
    const attached = attachCertificates(
      { artifacts: [{ artifact: artifact("one"), testIds: ["A"] }] },
      [{ test_id: "A" }],
    );
    expect("wholeRun" in attached).toBe(false);
  });

  test.each([
    [[{ test_id: "A" }, { test_id: "A" }], "A"],
    [[{}, { test_id: null }], ""],
  ])("refuses two certificates for one test", (certificates, id) => {
    expect(() =>
      attachCertificates({ artifacts: [] }, certificates as never),
    ).toThrow(new RegExp(`^the run left more than one certificate for ${id}$`));
  });
});

describe("command attribution", () => {
  test("attributes a run without a report as one unit", async () => {
    expect(
      await readCommandAttribution(path.join(root, "none.json"), ["T-1"], 2),
    ).toEqual(
      attributeCommandRun({
        selectedTestIds: ["T-1"],
        exitCode: 2,
        report: undefined,
      }),
    );
  });

  test("names an unparsable report", async () => {
    const file = path.join(root, "r.json");
    writeFileSync(file, "{");
    const attribution = await readCommandAttribution(file, ["T-1"], 0);
    expect(attribution.attribution).toBe("aggregate");
    expect(attribution.failedSteps).toEqual([]);
    expect((attribution as { reason: string }).reason).toMatch(
      /^the kibi\.proof-test-report\.v1 is not valid JSON \(.+\), so the run is evaluated as one unit$/,
    );
  });

  test("attributes a parsed report", async () => {
    const file = path.join(root, "r.json");
    const report = { version: "kibi.proof-test-report.v1", tests: [] };
    writeFileSync(file, JSON.stringify(report));
    expect(await readCommandAttribution(file, ["T-1"], 0)).toEqual(
      attributeCommandRun({ selectedTestIds: ["T-1"], exitCode: 0, report }),
    );
  });

  test("keeps partition artifacts beside the run artifact", () => {
    expect(partitionArtifactPath("/r/web.json", "failed")).toBe(
      "/r/web.failed.json",
    );
    expect(partitionArtifactPath("/r/web", "passed")).toBe(
      "/r/web.passed.json",
    );
  });
});

const contractFor = (integration: string, ...symbols: string[]) => ({
  version: "kibi.proof-contract.v1",
  integration,
  required_proofs: symbols.map((symbol) => ({
    symbol_id: symbol,
    target: "default",
  })),
  success_policy: "all_required_first_attempt",
});

const environment = {
  os: process.platform,
  arch: process.arch,
  runtime: { name: "node", version: process.version },
};

describe("command run artifacts", () => {
  const integration: ProofIntegration = {
    id: "cmd",
    producer: "command",
    command: ["run"],
  };
  const tests = [
    { id: "T-1", proof_contract: contractFor("cmd", "S-1", "S-2") },
    { id: "T-2", proof_contract: contractFor("cmd", "S-1") },
    { id: "T-3", proof_contract: [] },
  ];
  const input = (
    attribution: ProofRunAttribution,
    exitCode: number,
    extra: Partial<ProofIntegration> = {},
  ) => ({
    integration: { ...integration, ...extra },
    commandArgv: ["run", "x"],
    exitCode,
    startedAt: "s",
    finishedAt: "f",
    snapshot: SNAPSHOT,
    tests,
    attribution,
  });
  const result = (symbol: string, outcome: string) => ({
    symbol_id: symbol,
    target: "default",
    outcome,
    binding: "aggregate_run",
    attempts: { status: "unavailable" },
  });
  const header = {
    version: PROOF_RUN_VERSION,
    producer: { name: "kibi-command-producer" },
    integration: "cmd",
    command_argv: ["run", "x"],
    code_snapshot: SNAPSHOT,
    environment,
  };
  const step = {
    testId: "T-1",
    stepIndex: 2,
    command: ["npm", "test"],
    outcome: "failed",
    exitCode: 3,
  };

  test("a passing unattributed run passes every obligation once", () => {
    expect(
      buildCommandRunArtifacts(
        input(
          { attribution: "aggregate", reason: "no report", failedSteps: [] },
          0,
          { producer_version: "2.0" },
        ),
      ),
    ).toEqual({
      artifacts: [
        {
          artifact: {
            ...header,
            producer: { name: "kibi-command-producer", version: "2.0" },
            run: {
              outcome: "passed",
              exit_code: 0,
              started_at: "s",
              finished_at: "f",
            },
            proof_results: [result("S-1", "passed"), result("S-2", "passed")],
          },
          testIds: ["T-1", "T-2", "T-3"],
        },
      ],
      attribution: {
        attribution: "aggregate",
        reason: "no report",
        failedSteps: [],
      },
    } as never);
  });

  test("a failing unattributed run fails every obligation and says why", () => {
    const run = buildCommandRunArtifacts(
      input(
        {
          attribution: "aggregate",
          reason: "no report",
          failedSteps: [
            step,
            { ...step, exitCode: null, outcome: "timed_out" },
          ],
        },
        2,
      ),
    );
    expect(run.artifacts[0]?.artifact).toStrictEqual({
      ...header,
      run: {
        outcome: "failed",
        exit_code: 2,
        started_at: "s",
        finished_at: "f",
      },
      proof_results: [result("S-1", "failed"), result("S-2", "failed")],
      diagnostics: [
        "no report",
        "T-1 step 2 failed (exit 3): npm test",
        "T-1 step 2 timed_out: npm test",
      ],
    } as never);
  });

  test("an attributed run is split by outcome and kept whole", () => {
    const run = buildCommandRunArtifacts(
      input(
        {
          attribution: "per_test",
          partitions: [
            {
              outcome: "passed",
              testIds: ["T-2"],
              exitCode: 0,
              failedSteps: [],
            },
            {
              outcome: "failed",
              testIds: ["T-1", "T-3"],
              exitCode: 3,
              failedSteps: [step],
            },
          ],
          failedSteps: [step],
        },
        1,
      ),
    );
    expect(run).toStrictEqual({
      artifacts: [
        {
          artifact: {
            ...header,
            run: {
              outcome: "passed",
              exit_code: 0,
              started_at: "s",
              finished_at: "f",
            },
            proof_results: [result("S-1", "passed")],
            diagnostics: [
              "per-test attribution: 1 of 3 selected test(s) whose own steps all passed; the integration process exited 1",
            ],
          },
          testIds: ["T-2"],
        },
        {
          artifact: {
            ...header,
            run: {
              outcome: "failed",
              exit_code: 3,
              started_at: "s",
              finished_at: "f",
              failure_phase: "execution",
            },
            proof_results: [result("S-1", "failed"), result("S-2", "failed")],
            diagnostics: [
              "per-test attribution: 2 of 3 selected test(s) whose own steps ended failed; the integration process exited 1",
              "T-1 step 2 failed (exit 3): npm test",
            ],
          },
          testIds: ["T-1", "T-3"],
        },
      ],
      wholeRun: {
        ...header,
        run: {
          outcome: "failed",
          exit_code: 1,
          started_at: "s",
          finished_at: "f",
        },
        proof_results: [result("S-1", "failed"), result("S-2", "failed")],
        diagnostics: [
          "evaluated per test: 1 passed, 2 failed",
          "T-1 step 2 failed (exit 3): npm test",
        ],
      },
      attribution: expect.objectContaining({ attribution: "per_test" }),
    } as never);
  });

  test("an attributed passing run keeps a passing whole run", () => {
    const run = buildCommandRunArtifacts(
      input(
        {
          attribution: "per_test",
          partitions: [
            {
              outcome: "passed",
              testIds: ["T-1", "T-2", "T-3"],
              exitCode: 0,
              failedSteps: [],
            },
          ],
          failedSteps: [],
        },
        0,
      ),
    );
    expect(run.wholeRun?.run.outcome).toBe("passed");
    expect(run.wholeRun?.proof_results).toEqual([
      result("S-1", "passed"),
      result("S-2", "passed"),
    ] as never);
    expect(run.wholeRun?.diagnostics).toEqual(["evaluated per test: 3 passed"]);
  });
});

// --- proveCommand against a scripted runtime -------------------------------

type ChildScript = (
  argv: string[],
  options: { cwd: string; env: Record<string, string | undefined> },
) => number | null | Error;

interface Harness {
  stdout: string[];
  stderr: string[];
  spawns: Array<{
    argv: string[];
    cwd: string;
    env: Record<string, string | undefined>;
  }>;
  ingests: Array<{
    snapshot: string;
    artifact: Record<string, unknown>;
    testIds: readonly string[];
  }>;
  closes: unknown[];
  afterSuccess: number;
  opens: unknown[];
  categories: unknown[];
  loads: unknown[];
  summary: () => Record<string, unknown>;
  runtime: OperationRuntime;
  context: OperationContext;
}

function harness(options: {
  integrations?: Array<Record<string, unknown>> | { error: string };
  tests?: Array<Record<string, unknown>>;
  snapshots?: Array<string | Error>;
  child?: ChildScript;
  ingest?: (call: {
    artifact: Record<string, unknown>;
    testIds: readonly string[];
  }) => Partial<IngestProofResult>;
  query?: (goal: string) => {
    success: boolean;
    bindings: Record<string, unknown>;
  };
}): Harness {
  const h = {
    stdout: [] as string[],
    stderr: [] as string[],
    spawns: [] as Harness["spawns"],
    ingests: [] as Harness["ingests"],
    closes: [] as unknown[],
    afterSuccess: 0,
    opens: [] as unknown[],
    categories: [] as unknown[],
    loads: [] as unknown[],
  };
  const integrations = options.integrations ?? [];
  const load = spyOn(
    integrationsModule,
    "loadProofIntegrations",
  ).mockImplementation((() =>
    Array.isArray(integrations)
      ? {
          available: true,
          integrations: { version: PROOF_INTEGRATION_VERSION, integrations },
        }
      : { available: false, error: integrations.error }) as never);
  const entities = spyOn(discovery, "loadEntities").mockImplementation((async (
    _prolog: unknown,
    input: { id?: string },
  ) => {
    h.loads.push(input);
    const all = options.tests ?? [];
    return input.id === undefined
      ? all
      : all.filter((test) => test.id === input.id);
  }) as never);
  const spawn = spyOn(childProcess, "spawn").mockImplementation(((
    command: string,
    args: string[],
    spawnOptions: { cwd: string; env: Record<string, string | undefined> },
  ) => {
    const argv = [command, ...args];
    h.spawns.push({ argv, cwd: spawnOptions.cwd, env: spawnOptions.env });
    const child = Object.assign(new EventEmitter(), { pid: 1 });
    const outcome = (options.child ?? (() => 0))(argv, spawnOptions);
    queueMicrotask(() =>
      outcome instanceof Error
        ? child.emit("error", outcome)
        : child.emit("close", outcome),
    );
    return child;
  }) as never);
  const out = spyOn(process.stdout, "write").mockImplementation(((
    chunk: string,
  ) => {
    h.stdout.push(String(chunk));
    return true;
  }) as never);
  const err = spyOn(process.stderr, "write").mockImplementation(((
    chunk: string,
  ) => {
    h.stderr.push(String(chunk));
    return true;
  }) as never);
  const note = spyOn(telemetry, "noteCliErrorCategory").mockImplementation(((
    category: unknown,
  ) => {
    h.categories.push(category);
  }) as never);
  const packKey = process.env.KIBI_E2E_PACK_CACHE_KEY;
  restores.push(
    () => load.mockRestore(),
    () => entities.mockRestore(),
    () => spawn.mockRestore(),
    () => out.mockRestore(),
    () => err.mockRestore(),
    () => note.mockRestore(),
    () => {
      if (packKey === undefined) delete process.env.KIBI_E2E_PACK_CACHE_KEY;
      else process.env.KIBI_E2E_PACK_CACHE_KEY = packKey;
    },
  );
  const snapshots = options.snapshots ?? [SNAPSHOT];
  let snapshotIndex = 0;
  const context = {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog: {
      query: async (goal: string) =>
        options.query?.(goal) ?? { success: false, bindings: {} },
    },
    git: {
      workspaceSnapshot: async () => {
        const next =
          snapshots[Math.min(snapshotIndex, snapshots.length - 1)] ?? SNAPSHOT;
        snapshotIndex += 1;
        if (next instanceof Error) throw next;
        return {
          version: "kibi.workspace-snapshot.v2",
          hash: next,
          dirty: false,
          fileCount: 1,
        };
      },
    },
  } as unknown as OperationContext;
  const runtime: OperationRuntime = {
    open: async (...args: unknown[]) => {
      h.opens.push(args[1]);
      return context;
    },
    afterSuccess: async () => {
      h.afterSuccess += 1;
    },
    close: async (_context: unknown, status: unknown) => {
      h.closes.push(status);
    },
  } as unknown as OperationRuntime;
  return Object.assign(h, {
    runtime,
    context,
    summary: () =>
      JSON.parse(h.stdout.join("").trim().split("\n").at(-1) ?? "{}"),
  });
}

type IngestCall = {
  snapshot: string;
  artifact: Record<string, unknown>;
  testIds: readonly string[];
};

function ingestWith(
  h: Harness,
  result: (call: IngestCall) => Partial<IngestProofResult> = () => ({}),
) {
  return async (input: IngestCall) => {
    h.ingests.push(input);
    return {
      content: [],
      structuredContent: {
        artifactDigest: "d",
        environmentHash: "e",
        integration: String(input.artifact.integration),
        passed: input.testIds.length,
        failed: 0,
        unchanged: 0,
        results: [],
        ...result(input),
      },
    };
  };
}

const proofTest = (
  id: string,
  integration: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  proof_contract: contractFor(integration, `SYM-${id}`),
  ...extra,
});

// A self-emitting producer writes a passing artifact for its tests.
const emits =
  (outcome = "passed", code = 0): ChildScript =>
  (_argv, { env }) => {
    const output = String(env.KIBI_PROOF_OUTPUT);
    const testIds = JSON.parse(String(env.KIBI_PROOF_TEST_IDS)) as string[];
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(
      output,
      JSON.stringify({
        version: PROOF_RUN_VERSION,
        producer: { name: "own" },
        integration: env.KIBI_PROOF_INTEGRATION,
        command_argv: JSON.parse(String(env.KIBI_PROOF_COMMAND_ARGV)),
        code_snapshot: env.KIBI_PROOF_SNAPSHOT,
        environment,
        run: {
          outcome,
          exit_code: code,
          started_at: "2026-08-13T00:00:00Z",
          finished_at: "2026-08-13T00:00:01Z",
          ...(outcome === "passed" ? {} : { failure_phase: "execution" }),
        },
        proof_results: testIds.map((id) => ({
          symbol_id: `SYM-${id}`,
          target: "default",
          outcome,
          binding: "native_case",
          attempts: { status: "unavailable" },
        })),
      }),
    );
    return code;
  };

const web = {
  id: "web",
  producer: "playwright",
  command: ["playwright", "test"],
};
const packKey = () => process.env.KIBI_E2E_PACK_CACHE_KEY;

describe("prove command setup", () => {
  test("opens its own runtime for the given workspace", async () => {
    const h = harness({ integrations: [web] });
    const create = spyOn(cliRuntime, "createCliRuntime").mockImplementation(((
      options: unknown,
    ) => {
      h.opens.push(["create", options]);
      return h.runtime;
    }) as never);
    restores.push(() => create.mockRestore());
    await proveCommand({ all: true, workspaceRoot: root });
    await proveCommand({ all: true });
    expect(h.opens).toEqual([
      ["create", { workspaceRoot: root }],
      { workspaceRoot: root },
      ["create", {}],
      {},
    ]);
  });

  test("stops when the integrations cannot be read", async () => {
    const h = harness({ integrations: { error: "bad file" } });
    let caught: unknown;
    try {
      await proveCommand({ all: true }, { runtime: h.runtime });
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({
      code: "PROOF_INTEGRATIONS_UNAVAILABLE",
      message: "prove: bad file",
      retryable: false,
    });
    expect(h.closes).toEqual([{ status: "error", error: 1 }]);
  });

  test("reports an empty selection", async () => {
    const h = harness({ integrations: [web], tests: [{ id: "T-0" }] });
    expect(await proveCommand({ all: true }, { runtime: h.runtime })).toEqual({
      exitCode: 0,
    });
    expect(await proveCommand({ stale: true }, { runtime: h.runtime })).toEqual(
      { exitCode: 0 },
    );
    expect(h.stdout).toEqual([
      '{"passed":0,"certified":0,"failed":0,"message":"no proof-bearing tests selected"}\n',
      '{"passed":0,"certified":0,"failed":0,"message":"every selected test already has a current passing receipt"}\n',
    ]);
    expect(h.closes).toEqual([
      { status: "success", result: 0 },
      { status: "success", result: 0 },
    ]);
    expect(h.afterSuccess).toBe(0);
    expect(h.spawns).toEqual([]);
  });

  test("needs a workspace snapshot", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      snapshots: [new Error("no git")],
    });
    await expect(
      proveCommand({ all: true }, { runtime: h.runtime }),
    ).rejects.toMatchObject({
      code: "WORKSPACE_SNAPSHOT_UNAVAILABLE",
      message: "prove: no git",
      retryable: true,
    });
  });

  test("keys the shared pack cache by the snapshot unless one is set", async () => {
    delete process.env.KIBI_E2E_PACK_CACHE_KEY;
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: emits(),
    });
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(packKey()).toBe(SNAPSHOT);
    process.env.KIBI_E2E_PACK_CACHE_KEY = "kept";
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(packKey()).toBe("kept");
  });
});

describe("prove selection", () => {
  test("selects one test by id", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web"), proofTest("T-2", "web")],
      child: emits(),
    });
    await proveCommand(
      { testId: "T-2" },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.loads).toEqual([
      { id: "T-2", type: "test", projection: "proof_contract" },
    ]);
    expect(h.ingests.map((call) => call.testIds)).toEqual([["T-2"]]);
  });

  test("selects the tests a requirement reaches", async () => {
    const goals: string[] = [];
    const h = harness({
      integrations: [web],
      tests: ["TEST-1", "TEST-2", "TEST-3", "TEST-4", "TEST-5"].map((id) =>
        proofTest(id, "web"),
      ),
      child: emits(),
      query: (goal) => {
        goals.push(goal);
        if (goal.includes("specified_by"))
          return {
            success: true,
            bindings: {
              Rows: "[['SCN-1','TEST-1'],[SCN-2,\"TEST-2\"],[a, TEST-3 ]]",
            },
          };
        return {
          success: true,
          bindings: { Rows: "['TEST-4',TEST-5,'NOTE-1']" },
        };
      },
    });
    await proveCommand(
      { requirement: "REQ-1" },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(goals).toEqual([
      "findall([S,T], (kb_relationship(specified_by, 'REQ-1', S), (kb_relationship(verified_by, S, T) ; kb_relationship(validates, T, S))), Rows)",
      "findall(T, kb_relationship(validates, T, 'REQ-1'), Rows)",
    ]);
    expect(h.loads).toEqual([{ type: "test", projection: "proof_contract" }]);
    expect(h.ingests.map((call) => call.testIds)).toEqual([
      ["TEST-1", "TEST-2", "TEST-3", "TEST-4", "TEST-5"],
    ]);
  });

  test("a requirement without answers selects nothing", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("TEST-1", "web")],
      query: (goal) =>
        goal.includes("specified_by")
          ? { success: false, bindings: { Rows: "[[S,'TEST-1']]" } }
          : { success: true, bindings: { Rows: 5 } },
    });
    await proveCommand({ requirement: "REQ-1" }, { runtime: h.runtime });
    expect(h.stdout[0]).toContain("no proof-bearing tests selected");
  });

  test("a requirement with only unrelated rows selects nothing", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("TEST-1", "web")],
      query: (goal) =>
        goal.includes("specified_by")
          ? { success: true, bindings: { Rows: 7 } }
          : { success: false, bindings: { Rows: "[TEST-1]" } },
    });
    await proveCommand({ requirement: "REQ-1" }, { runtime: h.runtime });
    expect(h.stdout[0]).toContain("no proof-bearing tests selected");
  });

  test("keeps only stale tests with --stale", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web"), proofTest("T-2", "web")],
      child: emits(),
    });
    const states = spyOn(
      prologJson,
      "runOperationJsonQuery",
    ).mockImplementation((async () => ({
      states: { "T-1": "passed", "T-2": "stale" },
    })) as never);
    const bindings = spyOn(
      reporting,
      "perContractTestBindings",
    ).mockImplementation((async () => null) as never);
    restores.push(
      () => states.mockRestore(),
      () => bindings.mockRestore(),
    );
    await proveCommand(
      { stale: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.ingests.map((call) => call.testIds)).toEqual([["T-2"]]);
  });

  test("filters by integration and refuses an empty match", async () => {
    const h = harness({
      integrations: [web, { ...web, id: "api" }],
      tests: [proofTest("T-1", "web"), proofTest("T-2", "api"), { id: "T-3" }],
      child: emits(),
    });
    const prove = (options: Record<string, unknown>) =>
      proveCommand(options, {
        runtime: h.runtime,
        ingestProof: ingestWith(h) as never,
      });
    await prove({ integration: "api" });
    await prove({ integrationExcept: "api" });
    await prove({ integration: "api,web", integrationExcept: "web" });
    expect(h.ingests.map((call) => call.testIds)).toEqual([
      ["T-2"],
      ["T-1"],
      ["T-2"],
    ]);
    await expect(prove({ integration: "zed,other" })).rejects.toThrow(
      /^prove: no proof-bearing tests match the integration selector \(integrations: other, zed\)$/,
    );
    await expect(prove({ integrationExcept: "web,api" })).rejects.toThrow(
      /^prove: no proof-bearing tests match the integration selector \(excluding: api, web\)$/,
    );
    await expect(
      prove({ integration: "web", integrationExcept: "web" }),
    ).rejects.toThrow(/\(integrations: web; excluding: web\)$/);
  });

  test("names the flag of a blank integration id", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
    });
    await expect(
      proveCommand({ integration: "web,," }, { runtime: h.runtime }),
    ).rejects.toThrow(
      /^prove: --integration contains an empty integration id$/,
    );
    await expect(
      proveCommand({ integrationExcept: ",web" }, { runtime: h.runtime }),
    ).rejects.toThrow(
      /^prove: --integration-except contains an empty integration id$/,
    );
  });

  test("a requirement needs an engine to reach any test", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("TEST-1", "web")],
    });
    (h.context as { prolog?: unknown }).prolog = undefined;
    await proveCommand({ requirement: "REQ-1" }, { runtime: h.runtime });
    expect(h.stdout[0]).toContain("no proof-bearing tests selected");
  });

  test("refuses a test without an id", async () => {
    for (const id of [undefined, ""]) {
      const h = harness({ integrations: [web], tests: [{ id }] });
      await expect(
        proveCommand({ all: true }, { runtime: h.runtime }),
      ).rejects.toThrow(/^prove: loaded test entity is missing an id$/);
      for (const restore of restores.splice(0).reverse()) restore();
    }
  });

  test.each([
    ["null", null],
    ["an array", []],
    ["a string", "contract"],
  ])("skips a test whose contract is %s", async (_label, proof_contract) => {
    const h = harness({
      integrations: [web],
      tests: [{ id: "T-1", proof_contract }],
    });
    await proveCommand({ all: true }, { runtime: h.runtime });
    expect(h.stdout[0]).toContain("no proof-bearing tests selected");
  });
});

const runsDir = () => path.join(root, ".kb", "proof", "runs");
const progressFile = () => path.join(runsDir(), PROVE_PROGRESS_FILE);
const readJson = (file: string) => JSON.parse(readFileSync(file).toString());

describe("prove runs", () => {
  test("runs each integration once with its proof environment", async () => {
    const h = harness({
      integrations: [
        web,
        { ...web, id: "api", producer: "custom", command: ["api"] },
      ],
      tests: [
        proofTest("T-1", "web", {
          proof_bindings: [
            { source_file: "b.spec.ts" },
            { source_file: "a.spec.ts" },
          ],
        }),
        proofTest("T-2", "api"),
        proofTest("T-3", "web", {
          proof_bindings: [{ source_file: "a.spec.ts" }],
        }),
      ],
      child: emits(),
    });
    const outcome = await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(outcome).toEqual({ exitCode: 0 });
    expect(h.spawns.map((spawn) => [spawn.argv, spawn.cwd])).toEqual([
      [["playwright", "test"], root],
      [["api"], root],
    ]);
    const env = h.spawns[0]?.env ?? {};
    expect(env.KIBI_PROOF_TEST_IDS).toBe('["T-1","T-3"]');
    expect(env.KIBI_PROOF_SOURCE_FILES).toBe('["a.spec.ts","b.spec.ts"]');
    expect(env.KIBI_PROOF_OUTPUT).toBe(path.join(runsDir(), "web.json"));
    expect(env.KIBI_PROOF_CERTIFICATES).toBe(
      path.join(runsDir(), "certificates", "web"),
    );
    expect("KIBI_PROOF_TEST_REPORT" in env).toBe(false);
    expect(h.spawns[1]?.env.KIBI_PROOF_SOURCE_FILES).toBe("[]");
    expect(h.stderr).toEqual([
      "prove: running integration 'web' (1/2, 2 tests)\n",
      "prove: ingested integration 'web' (passed 2, failed 0)\n",
      "prove: running integration 'api' (2/2, 1 test)\n",
      "prove: ingested integration 'api' (passed 1, failed 0)\n",
    ]);
    expect(h.summary()).toEqual({
      passed: 3,
      certified: 0,
      failed: 0,
      unchanged: 0,
      runs: [
        { integration: "web", summary: "passed 2, failed 0", results: [] },
        { integration: "api", summary: "passed 1, failed 0", results: [] },
      ],
    });
    expect(h.ingests.map((call) => [call.snapshot, call.testIds])).toEqual([
      [SNAPSHOT, ["T-1", "T-3"]],
      [SNAPSHOT, ["T-2"]],
    ]);
    expect(readJson(path.join(runsDir(), "web.json")).integration).toBe("web");
    expect(readJson(progressFile())).toEqual({
      version: "kibi.prove-progress.v1",
      snapshot: SNAPSHOT,
      ingested: { web: ["T-1", "T-3"], api: ["T-2"] },
    });
    expect(h.afterSuccess).toBe(1);
    expect(h.closes).toEqual([{ status: "success", result: 0 }]);
    expect(h.categories).toEqual([]);
  });

  test("clears what an earlier run left behind", async () => {
    const certificates = path.join(runsDir(), "certificates", "web");
    mkdirSync(certificates, { recursive: true });
    writeFileSync(path.join(certificates, "old.json"), '{"test_id":"T-1"}');
    writeFileSync(path.join(runsDir(), "web.json"), "stale");
    let seen: unknown[] = [];
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: (argv, options) => {
        seen = [
          existsSync(path.join(runsDir(), "web.json")),
          readdirSync(certificates),
        ];
        return emits()(argv, options);
      },
    });
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(seen).toEqual([false, []]);
  });

  test("uses the artifact path an integration names", async () => {
    const h = harness({
      integrations: [{ ...web, artifact: "out/nested/web-run.json" }],
      tests: [proofTest("T-1", "web")],
      child: emits(),
    });
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.spawns[0]?.env.KIBI_PROOF_OUTPUT).toBe(
      path.join(root, "out/nested/web-run.json"),
    );
    expect(
      readJson(path.join(root, "out/nested/web-run.json")).integration,
    ).toBe("web");
  });

  test("narrows a playwright run only for a narrow selection", async () => {
    const tests = [
      proofTest("T-1", "web", {
        proof_bindings: [{ source_file: "a.spec.ts" }],
      }),
    ];
    const run = async (options: Record<string, unknown>, extra = {}) => {
      const h = harness({
        integrations: [{ ...web, ...extra }],
        tests,
        child: emits(),
      });
      const states = spyOn(
        prologJson,
        "runOperationJsonQuery",
      ).mockImplementation((async () => ({ states: {} })) as never);
      const bindings = spyOn(
        reporting,
        "perContractTestBindings",
      ).mockImplementation((async () => null) as never);
      restores.push(
        () => states.mockRestore(),
        () => bindings.mockRestore(),
      );
      await proveCommand(options, {
        runtime: h.runtime,
        ingestProof: ingestWith(h) as never,
      });
      const result = [
        h.spawns[0]?.argv,
        h.stderr.filter((line) => line.includes("whole")),
      ];
      for (const restore of restores.splice(0).reverse()) restore();
      return result;
    };
    expect(await run({ testId: "T-1" })).toEqual([
      ["playwright", "test", "a.spec.ts"],
      [],
    ]);
    expect(await run({ stale: true })).toEqual([
      ["playwright", "test", "a.spec.ts"],
      [],
    ]);
    expect(await run({ all: true })).toEqual([["playwright", "test"], []]);
    expect(await run({ testId: "T-1" }, { producer: "custom" })).toEqual([
      ["playwright", "test"],
      [],
    ]);
    expect(await run({ testId: "T-1" }, { command: ["npm", "test"] })).toEqual([
      ["npm", "test"],
      [
        "prove: running the whole 'web' integration: the command is not a direct `playwright test` invocation; narrow it from KIBI_PROOF_SOURCE_FILES\n",
      ],
    ]);
  });

  test("narrows for a requirement selection", async () => {
    const h = harness({
      integrations: [web],
      tests: [
        proofTest("TEST-1", "web", {
          proof_bindings: [{ source_file: "a.spec.ts" }],
        }),
      ],
      child: emits(),
      query: (goal) =>
        goal.includes("specified_by")
          ? { success: false, bindings: {} }
          : { success: true, bindings: { Rows: "['TEST-1']" } },
    });
    await proveCommand(
      { requirement: "REQ-1" },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.spawns[0]?.argv).toEqual(["playwright", "test", "a.spec.ts"]);
  });

  test("records an integration that is not configured", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "gone"), proofTest("T-2", "gone")],
    });
    expect(await proveCommand({ all: true }, { runtime: h.runtime })).toEqual({
      exitCode: 1,
    });
    expect(h.summary()).toEqual({
      passed: 0,
      certified: 0,
      failed: 0,
      unchanged: 0,
      runs: [],
      failures: [
        "integration 'gone' (required by T-1, T-2) is not configured in .kb/proof/integrations.json; plan it with kibi proof inspect --update gone --json and apply the plan with kb_apply_plan",
      ],
    });
    expect(h.categories).toEqual(["integration_failed"]);
    expect(h.stderr).not.toContain(
      "prove: integrations that failed to produce receipts run again with the same selector plus --resume\n",
    );
  });

  test("records a producer that cannot start", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: () => new Error("spawn ENOENT"),
    });
    await proveCommand({ all: true }, { runtime: h.runtime });
    expect(h.summary().failures).toEqual([
      "integration 'web' failed to start: spawn ENOENT",
    ]);
  });

  test.each([
    [
      "an unreadable artifact",
      () => 0,
      "integration 'web': producer 'playwright' did not emit a readable kibi.proof-run.v1 artifact at ARTIFACT",
    ],
    [
      "a passing artifact from a failing process",
      emits("passed", 4),
      "integration 'web': producer 'playwright' reported run.outcome 'passed' but the process exited with code 4",
    ],
  ])("records %s", async (_label, child, failure) => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: child as ChildScript,
    });
    await proveCommand({ all: true }, { runtime: h.runtime });
    expect(h.summary().failures).toEqual([
      failure.replace("ARTIFACT", path.join(runsDir(), "web.json")),
    ]);
  });

  test("accepts a failing artifact from a failing process", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: emits("failed", 2),
    });
    const outcome = await proveCommand(
      { all: true },
      {
        runtime: h.runtime,
        ingestProof: ingestWith(h, () => ({ passed: 0, failed: 1 })) as never,
      },
    );
    expect(outcome).toEqual({ exitCode: 1 });
    expect(h.ingests).toHaveLength(1);
    expect(h.categories).toEqual(["tests_failed"]);
    expect(h.summary().failed).toBe(1);
  });

  test("records an artifact without a run", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: (_argv, { env }) => {
        writeFileSync(String(env.KIBI_PROOF_OUTPUT), "{}");
        return 3;
      },
    });
    await proveCommand({ all: true }, { runtime: h.runtime });
    const errors = proofRunArtifactErrors({} as never);
    expect(errors.length).toBeGreaterThan(1);
    expect(h.summary().failures).toEqual([
      `integration 'web' produced an invalid kibi.proof-run.v1 artifact: ${errors.join("; ")}`,
    ]);
  });

  test("records an unreadable certificate", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: (argv, options) => {
        writeFileSync(
          path.join(String(options.env.KIBI_PROOF_CERTIFICATES), "c.json"),
          "{",
        );
        return emits()(argv, options);
      },
    });
    await proveCommand({ all: true }, { runtime: h.runtime });
    expect(h.summary().failures).toEqual([
      "integration 'web': certificate c.json is not valid JSON",
    ]);
  });

  test("hands each test its own certificate", async () => {
    const certificate = { version: "v1", kind: "typecheck", test_id: "T-1" };
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: (argv, options) => {
        writeFileSync(
          path.join(String(options.env.KIBI_PROOF_CERTIFICATES), "c.json"),
          JSON.stringify(certificate),
        );
        return emits()(argv, options);
      },
    });
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.ingests[0]?.artifact.certificates).toEqual([certificate]);
  });

  test.each([
    ["after the run", [SNAPSHOT, "b".repeat(64)], 0],
    ["when the snapshot fails after the run", [SNAPSHOT, new Error("x")], 0],
  ])(
    "refuses a workspace that changed %s",
    async (_label, snapshots, ingests) => {
      const h = harness({
        integrations: [web],
        tests: [proofTest("T-1", "web")],
        snapshots,
        child: emits(),
      });
      await proveCommand(
        { all: true },
        { runtime: h.runtime, ingestProof: ingestWith(h) as never },
      );
      expect(h.ingests).toHaveLength(ingests);
      expect(String((h.summary().failures as string[])[0])).toStartWith(
        `integration 'web' changed the tracked workspace during proof execution; proof is bound to snapshot ${SNAPSHOT} (`,
      );
    },
  );

  test.each([
    [[SNAPSHOT, SNAPSHOT, "c".repeat(64)]],
    [[SNAPSHOT, SNAPSHOT, new Error("x")]],
  ])(
    "reports a workspace that changed while receipts were applied",
    async (snapshots) => {
      const h = harness({
        integrations: [web],
        tests: [proofTest("T-1", "web")],
        snapshots,
        child: emits(),
      });
      expect(
        await proveCommand(
          { all: true },
          { runtime: h.runtime, ingestProof: ingestWith(h) as never },
        ),
      ).toEqual({ exitCode: 1 });
      expect(h.summary().passed).toBe(1);
      expect(String((h.summary().failures as string[])[0])).toStartWith(
        "the tracked workspace changed while receipts were applied; re-run kibi prove (",
      );
      expect(h.stderr).toContain(
        "prove: integrations that failed to produce receipts run again with the same selector plus --resume\n",
      );
      expect(h.categories).toEqual(["integration_failed"]);
    },
  );
});

const cmd = { id: "cmd", producer: "command", command: ["run-suite"] };
const reportEntry = (id: string, outcome: string, exit: number) => ({
  test_id: id,
  outcome,
  steps: [{ step_index: 1, command: ["step", id], outcome, exit_code: exit }],
});

describe("prove command integrations", () => {
  test("evaluates an unattributed command run as one unit", async () => {
    const h = harness({
      integrations: [cmd],
      tests: [proofTest("T-1", "cmd"), proofTest("T-2", "cmd")],
      child: () => 0,
    });
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    const env = h.spawns[0]?.env ?? {};
    expect(env.KIBI_PROOF_TEST_REPORT).toBe(
      path.join(runsDir(), "cmd.tests.json"),
    );
    expect(h.ingests.map((call) => call.testIds)).toEqual([["T-1", "T-2"]]);
    expect(h.ingests[0]?.artifact.run).toMatchObject({
      outcome: "passed",
      exit_code: 0,
    });
    expect((h.summary().runs as unknown[])[0]).toEqual({
      integration: "cmd",
      summary: "passed 2, failed 0",
      attribution: "aggregate",
      attributionReason: "the integration passed",
      results: [],
    });
    expect(existsSync(path.join(runsDir(), "cmd.passed.json"))).toBe(false);
  });

  test("ignores a test report an earlier run left", async () => {
    mkdirSync(runsDir(), { recursive: true });
    writeFileSync(
      path.join(runsDir(), "cmd.tests.json"),
      JSON.stringify({
        version: "kibi.proof-test-report.v1",
        tests: [reportEntry("T-1", "failed", 1)],
      }),
    );
    const h = harness({
      integrations: [cmd],
      tests: [proofTest("T-1", "cmd")],
      child: () => 0,
    });
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.ingests[0]?.artifact.run).toMatchObject({ outcome: "passed" });
  });

  test("splits an attributed command run by test outcome", async () => {
    const h = harness({
      integrations: [cmd],
      tests: [proofTest("T-1", "cmd"), proofTest("T-2", "cmd")],
      child: (_argv, { env }) => {
        writeFileSync(
          String(env.KIBI_PROOF_TEST_REPORT),
          JSON.stringify({
            version: "kibi.proof-test-report.v1",
            tests: [
              reportEntry("T-1", "passed", 0),
              reportEntry("T-2", "failed", 3),
            ],
          }),
        );
        return 1;
      },
    });
    const outcome = await proveCommand(
      { all: true },
      {
        runtime: h.runtime,
        ingestProof: ingestWith(h, (call) =>
          call.testIds.includes("T-2")
            ? { passed: 0, failed: 1, unchanged: 1 }
            : { passed: 1, failed: 0 },
        ) as never,
      },
    );
    expect(outcome).toEqual({ exitCode: 1 });
    expect(h.ingests.map((call) => call.testIds)).toEqual([["T-1"], ["T-2"]]);
    expect(readJson(path.join(runsDir(), "cmd.json")).run.exit_code).toBe(1);
    expect(readJson(path.join(runsDir(), "cmd.passed.json")).run.outcome).toBe(
      "passed",
    );
    expect(readJson(path.join(runsDir(), "cmd.failed.json")).run.outcome).toBe(
      "failed",
    );
    expect(h.summary()).toStrictEqual({
      passed: 1,
      certified: 0,
      failed: 1,
      unchanged: 1,
      runs: [
        {
          integration: "cmd",
          summary: "passed 1, failed 1, unchanged 1",
          attribution: "per_test",
          failedSteps: [
            {
              testId: "T-2",
              stepIndex: 1,
              command: ["step", "T-2"],
              outcome: "failed",
              exitCode: 3,
            },
          ],
          results: [],
        },
      ],
    });
    expect(h.stderr).toContain(
      "prove: ingested integration 'cmd' (passed 1, failed 1, unchanged 1)\n",
    );
  });
});

describe("prove native reports", () => {
  const junit = {
    id: "unit",
    producer: "junit",
    command: ["run-junit"],
    artifact: "reports/junit.xml",
  };

  function converters(conversion: Record<string, unknown>) {
    const calls: unknown[][] = [];
    const record = ((native: string, bindings: unknown) => {
      calls.push([native, bindings]);
      return conversion;
    }) as never;
    const j = spyOn(junitAdapter, "convertJUnitXml").mockImplementation(record);
    const t = spyOn(tapAdapter, "convertTap").mockImplementation(record);
    restores.push(
      () => j.mockRestore(),
      () => t.mockRestore(),
    );
    return calls;
  }

  const passing = (symbol: string, outcome = "passed") => ({
    symbol_id: symbol,
    target: "default",
    outcome,
    binding: "native_case",
    attempts: { status: "unavailable" },
  });

  const writesNative =
    (): ChildScript =>
    (_argv, { cwd }) => {
      mkdirSync(path.join(cwd, "reports"), { recursive: true });
      writeFileSync(path.join(cwd, "reports", "junit.xml"), "<native/>");
      return 0;
    };

  test.each(["junit", "tap"])(
    "converts a %s report found in the workspace",
    async (producer) => {
      const calls = converters({
        results: [passing("SYM-T-1"), passing("SYM-T-2", "failed")],
        diagnostics: ["note"],
        fatal: false,
      });
      const h = harness({
        integrations: [{ ...junit, producer, producer_version: "9" }],
        tests: [
          proofTest("T-1", "unit", {
            proof_bindings: [
              {
                symbol_id: "SYM-T-1",
                target: "default",
                native_id: "case a",
                aliases: ["x", "y"],
                extra: 1,
              },
            ],
          }),
          proofTest("T-2", "unit", {
            proof_bindings: [{ symbol_id: "SYM-T-2", target: "default" }],
          }),
          proofTest("T-3", "unit", { proof_bindings: "none" }),
        ],
        child: writesNative(),
      });
      await proveCommand(
        { all: true },
        { runtime: h.runtime, ingestProof: ingestWith(h) as never },
      );
      expect(calls).toStrictEqual([
        [
          "<native/>",
          [
            {
              symbol_id: "SYM-T-1",
              target: "default",
              native_id: "case a",
              aliases: ["x", "y"],
            },
            { symbol_id: "SYM-T-2", target: "default" },
          ],
        ],
      ]);
      expect(h.ingests[0]?.artifact).toEqual({
        version: PROOF_RUN_VERSION,
        producer: { name: `kibi-${producer}-adapter`, version: "9" },
        integration: "unit",
        command_argv: ["run-junit"],
        code_snapshot: SNAPSHOT,
        environment,
        run: {
          outcome: "failed",
          exit_code: 0,
          started_at: expect.any(String),
          finished_at: expect.any(String),
        },
        proof_results: [passing("SYM-T-1"), passing("SYM-T-2", "failed")],
        diagnostics: ["note"],
      });
    },
  );

  test("a passing conversion passes the run", async () => {
    converters({
      results: [passing("SYM-T-1")],
      diagnostics: [],
      fatal: false,
    });
    const h = harness({
      integrations: [junit],
      tests: [proofTest("T-1", "unit")],
      child: writesNative(),
    });
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    const artifact = h.ingests[0]?.artifact ?? {};
    expect(artifact.run).toMatchObject({ outcome: "passed" });
    expect(artifact.producer).toStrictEqual({ name: "kibi-junit-adapter" });
    expect("diagnostics" in artifact).toBe(false);
  });

  test.each([
    [
      "a missing artifact path",
      { artifact: undefined },
      () => 0,
      { results: [], diagnostics: [], fatal: false },
      "producer 'junit' requires an artifact path in .kb/proof/integrations.json",
    ],
    [
      "a missing report",
      {},
      () => 0,
      { results: [], diagnostics: [], fatal: false },
      "producer 'junit' did not produce its native report at reports/junit.xml",
    ],
    [
      "a rejected report",
      {},
      writesNative(),
      { results: [], diagnostics: ["bad", "worse"], fatal: true },
      "producer 'junit' rejected its native report: bad; worse",
    ],
    [
      "a rejected report without detail",
      {},
      writesNative(),
      { results: [], diagnostics: [], fatal: true },
      "producer 'junit' rejected its native report",
    ],
    [
      "a report without bound results",
      {},
      writesNative(),
      { results: [], diagnostics: ["unbound", "again"], fatal: false },
      "producer 'junit' produced no bound proof results: unbound; again",
    ],
    [
      "a report without bound results or detail",
      {},
      writesNative(),
      { results: [], diagnostics: [], fatal: false },
      "producer 'junit' produced no bound proof results",
    ],
  ])("records %s", async (_label, extra, child, conversion, failure) => {
    converters(conversion);
    const h = harness({
      integrations: [{ ...junit, ...extra }],
      tests: [proofTest("T-1", "unit")],
      child: child as ChildScript,
    });
    await proveCommand({ all: true }, { runtime: h.runtime });
    expect(h.summary().failures).toEqual([`integration 'unit': ${failure}`]);
  });

  test("refuses invalid proof bindings", async () => {
    converters({ results: [], diagnostics: [], fatal: false });
    const h = harness({
      integrations: [junit],
      tests: [proofTest("T-1", "unit", { proof_bindings: [{}] })],
      child: writesNative(),
    });
    await proveCommand({ all: true }, { runtime: h.runtime });
    expect(String((h.summary().failures as string[])[0])).toStartWith(
      "integration 'unit': prove: test T-1 has invalid proof_bindings: ",
    );
    expect(String((h.summary().failures as string[])[0])).toContain("; ");
  });
});

describe("prove resume", () => {
  const progress = (snapshot: string, ingested: Record<string, string[]>) => {
    mkdirSync(runsDir(), { recursive: true });
    writeFileSync(
      progressFile(),
      JSON.stringify({ version: "kibi.prove-progress.v1", snapshot, ingested }),
    );
  };
  const tests = [proofTest("T-1", "web"), proofTest("T-2", "api")];
  const integrations = [web, { ...web, id: "api" }];

  test("skips integrations already ingested at this snapshot", async () => {
    progress(SNAPSHOT, { web: ["T-1"], other: ["X"] });
    const h = harness({ integrations, tests, child: emits() });
    await proveCommand(
      { all: true, resume: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.ingests.map((call) => call.testIds)).toEqual([["T-2"]]);
    expect(h.stderr[0]).toBe(
      "prove: resuming; skipping integrations already ingested at this snapshot: web\n",
    );
    expect(h.stderr[1]).toBe(
      "prove: running integration 'api' (1/1, 1 test)\n",
    );
    expect(readJson(progressFile()).ingested).toEqual({
      web: ["T-1"],
      other: ["X"],
      api: ["T-2"],
    });
  });

  test("runs everything again after the workspace changed", async () => {
    progress("old", { web: ["T-1"], other: ["X"] });
    const h = harness({ integrations, tests, child: emits() });
    await proveCommand(
      { all: true, resume: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.ingests).toHaveLength(2);
    expect(h.stderr[0]).toBe(
      "prove: the workspace changed since the interrupted run; running every selected integration\n",
    );
    expect(readJson(progressFile())).toEqual({
      version: "kibi.prove-progress.v1",
      snapshot: SNAPSHOT,
      ingested: { web: ["T-1"], api: ["T-2"] },
    });
  });

  test("names every skipped integration", async () => {
    progress(SNAPSHOT, { web: ["T-1"], api: ["T-2"] });
    const h = harness({ integrations, tests, child: emits() });
    await proveCommand(
      { all: true, resume: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.stderr[0]).toBe(
      "prove: resuming; skipping integrations already ingested at this snapshot: web, api\n",
    );
    expect(h.spawns).toEqual([]);
  });

  test("resumes quietly without earlier progress", async () => {
    const h = harness({ integrations, tests, child: emits() });
    await proveCommand(
      { all: true, resume: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(h.stderr[0]).toBe(
      "prove: running integration 'web' (1/2, 1 test)\n",
    );
  });

  test("a fresh run starts a new record", async () => {
    progress(SNAPSHOT, { web: ["T-1"] });
    let seen: unknown;
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: (argv, options) => {
        seen = readJson(progressFile());
        return emits()(argv, options);
      },
    });
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(seen).toEqual({
      version: "kibi.prove-progress.v1",
      snapshot: SNAPSHOT,
      ingested: {},
    });
    expect(readFileSync(progressFile()).toString()).toBe(
      `${JSON.stringify(
        {
          version: "kibi.prove-progress.v1",
          snapshot: SNAPSHOT,
          ingested: { web: ["T-1"] },
        },
        null,
        2,
      )}\n`,
    );
  });

  test("a resumed run keeps the earlier record until something lands", async () => {
    progress(SNAPSHOT, { web: ["T-1"] });
    const before = readFileSync(progressFile()).toString();
    let seen: unknown;
    const h = harness({
      integrations,
      tests,
      child: () => {
        seen = readFileSync(progressFile()).toString();
        return new Error("down");
      },
    });
    await proveCommand({ all: true, resume: true }, { runtime: h.runtime });
    expect(seen).toBe(before);
    expect(h.stderr).toContain(
      "prove: integrations that failed to produce receipts run again with the same selector plus --resume\n",
    );
  });

  test("merges new test ids into an integration's record", async () => {
    progress(SNAPSHOT, { web: ["T-9"] });
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: emits(),
    });
    await proveCommand(
      { all: true, resume: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    expect(readJson(progressFile()).ingested).toEqual({ web: ["T-1", "T-9"] });
  });
});

describe("prove summary", () => {
  const row = (testId: string, extra: Record<string, unknown> = {}) => ({
    testId,
    outcome: "passed",
    receiptId: "r",
    applied: true,
    duplicate: false,
    receiptCount: 1,
    compacted: 0,
    gaps: [],
    ...extra,
  });

  test("counts refused and certified receipts and explains each claim", async () => {
    const results = [
      row("T-1", { evidenceLevel: "proved" }),
      row("T-2", { evidenceLevel: "proved", outcome: "failed" }),
      row("T-3", {
        certificateRejection: "digest mismatch",
        kind: "typecheck",
      }),
      row("T-4", { certificateRejection: "bad" }),
      row("T-5", {
        claimBindings: [
          { claim_key: "c1", binding: "rejected", reason: "no scope" },
        ],
      }),
      row("T-6", {
        scope: "unit",
        claimBindings: [
          {
            claim_key: "c2",
            requirement_id: "REQ-1",
            binding: "derived",
            scope: "code",
          },
          { claim_key: "c3", binding: "attested" },
        ],
      }),
      row("T-7", {
        scope: "end_to_end",
        claimBindings: [{ claim_key: "c4", binding: "derived" }],
      }),
      row("T-8", {
        outcome: "failed",
        claimBindings: [{ claim_key: "c5", binding: "rejected" }],
      }),
      row("T-9", {
        claimBindings: [{ claim_key: "c6", binding: "attested", scope: "s" }],
      }),
    ];
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: emits(),
    });
    const outcome = await proveCommand(
      { all: true },
      {
        runtime: h.runtime,
        ingestProof: ingestWith(h, () => ({
          passed: 7,
          failed: 2,
          unchanged: 0,
          results: results as never,
        })) as never,
      },
    );
    expect(outcome).toEqual({ exitCode: 1 });
    const summary = h.summary();
    expect(summary).toMatchObject({
      passed: 4,
      refused: 3,
      certified: 1,
      failed: 2,
      unchanged: 0,
    });
    expect((summary.runs as Array<{ summary: string }>)[0]?.summary).toBe(
      "passed 4, refused 3, failed 2",
    );
    expect(h.stderr.slice(2)).toEqual([
      "prove: T-3 typecheck: certificate rejected, digest mismatch\n",
      "prove: T-4 certificate: certificate rejected, bad\n",
      "prove: T-5 c1: rejected: no scope\n",
      "prove: T-6 c2 (REQ-1): derived, code scope; the receipt's verification_scope is unit, and a claim is proved only once its requirement is tested end to end, so kibi proof explain keeps it unproved until an end_to_end receipt covers the scenario\n",
      "prove: T-6 c3: attested\n",
      "prove: T-7 c4: derived\n",
      "prove: T-8 c5: rejected\n",
      "prove: T-9 c6: attested\n",
    ]);
    expect(h.categories).toEqual(["tests_failed"]);
  });

  test("one rejected claim among others refuses a passing receipt", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: emits(),
    });
    await proveCommand(
      { all: true },
      {
        runtime: h.runtime,
        ingestProof: ingestWith(h, () => ({
          results: [
            row("T-1", {
              claimBindings: [
                { claim_key: "a", binding: "attested" },
                { claim_key: "b", binding: "rejected" },
              ],
            }),
          ] as never,
        })) as never,
      },
    );
    expect(h.summary()).toMatchObject({ passed: 0, refused: 1 });
  });

  test("a derived claim without a receipt scope needs no note", async () => {
    const h = harness({
      integrations: [web],
      tests: [proofTest("T-1", "web")],
      child: emits(),
    });
    await proveCommand(
      { all: true },
      {
        runtime: h.runtime,
        ingestProof: ingestWith(h, () => ({
          results: [
            row("T-1", {
              claimBindings: [{ claim_key: "c", binding: "derived" }],
            }),
          ] as never,
        })) as never,
      },
    );
    expect(h.stderr.at(-1)).toBe("prove: T-1 c: derived\n");
    expect("refused" in h.summary()).toBe(false);
  });

  test("a run that ingests nothing reports nothing for it", async () => {
    const h = harness({
      integrations: [cmd],
      tests: [proofTest("T-1", "cmd")],
      child: (_argv, { env }) => {
        writeFileSync(
          String(env.KIBI_PROOF_TEST_REPORT),
          JSON.stringify({
            version: "kibi.proof-test-report.v1",
            tests: [reportEntry("T-1", "passed", 0)],
          }),
        );
        return 0;
      },
    });
    const ingest = ingestWith(h);
    await proveCommand(
      { all: true },
      {
        runtime: h.runtime,
        ingestProof: (async (input: IngestCall) => {
          const result = await ingest(input);
          return result;
        }) as never,
      },
    );
    expect(h.summary().runs).toHaveLength(1);
  });

  test("an unreadable report is attributed as one unit", async () => {
    const h = harness({
      integrations: [cmd],
      tests: [proofTest("T-1", "cmd")],
      child: (_argv, { env }) => {
        writeFileSync(String(env.KIBI_PROOF_TEST_REPORT), "{");
        return 0;
      },
    });
    await proveCommand(
      { all: true },
      { runtime: h.runtime, ingestProof: ingestWith(h) as never },
    );
    const run = (h.summary().runs as Array<Record<string, unknown>>)[0];
    expect(run?.attribution).toBe("aggregate");
    expect(String(run?.attributionReason)).toContain("is not valid JSON");
  });
});
