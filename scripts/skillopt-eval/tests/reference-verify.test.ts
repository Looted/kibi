import { describe, expect, test } from "bun:test";
import type { TaskSpec } from "../catalog";
import { skillReferences } from "../reference/registry";
import type { ReferenceResult, ReferenceScript } from "../reference/runner";
import { verifyReferences } from "../reference/verify";

const CASE = "kibi-usage-intent-consult-held-out-2";

function usageCase(id: string) {
  const entry = skillReferences("kibi-usage").find(
    ({ task }) => task.id === id,
  );
  if (entry === undefined) throw new Error(`no case ${id}`);
  return entry;
}

function scored(task: TaskSpec, score: number): ReferenceResult {
  return { taskId: task.id, durationMs: 1, score, criticalFailures: [] };
}

describe("reference answer check", () => {
  test("a case without a reference, or whose reference scores below 100, fails", async () => {
    const { task } = usageCase(CASE);
    const reference: ReferenceScript = async () => "answer";
    const scores = [75, 100];
    const verdicts = await verifyReferences(
      [{ task }, { task, reference }, { task, reference }],
      async (spec) => scored(spec, scores.shift() ?? 0),
    );
    expect(verdicts.map(({ passed }) => passed)).toEqual([false, false, true]);
    expect(verdicts[0]?.reason).toBe("no reference answer");
    expect(verdicts[1]?.reason).toBe("scored 75");
  });

  test("every kibi-usage case has a reference answer", () => {
    const missing = skillReferences("kibi-usage")
      .filter(({ reference }) => reference === undefined)
      .map(({ task }) => task.id);
    expect(missing).toEqual([]);
  });

  test(
    "a case's own reference answer scores 100 and one that skips discovery fails",
    async () => {
      const { task, reference } = usageCase(CASE);
      if (reference === undefined) throw new Error(`${CASE} has no reference`);
      const skipsDiscovery: ReferenceScript = async () =>
        "Kibi records no requirement about archiving fixture families.";
      const verdicts = await verifyReferences([
        { task, reference },
        { task, reference: skipsDiscovery },
      ]);
      expect(verdicts[0]).toMatchObject({ taskId: CASE, passed: true });
      expect(verdicts[0]?.result?.score).toBe(100);
      expect(verdicts[1]?.passed).toBe(false);
      expect(verdicts[1]?.result?.score).toBeLessThan(100);
    },
    { timeout: 180_000 },
  );
});
