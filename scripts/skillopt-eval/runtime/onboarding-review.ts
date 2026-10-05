import { z } from "zod";
import { onboardingReviewEvidence } from "../fixtures/onboarding-review";

const Row = z.object({ reference: z.string(), sourceId: z.string() });
const Evidence = z.object({
  obligations: z.array(Row),
  otherMaterial: z.array(Row),
  plan: z.object({ candidates: z.array(Row) }),
});
const Review = z
  .object({
    decision: z.enum([
      "request_approval",
      "revise_plan",
      "complete",
      "blocked",
    ]),
    selectedBySource: z.record(z.string(), z.number().int().nonnegative()),
    missingReferences: z.array(z.string()),
    nonProductReferences: z.array(z.string()),
    proof: z.enum(["proven", "not_established"]),
    nextStep: z.string().trim().min(1),
  })
  .strict();

/** Review-only evidence reconciliation; never claims a successful real apply. */
// implements REQ-skillopt-codex-optimization
export function onboardingReviewMatches(
  answer: string,
  evidenceText: string | undefined,
  taskId?: string,
): boolean {
  try {
    const blocks = [
      ...answer.matchAll(/```bootstrap-review\s*\n([\s\S]*?)```/g),
    ];
    if (blocks.length !== 1 || evidenceText === undefined) return false;
    const raw: unknown = JSON.parse(evidenceText);
    if (
      taskId !== undefined &&
      JSON.stringify(raw) !== JSON.stringify(onboardingReviewEvidence(taskId))
    )
      return false;
    const evidence = Evidence.parse(raw);
    const reportText = blocks[0]?.[1];
    if (reportText === undefined) return false;
    const report = Review.parse(JSON.parse(reportText));
    const counts: Record<string, number> = {};
    const missing: string[] = [];
    for (const obligation of evidence.obligations) {
      counts[obligation.sourceId] ??= 0;
      if (
        evidence.plan.candidates.some(
          (candidate) =>
            candidate.sourceId === obligation.sourceId &&
            candidate.reference === obligation.reference,
        )
      )
        counts[obligation.sourceId] = (counts[obligation.sourceId] ?? 0) + 1;
      else missing.push(obligation.reference);
    }
    const nonProduct = evidence.otherMaterial
      .filter((row) =>
        evidence.plan.candidates.some(
          (candidate) =>
            candidate.reference === row.reference &&
            candidate.sourceId === row.sourceId,
        ),
      )
      .map((row) => row.reference);
    const same = (a: readonly string[], b: readonly string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    return (
      report.decision ===
        (missing.length > 0 || nonProduct.length > 0
          ? "revise_plan"
          : "request_approval") &&
      report.proof === "not_established" &&
      same(Object.keys(report.selectedBySource), Object.keys(counts)) &&
      Object.entries(counts).every(
        ([source, count]) => report.selectedBySource[source] === count,
      ) &&
      same(report.missingReferences, missing) &&
      same(report.nonProductReferences, nonProduct)
    );
  } catch {
    return false;
  }
}
