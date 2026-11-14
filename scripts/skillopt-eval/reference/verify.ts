/**
 * Harness check for one skill: every case must have a reference answer and
 * the scorer must rate it 100. A case below 100 cannot be passed by a careful
 * agent, so its paid cells measure nothing; the check fails until it is fixed.
 *
 * Usage: bun scripts/skillopt-eval/reference/verify.ts --skill SKILL [--case ID]...
 */
import { CANONICAL_SKILLS, type CanonicalSkill } from "../catalog";
import { skillReferences } from "./registry";
import {
  type ReferenceResult,
  type ReferenceScript,
  runReference,
} from "./runner";

export type CaseVerdict = Readonly<{
  taskId: string;
  passed: boolean;
  /** Why it failed: no reference, or the score and its failures. */
  reason?: string;
  result?: ReferenceResult;
}>;

type Run = (
  task: Parameters<typeof runReference>[0],
  script: ReferenceScript,
) => Promise<ReferenceResult>;

export async function verifyReferences(
  cases: readonly Readonly<{
    task: Parameters<typeof runReference>[0];
    reference?: ReferenceScript;
  }>[],
  run: Run = runReference,
  onVerdict: (verdict: CaseVerdict) => void = () => {},
): Promise<readonly CaseVerdict[]> {
  const verdicts: CaseVerdict[] = [];
  for (const { task, reference } of cases) {
    let verdict: CaseVerdict;
    if (reference === undefined) {
      verdict = {
        taskId: task.id,
        passed: false,
        reason: "no reference answer",
      };
    } else {
      const result = await run(task, reference);
      verdict =
        result.score === 100
          ? { taskId: task.id, passed: true, result }
          : {
              taskId: task.id,
              passed: false,
              reason: [
                `scored ${result.score}`,
                ...(result.terminal === undefined ? [] : [result.terminal]),
                ...result.criticalFailures,
                ...(result.error === undefined ? [] : [result.error]),
              ].join("; "),
              result,
            };
    }
    verdicts.push(verdict);
    onVerdict(verdict);
  }
  return verdicts;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const skill = args[args.indexOf("--skill") + 1];
  const only = args.flatMap((arg, index) =>
    args[index - 1] === "--case" ? [arg] : [],
  );
  if (
    !args.includes("--skill") ||
    !CANONICAL_SKILLS.includes(skill as CanonicalSkill)
  ) {
    process.stderr.write(
      `Usage: verify.ts --skill (${CANONICAL_SKILLS.join("|")}) [--case ID]...\n`,
    );
    process.exit(2);
  }
  const cases = skillReferences(skill as CanonicalSkill).filter(
    ({ task }) => only.length === 0 || only.includes(task.id),
  );
  const verdicts = await verifyReferences(cases, runReference, (verdict) =>
    console.log(
      `${verdict.passed ? "pass" : "FAIL"}\t${verdict.taskId}${verdict.reason === undefined ? "" : `\t${verdict.reason}`}`,
    ),
  );
  const failed = verdicts.filter(({ passed }) => !passed).length;
  console.log(
    `${verdicts.length - failed} of ${verdicts.length} ${skill} cases have a reference answer scoring 100`,
  );
  process.exit(failed === 0 ? 0 : 1);
}
