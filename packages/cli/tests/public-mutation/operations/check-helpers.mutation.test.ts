import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChangedFileImpactResult } from "../../../src/public/impact-diagnostics.js";
import type { QualityDiagnostic } from "../../../src/public/impact/types.js";
import {
  SCOPED_CHECK_OMITTED_ID,
  analyzeKbCheckImpact,
  collectQueryPlanSafetyViolations,
  hasImpactOptions,
  partitionCheckFindings,
  qualityDiagnosticsFromImpact,
  readLegacyChecksHint,
  resolveCheckRules,
  scopeQualityDiagnosticsToImpact,
  stagedEntityIdStyleDiagnostics,
} from "../../../src/public/operations/check-helpers.js";
import { getEffectiveRules } from "../../../src/utils/rule-registry.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function temp(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-check-helpers-"));
  roots.push(root);
  return root;
}

describe("partitionCheckFindings", () => {
  test("keeps canonical findings and turns the rest into diagnostics", () => {
    const canonical = {
      rule: "symbol-coverage",
      entityId: "S",
      description: "d",
    };
    const unknown = { rule: "no-such-rule", entityId: "U", description: "d" };
    expect(
      partitionCheckFindings([
        canonical,
        unknown,
        {
          rule: "symbol-coordinates-missing",
          entityId: "E",
          source: "s.md",
          description: "coords",
          suggestion: "add",
          evidence: { a: 1 },
        },
        { rule: "adr-unlinked", entityId: "A", description: "adr" },
        { rule: "adr-proposed", description: "proposed" } as never,
        { rule: "strict-readiness", entityId: "M", description: "mig" },
      ]),
    ).toStrictEqual({
      violations: [canonical, unknown],
      qualityDiagnostics: [
        {
          id: "rule.symbol-coordinates-missing",
          severity: "warning",
          blocking: false,
          category: "traceability",
          entityId: "E",
          source: "s.md",
          message: "coords",
          suggestion: "add",
          evidence: { a: 1 },
        },
        {
          id: "rule.adr-unlinked",
          severity: "warning",
          blocking: false,
          category: "lifecycle",
          entityId: "A",
          message: "adr",
          suggestion: "",
        },
        {
          id: "rule.adr-proposed",
          severity: "info",
          blocking: false,
          category: "lifecycle",
          message: "proposed",
          suggestion: "",
        },
        {
          id: "rule.strict-readiness",
          severity: "warning",
          blocking: false,
          category: "integrity",
          entityId: "M",
          message: "mig",
          suggestion: "",
        },
      ],
    });
  });
});

function impact(
  sourceFiles: string[],
  linkedEntities: { id: string; sourceSymbolId: string }[] = [],
): ChangedFileImpactResult {
  return {
    impactDiagnostics: [],
    sourceFiles,
    extractedSymbols: [],
    linkedEntities,
    nextActions: [],
  } as unknown as ChangedFileImpactResult;
}

const diag = (
  id: string,
  extra: Partial<QualityDiagnostic> = {},
): QualityDiagnostic =>
  ({
    id,
    severity: "warning",
    blocking: false,
    category: "c",
    message: "m",
    suggestion: "s",
    ...extra,
  }) as QualityDiagnostic;

