// implements REQ-kibi-verification-evidence-contract
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  parseCommandOption,
  registerProofCommand,
} from "../src/cli-register-proof.js";
import * as compact from "../src/commands/proof-compact.js";
import * as explain from "../src/commands/proof-explain.js";
import * as migrateLegacy from "../src/commands/proof-migrate-legacy.js";
import * as prune from "../src/commands/proof-prune.js";
import * as prove from "../src/commands/prove.js";
import * as inspect from "../src/proof/inspect.js";
import * as stepRunner from "../src/proof/step-runner.js";
import {
  goldenSurface,
  plainCalls,
  programWith,
  stubExports,
} from "./helpers/command-surface.js";

const restores: Array<() => void> = [];
const savedWorkspace = process.env.KIBI_PROOF_WORKSPACE;
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
  if (savedWorkspace === undefined)
    Reflect.deleteProperty(process.env, "KIBI_PROOF_WORKSPACE");
  else process.env.KIBI_PROOF_WORKSPACE = savedWorkspace;
});

function stub(
  module: Record<string, unknown>,
  name: string,
  result: unknown = undefined,
) {
  const stubbed = stubExports(module, [name], result);
  restores.push(stubbed.restore);
  return stubbed.spies[name] as Parameters<typeof plainCalls>[0];
}

const run = (...args: string[]) =>
  programWith(registerProofCommand).parseAsync(args, { from: "user" });

async function stdoutOf(...args: string[]): Promise<string> {
  const chunks: string[] = [];
  const spy = spyOn(process.stdout, "write").mockImplementation(
    (chunk: unknown) => {
      chunks.push(String(chunk));
      return true;
    },
  );
  try {
    await run(...args);
  } finally {
    spy.mockRestore();
  }
  return chunks.join("");
}

describe("registerProofCommand", () => {
  test("registers the documented command surface", () => {
    const { actual, expected } = goldenSurface("proof", registerProofCommand);
    expect(actual).toStrictEqual(expected);
  });
});

describe("kibi prove", () => {
  test("maps each selector to the prove options", async () => {
    const spy = stub(prove, "proveCommand", { exitCode: 3 });
    await run("prove");
    await run("prove", "--test", "TEST-1");
    await run("prove", "--requirement", "REQ-1", "--stale", "--resume");
    await run("prove", "--integration", "unit");
    await run("prove", "--all", "--integration-except", "e2e");
    expect(plainCalls(spy)).toStrictEqual([
      [{ all: true }],
      [{ testId: "TEST-1", all: false }],
      [{ requirement: "REQ-1", all: false, stale: true, resume: true }],
      [{ integration: "unit", all: false }],
      [{ integrationExcept: "e2e", all: false }],
    ]);
    expect(process.exitCode).toBe(3);
  });

  test("refuses two selectors or an exception without a selector", async () => {
    const spy = stub(prove, "proveCommand");
    const twoSelectors = new Error(
      "prove: choose exactly one selector: --test, --requirement, --integration, or --all",
    );
    for (const args of [
      ["--test", "T", "--all"],
      ["--requirement", "R", "--integration", "I"],
      ["--test", "T", "--requirement", "R"],
      ["--integration", "I", "--all"],
    ])
      await expect(run("prove", ...args)).rejects.toThrow(twoSelectors);
    await expect(run("prove", "--integration-except", "e2e")).rejects.toThrow(
      new Error(
        "prove: --integration-except requires a selector such as --all",
      ),
    );
    expect(spy.mock.calls.length).toBe(0);
  });
});

