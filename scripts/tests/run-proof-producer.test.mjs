import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";
import {
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
    return true;
  } catch {
    return false;
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
  const deadline = Date.now() + 2000;
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
