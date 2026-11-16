import { describe, expect, test } from "bun:test";
import {
  type CheckStructuredContent,
  fitScopedCheckToBudget,
  formatViolationText,
} from "../../../src/public/operations/check-format-shared.js";
import type { Violation } from "../../../src/utils/rule-registry.js";

const HINT =
  "The result was cut to its size budget. Narrow sourceFiles, or pass rules to list those rules' findings in full; kibi check --format json lists every finding.";
const size = (value: unknown) => JSON.stringify(value).length;

function violation(index: number, extra: Partial<Violation> = {}): Violation {
  return {
    rule: "required-fields",
    entityId: `REQ-${String(index).padStart(3, "0")}`,
    description: "Missing required field: title",
    suggestion: "Add title",
    ...extra,
  } as Violation;
}

function diagnostic(index: number) {
  return {
    category: "integrity",
    severity: "error",
    message: `diagnostic ${String(index).padStart(3, "0")}`,
  };
}

function content(
  count: number,
  extra: Partial<CheckStructuredContent> = {},
): CheckStructuredContent {
  return {
    violations: Array.from({ length: count }, (_, i) => violation(i)),
    count,
    evaluated: { rules: [] },
    diagnostics: Array.from({ length: count }, (_, i) => diagnostic(i)),
    ...extra,
  } as unknown as CheckStructuredContent;
}

const truncated = (input: CheckStructuredContent, budget: number) => ({
  ...input,
  truncated: true,
  truncation: { budgetChars: budget, hint: HINT },
});

