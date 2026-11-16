import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ChangedFileImpactResult } from "../../../src/public/impact-diagnostics.js";
import {
  SCOPED_CHECK_BUDGET_CHARS,
  buildStructuredContent,
  buildSummary,
  fitScopedCheckToBudget,
  summarizeMigrationPlan,
} from "../../../src/public/operations/check-format-shared.js";
import {
  changedKbEntityIds,
  scopeViolationsToImpact,
} from "../../../src/public/operations/check-helpers.js";
import type { MigrationPlan } from "../../../src/public/operations/migration-plan.js";
import type { Violation } from "../../../src/utils/rule-registry.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function finding(
  rule: string,
  entityId: string,
  extras: Partial<Violation> = {},
): Violation {
  return {
    rule,
    entityId,
    description: `${rule} on ${entityId}`,
    source: `.kb/requirements/${entityId}.md`,
    ...extras,
  };
}

const impact: ChangedFileImpactResult = {
  impactDiagnostics: [],
  sourceFiles: ["src/a.ts"],
  extractedSymbols: [
    {
      id: "SYM-a-other",
      name: "other",
      kind: "function",
      role: "behavioral",
      location: { line: 1 } as never,
      hunkRanges: [],
      linkedEntityIds: [],
    },
  ],
  linkedEntities: [
    {
      id: "REQ-linked",
      relationshipType: "implements",
      sourceSymbolId: "SYM-a-run",
      sourceSymbolName: "run",
    },
  ],
  nextActions: [],
};

describe("scopeViolationsToImpact", () => {
  test("lists what concerns the change and counts the rest by rule", () => {
    const kept = [
      finding("required-fields", "REQ-linked"),
      finding("symbol-traceability", "SYM-a-run"),
      finding("symbol-traceability", "SYM-a-other"),
      finding("claim-subject-missing", "REQ-new"),
      finding("verified-by-target", "SCEN-x", {
        evidence: { relationship: { from: "SCEN-x", to: "REQ-linked" } },
      }),
      finding("verified-by-target", "TEST-y", {
        evidence: { relationship: { from: "REQ-new", to: "TEST-y" } },
      }),
      finding("source-path-dangling", "REQ-far", { source: "./src/a.ts" }),
      finding("source-relationship-parity", "REQ-far"),
      finding("kb-consistency", "REQ-far"),
      finding("branch-store-not-compiled", "REQ-far"),
      finding("required-fields", ""),
    ];
    const omitted = [
      finding("required-fields", "REQ-far"),
      finding("required-fields", "REQ-far-2"),
      finding("claim-subject-missing", "REQ-far-3", {
        evidence: { relationship: { from: 1, to: null } },
      }),
    ];
    const scoped = scopeViolationsToImpact(
      [...kept, ...omitted],
      impact,
      new Set(["REQ-new"]),
    );
    expect(scoped.kept).toEqual(kept);
    expect(scoped.omitted).toEqual({
      total: 3,
      byRule: { "required-fields": 2, "claim-subject-missing": 1 },
    });
    expect(Object.keys(scoped.omitted?.byRule ?? {})).toEqual([
      "required-fields",
      "claim-subject-missing",
    ]);
  });

  test("orders tied rules by name and omits nothing when all concern the change", () => {
    const scoped = scopeViolationsToImpact(
      [finding("zeta", "REQ-far"), finding("alpha", "REQ-far")],
      impact,
      new Set(),
    );
    expect(Object.keys(scoped.omitted?.byRule ?? {})).toEqual([
      "alpha",
      "zeta",
    ]);
    expect(
      scopeViolationsToImpact(
        [finding("required-fields", "REQ-linked")],
        impact,
        new Set(),
      ).omitted,
    ).toBeUndefined();
  });
});

