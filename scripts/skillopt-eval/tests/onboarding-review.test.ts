import { expect, test } from "bun:test";
import { buildPublicCatalog } from "../catalog";
import { onboardingReviewEvidence } from "../fixtures/onboarding-review";
import { onboardingReviewMatches } from "../runtime/onboarding-review";

test("supplied-source review permits reading its evidence file without authorizing writes", () => {
  const tasks = buildPublicCatalog().filter(
    (task) => task.taskData.objectiveCode === "onboarding_evidence_review",
  );
  expect(tasks.length).toBeGreaterThan(0);
  for (const task of tasks) {
    expect(task.allowedPublicFiles).toContain("src/onboarding-review.json");
    expect(task.prompt).toContain("ordinary file-reading tools");
    expect(task.prompt).not.toContain("use only the public Kibi MCP surface");
    expect(task.prompt).toContain("do not mutate files or KB entities");
  }
});

const evidence = JSON.stringify({
  obligations: [
    { reference: "T-1", sourceId: "tracker" },
    { reference: "D-1", sourceId: "document" },
  ],
  otherMaterial: [{ reference: "EXAMPLE", sourceId: "tools" }],
  plan: {
    candidates: [
      { reference: "D-1", sourceId: "document" },
      { reference: "EXAMPLE", sourceId: "tools" },
    ],
  },
});
const review = {
  decision: "revise_plan",
  selectedBySource: { tracker: 0, document: 1 },
  missingReferences: ["T-1"],
  nonProductReferences: ["EXAMPLE"],
  proof: "not_established",
  nextStep: "Correct the source scope before approval.",
};
const answer = (value: unknown) =>
  ["```bootstrap-review", JSON.stringify(value), "```"].join("\n");
test("reconciles source loss and false product policy without credit for green checks", () => {
  expect(onboardingReviewMatches(answer(review), evidence)).toBe(true);
  for (const change of [
    { decision: "complete" },
    { decision: "request_approval" },
    { proof: "proven" },
    { missingReferences: [] },
    { nonProductReferences: [] },
    { selectedBySource: { tracker: 1, document: 1 } },
  ])
    expect(
      onboardingReviewMatches(answer({ ...review, ...change }), evidence),
    ).toBe(false);
});
test("refuses missing evidence, invalid reports and ambiguous multiple answers", () => {
  expect(onboardingReviewMatches(answer(review), undefined)).toBe(false);
  expect(
    onboardingReviewMatches(answer(review) + answer(review), evidence),
  ).toBe(false);
  expect(onboardingReviewMatches("SUCCESS", evidence)).toBe(false);
});

test("review evidence cannot be rewritten by the target to hide omissions", () => {
  const task = "kibi-bootstrap-onboarding-review-development-1";
  expect(onboardingReviewMatches(answer(review), evidence, task)).toBe(false);
  const input = onboardingReviewEvidence(task);
  const valid = {
    ...review,
    selectedBySource: { tracker: 0, guide: 1 },
    missingReferences: ["LIB-1"],
    nonProductReferences: ["TEMPLATE-1"],
  };
  expect(
    onboardingReviewMatches(answer(valid), JSON.stringify(input), task),
  ).toBe(true);
  expect(
    onboardingReviewMatches(
      answer(valid),
      JSON.stringify({ ...input, obligations: [] }),
      task,
    ),
  ).toBe(false);
});

test("a clean document-only preview can proceed to approval without inventing gaps", () => {
  const task = "kibi-bootstrap-onboarding-review-train-2";
  const input = onboardingReviewEvidence(task);
  const valid = {
    ...review,
    decision: "request_approval",
    selectedBySource: { guide: 1 },
    missingReferences: [],
    nonProductReferences: [],
  };
  expect(
    onboardingReviewMatches(answer(valid), JSON.stringify(input), task),
  ).toBe(true);
  expect(
    onboardingReviewMatches(
      answer({ ...valid, decision: "revise_plan" }),
      JSON.stringify(input),
      task,
    ),
  ).toBe(false);
});

test("accepts the same strict review under a JSON fence and rejects ambiguous or false reports", () => {
  const jsonAnswer = (value: unknown) =>
    answer(value).replace("bootstrap-review", "json");
  expect(onboardingReviewMatches(jsonAnswer(review), evidence)).toBe(true);
  expect(
    onboardingReviewMatches(
      jsonAnswer({ ...review, proof: "proven" }),
      evidence,
    ),
  ).toBe(false);
  expect(
    onboardingReviewMatches(
      jsonAnswer({ ...review, decision: "request_approval" }),
      evidence,
    ),
  ).toBe(false);
  expect(
    onboardingReviewMatches(jsonAnswer(review) + answer(review), evidence),
  ).toBe(false);
});
