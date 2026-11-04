import { describe, expect, test } from "bun:test";
import {
  evaluateContractAgainstRun,
  mapRunOutcome,
} from "../../src/proof/evaluate.js";
import type {
  ProofContract,
  ProofResult,
  ProofRunArtifact,
} from "../../src/public/proof-protocol.js";

const contract = (
  symbols: string[] = ["SYM-A"],
  success_policy: ProofContract["success_policy"] = "all_required_first_attempt",
): ProofContract => ({
  version: "kibi.proof-contract.v1",
  integration: "unit",
  required_proofs: symbols.map((symbol_id) => ({
    symbol_id,
    target: "default",
  })),
  success_policy,
});

const passedNative = {
  binding: "native_case",
  attempts: { status: "complete", entries: [{ outcome: "passed" }] },
} as const;

function result(
  symbol_id: string,
  overrides: Partial<ProofResult> = {},
): ProofResult {
  return {
    symbol_id,
    target: "default",
    outcome: "passed",
    binding: "aggregate_run",
    attempts: { status: "unavailable" },
    ...overrides,
  } as ProofResult;
}

function artifact(
  run: Partial<ProofRunArtifact["run"]>,
  proofResults: readonly ProofResult[],
): ProofRunArtifact {
  return {
    version: "kibi.proof-run.v1",
    producer: { name: "kibi-command-producer" },
    integration: "unit",
    command_argv: ["bun", "test"],
    code_snapshot: "a".repeat(64),
    environment: {},
    run: {
      outcome: "passed",
      exit_code: 0,
      started_at: "2026-09-03T00:00:00Z",
      finished_at: "2026-09-03T00:00:01Z",
      ...run,
    },
    proof_results: proofResults,
  };
}

const gap = (symbol_id: string, reason: string) => ({
  symbol_id,
  target: "default",
  reason,
});

describe("mapRunOutcome", () => {
  test("maps every run outcome to a receipt outcome", () => {
    expect(
      (
        [
          "passed",
          "errored",
          "cancelled",
          "timed_out",
          "interrupted",
          "no_results",
          "failed",
        ] as const
      ).map(mapRunOutcome),
    ).toEqual([
      "passed",
      "errored",
      "cancelled",
      "timed_out",
      "interrupted",
      "failed",
      "failed",
    ]);
  });
});

describe("a passed run", () => {
  test("satisfies the contract when every obligation passed", () => {
    const own = [result("SYM-A"), result("SYM-B", passedNative)];
    expect(
      evaluateContractAgainstRun(
        artifact({}, [...own, result("SYM-C", { outcome: "failed" })]),
        contract(["SYM-A", "SYM-B"]),
      ),
    ).toStrictEqual({
      satisfied: true,
      outcome: "passed",
      gaps: [],
      projectedResults: own,
    });
  });

  test("a result must match both the symbol and the target", () => {
    const results = [result("SYM-A", { target: "other" }), result("SYM-Z")];
    expect(
      evaluateContractAgainstRun(artifact({}, results), contract()),
    ).toStrictEqual({
      satisfied: false,
      outcome: "failed",
      gaps: [
        gap(
          "SYM-A",
          "missing proof result: the run reported no result for this obligation",
        ),
      ],
      projectedResults: [],
    });
  });

  test("a non-passing own result is a gap", () => {
    const failed = result("SYM-A", { outcome: "failed" });
    expect(
      evaluateContractAgainstRun(artifact({}, [failed]), contract()),
    ).toStrictEqual({
      satisfied: false,
      outcome: "failed",
      gaps: [gap("SYM-A", "proof result outcome is 'failed'")],
      projectedResults: [failed],
    });
  });

  test("native cases need a passing first attempt", () => {
    const cases: [ProofResult["attempts"], string][] = [
      [
        { status: "unavailable" },
        "attempt history unavailable: strict first-attempt policy cannot verify a native-case pass",
      ],
      [
        {
          status: "complete",
          entries: [{ outcome: "failed" }, { outcome: "passed" }],
        },
        "first attempt outcome is 'failed'",
      ],
      [
        { status: "complete", entries: [] },
        "first attempt outcome is 'unknown'",
      ],
    ];
    for (const [attempts, reason] of cases) {
      expect(
        evaluateContractAgainstRun(
          artifact({}, [result("SYM-A", { binding: "native_case", attempts })]),
          contract(),
        ).gaps,
      ).toEqual([gap("SYM-A", reason)]);
    }
  });

  test("an aggregate result needs the run to exit zero", () => {
    expect(
      evaluateContractAgainstRun(
        artifact({ exit_code: 3 }, [result("SYM-A")]),
        contract(),
      ).gaps,
    ).toEqual([gap("SYM-A", "aggregate run exit code is 3")]);
  });

  test("gaps report an interrupted or timed-out own result first", () => {
    const outcome = (...outcomes: ProofResult["outcome"][]) =>
      evaluateContractAgainstRun(
        artifact(
          {},
          outcomes.map((value, index) =>
            result(`SYM-${index}`, { outcome: value }),
          ),
        ),
        contract(outcomes.map((_, index) => `SYM-${index}`)),
      ).outcome;
    expect(outcome("failed", "timed_out", "interrupted")).toBe("interrupted");
    expect(outcome("interrupted")).toBe("interrupted");
    expect(outcome("failed", "timed_out")).toBe("timed_out");
    expect(outcome("failed", "errored")).toBe("failed");
  });
});