describe("scopeViolationsToImpact paths and endpoints", () => {
  test("matches sources however their path is spelled", () => {
    const spelled: ChangedFileImpactResult = {
      ...impact,
      sourceFiles: ["./src/a.ts", "src\\b.ts"],
    };
    const kept = [
      finding("source-path-dangling", "REQ-far", { source: "src\\a.ts" }),
      finding("source-path-dangling", "REQ-far", { source: "./src/b.ts" }),
    ];
    expect(scopeViolationsToImpact(kept, spelled, new Set())).toStrictEqual({
      kept,
      omitted: undefined,
    });
  });

  test("strips only a leading ./ from a source", () => {
    const near: ChangedFileImpactResult = {
      ...impact,
      sourceFiles: ["src/ab.ts"],
    };
    const far = finding("required-fields", "REQ-far", {
      source: "src/a./b.ts",
    });
    expect(scopeViolationsToImpact([far], near, new Set()).kept).toStrictEqual(
      [],
    );
  });

  test("leaves out findings whose endpoints and source are all elsewhere", () => {
    const far = [
      finding("verified-by-target", "SCEN-far", {
        evidence: { relationship: { from: "SCEN-far", to: "REQ-far" } },
      }),
      finding("required-fields", "REQ-far", { source: undefined }),
      finding("required-fields", "REQ-far", { source: "src/other.ts" }),
    ];
    const scoped = scopeViolationsToImpact(far, impact, new Set());
    expect(scoped.kept).toStrictEqual([]);
    expect(scoped.omitted).toStrictEqual({
      total: 3,
      byRule: { "required-fields": 2, "verified-by-target": 1 },
    });
  });
});

describe("changedKbEntityIds", () => {
  function repo(): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-check-scope-"));
    dirs.push(dir);
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: dir, stdio: "pipe" });
    git("init", "-q", "-b", "main");
    mkdirSync(path.join(dir, ".kb", "requirements"), { recursive: true });
    for (const id of ["REQ-kept", "REQ-edited", "REQ-staged", "REQ-moved"]) {
      writeFileSync(path.join(dir, ".kb", "requirements", `${id}.md`), id);
    }
    writeFileSync(path.join(dir, ".kb", "symbols.yaml"), "symbols: []\n");
    git("add", ".");
    git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base");
    return dir;
  }

  test("names the entities whose KB document differs from HEAD", () => {
    const dir = repo();
    const req = (id: string) =>
      path.join(dir, ".kb", "requirements", `${id}.md`);
    writeFileSync(req("REQ-edited"), "changed");
    writeFileSync(req("REQ-staged"), "changed");
    writeFileSync(req("REQ-new"), "new");
    writeFileSync(path.join(dir, ".kb", "symbols.yaml"), "symbols: [x]\n");
    execFileSync("git", ["add", req("REQ-staged")], { cwd: dir });
    execFileSync(
      "git",
      [
        "mv",
        req("REQ-moved"),
        path.join(dir, ".kb", "requirements", "REQ-renamed.md"),
      ],
      { cwd: dir },
    );
    expect([...changedKbEntityIds(dir)].sort()).toEqual([
      "REQ-edited",
      "REQ-new",
      "REQ-renamed",
      "REQ-staged",
    ]);
  });

  test("ignores files that only look like KB documents", () => {
    const dir = repo();
    writeFileSync(path.join(dir, ".kb", "requirements", "REQ-x.md.orig"), "x");
    writeFileSync(path.join(dir, ".kb", "requirements", "notes.txt"), "x");
    mkdirSync(path.join(dir, ".kb", "requirements", "deep"));
    writeFileSync(
      path.join(dir, ".kb", "requirements", "deep", "REQ-d.md"),
      "x",
    );
    expect([...changedKbEntityIds(dir)]).toStrictEqual([]);
  });

  test("reads paths of a workspace nested in the repository", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-check-scope-"));
    dirs.push(root);
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, stdio: "pipe" });
    git("init", "-q", "-b", "main");
    const reqs = path.join(root, "sub", ".kb", "requirements");
    mkdirSync(reqs, { recursive: true });
    for (const id of ["REQ-edited", "REQ-moved", "REQ-source"]) {
      writeFileSync(
        path.join(reqs, `${id}.md`),
        `${id} body that is long enough\n`.repeat(20),
      );
    }
    git("add", ".");
    git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base");
    writeFileSync(path.join(reqs, "REQ-edited.md"), "changed");
    git(
      "mv",
      path.join(reqs, "REQ-moved.md"),
      path.join(reqs, "REQ-renamed.md"),
    );
    expect(
      [...changedKbEntityIds(path.join(root, "sub"))].sort(),
    ).toStrictEqual(["REQ-edited", "REQ-renamed"]);
  });

  test("names none outside a Git work tree", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-check-scope-"));
    dirs.push(dir);
    expect(changedKbEntityIds(dir).size).toBe(0);
  });
});

