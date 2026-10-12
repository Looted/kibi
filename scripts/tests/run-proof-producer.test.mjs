import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";
import {
  acceptUnitResultsLedger,
  createTestFileReuse,
  groupProofSteps,
  proofStepConcurrency,
  reusableBunTestFiles,
  runProofProducer,
  validateProofSteps,
  validateRequestedTestIds,
} from "../run-proof-producer.mjs";

const tempDirs = [];

function tempDir() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "kibi-proof-producer-"));
  tempDirs.push(directory);
  return directory;
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  // A killed process stays signalable as a zombie until its new parent reaps
  // it, which can lag on a loaded host; it no longer runs anything.
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return (
      stat.slice(stat.lastIndexOf(")") + 2, stat.lastIndexOf(")") + 3) !== "Z"
    );
  } catch {
    return true;
  }
}

test.after(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("proof producer requires exact non-empty unique contracts and steps", () => {
  assert.throws(() => validateRequestedTestIds([]), /non-empty JSON array/);
  assert.throws(
    () => validateRequestedTestIds(["TEST-ONE", "TEST-ONE"]),
    /duplicate requested test ID/,
  );
  assert.throws(
    () => validateProofSteps([{ test_id: "TEST-ONE", steps: [] }]),
    /at least one step/,
  );
  assert.throws(
    () =>
      validateProofSteps([
        { test_id: "TEST-ONE", steps: [["node", "-e", "0"]] },
        { test_id: "TEST-ONE", steps: [["node", "-e", "0"]] },
      ]),
    /duplicate test_id/,
  );
  assert.throws(
    () => validateProofSteps([{ test_id: "TEST-ONE", steps: [[]] }]),
    /non-empty string argv array/,
  );
  assert.throws(
    () => validateProofSteps([{ test_id: "TEST-ONE", steps: [["  "]] }]),
    /non-empty string argv array/,
  );
  assert.throws(
    () => validateProofSteps([{ test_id: "TEST-ONE", steps: [["node", 1]] }]),
    /non-empty string argv array/,
  );
});

test("proof producer rejects a partially known selection", async () => {
  await assert.rejects(
    () =>
      runProofProducer({
        testIds: ["TEST-KNOWN", "TEST-UNKNOWN"],
        entries: [
          { test_id: "TEST-KNOWN", steps: [[process.execPath, "-e", ""]] },
        ],
        env: { ...process.env },
        write: () => undefined,
      }),
    /no proof steps found.*TEST-UNKNOWN/,
  );
});

test("proof producer does not retry a failed assertion step", async () => {
  const directory = tempDir();
  const marker = path.join(directory, "attempts");
  const result = await runProofProducer({
    workspaceRoot: directory,
    testIds: ["TEST-FAIL-ONCE"],
    entries: [
      {
        test_id: "TEST-FAIL-ONCE",
        steps: [
          [
            process.execPath,
            "-e",
            `require('node:fs').appendFileSync(${JSON.stringify(marker)}, 'x'); process.exit(7)`,
          ],
        ],
      },
    ],
    env: { ...process.env },
    write: () => undefined,
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].outcome, "failed");
  assert.equal(readFileSync(marker, "utf8"), "x");
});

test("proof producer records synchronous spawn failures as failed attempts", async () => {
  const result = await runProofProducer({
    testIds: ["TEST-SPAWN-THROW"],
    entries: [
      {
        test_id: "TEST-SPAWN-THROW",
        steps: [[process.execPath, "-e", ""]],
      },
    ],
    env: { ...process.env },
    spawnProcess: () => {
      throw new Error("spawn boom");
    },
    write: () => undefined,
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].outcome, "failed");
  assert.equal(result.attempts[0].error, "spawn boom");
});

test("proof producer runs each step from the declared workspace", async () => {
  const directory = tempDir();
  const marker = path.join(directory, "cwd");
  const result = await runProofProducer({
    workspaceRoot: directory,
    testIds: ["TEST-CWD"],
    entries: [
      {
        test_id: "TEST-CWD",
        steps: [
          [
            process.execPath,
            "-e",
            `require('node:fs').writeFileSync('cwd', process.cwd())`,
          ],
        ],
      },
    ],
    env: { ...process.env },
    write: () => undefined,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(readFileSync(marker, "utf8"), directory);
});

test("proof producer times out and cleans up a descendant process group", async () => {
  const directory = tempDir();
  const descendantPidFile = path.join(directory, "descendant.pid");
  const script = path.join(directory, "tree.mjs");
  writeFileSync(
    script,
    `import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)']);
process.on('SIGTERM', () => process.exit(0));
await import('node:fs/promises').then(({ writeFile }) => writeFile(${JSON.stringify(descendantPidFile)}, String(child.pid)));
setInterval(() => {}, 1000);
`,
    "utf8",
  );

  const result = await runProofProducer({
    workspaceRoot: directory,
    testIds: ["TEST-TIMEOUT"],
    entries: [{ test_id: "TEST-TIMEOUT", steps: [[process.execPath, script]] }],
    env: { ...process.env },
    timeoutMs: 1000,
    write: () => undefined,
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.attempts[0].outcome, "timed_out");
  assert.equal(result.attempts[0].timed_out, true);

  assert.equal(
    existsSync(descendantPidFile),
    true,
    "timed out step did not record its descendant PID",
  );
  const descendantPid = Number(readFileSync(descendantPidFile, "utf8"));
  assert.ok(Number.isInteger(descendantPid) && descendantPid > 0);
  const deadline = Date.now() + 5000;
  let descendantAlive = isAlive(descendantPid);
  while (Date.now() < deadline && descendantAlive) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    descendantAlive = isAlive(descendantPid);
  }
  assert.equal(
    descendantAlive,
    false,
    "timed out step left a descendant alive",
  );
});

test("proof producer runs an identical argv once and fans the attempt out", async () => {
  let spawns = 0;
  const result = await runProofProducer({
    testIds: ["TEST-A", "TEST-B", "TEST-C"],
    entries: [
      {
        test_id: "TEST-A",
        steps: [
          [process.execPath, "-e", "process.exit(0)"],
          [process.execPath, "-e", "process.exit(3)"],
        ],
      },
      {
        test_id: "TEST-B",
        steps: [[process.execPath, "-e", "process.exit(0)"]],
      },
      {
        test_id: "TEST-C",
        steps: [[process.execPath, "-e", "process.exit(3)"]],
      },
    ],
    env: { ...process.env },
    spawnProcess: (command, args, options) => {
      spawns += 1;
      return spawn(command, args, options);
    },
    write: () => undefined,
  });

  assert.equal(spawns, 2);
  assert.equal(result.exitCode, 1);
  assert.equal(result.attempts.length, 4);
  assert.deepEqual(
    result.attempts.map((attempt) => [
      attempt.test_id,
      attempt.step_index,
      attempt.outcome,
    ]),
    [
      ["TEST-A", 1, "passed"],
      ["TEST-A", 2, "failed"],
      ["TEST-B", 1, "passed"],
      ["TEST-C", 1, "failed"],
    ],
  );
  const grouped = groupProofSteps([
    {
      test_id: "TEST-A",
      steps: [
        ["node", "a"],
        ["node", "b"],
      ],
    },
    { test_id: "TEST-B", steps: [["node", "a"]] },
  ]);
  assert.equal(grouped.groups.length, 2);
  assert.equal(grouped.groups[0].slots.length, 2);
});

test("proof step concurrency stays sequential unless configured", () => {
  assert.equal(proofStepConcurrency({}), 1);
  assert.equal(proofStepConcurrency({ KIBI_PROOF_STEP_CONCURRENCY: "0" }), 1);
  assert.equal(proofStepConcurrency({ KIBI_PROOF_STEP_CONCURRENCY: "2" }), 2);
});

test("proof producer overlaps distinct commands when concurrency is set", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const result = await runProofProducer({
    testIds: ["TEST-P1", "TEST-P2"],
    entries: [
      { test_id: "TEST-P1", steps: [["sleep-a"]] },
      { test_id: "TEST-P2", steps: [["sleep-b"]] },
    ],
    env: { ...process.env, KIBI_PROOF_STEP_CONCURRENCY: "2" },
    spawnProcess: () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const child = new EventEmitter();
      child.pid = 1;
      queueMicrotask(() => {
        inFlight -= 1;
        child.emit("close", 0, null);
      });
      return child;
    },
    write: () => undefined,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(maxInFlight, 2);
  assert.equal(result.attempts.length, 2);
});

test("proof steps run without the operator's usage-telemetry opt-in", async () => {
  const seen = [];
  await runProofProducer({
    workspaceRoot: tempDir(),
    testIds: ["TEST-ENV"],
    entries: [{ test_id: "TEST-ENV", steps: [[process.execPath, "-e", ""]] }],
    env: {
      ...process.env,
      KIBI_DIAGNOSTIC_MODE: "1",
      KIBI_CLI_DIAGNOSTIC_MODE: "1",
      KIBI_PROOF_KEEP: "yes",
    },
    spawnProcess: (command, args, options) => {
      seen.push(options.env);
      return spawn(command, args, options);
    },
    write: () => undefined,
  });

  assert.equal(seen.length, 1);
  assert.equal("KIBI_DIAGNOSTIC_MODE" in seen[0], false);
  assert.equal("KIBI_CLI_DIAGNOSTIC_MODE" in seen[0], false);
  assert.equal(seen[0].KIBI_PROOF_KEEP, "yes");
});

test("proof producer reports each test's own step outcomes for kibi prove", async () => {
  const directory = tempDir();
  const reportPath = path.join(directory, "runs", "self-proof.tests.json");
  const pass = [process.execPath, "-e", "process.exit(0)"];
  const fail = [process.execPath, "-e", "process.exit(4)"];
  const lines = [];
  const stepEnvs = [];
  const result = await runProofProducer({
    workspaceRoot: directory,
    testIds: ["TEST-GREEN", "TEST-RED"],
    entries: [
      { test_id: "TEST-GREEN", steps: [pass] },
      { test_id: "TEST-RED", steps: [pass, fail] },
    ],
    env: { ...process.env, KIBI_PROOF_TEST_REPORT: reportPath },
    spawnProcess: (command, args, options) => {
      stepEnvs.push(options.env);
      return spawn(command, args, options);
    },
    write: (line) => lines.push(line),
  });

  assert.equal(result.exitCode, 1);
  // The shared passing step runs once; neither step sees the report path.
  assert.equal(stepEnvs.length, 2);
  assert.ok(stepEnvs.every((env) => !("KIBI_PROOF_TEST_REPORT" in env)));
  const written = JSON.parse(readFileSync(reportPath, "utf8"));
  assert.deepEqual(written, result.report);
  assert.deepEqual(written, {
    version: "kibi.proof-test-report.v1",
    tests: [
      {
        test_id: "TEST-GREEN",
        outcome: "passed",
        steps: [
          { step_index: 1, command: pass, outcome: "passed", exit_code: 0 },
        ],
      },
      {
        test_id: "TEST-RED",
        outcome: "failed",
        steps: [
          { step_index: 1, command: pass, outcome: "passed", exit_code: 0 },
          { step_index: 2, command: fail, outcome: "failed", exit_code: 4 },
        ],
      },
    ],
  });
  assert.ok(
    lines.includes("[proof] 1 step(s) failed in 1 of 2 test(s): TEST-RED"),
    lines.join("\n"),
  );
});

test("proof producer writes no test report unless kibi prove asks for one", async () => {
  const directory = tempDir();
  const result = await runProofProducer({
    workspaceRoot: directory,
    testIds: ["TEST-QUIET"],
    entries: [
      { test_id: "TEST-QUIET", steps: [[process.execPath, "-e", "0"]] },
    ],
    env: { ...process.env, KIBI_PROOF_TEST_REPORT: "" },
    write: () => undefined,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.tests[0].outcome, "passed");
  assert.deepEqual(readdirSync(directory), []);
});

function reuseWorkspace() {
  const root = tempDir();
  mkdirSync(path.join(root, "pkg", "tests", "deep"), { recursive: true });
  mkdirSync(path.join(root, "pkg", "tests", "node_modules"), {
    recursive: true,
  });
  for (const file of [
    "pkg/tests/a.test.ts",
    "pkg/tests/deep/b.spec.mjs",
    "pkg/tests/helper.ts",
    "pkg/tests/node_modules/c.test.ts",
    "pkg/tests/d.test.ts",
  ]) {
    writeFileSync(path.join(root, file), "\n");
  }
  return root;
}

const COMMIT = "a".repeat(40);

function cleanLedger(files) {
  return {
    version: "kibi.unit-test-results.v1",
    commit: COMMIT,
    shards: ["demo"],
    files: Object.fromEntries(
      files.map((file) => [file, { tests: 2, failures: 0, skipped: 0 }]),
    ),
  };
}

test("only whole-file bun test steps under known flags are reusable", () => {
  const root = reuseWorkspace();
  assert.deepEqual(
    reusableBunTestFiles(
      ["bun", "test", "--timeout", "60000", "--isolate", "./pkg/tests"],
      root,
    ),
    ["pkg/tests/a.test.ts", "pkg/tests/d.test.ts", "pkg/tests/deep/b.spec.mjs"],
  );
  assert.deepEqual(
    reusableBunTestFiles(["bun", "test", "./pkg/tests/a.test.ts"], root),
    ["pkg/tests/a.test.ts"],
  );
  for (const argv of [
    ["bun", "test", "-t", "name", "./pkg/tests/a.test.ts"],
    ["bun", "test", "--test-name-pattern", "x", "./pkg/tests/a.test.ts"],
    ["bun", "test", "--cwd", "pkg", "./tests/a.test.ts"],
    ["bun", "test", "pkg/tests/a.test.ts"],
    ["bun", "test", "./pkg/tests/missing.test.ts"],
    ["bun", "test", "./pkg/../pkg/tests/a.test.ts"],
    ["bun", "test", "--timeout", "./pkg/tests/a.test.ts"],
    ["bun", "test"],
    ["node", "--test", "./pkg/tests/a.test.ts"],
  ]) {
    assert.equal(reusableBunTestFiles(argv, root), null, argv.join(" "));
  }
});

test("unit results are accepted only for the exact clean commit", () => {
  const ledger = {
    ...cleanLedger(["x.test.ts"]),
    files: {
      "x.test.ts": { tests: 2, failures: 0, skipped: 0 },
      "failed.test.ts": { tests: 2, failures: 1, skipped: 0 },
      "skipped.test.ts": { tests: 2, failures: 0, skipped: 1 },
      "empty.test.ts": { tests: 0, failures: 0, skipped: 0 },
    },
  };
  const clean = { commit: COMMIT, dirty: false };
  assert.deepEqual(
    [...acceptUnitResultsLedger(ledger, clean).files],
    ["x.test.ts"],
  );
  assert.match(
    acceptUnitResultsLedger(ledger, { commit: "b".repeat(40), dirty: false })
      .reason,
    /not b{40}/,
  );
  assert.match(
    acceptUnitResultsLedger(ledger, { commit: COMMIT, dirty: true }).reason,
    /tracked files differ/,
  );
  assert.match(
    acceptUnitResultsLedger({ ...ledger, commit: null }, clean).reason,
    /not bound to a clean commit/,
  );
  assert.match(
    acceptUnitResultsLedger({ ...ledger, version: "v0" }, clean).reason,
    /unknown version/,
  );
  assert.match(
    acceptUnitResultsLedger({ unavailable: "no CI run" }, clean).reason,
    /unavailable: no CI run/,
  );
  assert.match(acceptUnitResultsLedger([], clean).reason, /malformed/);
});

test("test file reuse waits for the ledger and falls back to running", async () => {
  const root = tempDir();
  const ledgerPath = path.join(root, "results.json");
  const lines = [];
  let sleeps = 0;
  const reuse = createTestFileReuse({
    env: { KIBI_PROOF_UNIT_RESULTS: ledgerPath },
    workspaceRoot: root,
    write: (line) => lines.push(line),
    identity: () => ({ commit: COMMIT, dirty: false }),
    sleep: async () => {
      sleeps += 1;
      writeFileSync(ledgerPath, JSON.stringify(cleanLedger(["a.test.ts"])));
    },
  });
  assert.equal(await reuse.source(["a.test.ts"]), "unit-coverage");
  assert.equal(sleeps, 1);
  assert.equal(await reuse.source(["a.test.ts", "b.test.ts"]), null);
  reuse.recordPassed(["b.test.ts"]);
  assert.equal(await reuse.source(["b.test.ts"]), "this-run");
  assert.equal(await reuse.source(["a.test.ts", "b.test.ts"]), "unit-coverage");
  assert.deepEqual(lines, [
    `[proof] unit results accepted for ${COMMIT}: 1 clean test file(s)`,
  ]);

  const missing = [];
  const noLedger = createTestFileReuse({
    env: {
      KIBI_PROOF_UNIT_RESULTS: path.join(root, "never.json"),
      KIBI_PROOF_UNIT_RESULTS_WAIT_MS: "0",
    },
    workspaceRoot: root,
    write: (line) => missing.push(line),
    sleep: async () => undefined,
  });
  assert.equal(await noLedger.source(["a.test.ts"]), null);
  assert.match(missing[0], /did not appear/);
  const unset = createTestFileReuse({ env: {}, workspaceRoot: root });
  assert.equal(await unset.source(["a.test.ts"]), null);
});

test("proof producer runs a test file once and reuses it for later steps", async () => {
  const root = reuseWorkspace();
  const spawned = [];
  const lines = [];
  const result = await runProofProducer({
    workspaceRoot: root,
    testIds: ["TEST-DIR", "TEST-FILE", "TEST-FILTERED", "TEST-NODE"],
    entries: [
      { test_id: "TEST-DIR", steps: [["bun", "test", "./pkg/tests"]] },
      {
        test_id: "TEST-FILE",
        steps: [["bun", "test", "--isolate", "./pkg/tests/a.test.ts"]],
      },
      {
        test_id: "TEST-FILTERED",
        steps: [["bun", "test", "-t", "x", "./pkg/tests/a.test.ts"]],
      },
      { test_id: "TEST-NODE", steps: [["node", "-e", "0"]] },
    ],
    env: {
      ...process.env,
      KIBI_PROOF_UNIT_RESULTS: "",
      KIBI_PROOF_STEP_CONCURRENCY: "1",
    },
    spawnProcess: (command, args) => {
      spawned.push([command, ...args].join(" "));
      const child = new EventEmitter();
      child.pid = 1;
      queueMicrotask(() => child.emit("close", 0, null));
      return child;
    },
    write: (line) => lines.push(line),
  });

  assert.equal(result.exitCode, 0);
  // Non-reusable steps run first; the file step reuses the directory pass.
  assert.deepEqual(spawned, [
    "bun test -t x ./pkg/tests/a.test.ts",
    "node -e 0",
    "bun test ./pkg/tests",
  ]);
  const reused = result.attempts.find(
    (attempt) => attempt.test_id === "TEST-FILE",
  );
  assert.equal(reused.outcome, "passed");
  assert.equal(reused.exit_code, 0);
  assert.equal(reused.reused, "this-run");
  assert.ok(
    lines.includes(
      "[proof] TEST-FILE step 1: bun test --isolate ./pkg/tests/a.test.ts reused (this-run)",
    ),
  );
  assert.ok(
    lines.includes("[proof] 1 of 4 distinct step(s) reused test file results"),
  );
  assert.deepEqual(
    result.report.tests.map((entry) => [entry.test_id, entry.outcome]),
    [
      ["TEST-DIR", "passed"],
      ["TEST-FILE", "passed"],
      ["TEST-FILTERED", "passed"],
      ["TEST-NODE", "passed"],
    ],
  );
});

test("proof producer never reuses a failed run of the same files", async () => {
  const root = reuseWorkspace();
  let spawns = 0;
  const result = await runProofProducer({
    workspaceRoot: root,
    testIds: ["TEST-DIR", "TEST-FILE"],
    entries: [
      { test_id: "TEST-DIR", steps: [["bun", "test", "./pkg/tests"]] },
      {
        test_id: "TEST-FILE",
        steps: [["bun", "test", "./pkg/tests/a.test.ts"]],
      },
    ],
    env: {
      ...process.env,
      KIBI_PROOF_UNIT_RESULTS: "",
      KIBI_PROOF_STEP_CONCURRENCY: "1",
    },
    spawnProcess: () => {
      spawns += 1;
      const child = new EventEmitter();
      child.pid = 1;
      queueMicrotask(() => child.emit("close", 1, null));
      return child;
    },
    write: () => undefined,
  });
  assert.equal(spawns, 2);
  assert.equal(result.exitCode, 1);
  assert.ok(result.attempts.every((attempt) => attempt.reused === undefined));
});
