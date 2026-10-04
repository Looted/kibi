// implements REQ-kibi-search-gold-set-gate
import { afterEach, describe, expect, test } from "bun:test";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The repository search gate end to end: `scripts/change-to-proof-eval.ts
 * --repo-kb` runs as its own process, as the proof workflow runs it, against a
 * small consumer KB built only through the real `kibi` CLI (`git init`,
 * `kibi init`, authored requirements, `kibi sync`). Each gold question is
 * asked through `kibi search --input -` with the engine the script restarts.
 */

const ROOT = path.resolve(import.meta.dir, "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "change-to-proof-eval.ts");
const KIBI_CLI = path.join(ROOT, "packages", "cli", "bin", "kibi");
const TEST_TIMEOUT_MS = 180_000;

/**
 * The host's own Kibi identity (proof CI's branch and workspace, path
 * overrides, telemetry opt-in) must not leak into the sandbox CLI.
 */
function sandboxEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      key === "KIBI_BRANCH" ||
      key === "KIBI_WORKSPACE" ||
      key === "KIBI_PROJECT_ROOT" ||
      key === "KIBI_ROOT" ||
      key === "KIBI_DIAGNOSTIC_MODE" ||
      key === "KIBI_CLI_DIAGNOSTIC_MODE" ||
      key === "KB_PATH" ||
      key.startsWith("KIBI_PROOF_") ||
      /^KIBI_.+_PATH$/.test(key)
    ) {
      Reflect.deleteProperty(env, key);
    }
  }
  return env;
}

function run(
  cwd: string,
  command: string,
  args: readonly string[],
): SpawnSyncReturns<string> {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: sandboxEnv(),
    maxBuffer: 64 * 1024 * 1024,
    timeout: 150_000,
  });
}