describe("fitScopedCheckToBudget", () => {
  test("a result exactly at the budget is returned as is", () => {
    const input = content(3);
    expect(fitScopedCheckToBudget(input, size(input))).toBe(input);
  });

  test("a result over the budget is marked with the hint, advisory counts first", () => {
    const quality = (id: string) => ({
      id,
      severity: "warning",
      blocking: false,
      category: "symbol",
      message: "m".repeat(400),
    });
    const input = content(1, {
      qualityDiagnostics: [quality("q1"), quality("q1"), quality("q2")],
    } as unknown as Partial<CheckStructuredContent>);
    const reduced = (budget: number) => ({
      ...truncated(input, budget),
      qualityDiagnostics: [
        {
          id: "check_quality_truncated",
          severity: "info",
          blocking: false,
          category: "integrity",
          message:
            "3 advisory findings are not listed, to keep this result within its size budget.",
          suggestion:
            "Run kibi check --format json to list every advisory finding.",
          evidence: { omitted: 3, byId: { q1: 2, q2: 1 } },
        },
      ],
    });
    // The budget the reduced result fills exactly.
    let budget = 1;
    while (size(reduced(budget)) !== budget) budget = size(reduced(budget));
    expect(fitScopedCheckToBudget(input, budget)).toStrictEqual(
      reduced(budget) as unknown as CheckStructuredContent,
    );

    const one = content(1, {
      qualityDiagnostics: [quality("q1")],
    } as unknown as Partial<CheckStructuredContent>);
    const fitted = fitScopedCheckToBudget(one, size(one) - 1);
    expect(fitted.qualityDiagnostics?.[0]?.message).toBe(
      "1 advisory finding is not listed, to keep this result within its size budget.",
    );
  });

  test("no advisory findings, missing or empty, adds no count", () => {
    const missing = content(40);
    const missingFit = fitScopedCheckToBudget(missing, size(missing) - 1);
    expect(Object.hasOwn(missingFit, "qualityDiagnostics")).toBe(false);
    expect(missingFit.truncation).toStrictEqual({
      budgetChars: size(missing) - 1,
      hint: HINT,
    });
    const empty = content(40, {
      qualityDiagnostics: [],
    } as unknown as Partial<CheckStructuredContent>);
    expect(
      fitScopedCheckToBudget(empty, size(empty) - 1).qualityDiagnostics,
    ).toStrictEqual([]);
  });

  test("blocking findings are listed in full up to four fifths of the budget", () => {
    const input = content(40);
    const cost = size(violation(0)) + size(diagnostic(0)) + 2;
    // A budget whose four fifths hold the base and exactly `listed` findings.
    let found: { budget: number; listed: number } | undefined;
    for (let budget = 1000; budget < size(input) && !found; budget += 5) {
      const base = size({
        ...truncated(input, budget),
        violations: [],
        diagnostics: [],
      });
      const room = budget * 0.8 - base;
      if (room > cost && room % cost === 0)
        found = { budget, listed: room / cost };
    }
    if (!found) throw new Error("no exact budget");
    const fitted = fitScopedCheckToBudget(input, found.budget);
    expect(fitted.violations).toHaveLength(found.listed);
    expect(fitted.diagnostics).toHaveLength(found.listed);
    expect(fitted.violationGroups).toStrictEqual([
      {
        rule: "required-fields",
        count: 40 - found.listed,
        entityIds: input.violations
          .slice(found.listed, found.listed + 20)
          .map((v) => v.entityId),
        description: "Missing required field: title",
        suggestion: "Add title",
      },
    ]);
  });

  test("a finding that does not fit is grouped, one that fits is listed", () => {
    const input = content(40);
    const cost = size(violation(0)) + size(diagnostic(0)) + 2;
    // A budget whose four fifths leave room just short of one finding.
    let budget = 300;
    const room = (b: number) =>
      b * 0.8 -
      size({ ...truncated(input, b), violations: [], diagnostics: [] });
    while (!(room(budget) < cost && room(budget) > cost - 4)) budget += 1;
    expect(fitScopedCheckToBudget(input, budget).violations).toStrictEqual([]);
  });

  test("findings that all fit are listed with no group", () => {
    const input = {
      ...content(2),
      diagnostics: Array.from({ length: 60 }, (_, i) => diagnostic(i)),
    } as unknown as CheckStructuredContent;
    const fitted = fitScopedCheckToBudget(input, Math.floor(size(input) / 2));
    expect(fitted.violations).toStrictEqual(input.violations);
    expect(fitted.diagnostics).toStrictEqual(input.diagnostics.slice(0, 2));
    expect(fitted.violationGroups).toStrictEqual([]);
  });

  test("findings without diagnostics or suggestions list none", () => {
    const input = {
      ...content(40),
      diagnostics: [],
      violations: Array.from({ length: 40 }, (_, i) =>
        violation(i, { suggestion: undefined }),
      ),
    } as unknown as CheckStructuredContent;
    const fitted = fitScopedCheckToBudget(input, Math.floor(size(input) / 2));
    expect(fitted.violations.length).toBeGreaterThan(0);
    expect(fitted.diagnostics).toStrictEqual([]);
    const group = fitted.violationGroups?.[0] as object;
    expect(Object.hasOwn(group, "suggestion")).toBe(false);
  });
});

describe("formatViolationText listings", () => {
  test("five rules are all named, a sixth is counted", () => {
    const byRule = (n: number) =>
      Object.fromEntries(
        Array.from({ length: n }, (_, i) => [`r${i}`, 1]),
      ) as Record<string, number>;
    expect(
      formatViolationText([], [], {
        omittedViolations: { total: 5, byRule: byRule(5) },
      }),
    ).toContain("(r0 ×1, r1 ×1, r2 ×1, r3 ×1, r4 ×1);");
  });

  test("a group line names its count, ids, description and suggestion", () => {
    const text = formatViolationText([], [], {
      violationGroups: [
        {
          rule: "required-fields",
          count: 3,
          entityIds: ["REQ-1", "REQ-2"],
          description: "Missing title",
          suggestion: "Add title",
        },
        {
          rule: "no-cycles",
          count: 1,
          entityIds: ["REQ-3"],
          description: "Cycle",
        },
      ],
    });
    expect(text).toContain(
      "- required-fields ×3 | REQ-1, REQ-2, … | Missing title | Suggestion: Add title\n- no-cycles ×1 | REQ-3 | Cycle",
    );
  });
});