describe("kibi proof subcommands", () => {
  test("run-steps runs the steps file in the proof workspace", async () => {
    const spy = stub(stepRunner, "runProofSteps", 5);
    process.env.KIBI_PROOF_WORKSPACE = "/ws";
    await run("proof", "run-steps");
    expect(process.exitCode).toBe(5);
    Reflect.deleteProperty(process.env, "KIBI_PROOF_WORKSPACE");
    await run("proof", "run-steps", "s.json", "--test", "A", "B");
    expect(plainCalls(spy)).toStrictEqual([
      [{ workspaceRoot: "/ws", stepsPath: "proof/steps.json" }],
      [
        {
          workspaceRoot: process.cwd(),
          stepsPath: "s.json",
          testIds: ["A", "B"],
        },
      ],
    ]);
  });

  test("explain, prune, compact and migrate-legacy pass their options", async () => {
    const explainSpy = stub(explain, "proofExplainCommand", { exitCode: 1 });
    const pruneSpy = stub(prune, "proofPruneCommand", { exitCode: 2 });
    const compactSpy = stub(compact, "proofCompactCommand", { exitCode: 3 });
    const migrateSpy = stub(migrateLegacy, "proofMigrateLegacyCommand", {
      exitCode: 4,
    });
    await run("proof", "explain");
    await run(
      "proof",
      "explain",
      "REQ-1",
      "--requirement",
      "R",
      "--symbol",
      "S",
      "--json",
    );
    expect(process.exitCode).toBe(1);
    await run("proof", "prune");
    await run("proof", "prune", "--test", "T", "--keep", "3");
    expect(process.exitCode).toBe(2);
    await run("proof", "compact");
    await run("proof", "compact", "--test", "T", "--dry-run", "--json");
    expect(process.exitCode).toBe(3);
    await run("proof", "migrate-legacy");
    await run("proof", "migrate-legacy", "--test", "T");
    expect(process.exitCode).toBe(4);
    expect(plainCalls(explainSpy)).toStrictEqual([
      [{ json: false }],
      [{ id: "REQ-1", requirement: "R", symbol: "S", json: true }],
    ]);
    expect(plainCalls(pruneSpy)).toStrictEqual([
      [{ keep: "1" }],
      [{ test: "T", keep: "3" }],
    ]);
    expect(plainCalls(compactSpy)).toStrictEqual([
      [{ dryRun: false, json: false }],
      [{ test: "T", dryRun: true, json: true }],
    ]);
    expect(plainCalls(migrateSpy)).toStrictEqual([[{}], [{ test: "T" }]]);
  });

  test("prune passes no keep when commander leaves it unset", async () => {
    const pruneSpy = stub(prune, "proofPruneCommand");
    const program = programWith(registerProofCommand);
    const pruneCommand = program.commands
      .find((command) => command.name() === "proof")
      ?.commands.find((command) => command.name() === "prune");
    pruneCommand?.setOptionValue("keep", undefined);
    for (const option of pruneCommand?.options ?? []) {
      if (option.long === "--keep") option.defaultValue = undefined;
    }
    await program.parseAsync(["proof", "prune"], { from: "user" });
    expect(plainCalls(pruneSpy)).toStrictEqual([[{}]]);
  });
});

const FULL = {
  languages: ["typescript", "go"],
  buildSystems: ["bun", "make"],
  detectedRunners: ["bun test", "go test"],
  ciWorkflows: ["ci.yml", "release.yml"],
  currentIntegration: "ignored",
  currentIntegrations: [
    { id: "unit", producer: "junit", command: ["bun", "test"] },
    { id: "go", producer: "tap", command: ["go", "test", "./..."] },
  ],
  recommendation: "Add a JUnit reporter.",
  missing: ["junit reporter", "ci upload"],
  proposedIntegration: {
    id: "unit",
    producer: "junit",
    command: ["bun", "test", "--reporter=junit"],
  },
  integrationPlan: {
    planHash: "0123456789abcdef",
    actions: [{ id: "write-config" }, { id: "add-script" }],
  },
  integrationPlanReason: "Review the plan first.",
};

const MINIMAL = {
  languages: [],
  buildSystems: [],
  detectedRunners: [],
  ciWorkflows: [],
  currentIntegration: null,
  recommendation: "Nothing to do.",
  missing: [],
};