describe("scopeQualityDiagnosticsToImpact", () => {
  test("keeps diagnostics about the checked files and their entities", () => {
    const kept = [
      diag("rule.a", { entityId: "REQ-1" }),
      diag("rule.a", { entityId: "SYM-1" }),
      diag("rule.a", { source: "./src/a.ts" }),
      diag("rule.a", { files: ["x.ts", "src\\a.ts"] }),
      diag("rule.a", { files: ["./ab.ts"] }),
    ];
    expect(
      scopeQualityDiagnosticsToImpact(
        kept,
        impact(
          ["./src\\a.ts", "ab.ts"],
          [{ id: "REQ-1", sourceSymbolId: "SYM-1" }],
        ),
      ),
    ).toStrictEqual(kept);
  });

  test("counts what lies elsewhere by rule", () => {
    const elsewhere = [
      diag("rule.b"),
      diag("rule.a", { source: "a./b.ts" }),
      diag("rule.a", { files: [] }),
      diag("x.rule.c"),
    ];
    expect(
      scopeQualityDiagnosticsToImpact(elsewhere, impact(["ab.ts"])),
    ).toStrictEqual([
      {
        id: SCOPED_CHECK_OMITTED_ID,
        severity: "info",
        blocking: false,
        category: "integrity",
        message:
          "This check is scoped to 1 source file; 4 advisory findings elsewhere in the KB are not listed (a ×2, b ×1, x.rule.c ×1). None of them concerns the checked files.",
        suggestion:
          "Run kb_check without sourceFiles for the full KB audit when it matters to the task.",
        evidence: { omitted: 4, byRule: { a: 2, b: 1, "x.rule.c": 1 } },
      },
    ]);
    expect(SCOPED_CHECK_OMITTED_ID).toBe("scoped_check_omitted_quality");
  });

  test("names at most five rules and counts the rest", () => {
    const rules = (count: number) =>
      Array.from({ length: count }, (_, index) => diag(`rule.r${index}`));
    const message = (count: number) =>
      (
        scopeQualityDiagnosticsToImpact(
          rules(count),
          impact(["a.ts", "b.ts"]),
        )[0] as QualityDiagnostic
      ).message;
    expect(message(1)).toBe(
      "This check is scoped to 2 source files; 1 advisory finding elsewhere in the KB is not listed (r0 ×1). None of them concerns the checked files.",
    );
    expect(message(5)).toBe(
      "This check is scoped to 2 source files; 5 advisory findings elsewhere in the KB are not listed (r0 ×1, r1 ×1, r2 ×1, r3 ×1, r4 ×1). None of them concerns the checked files.",
    );
    expect(message(7)).toBe(
      "This check is scoped to 2 source files; 7 advisory findings elsewhere in the KB are not listed (r0 ×1, r1 ×1, r2 ×1, r3 ×1, r4 ×1, 2 more rules). None of them concerns the checked files.",
    );
    expect(scopeQualityDiagnosticsToImpact([], impact([]))).toStrictEqual([]);
    expect(
      (
        scopeQualityDiagnosticsToImpact(
          [diag("rule.a"), diag("rule.z"), diag("rule.z")],
          impact([]),
        )[0] as QualityDiagnostic
      ).message,
    ).toBe(
      "This check is scoped to 0 source files; 3 advisory findings elsewhere in the KB are not listed (z ×2, a ×1). None of them concerns the checked files.",
    );
  });
});

describe("collectQueryPlanSafetyViolations", () => {
  test("reads checks.pl beside the configured kb.pl", () => {
    const dir = temp();
    writeFileSync(join(dir, "kb.pl"), "");
    writeFileSync(
      join(dir, "checks.pl"),
      "safe(X) :- kb_entity(X, req, _).\n\nbad(X) :-\n  \\+ done(X),\n  kb_entity(X, req, _).\n",
    );
    const previous = process.env.KIBI_KB_PL_PATH;
    process.env.KIBI_KB_PL_PATH = join(dir, "kb.pl");
    try {
      expect(collectQueryPlanSafetyViolations()).toStrictEqual([
        {
          rule: "query-plan-safety",
          entityId: "bad",
          description:
            "Negation appears before later generator calls in the same clause.",
          suggestion:
            "Move kb_entity/kb_relationship/member/findall generators before \\+/1 so variables are bound before negation.",
          source: `${join(dir, "checks.pl")}:4`,
        },
      ]);
      process.env.KIBI_KB_PL_PATH = "";
      expect(collectQueryPlanSafetyViolations()).toStrictEqual([]);
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
      else process.env.KIBI_KB_PL_PATH = previous;
    }
  });
});

describe("resolveCheckRules", () => {
  test("selects default, none or the named rules", () => {
    expect(resolveCheckRules({})).toStrictEqual(getEffectiveRules());
    expect(resolveCheckRules({ rules: [] })).toStrictEqual(new Set());
    expect(resolveCheckRules({ rules: ["symbol-coverage"] })).toStrictEqual(
      getEffectiveRules(["symbol-coverage"]),
    );
    expect(resolveCheckRules({ rules: ["symbol-coverage"] }).size).toBe(1);
  });
});

