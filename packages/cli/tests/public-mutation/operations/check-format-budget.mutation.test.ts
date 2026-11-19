import { describe, expect, test } from "bun:test";
import type { QualityDiagnostic } from "../../../src/public/impact/types.js";
import {
  type CheckStructuredContent,
  fitScopedCheckToBudget,
  fitSymbolDebtToBudget,
  formatViolationText,
  pageCheckFindings,
} from "../../../src/public/operations/check-format-shared.js";
import type { Violation } from "../../../src/utils/rule-registry.js";

const HINT =
  "The result was cut to its size budget. Narrow sourceFiles, or pass rules to page through those rules' findings; kibi check --format json lists every finding.";
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

  test("telemetry acceptance diagnostics are kept after the count", () => {
    const finding = (id: string, category: string) =>
      ({
        id,
        severity: "warning",
        blocking: false,
        category,
        message: "m".repeat(400),
      }) as unknown as QualityDiagnostic;
    const accepted = finding("telemetry_acceptance_passed", "telemetry");
    const input = content(1, {
      qualityDiagnostics: [
        accepted,
        finding("q1", "symbol"),
        finding("q2", "symbol"),
      ],
    } as unknown as Partial<CheckStructuredContent>);
    const fitted = fitScopedCheckToBudget(input, size(input) - 1);
    expect(fitted.qualityDiagnostics?.map((d) => d.id)).toStrictEqual([
      "check_quality_truncated",
      "telemetry_acceptance_passed",
    ]);
    expect(fitted.qualityDiagnostics?.[0]?.evidence).toStrictEqual({
      omitted: 2,
      byId: { q1: 1, q2: 1 },
    });
    expect(fitted.qualityDiagnostics?.[1]).toBe(accepted);

    const onlyTelemetry = content(1, {
      qualityDiagnostics: [accepted],
    } as unknown as Partial<CheckStructuredContent>);
    expect(
      fitScopedCheckToBudget(onlyTelemetry, size(onlyTelemetry) - 1)
        .qualityDiagnostics,
    ).toStrictEqual([accepted]);
  });

  test("an over-budget plan becomes its summary unless it is asked for", () => {
    const plan = {
      actions: Array.from({ length: 40 }, (_, i) => ({
        kind: "add-field",
        entityId: `REQ-${i}`,
        detail: "d".repeat(80),
      })),
    };
    const input = content(1, {
      migrationPlan: plan,
    } as unknown as Partial<CheckStructuredContent>);
    const budget = size(input) - 1;
    const summarized = fitScopedCheckToBudget(
      input,
      budget,
    ) as unknown as Record<string, unknown>;
    expect(summarized.migrationPlan).toBeUndefined();
    expect(summarized.migrationPlanSummary).toBeDefined();
    const kept = fitScopedCheckToBudget(
      input,
      budget,
      true,
      true,
    ) as unknown as Record<string, unknown>;
    expect(kept.migrationPlan).toBe(plan);
    expect(kept.migrationPlanSummary).toBeUndefined();
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
    const input = content(200);
    const cost = size(violation(0)) + size(diagnostic(0)) + 2;
    // A budget whose four fifths hold the base and exactly `listed` findings.
    let found: { budget: number; listed: number } | undefined;
    for (let budget = 4000; budget < size(input) && !found; budget += 5) {
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
        count: 200 - found.listed,
        entityIds: input.violations
          .slice(found.listed, found.listed + 20)
          .map((v) => v.entityId),
        description: "Missing required field: title",
        suggestion: "Add title",
      },
    ]);
  });

  test("the grouped rest takes room from the listed findings when it needs it", () => {
    const input = content(40);
    // A fifth of this budget cannot hold the group of the rest.
    const budget = 1500;
    const fitted = fitScopedCheckToBudget(input, budget);
    expect(size(fitted)).toBeLessThanOrEqual(budget);
    expect(fitted.violations.length).toBeGreaterThan(0);
    expect(fitted.violations.length).toBeLessThan(40);
    expect(fitted.violationGroups?.[0]?.count).toBe(
      40 - fitted.violations.length,
    );
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

describe("pageCheckFindings", () => {
  test("a first page within the budget is returned as is", () => {
    const input = content(3);
    expect(pageCheckFindings(input, 0, true, false, size(input))).toBe(input);
  });

  test("lists the findings in pages and names the next offset", () => {
    const input = content(40);
    const budget = 2_000;
    const first = pageCheckFindings(input, 0, true, false, budget);
    expect(size(first)).toBeLessThanOrEqual(budget);
    const listed = first.violations.length;
    expect(listed).toBeGreaterThan(0);
    expect(first.diagnostics).toHaveLength(listed);
    expect(first.violations).toStrictEqual(input.violations.slice(0, listed));
    expect(first.count).toBe(40);
    expect(first.truncated).toBe(true);
    expect(first.truncation as Record<string, unknown>).toStrictEqual({
      budgetChars: budget,
      returned: listed,
      total: 40,
      omitted: 40 - listed,
      nextOffset: listed,
      hint: "The rule selection's findings are listed in pages; call again with offset for the next page. kibi check --format json lists every finding.",
    });
    const second = pageCheckFindings(input, listed, true, false, budget);
    expect(second.violations[0]).toStrictEqual(input.violations[listed]);
    const last = pageCheckFindings(input, 38, true, false, budget);
    expect(last.violations).toStrictEqual(input.violations.slice(38));
    expect(last.truncated).toBe(true);
    expect(last.truncation as Record<string, unknown>).toStrictEqual({
      budgetChars: budget,
      returned: 2,
      total: 40,
      omitted: 0,
      hint: "This is the last page of the rule selection's findings.",
    });
  });

  test("a finding larger than the budget is cut like an unscoped check", () => {
    const input = content(1, {
      violations: [violation(0, { description: "d".repeat(1_000) })],
      diagnostics: [{ ...diagnostic(0), message: "m".repeat(1_000) }],
    } as Partial<CheckStructuredContent>);
    const page = pageCheckFindings(input, 0, true, false, 1_800);
    expect(size(page)).toBeLessThanOrEqual(1_800);
    expect(page.violations).toStrictEqual([]);
    expect(page.violationGroups?.[0]?.count).toBe(1);
  });
});

describe("fitSymbolDebtToBudget", () => {
  const files = Array.from({ length: 50 }, (_, index) => ({
    path: `src/f${index}.ts`,
    unrecorded: ["a", "b"],
  }));
  const debt = { total: 100, fileCount: 50, files };

  test("keeps a debt list that fits, or a count without a list", () => {
    const input = content(1);
    expect(fitSymbolDebtToBudget(input, debt, 100_000)).toBe(debt);
    const counted = { total: 100, fileCount: 50 };
    expect(fitSymbolDebtToBudget(input, counted, 10)).toBe(counted);
  });

  test("lists the files that fit and counts the rest", () => {
    const input = content(1);
    const budget = size(input) + 600;
    const fitted = fitSymbolDebtToBudget(input, debt, budget);
    const shown = fitted.files?.length ?? 0;
    expect(shown).toBeGreaterThan(0);
    expect(fitted.files).toStrictEqual(files.slice(0, shown));
    expect(fitted.filesOmitted).toBe(50 - shown);
    expect(size({ ...input, symbolDebt: fitted })).toBeLessThanOrEqual(budget);
  });
});
