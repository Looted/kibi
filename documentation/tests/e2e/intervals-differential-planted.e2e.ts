/*
 * E2E: the intervals.pl differential run fails on a planted disagreement.
 *
 * REQ-kibi-intervals-verified — intervals.pl, the Lean model and the CLP(Q)
 * and CLP(FD) oracle must agree on every generated case. Agreement on a real
 * run says little unless the run fails when one side is wrong, so this
 * exerciser runs scripts/intervals-differential.ts as a process three times
 * on the same seeded cases, with the real Lean executable and the real
 * oracle:
 *
 *   1. Control: intervals.pl as shipped. The run exits 0 with no
 *      disagreement.
 *   2. A planted one-variable satisfiability misdecision: intervals.pl runs
 *      through a wrapper that flips its answer on the first one-variable
 *      satisfiability case. The run exits 1, counts one disagreement and prints that case
 *      with each side's answer.
 *   3. A planted entailment misdecision: the wrapper flips the answer on the
 *      first one-variable entailment case instead, with the same result.
 *
 * Run via `bun run documentation/tests/e2e/intervals-differential-planted.e2e.ts
 * --lean proof/lean/.lake/build/bin/kibi-intervals` after `lake --dir
 * proof/lean build`.
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { generateCases } from "../../../scripts/intervals-differential";

const REPO_ROOT = process.cwd();
const CASES = 2000;
const SEED = 20261030;

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error(`E2E FAILURE: ${message}`);
    process.exit(1);
  }
}

const leanFlag = process.argv.indexOf("--lean");
const lean = resolve(
  leanFlag === -1
    ? "proof/lean/.lake/build/bin/kibi-intervals"
    : (process.argv[leanFlag + 1] ?? ""),
);
assert(
  existsSync(lean),
  `the Lean executable ${lean} is missing; run lake --dir proof/lean build`,
);
const which = spawnSync("sh", ["-c", "command -v swipl"], {
  encoding: "utf8",
});
const swipl = which.stdout.trim();
assert(which.status === 0 && swipl !== "", "swipl is not on PATH");

const cases = generateCases(CASES, SEED);
/** A case whose comparisons all constrain one variable, variable 0. */
const oneVariable = (line: string): boolean =>
  line
    .split(";")
    .slice(2)
    .flatMap((part) => part.split(","))
    .every((comparison) => comparison.startsWith("0:"));
const firstSatisfiability = cases.findIndex(
  (line) => line.startsWith("S;") && oneVariable(line),
);
const firstEntailment = cases.findIndex(
  (line) => line.startsWith("E;") && oneVariable(line),
);
assert(firstSatisfiability >= 0, "no satisfiability case was generated");
assert(firstEntailment >= 0, "no entailment case was generated");

const root = realpathSync(mkdtempSync(join(tmpdir(), "intervals-planted-")));

/**
 * An SWI-Prolog stand-in for the intervals.pl side: it runs the real
 * swipl on the intervals.pl driver and flips the answer of one case.
 */
function plantedSwipl(caseIndex: number): string {
  const file = join(root, `swipl-flip-${caseIndex}`);
  writeFileSync(
    file,
    `#!/bin/sh
"${swipl}" "$@" | awk 'NR == ${caseIndex + 1} { if ($0 == "true") $0 = "false"; else if ($0 == "false") $0 = "true"; else $0 = "flipped-" $0 } { print }'
`,
  );
  chmodSync(file, 0o755);
  return file;
}

function differential(swiplExecutable: string) {
  return spawnSync(
    process.execPath,
    [
      "scripts/intervals-differential.ts",
      "--lean",
      lean,
      "--swipl",
      swiplExecutable,
      "--require-oracle",
      "--cases",
      String(CASES),
      "--seed",
      String(SEED),
    ],
    { cwd: REPO_ROOT, encoding: "utf8", timeout: 600_000 },
  );
}

function assertPlantedMismatch(caseIndex: number, kind: string): void {
  const run = differential(plantedSwipl(caseIndex));
  assert(
    run.status === 1,
    `a planted ${kind} misdecision exited ${run.status}: ${run.stdout}${run.stderr}`,
  );
  assert(
    run.stdout.includes(`${CASES} cases (seed ${SEED})`) &&
      run.stdout.includes(", 1 disagreements"),
    `a planted ${kind} misdecision was not counted once: ${run.stdout}`,
  );
  const reported = run.stderr
    .split("\n")
    .find((line) => line.startsWith(`${cases[caseIndex]}  `));
  assert(
    reported !== undefined,
    `the ${kind} case ${cases[caseIndex]} was not reported: ${run.stderr}`,
  );
  const answers = Object.fromEntries(
    (reported as string)
      .slice((cases[caseIndex] as string).length + 2)
      .split(" ")
      .map((pair) => pair.split("=") as [string, string]),
  );
  assert(
    answers["intervals.pl"] !== answers.lean &&
      answers.lean === answers["CLP(Q)/CLP(FD)"],
    `the ${kind} report does not single out intervals.pl: ${reported}`,
  );
}

try {
  // 1. Control: the shipped intervals.pl agrees with Lean and the oracle.
  const control = differential(swipl);
  assert(
    control.status === 0 && control.stdout.includes(", 0 disagreements"),
    `the unplanted run did not agree: ${control.stdout}${control.stderr}`,
  );

  // 2. A one-variable satisfiability misdecision fails the run.
  assertPlantedMismatch(firstSatisfiability, "satisfiability");

  // 3. An entailment misdecision fails the run.
  assertPlantedMismatch(firstEntailment, "entailment");

  console.log("intervals differential planted e2e: all assertions passed");
} finally {
  rmSync(root, { recursive: true, force: true });
}
