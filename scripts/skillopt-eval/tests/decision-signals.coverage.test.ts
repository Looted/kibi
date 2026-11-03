import { describe, expect, test } from "bun:test";
import type {
  BrokerCallEvidence,
  CaseSignalContext,
} from "../runtime/case-signals";
import { IMPACT_REVIEW_PATH } from "../runtime/decision-seeds";
import { decisionSignalObserved } from "../runtime/decision-signals";

function context(
  calls: readonly BrokerCallEvidence[],
  workspaceFiles: Record<string, string> = {},
): CaseSignalContext {
  return {
    results: [],
    brokerTools: calls.map((call) => call.tool),
    answer: {
      text: "",
      answer: {
        source: "none",
        verdict: null,
        governing: [],
        conflict: null,
        unknowns: [],
        nextStep: null,
        proof: null,
      },
    },
    ordering: {
      firstKbSearchIndex: null,
      firstEditIndex: null,
      kibiCallsBeforeFirstEdit: 0,
      editedPaths: [],
    },
    workspaceFiles,
    workspaceAssertions: [],
    calls,
  };
}

const PREPARED: BrokerCallEvidence = {
  tool: "kb_prepare_impact_review",
  args: {},
  resultOk: true,
  result: {
    structuredContent: {
      recordHeaders: { reviewer: "person" },
      files: [{ path: "src/a.ts" }],
    },
  },
};

describe("decision signals over brokered calls", () => {
  test("a plan applied to an existing requirement compiles nothing new", () => {
    expect(
      decisionSignalObserved(
        "compiled plan applied",
        context([
          {
            tool: "kb_apply_plan",
            args: {
              plan: { target: { mode: "update", requirementId: "REQ-1" } },
            },
            resultOk: true,
          },
        ]),
      ),
    ).toBe(false);
  });

  test("an unreadable or file-less review record does not match the prepared review", () => {
    const matches = (record: string) =>
      decisionSignalObserved(
        "review record matches the prepared review",
        context([PREPARED], { [IMPACT_REVIEW_PATH]: record }),
      );
    expect(matches("{not json")).toBe(false);
    expect(
      matches(JSON.stringify({ reviewer: "person", files: "src/a.ts" })),
    ).toBe(false);
    expect(
      matches(
        JSON.stringify({ reviewer: "person", files: [{ path: "src/a.ts" }] }),
      ),
    ).toBe(true);
  });
});