function mustRun(cwd: string, command: string, args: readonly string[]) {
  const result = run(cwd, command, args);
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited ${result.status}: ${result.stderr || result.stdout}`,
    );
  }
  return result;
}

function doc(frontMatter: string, body: string): string {
  return `---\n${frontMatter.trim()}\n---\n${body}\n`;
}

type ConsumerKb = {
  root: string;
  /** Directory beside the workspace for the gold and thresholds files. */
  base: string;
  write(relativePath: string, content: string): void;
  sync(): void;
};

const consumers: ConsumerKb[] = [];

afterEach(() => {
  for (const consumer of consumers.splice(0)) {
    // The gate leaves the engine it warmed running for the workspace.
    run(consumer.root, "node", [KIBI_CLI, "engine", "stop"]);
    rmSync(consumer.base, { recursive: true, force: true });
  }
});

const REQ_EXPORT_CSV = (status: string) =>
  doc(
    `
id: REQ-EXPORT-CSV
title: Reports download as CSV files
type: req
status: ${status}
priority: should
`,
    "A user can download any report as a CSV file.",
  );

/**
 * A consumer KB with three current requirements, one of which superseded a
 * fourth: the superseded one is what a naive match on call quota returns.
 */
function createConsumerKb(): ConsumerKb {
  const base = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "kibi-gold-gate-")),
  );
  const root = path.join(base, "workspace");
  mkdirSync(root);
  const consumer: ConsumerKb = {
    root,
    base,
    write(relativePath, content) {
      const target = path.join(root, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    },
    sync() {
      // `kibi sync` reads the Git-tracked source boundary.
      mustRun(root, "git", ["add", "-A", ".kb"]);
      mustRun(root, "node", [KIBI_CLI, "sync"]);
    },
  };
  consumers.push(consumer);
  mustRun(root, "git", ["init", "-q", "-b", "main"]);
  mustRun(root, "node", [KIBI_CLI, "init"]);
  consumer.write(
    ".kb/requirements/REQ-QUOTA-CALL-LEGACY.md",
    doc(
      `
id: REQ-QUOTA-CALL-LEGACY
title: Client calls were unlimited
type: req
status: superseded
priority: should
`,
      "Client calls were unlimited.",
    ),
  );
  consumer.write(
    ".kb/requirements/REQ-QUOTA-CALL.md",
    doc(
      `
id: REQ-QUOTA-CALL
title: A client call needs remaining call quota
type: req
status: open
priority: must
links:
  - type: supersedes
    target: REQ-QUOTA-CALL-LEGACY
`,
      "A client may call only with remaining call quota.",
    ),
  );
  consumer.write(".kb/requirements/REQ-EXPORT-CSV.md", REQ_EXPORT_CSV("open"));
  consumer.write(
    ".kb/requirements/REQ-LOGIN-LOCKOUT.md",
    doc(
      `
id: REQ-LOGIN-LOCKOUT
title: Accounts lock after five failed sign-in attempts
type: req
status: open
priority: must
`,
      "An account locks for fifteen minutes after five failed sign-in attempts.",
    ),
  );
  consumer.sync();
  return consumer;
}

type GoldCase = {
  id: string;
  query: string;
  expectedIds: string[];
  supersededIds?: string[];
  expectAbstention?: boolean;
};

const GOLD: readonly GoldCase[] = [
  {
    id: "quota",
    query: "how much call quota does a client need?",
    expectedIds: ["REQ-QUOTA-CALL"],
    supersededIds: ["REQ-QUOTA-CALL-LEGACY"],
  },
  {
    id: "export",
    query: "can a user download a report as csv?",
    expectedIds: ["REQ-EXPORT-CSV"],
  },
  {
    id: "lockout",
    query: "when does an account lock after failed sign-in?",
    expectedIds: ["REQ-LOGIN-LOCKOUT"],
  },
  {
    id: "off-topic",
    query: "how do we bake sourdough bread?",
    expectedIds: [],
    expectAbstention: true,
  },
];

/** Quality bars the healthy gold set meets exactly; latency stays lenient. */
const THRESHOLDS = {
  minRecallAt3: 1,
  maxSupersededResultRate: 0,
  minAbstentionPrecision: 1,
  minAbstentionRecall: 1,
  maxP50Ms: 60_000,
  maxP95Ms: 60_000,
};

type GateOutput = {
  evaluation: {
    caseCount: number;
    positiveCaseCount: number;
    recallAt3: number;
    supersededResultRate: number;
    abstentionCount: number;
    abstentionPrecision: number;
    abstentionRecall: number;
    latencyMs: { warmup: number; p50: number; p95: number; max: number };
    misses: { id: string }[];
    supersededResults: { id: string; ids: string[] }[];
    falseAbstentions: string[];
  };
  thresholds: Record<string, number>;
  failures: string[];
};

/**
 * Run the gate as CI does, from the workspace whose KB it asks, with the
 * gold set and thresholds files the caller writes.
 */
function runGate(
  consumer: ConsumerKb,
  gold: readonly GoldCase[],
  thresholds: Record<string, number>,
): SpawnSyncReturns<string> {
  const goldPath = path.join(consumer.base, "repo-search-gold.jsonl");
  const thresholdsPath = path.join(consumer.base, "thresholds.json");
  writeFileSync(
    goldPath,
    `${gold.map((gold) => JSON.stringify(gold)).join("\n")}\n`,
  );
  writeFileSync(thresholdsPath, `${JSON.stringify(thresholds, null, 2)}\n`);
  return run(consumer.root, process.execPath, [
    "run",
    SCRIPT,
    "--repo-kb",
    goldPath,
    "--thresholds",
    thresholdsPath,
  ]);
}

function gateOutput(result: SpawnSyncReturns<string>): GateOutput {
  return JSON.parse(result.stdout) as GateOutput;
}

describe("repository search gold-set gate (end to end)", () => {
  test(
    "a gold set the KB answers passes with every metric printed",
    () => {
      const consumer = createConsumerKb();

      const result = runGate(consumer, GOLD, THRESHOLDS);

      expect(result.stderr).not.toContain("gold-set gate failed");
      expect(result.status).toBe(0);
      const output = gateOutput(result);
      expect(output.failures).toEqual([]);
      expect(output.thresholds).toEqual(THRESHOLDS);
      expect(output.evaluation).toMatchObject({
        caseCount: 4,
        positiveCaseCount: 3,
        recallAt3: 1,
        supersededResultRate: 0,
        abstentionCount: 1,
        abstentionPrecision: 1,
        abstentionRecall: 1,
        misses: [],
        supersededResults: [],
        falseAbstentions: [],
      });
      const latency = output.evaluation.latencyMs;
      expect(latency.warmup).toBeGreaterThan(0);
      expect(latency.p50).toBeGreaterThan(0);
      expect(latency.p95).toBeGreaterThanOrEqual(latency.p50);
      expect(latency.max).toBeGreaterThanOrEqual(latency.p95);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "a latency ceiling lowered below what the KB achieves fails the gate naming the metric",
    () => {
      const consumer = createConsumerKb();

      const result = runGate(consumer, GOLD, {
        ...THRESHOLDS,
        maxP50Ms: 1,
        maxP95Ms: 1,
      });

      expect(result.status).toBe(1);
      const output = gateOutput(result);
      // Answer quality still meets its bars; only latency regressed.
      expect(output.evaluation.recallAt3).toBe(1);
      expect(output.failures).toEqual([
        expect.stringMatching(/^warm latency p50 \(ms\) \d+ is above 1$/),
        expect.stringMatching(/^warm latency p95 \(ms\) \d+ is above 1$/),
      ]);
      expect(result.stderr).toContain("kb_search gold-set gate failed:");
      for (const failure of output.failures) {
        expect(result.stderr).toContain(`  - ${failure}`);
      }
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "superseding a requirement the gold set expects fails the gate and lists the false abstention",
    () => {
      const consumer = createConsumerKb();
      consumer.write(
        ".kb/requirements/REQ-EXPORT-CSV.md",
        REQ_EXPORT_CSV("superseded"),
      );
      consumer.sync();

      const result = runGate(consumer, GOLD, THRESHOLDS);

      expect(result.status).toBe(1);
      const output = gateOutput(result);
      // No current requirement governs the export question any more, so the
      // answer abstains where the gold set expects an answer.
      expect(output.evaluation.falseAbstentions).toEqual(["export"]);
      expect(output.evaluation.abstentionCount).toBe(2);
      expect(output.evaluation.abstentionPrecision).toBe(0.5);
      expect(output.failures).toContain(
        "abstention precision 0.500 is below 1",
      );
      expect(result.stderr).toContain("kb_search gold-set gate failed:");
      expect(result.stderr).toContain(
        "  - abstention precision 0.500 is below 1",
      );
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "a gold question the CLI cannot answer fails the gate",
    () => {
      const consumer = createConsumerKb();

      const result = runGate(
        consumer,
        [...GOLD, { id: "blank", query: "", expectedIds: ["REQ-EXPORT-CSV"] }],
        THRESHOLDS,
      );

      // The CLI rejects the blank question; the gate stops without scoring.
      expect(result.status).not.toBe(0);
      expect(result.stdout).not.toContain('"evaluation"');
      expect(result.stderr).toMatch(
        /kibi search (--input - exited \d+|did not succeed)/,
      );
    },
    TEST_TIMEOUT_MS,
  );
});