describe("kibi proof inspect", () => {
  test("renders every section of a full inspection", async () => {
    stub(inspect, "inspectProofEnvironment", FULL);
    expect(await stdoutOf("proof", "inspect")).toBe(
      [
        "Proof environment",
        "",
        "Languages: typescript, go",
        "Build systems: bun, make",
        "",
        "Detected runners:",
        "  ✓ bun test",
        "  ✓ go test",
        "CI workflows: ci.yml, release.yml",
        "",
        "Current integrations:",
        "  unit (junit: bun test)",
        "  go (tap: go test ./...)",
        "",
        "Recommendation: Add a JUnit reporter.",
        "",
        "Missing:",
        "  - junit reporter",
        "  - ci upload",
        "",
        "Proposed integration: unit (junit: bun test --reporter=junit)",
        "Integration plan: 0123456789ab (actions: write-config, add-script); rerun with --json for the plan to pass to kb_apply_plan.",
        "Review the plan first.",
        "",
      ].join("\n"),
    );
  });

  test("renders an empty inspection", async () => {
    stub(inspect, "inspectProofEnvironment", MINIMAL);
    expect(await stdoutOf("proof", "inspect")).toBe(
      [
        "Proof environment",
        "",
        "",
        "Detected runners:",
        "  (none detected)",
        "",
        "Current integration: none",
        "",
        "Recommendation: Nothing to do.",
        "",
      ].join("\n"),
    );
  });

  test("names a single integration and why there is no plan", async () => {
    stub(inspect, "inspectProofEnvironment", {
      ...MINIMAL,
      currentIntegration: "legacy",
      currentIntegrations: [],
      proposedIntegration: null,
      integrationPlan: null,
      integrationPlanReason: "Already configured.",
    });
    expect(await stdoutOf("proof", "inspect")).toBe(
      [
        "Proof environment",
        "",
        "",
        "Detected runners:",
        "  (none detected)",
        "",
        "Current integration: legacy",
        "",
        "Recommendation: Nothing to do.",
        "",
        "Integration plan: none. Already configured.",
        "",
      ].join("\n"),
    );
  });

  test("a plan without a reason prints only the plan line", async () => {
    stub(inspect, "inspectProofEnvironment", {
      ...MINIMAL,
      integrationPlan: { planHash: "abc", actions: [{ id: "a" }] },
    });
    expect(await stdoutOf("proof", "inspect")).toEndWith(
      "Recommendation: Nothing to do.\nIntegration plan: abc (actions: a); rerun with --json for the plan to pass to kb_apply_plan.\n",
    );
  });

  test("--json prints the result and options reach the inspector", async () => {
    const spy = stub(inspect, "inspectProofEnvironment", MINIMAL);
    expect(
      await stdoutOf(
        "proof",
        "inspect",
        "--json",
        "--update",
        "unit",
        "--command",
        "bun test",
      ),
    ).toBe(`${JSON.stringify(MINIMAL, null, 2)}\n`);
    await stdoutOf("proof", "inspect");
    expect(plainCalls(spy)).toStrictEqual([
      [process.cwd(), { update: "unit", command: ["bun", "test"] }],
      [process.cwd(), {}],
    ]);
    expect(process.exitCode).toBe(0);
  });
});

describe("parseCommandOption", () => {
  test("splits words on any whitespace", () => {
    expect(parseCommandOption("  bun \t test\n x ")).toStrictEqual([
      "bun",
      "test",
      "x",
    ]);
  });

  test("reads a JSON array of argv strings", () => {
    expect(parseCommandOption(' ["npx", "vitest run"] ')).toStrictEqual([
      "npx",
      "vitest run",
    ]);
  });

  test("refuses empty input and malformed or empty arrays", () => {
    expect(() => parseCommandOption("   ")).toThrow(
      new Error("--command must not be empty."),
    );
    expect(() => parseCommandOption("[nope")).toThrow(
      new Error(
        "--command must be a JSON array of argv strings or space-separated words.",
      ),
    );
    const nonEmpty = new Error(
      "--command must be a JSON array of non-empty argv strings.",
    );
    for (const value of ["[]", '["a", 1]', '["a", ""]', "[1]"])
      expect(() => parseCommandOption(value)).toThrow(nonEmpty);
  });
});