describe("readLegacyChecksHint", () => {
  test("points at a legacy config file only when it is readable", async () => {
    const root = temp();
    expect(await readLegacyChecksHint(root)).toBeNull();
    mkdirSync(join(root, ".kb", "config.json"), { recursive: true });
    expect(await readLegacyChecksHint(root)).toBeNull();
    const other = temp();
    mkdirSync(join(other, ".kb"));
    writeFileSync(join(other, ".kb", "config.json"), "{}");
    expect(await readLegacyChecksHint(other)).toBe(
      "Legacy .kb/config.json is present. Kibi no longer reads project check or path configuration; run 'kibi migrate' to adopt the canonical .kb/ layout and retire this file.",
    );
  });
});

describe("impact options", () => {
  test.each([
    [{}, false],
    [{ sourceFiles: [] }, false],
    [{ sourceFiles: ["a.ts"] }, true],
    [{ staged: true }, true],
    [{ includeWorkingTreeDiff: true }, true],
    [{ includeImpactDiagnostics: true }, true],
    [{ includeImpactDiagnostics: false, staged: false }, false],
  ])("hasImpactOptions(%j) is %p", (args, expected) => {
    expect(hasImpactOptions(args as never)).toBe(expected);
  });

  test("analyzeKbCheckImpact skips a check without impact options", async () => {
    expect(await analyzeKbCheckImpact(temp(), {} as never)).toBeUndefined();
  });

  test("analyzeKbCheckImpact passes every option on", async () => {
    const root = temp();
    writeFileSync(join(root, "a.ts"), "export function a() {}\n");
    const full = await analyzeKbCheckImpact(root, {
      sourceFiles: ["a.ts"],
      includeImpactDiagnostics: true,
    } as never);
    expect(full?.sourceFiles).toStrictEqual(["a.ts"]);
    const none = await analyzeKbCheckImpact(root, {
      sourceFiles: ["a.ts"],
      includeImpactDiagnostics: false,
    } as never);
    expect(none?.impactDiagnostics).toStrictEqual([]);
    const capped = await analyzeKbCheckImpact(root, {
      sourceFiles: ["a.ts"],
      maxDiagnostics: 0,
    } as never);
    expect(capped?.impactDiagnostics).toStrictEqual([]);
    expect((full?.impactDiagnostics.length ?? 0) > 0).toBe(true);
  });
});

describe("qualityDiagnosticsFromImpact", () => {
  test("keeps non-blocking, non-error impact diagnostics", () => {
    const keep = diag("k", { severity: "warning" });
    const result = {
      ...impact([]),
      impactDiagnostics: [
        keep,
        diag("b", { blocking: true }),
        diag("e", { severity: "error" }),
      ],
    } as unknown as ChangedFileImpactResult;
    expect(qualityDiagnosticsFromImpact(undefined)).toStrictEqual([]);
    expect(qualityDiagnosticsFromImpact(result)).toStrictEqual([keep]);
  });
});

describe("stagedEntityIdStyleDiagnostics", () => {
  test("reviews entity files staged as new in the workspace's repository", () => {
    const root = temp();
    const git = (...args: string[]) =>
      execFileSync("git", ["-C", root, ...args], { stdio: "pipe" });
    git("init", "-q");
    mkdirSync(join(root, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      join(root, ".kb", "requirements", "REQ-x.md"),
      "---\nid: 'REQ-012'\ntitle: Thing\n---\nBody\n",
    );
    git("add", "-A");
    const found = stagedEntityIdStyleDiagnostics(root, { staged: true });
    const review = [
      "entity_id_style_review",
      "REQ-012",
      ".kb/requirements/REQ-x.md",
    ];
    expect(found.map((d) => [d.id, d.entityId, d.source])).toStrictEqual([
      review,
      review,
    ]);
    expect(stagedEntityIdStyleDiagnostics(root, {})).toStrictEqual([]);
    expect(
      stagedEntityIdStyleDiagnostics(root, { staged: false }),
    ).toStrictEqual([]);
  });

  test("runs only for staged checks inside a work tree", () => {
    expect(stagedEntityIdStyleDiagnostics(temp(), {})).toStrictEqual([]);
    expect(
      stagedEntityIdStyleDiagnostics(temp(), { staged: false }),
    ).toStrictEqual([]);
    expect(
      stagedEntityIdStyleDiagnostics(temp(), { staged: true }),
    ).toStrictEqual([]);
  });
});