describe("a run that did not pass", () => {
  test("refuses every obligation with the run outcome and phase", () => {
    const own = result("SYM-A");
    expect(
      evaluateContractAgainstRun(
        artifact({ outcome: "errored", exit_code: 1 }, [own]),
        contract(["SYM-A", "SYM-B"]),
      ),
    ).toStrictEqual({
      satisfied: false,
      outcome: "errored",
      gaps: [
        gap("SYM-A", "run did not pass (outcome: errored)"),
        gap("SYM-B", "run did not pass (outcome: errored)"),
      ],
      projectedResults: [own],
    });
    expect(
      evaluateContractAgainstRun(
        artifact({ outcome: "cancelled", failure_phase: "setup" }, []),
        contract(),
      ),
    ).toStrictEqual({
      satisfied: false,
      outcome: "cancelled",
      gaps: [
        gap("SYM-A", "run did not pass (outcome: cancelled, phase: setup)"),
      ],
      projectedResults: [],
    });
  });

  test("an empty run says it produced no results", () => {
    expect(
      evaluateContractAgainstRun(
        artifact({ outcome: "no_results" }, []),
        contract(),
      ).gaps,
    ).toEqual([gap("SYM-A", "run produced no results (outcome: no_results)")]);
    expect(
      evaluateContractAgainstRun(
        artifact({ outcome: "no_results", failure_phase: "collection" }, []),
        contract(),
      ).gaps,
    ).toEqual([
      gap(
        "SYM-A",
        "run produced no results (outcome: no_results, phase: collection)",
      ),
    ]);
  });

  test("the failure is attributed to the results that did not pass", () => {
    const reason = (results: ProofResult[]) =>
      evaluateContractAgainstRun(
        artifact({ outcome: "timed_out" }, results),
        contract(),
      ).gaps[0]?.reason;
    const failing = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        result(`SYM-M${index}`, { outcome: "timed_out" }),
      );
    expect(reason([result("SYM-A"), ...failing(1)])).toBe(
      "run did not pass (outcome: timed_out); this obligation's own result passed; failing member result(s): SYM-M0 (timed_out)",
    );
    expect(reason([result("SYM-A", { outcome: "interrupted" })])).toBe(
      "run did not pass (outcome: timed_out); this obligation's own result outcome is 'interrupted'",
    );
    expect(reason(failing(2))).toBe(
      "run did not pass (outcome: timed_out); failing member result(s): SYM-M0 (timed_out), SYM-M1 (timed_out)",
    );
    expect(reason(failing(5))).toBe(
      "run did not pass (outcome: timed_out); failing member result(s): SYM-M0 (timed_out), SYM-M1 (timed_out), SYM-M2 (timed_out), SYM-M3 (timed_out), SYM-M4 (timed_out)",
    );
    expect(
      reason([result("SYM-A", { outcome: "failed" }), ...failing(7)]),
    ).toBe(
      "run did not pass (outcome: timed_out); this obligation's own result outcome is 'failed'; failing member result(s): SYM-M0 (timed_out), SYM-M1 (timed_out), SYM-M2 (timed_out), SYM-M3 (timed_out), SYM-M4 (timed_out) +2 more",
    );
    expect(reason([result("SYM-A")])).toBe(
      "run did not pass (outcome: timed_out)",
    );
  });
});

describe("judging own results under own_results_first_attempt", () => {
  const own = contract(["SYM-A", "SYM-B"], "own_results_first_attempt");

  test("a failed execution is judged per obligation", () => {
    for (const failure_phase of [undefined, "execution"] as const) {
      const a = result("SYM-A", passedNative);
      const b = result("SYM-B");
      expect(
        evaluateContractAgainstRun(
          artifact(
            {
              outcome: "failed",
              exit_code: 1,
              ...(failure_phase === undefined ? {} : { failure_phase }),
            },
            [a, b, result("SYM-C", { outcome: "failed" })],
          ),
          own,
        ),
      ).toStrictEqual({
        satisfied: false,
        outcome: "failed",
        gaps: [
          gap(
            "SYM-B",
            "run did not pass (outcome: failed); an aggregate-run result has no result of its own to judge",
          ),
        ],
        projectedResults: [a, b],
      });
    }
  });

  test("every own native pass satisfies the contract, a missing one does not", () => {
    const a = result("SYM-A", passedNative);
    const b = result("SYM-B", passedNative);
    expect(
      evaluateContractAgainstRun(
        artifact({ outcome: "failed", exit_code: 1 }, [a, b]),
        own,
      ),
    ).toStrictEqual({
      satisfied: true,
      outcome: "passed",
      gaps: [],
      projectedResults: [a, b],
    });
    expect(
      evaluateContractAgainstRun(
        artifact({ outcome: "failed", exit_code: 1 }, [a]),
        own,
      ).gaps,
    ).toEqual([
      gap(
        "SYM-B",
        "missing proof result: the run reported no result for this obligation",
      ),
    ]);
  });

  test("other failures, phases and policies still refuse everything", () => {
    const a = result("SYM-A", passedNative);
    const b = result("SYM-B", passedNative);
    const satisfied = (run: Partial<ProofRunArtifact["run"]>, policy = own) =>
      evaluateContractAgainstRun(
        artifact({ exit_code: 1, ...run }, [a, b]),
        policy,
      ).satisfied;
    expect(satisfied({ outcome: "failed", failure_phase: "setup" })).toBe(
      false,
    );
    expect(satisfied({ outcome: "failed", failure_phase: "teardown" })).toBe(
      false,
    );
    expect(satisfied({ outcome: "errored" })).toBe(false);
    expect(satisfied({ outcome: "failed" }, contract(["SYM-A", "SYM-B"]))).toBe(
      false,
    );
    expect(satisfied({ outcome: "failed" })).toBe(true);
  });
});
