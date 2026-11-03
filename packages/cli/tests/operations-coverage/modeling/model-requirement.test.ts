import { describe, expect, test } from "bun:test";
import { executeModelRequirement } from "../../../src/operations/modeling/model-requirement.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

const VOCABULARY = [
  {
    factId: "FACT-SUBJ-CART",
    subjectKey: "cart.checkout_window",
    title: "Checkout window for shopping carts",
    reqDerived: false,
    requirements: [],
  },
];
const context = {
  workspaceRoot: process.cwd(),
  signal: new AbortController().signal,
  clock: () => new Date(0),
  prolog: {
    query: async (goal: string) =>
      goal.includes("subject_vocabulary_json")
        ? { success: true, bindings: { Json: JSON.stringify(VOCABULARY) } }
        : { success: true, bindings: { Json: "[]" } },
  },
} as unknown as OperationContext;

const model = async (text: string, extra: Record<string, unknown> = {}) =>
  (
    await executeModelRequirement(
      { text, source: ".kb/requirements/REQ-x.md", ...extra } as never,
      context,
    )
  ).structuredContent as unknown as {
    warnings: { kind: string; message: string }[];
    applyPlan: { type: string; properties: Record<string, unknown> }[];
  };

const provided = {
  subjectKey: "order.retention",
  propertyKey: "max_days",
  operator: "lte",
  value: 7,
};

describe("model requirement subject review", () => {
  test("asks to review a provided new key when an existing subject matches", async () => {
    const { warnings } = await model(
      "The shopping checkout window must be at most 7 days for each guest order.",
      provided,
    );
    expect(warnings).toContainEqual({
      kind: "subject_reuse_review",
      message:
        "Provided subjectKey order.retention is new, but existing subject cart.checkout_window (FACT-SUBJ-CART) matches this clause.",
      nextAction:
        "Reuse subjectKey cart.checkout_window so this requirement can be compared with the others on that subject, or keep order.retention if it is genuinely a different component.",
    });
  });

  test("names the nearest subject when it declares a new one", async () => {
    const { warnings } = await model(
      "The checkout window must close within 7 days for every order.",
      provided,
    );
    expect(warnings).toContainEqual({
      kind: "new_subject_declared",
      message:
        "Declaring new subject order.retention; nearest existing subject is cart.checkout_window (score 0.353).",
      nextAction:
        "Confirm the new subject is a different component, or pass subjectKey set to the existing subject to reuse it.",
    });
  });
});

describe("set and pattern claims", () => {
  test("models a membership claim with the advisor's strict set shape", async () => {
    const { applyPlan } = await model(
      "Order status must be one of open, shipped or closed.",
    );
    const property = applyPlan.find(
      (step) =>
        step.type === "fact" && step.properties.fact_kind === "property_value",
    );
    expect(property?.properties).toMatchObject({ value_type: "set" });
  });
});

describe("claims below the strict threshold", () => {
  test("tag the observation as an open ontology gap", async () => {
    const { applyPlan } = await model(
      "The dashboard should feel calm and friendly.",
      {
        confidence: 0.3,
      },
    );
    expect(applyPlan[0]?.properties.tags).toContain("review:ontology-gap");
  });
});