function plan(
  actions: { id: string; code: string; state: string }[],
): MigrationPlan {
  return {
    version: "kibi.migration-plan.v2",
    planHash: "hash",
    status: "ready",
    expected: {} as never,
    scope: {} as never,
    summary: { actionCount: actions.length } as never,
    actions: actions as never,
  } as unknown as MigrationPlan;
}

describe("scoped check results", () => {
  test("summarize the migration plan by action code", () => {
    const blocked = Array.from({ length: 12 }, (_, index) => ({
      id: `blocked-${index}`,
      code: "check_x",
      state: "blocked",
    }));
    const summary = summarizeMigrationPlan(
      plan([
        { id: "ready", code: "proof_snapshot_dirty", state: "ready" },
        ...blocked,
      ]),
    );
    expect(summary).toEqual({
      planHash: "hash",
      status: "ready",
      summary: { actionCount: 13 } as never,
      actionsByCode: { proof_snapshot_dirty: 1, check_x: 12 },
      blockedActionIds: blocked.slice(0, 10).map((action) => action.id),
      hint: "Pass includeMigrationPlan: true for the full plan with its actions (kb_apply_plan needs it).",
    });
  });

  test("count the omitted findings, never reading as a pass", () => {
    const content = buildStructuredContent({
      violations: [],
      evaluated: { rules: ["required-fields"] },
      diagnostics: [],
      impactResult: undefined,
      migrationPlan: plan([]),
      omittedViolations: { total: 2, byRule: { "required-fields": 2 } },
      summarizePlan: true,
    });
    expect(content.count).toBe(2);
    expect(content.migrationPlan).toBeUndefined();
    expect(content.migrationPlanSummary?.planHash).toBe("hash");
    expect(content.omittedViolations).toEqual({
      total: 2,
      byRule: { "required-fields": 2 },
    });
    const text = buildSummary({
      violations: [],
      impactResult: undefined,
      qualityDiagnostics: [],
      omittedViolations: content.omittedViolations,
    });
    expect(text).toBe(
      "2 violations found\n- 2 blocking violations elsewhere in the KB are not listed here (required-fields ×2); they do not concern the checked files, but they still block kb_check without sourceFiles.",
    );
    expect(
      buildSummary({
        violations: [],
        impactResult: undefined,
        qualityDiagnostics: [],
        omittedViolations: {
          total: 6,
          byRule: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 },
        },
      }),
    ).toContain("(a ×1, b ×1, c ×1, d ×1, e ×1, 1 more rules)");
    expect(
      buildSummary({
        violations: [],
        impactResult: undefined,
        qualityDiagnostics: [],
        omittedViolations: { total: 1, byRule: { a: 1 } },
      }),
    ).toContain(
      "1 blocking violation elsewhere in the KB is not listed here (a ×1); it does not concern the checked files, but it still blocks kb_check without sourceFiles.",
    );
  });

  test("keep a result within its budget unchanged", () => {
    const content = buildStructuredContent({
      violations: [finding("required-fields", "REQ-a")],
      evaluated: { rules: [] },
      diagnostics: [],
      impactResult: undefined,
    });
    expect(fitScopedCheckToBudget(content)).toBe(content);
  });

  test("cut a large result: advisory findings to counts, then blocking ones by rule", () => {
    const violations = Array.from({ length: 300 }, (_, index) =>
      finding("source-relationship-parity", `REQ-${index % 150}`, {
        suggestion: "Run kibi sync.",
      }),
    );
    violations.push(finding("required-fields", "REQ-last"));
    const content = buildStructuredContent({
      violations,
      evaluated: { rules: [] },
      diagnostics: violations.map((violation) => ({
        category: "SYNC_ERROR",
        severity: "error" as const,
        message: violation.description,
      })),
      qualityDiagnostics: Array.from({ length: 3 }, (_, index) => ({
        id: index === 0 ? "rule.a" : "rule.b",
        severity: "warning" as const,
        blocking: false,
        category: "integrity",
        message: "advisory",
        suggestion: "",
      })),
      impactResult: undefined,
    });
    const fitted = fitScopedCheckToBudget(content);
    expect(JSON.stringify(fitted).length).toBeLessThanOrEqual(
      SCOPED_CHECK_BUDGET_CHARS,
    );
    expect(fitted.truncated).toBe(true);
    expect(fitted.count).toBe(301);
    expect(fitted.qualityDiagnostics).toEqual([
      expect.objectContaining({
        id: "check_quality_truncated",
        blocking: false,
        evidence: { omitted: 3, byId: { "rule.a": 1, "rule.b": 2 } },
      }),
    ]);
    const listed = fitted.violations.length;
    expect(listed).toBeGreaterThan(0);
    expect(fitted.diagnostics).toHaveLength(listed);
    expect(fitted.violations).toEqual(violations.slice(0, listed));
    const groups = fitted.violationGroups ?? [];
    expect(groups.map((group) => [group.rule, group.count])).toEqual([
      ["source-relationship-parity", 300 - listed],
      ["required-fields", 1],
    ]);
    expect(groups[0]?.entityIds).toHaveLength(20);
    expect(new Set(groups[0]?.entityIds).size).toBe(20);
    expect(groups[0]?.suggestion).toBe("Run kibi sync.");
    expect(groups[1]).toEqual({
      rule: "required-fields",
      count: 1,
      entityIds: ["REQ-last"],
      description: "required-fields on REQ-last",
    });
    const text = buildSummary({
      violations: fitted.violations,
      impactResult: undefined,
      qualityDiagnostics: fitted.qualityDiagnostics ?? [],
      violationGroups: groups,
      ...(fitted.truncation ? { truncation: fitted.truncation } : {}),
    });
    expect(text.startsWith("301 violations found\n")).toBe(true);
    expect(text).toContain(
      `- source-relationship-parity ×${300 - listed} | ${groups[0]?.entityIds.join(", ")}, … | source-relationship-parity on`,
    );
    expect(text).toContain(
      "- required-fields ×1 | REQ-last | required-fields on REQ-last\n",
    );
    expect(text.endsWith(fitted.truncation?.hint ?? "missing")).toBe(true);
  });

  test("cut advisory findings alone when that is enough", () => {
    const content = buildStructuredContent({
      violations: [finding("required-fields", "REQ-a")],
      evaluated: { rules: [] },
      diagnostics: [],
      qualityDiagnostics: [
        {
          id: "rule.big",
          severity: "warning",
          blocking: false,
          category: "integrity",
          message: "x".repeat(SCOPED_CHECK_BUDGET_CHARS),
          suggestion: "",
        },
      ],
      impactResult: undefined,
    });
    const fitted = fitScopedCheckToBudget(content);
    expect(fitted.violations).toEqual(content.violations);
    expect(fitted.violationGroups).toBeUndefined();
    expect(fitted.qualityDiagnostics?.[0]?.message).toBe(
      "1 advisory finding is not listed, to keep this result within its size budget.",
    );
  });
});
