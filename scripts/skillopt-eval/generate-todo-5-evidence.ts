import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildTodo5EvidenceDocument } from "./runtime/paid-launch-evidence";
import {
  debitSubentryReceiptFixture,
  finalDebitReceiptFixture,
  finalVerdictReceiptFixture,
} from "./tests/fixtures/trust-plane-fixtures";

const outputPath = resolve(
  process.argv[2] ??
    ".omo/evidence/task-5-skillopt-predicate-requirements.json",
);
const existing: unknown = JSON.parse(await readFile(outputPath, "utf8"));
const git = (...args: readonly string[]): string =>
  execFileSync("git", args, {
    encoding: "utf8",
    env: { ...process.env, GIT_MASTER: "1" },
  }).trim();
const evidence = buildTodo5EvidenceDocument({
  existing,
  receipts: {
    debitSubentry: debitSubentryReceiptFixture,
    finalDebit: finalDebitReceiptFixture,
    finalVerdict: finalVerdictReceiptFixture,
  },
  implementationBinding: {
    commit: git("rev-parse", "HEAD"),
    tree: git("rev-parse", "HEAD^{tree}"),
    commitSubject: git("log", "-1", "--pretty=%s"),
  },
  observedAt: new Date().toISOString(),
});

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(outputPath);
