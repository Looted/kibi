/**
 * Differential test of the one-variable numeric decision procedure.
 *
 * Generates seeded random cases and decides each three ways: intervals.pl
 * (the code Kibi ships, on the bundled SWI-Prolog), the Lean model the
 * proofs in proof/lean are about (its executable), and an independent
 * CLP(Q)/CLP(FD) oracle (on an SWI-Prolog that ships library(clpq)). The
 * Lean proofs show the model decides satisfiability and entailment exactly;
 * agreement shows intervals.pl computes what the model computes.
 *
 * Usage: bun scripts/intervals-differential.ts --lean <exe> [--oracle-swipl
 * <swipl>] [--require-oracle] [--swipl <swipl>] [--cases <n>] [--seed <n>]
 *
 * Without an SWI-Prolog that has library(clpq) the oracle is skipped with a
 * note and intervals.pl is compared with the Lean model alone;
 * --require-oracle or KIBI_REQUIRE_ORACLE=1 (CI) makes a missing oracle an
 * error.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const DRIVERS = path.join(REPO_ROOT, "proof/lean/differential");
const INTERVALS_PL = path.join(REPO_ROOT, "packages/core/src/intervals.pl");
const OPS = ["eq", "neq", "lt", "lte", "gt", "gte"] as const;

type Options = {
  lean: string;
  swipl: string;
  oracleSwipl: string;
  requireOracle: boolean;
  cases: number;
  seed: number;
};

function parseOptions(argv: readonly string[]): Options {
  const value = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const lean = value("--lean");
  if (lean === undefined) throw new Error("--lean <executable> is required");
  return {
    lean: path.resolve(lean),
    swipl: value("--swipl") ?? "swipl",
    oracleSwipl:
      value("--oracle-swipl") ??
      process.env.KIBI_ORACLE_SWIPL ??
      "/usr/bin/swipl",
    requireOracle:
      argv.includes("--require-oracle") ||
      process.env.KIBI_REQUIRE_ORACLE === "1",
    cases: Number(value("--cases") ?? "20000"),
    seed: Number(value("--seed") ?? "20261024"),
  };
}

/** mulberry32: a small seeded generator, so a failing seed replays. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

/**
 * Small numerators and denominators so bounds collide often: equal values,
 * strict against closed ends, fractional bounds on integer variables and
 * excluded points on the ends are the cases that break interval code.
 */
function constraint(random: () => number, variable: number): string {
  const numerator = Math.floor(random() * 13) - 6;
  const op = pick(random, OPS);
  // Facts carry floats too: a fifth of the values are floats with an exact
  // binary value (k/4), which intervals.pl compares against the rationals
  // and integers of the same case.
  if (random() < 0.2) {
    const value = numerator / pick(random, [1, 2, 4]);
    return `${variable}:${op}:${Number.isInteger(value) ? value.toFixed(1) : String(value)}`;
  }
  const denominator = pick(random, [1, 1, 1, 2, 3]);
  return `${variable}:${op}:${numerator}/${denominator}`;
}

export function generateCases(count: number, seed: number): string[] {
  const random = generator(seed);
  const cases: string[] = [];
  for (let index = 0; index < count; index++) {
    const variables = random() < 0.8 ? 1 : 2;
    const ints = Array.from({ length: variables }, (_, v) => v).filter(
      () => random() < 0.5,
    );
    const constraints = Array.from(
      { length: 1 + Math.floor(random() * 5) },
      () => constraint(random, Math.floor(random() * variables)),
    );
    if (random() < 0.7) {
      cases.push(`S;${ints.join(",")};${constraints.join(",")}`);
    } else {
      const claim = constraint(random, Math.floor(random() * variables));
      cases.push(`E;${ints.join(",")};${constraints.join(",")};${claim}`);
    }
  }
  return cases;
}

function decide(
  label: string,
  command: string,
  args: readonly string[],
  input: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const run = spawnSync(command, args, {
    input,
    encoding: "utf8",
    env,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (run.error)
    throw new Error(`${label} could not run: ${run.error.message}`);
  if (run.status !== 0) {
    throw new Error(`${label} exited with ${run.status}: ${run.stderr.trim()}`);
  }
  return run.stdout.split("\n").filter((line) => line !== "");
}

/** Why the CLP oracle cannot run on `swipl`, or null when it can. */
function oracleProblem(swipl: string): string | null {
  const run = spawnSync(
    swipl,
    ["-q", "-g", "use_module(library(clpq)), halt", "-t", "halt(1)"],
    { encoding: "utf8" },
  );
  if (run.error) return `${swipl} is not available (${run.error.message})`;
  return run.status === 0 ? null : `${swipl} has no library(clpq)`;
}

export function runDifferential(): number {
  const options = parseOptions(process.argv.slice(2));
  const missingOracle = oracleProblem(options.oracleSwipl);
  if (missingOracle !== null) {
    if (options.requireOracle) {
      console.error(`the CLP oracle cannot run: ${missingOracle}`);
      return 1;
    }
    console.error(
      `note: skipping the CLP(Q)/CLP(FD) oracle: ${missingOracle}; comparing intervals.pl with the Lean model only (install swi-prolog with clpq, or pass --oracle-swipl)`,
    );
  }
  const cases = generateCases(options.cases, options.seed);
  const input = `${cases.join("\n")}\n`;
  const answers = {
    "intervals.pl": decide(
      "intervals.pl",
      options.swipl,
      [path.join(DRIVERS, "intervals_driver.pl")],
      input,
      { ...process.env, KIBI_INTERVALS_PL: INTERVALS_PL },
    ),
    lean: decide("the Lean model", options.lean, [], input),
    ...(missingOracle === null
      ? {
          "CLP(Q)/CLP(FD)": decide(
            "the CLP oracle",
            options.oracleSwipl,
            [path.join(DRIVERS, "clp_oracle.pl")],
            input,
          ),
        }
      : {}),
  };
  for (const [label, lines] of Object.entries(answers)) {
    if (lines.length !== cases.length) {
      console.error(
        `${label} answered ${lines.length} of ${cases.length} cases`,
      );
      return 1;
    }
  }
  const mismatches: string[] = [];
  let satisfied = 0;
  cases.forEach((testCase, index) => {
    const row = Object.entries(answers).map(
      ([label, lines]) => `${label}=${lines[index]}`,
    );
    const values = new Set(Object.values(answers).map((lines) => lines[index]));
    if (values.size > 1) mismatches.push(`${testCase}  ${row.join(" ")}`);
    if (answers.lean[index] === "true") satisfied++;
  });
  console.log(
    `${cases.length} cases (seed ${options.seed}): ${satisfied} true, ${cases.length - satisfied} false, ${mismatches.length} disagreements`,
  );
  for (const mismatch of mismatches.slice(0, 20)) console.error(mismatch);
  return mismatches.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(runDifferential());
