import { describe, expect, test } from "bun:test";
import {
  SOURCE_PLANNED_LIFECYCLE_CODES,
  closeSupersededRequirementsActionInput,
  exceptionUnapprovedActionInput,
  lifecycleActionsFromViolations,
  migrationSyncActionInput,
  schema6ReviewActionsFromCheck,
  sourcePathReviewActionInput,
  sourcePathRewriteActionInput,
  supersessionCycleReviewActionInput,
} from "../../../src/public/operations/schema6-check-actions.js";
import { expectGolden } from "../helpers/golden.js";

/** Paths of keys whose value is undefined, which JSON goldens cannot show. */
function undefinedKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) =>
      undefinedKeys(item, `${path}[${index}]`),
    );
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    item === undefined
      ? [`${path}.${key}`]
      : undefinedKeys(item, `${path}.${key}`),
  );
}

function golden(name: string, result: unknown) {
  expect(undefinedKeys(result)).toEqual([]);
  expectGolden(name, result);
}

const plain = (result: {
  actions: unknown[];
  consumed: ReadonlySet<number>;
}) => ({ actions: result.actions, consumed: [...result.consumed] });

const VIOLATIONS = [
  {
    rule: "superseded-requirement-open",
    entityId: "REQ-z",
    evidence: {
      cycle: ["REQ-z", "REQ-a", 5],
      edges: [["REQ-z", "REQ-a"], ["x"], "bad", ["REQ-a", 2, "REQ-z"]],
    },
  },
  {
    rule: "superseded-requirement-open",
    evidence: { cycle: ["REQ-q x"], edges: "no" },
  },
  {
    rule: "superseded-requirement-open",
    entityId: "REQ-b",
    source: "b.md",
    evidence: { status: "open", supersededBy: ["REQ-c", 3] },
  },
  {
    rule: "superseded-requirement-open",
    entityId: "REQ-a",
    evidence: ["not", "a", "record"],
  },
  { rule: "superseded-requirement-open", entityId: 4, evidence: {} },
  { rule: "source-path-dangling", evidence: { value: "v" } },
  {
    rule: "source-path-dangling",
    entityId: "E1",
    evidence: {
      file: "f1.md",
      refused: "multi-line",
      value: ["a"],
      rewrite: ".kb/x.md",
    },
  },
  { rule: "source-path-dangling", entityId: "E2", evidence: { value: "v" } },
  {
    rule: "source-path-dangling",
    entityId: "E3",
    evidence: { field: "text_ref", value: "t.md", refused: "r", file: "f3" },
  },
  {
    rule: "source-path-dangling",
    entityId: "E4",
    evidence: { field: "text_ref", value: "t", rewrite: "r.md" },
  },
  {
    rule: "source-path-dangling",
    entityId: "E5",
    source: "s5.md",
    evidence: { value: "old", rewrite: "new" },
  },
  {
    rule: "source-path-dangling",
    entityId: "E5",
    source: "ignored.md",
    evidence: { file: "a5.md", field: "text_ref", value: "o", rewrite: "n" },
  },
  {
    rule: "source-path-dangling",
    entityId: "E7",
    evidence: { file: "f7", field: "text_ref", value: "gone" },
  },
  {
    rule: "source-path-dangling",
    entityId: "E6",
    evidence: { file: "f6", value: 7, remove: "self" },
  },
  {
    rule: "source-path-dangling",
    entityId: "E0",
    source: "f0",
    evidence: { remove: "other" },
  },
  { rule: "other", entityId: "E9" },
];

describe("lifecycleActionsFromViolations", () => {
  test("maps lifecycle findings to stable actions", () => {
    const result = lifecycleActionsFromViolations(VIOLATIONS);
    golden("schema6-lifecycle-actions", plain(result));
    expect([...result.consumed]).toEqual([
      0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 13, 14,
    ]);
  });

  test("plans the sync after the actions that rewrite sources", () => {
    const only = (violations: Record<string, unknown>[]) =>
      lifecycleActionsFromViolations(violations).actions.map(
        (action) => `${action.id} ${JSON.stringify(action.dependsOn ?? null)}`,
      );
    expect(only([VIOLATIONS[2] as Record<string, unknown>])).toEqual([
      "close-superseded-requirements null",
      'migration-sync ["close-superseded-requirements"]',
    ]);
    expect(only([VIOLATIONS[13] as Record<string, unknown>])).toEqual([
      "source-path-rewrite null",
      'migration-sync ["source-path-rewrite"]',
    ]);
    expect(only([VIOLATIONS[10] as Record<string, unknown>])).toEqual([
      "source-path-rewrite null",
      'migration-sync ["source-path-rewrite"]',
    ]);
    expect(only([VIOLATIONS[0] as Record<string, unknown>])).toEqual([
      "review-supersession-cycle-REQ-a-REQ-z null",
    ]);
    expect(lifecycleActionsFromViolations([])).toEqual({
      actions: [],
      consumed: new Set(),
    });
  });
});

describe("lifecycle action inputs", () => {
  test("orders closures, rewrites and removals", () => {
    const close = closeSupersededRequirementsActionInput([
      { id: "REQ-b", status: "open", supersededBy: ["X"] },
      { id: "REQ-a", path: "a.md", status: "active", supersededBy: [] },
    ]);
    expect(close.affectedEntityIds).toEqual(["REQ-a", "REQ-b"]);
    expect(close.affectedFiles).toEqual(["a.md"]);
    const rewrite = sourcePathRewriteActionInput({
      rewrites: [
        { entityId: "B", file: "z", from: "1", to: "2" },
        { entityId: "B", file: "a", from: "1", to: "2" },
        { entityId: "A", file: "z", from: "1", to: "2" },
      ],
      removals: [
        { entityId: "C", file: "c", from: "x", reason: "self" },
        { entityId: "A", file: "y", from: "x", reason: "dangling" },
      ],
    });
    expect(rewrite.affectedEntityIds).toEqual(["A", "B", "C"]);
    expect(rewrite.affectedFiles).toEqual(["y", "z", "a", "c"]);
    expect(
      (rewrite.evidence as { rewrites: { file: string }[] }).rewrites.map(
        (row) => row.file,
      ),
    ).toEqual(["z", "a", "z"]);
    expect(
      (rewrite.evidence as { removals: { entityId: string }[] }).removals.map(
        (row) => row.entityId,
      ),
    ).toEqual(["A", "C"]);
    golden("schema6-lifecycle-inputs", {
      sync: migrationSyncActionInput(["a", "b"]),
      cycle: supersessionCycleReviewActionInput({
        members: ["B", "A..x"],
        edges: [["A..x", "B"]],
        files: ["f.md"],
      }),
      review: [
        sourcePathReviewActionInput({ entityId: "S 1", value: "v" }),
        sourcePathReviewActionInput({
          entityId: "S2",
          value: { a: 1 },
          file: "s.md",
          reason: "why",
          rewrite: ".kb/s.md",
        }),
        sourcePathReviewActionInput({
          entityId: "T 1",
          field: "text_ref",
          value: "t",
        }),
        sourcePathReviewActionInput({
          entityId: "T2",
          field: "text_ref",
          value: 3,
          file: "t.md",
          reason: "why",
          rewrite: "e.md",
        }),
      ],
      exception: [
        exceptionUnapprovedActionInput({
          exceptionId: "EX",
          exempts: ["B1", "B2"],
          source: "ex.md",
        }),
        exceptionUnapprovedActionInput({ exceptionId: "EY", exempts: [] }),
      ],
      codes: [...SOURCE_PLANNED_LIFECYCLE_CODES],
    });
  });
});

const finding = (
  id: string,
  entityId: unknown,
  extra: Record<string, unknown> = {},
) => ({ id: `rule.${id}`, entityId, ...extra });

const DIAGNOSTICS = [
  finding("exception-unapproved", ""),
  finding("exception-unapproved", "EX", {
    source: "ex.md",
    evidence: { exempts: ["B1", 2, "B2"] },
  }),
  finding("exception-unapproved", "EY", { evidence: null }),
  finding("exception-approval-self-attested", ""),
  finding("exception-approval-self-attested", "SA", {
    message: "message only",
    suggestion: "",
    source: "sa.md",
    evidence: { exempts: ["B1"] },
  }),
  finding("exception-approval-self-attested", "SB", {
    message: "ignored",
    suggestion: "suggested",
  }),
  finding("scenario-feasibility-unknown", ""),
  finding("scenario-feasibility-unknown", "SC", {
    message: "cannot decide",
    suggestion: "add facts",
    source: "sc.md",
  }),
  finding("scenario-feasibility-unknown", "SD"),
  finding("agent-requirement-unapproved", "R2", { source: "r2.md" }),
  finding("agent-requirement-unapproved", "R1"),
  finding("agent-requirement-unapproved", "R1", { source: "r1.md" }),
  finding("agent-requirement-unapproved", "workspace", {
    source: "w.md",
    evidence: { total: 7 },
  }),
  finding("agent-requirement-unapproved", ""),
  finding("symbol-owner-superseded", "SYM-2", {
    source: "s2.ts",
    evidence: { replacements: ["REQ-n"] },
  }),
  finding("symbol-owner-superseded", "SYM-1", { evidence: ["x"] }),
  finding("symbol-owner-superseded", "SYM-1", { source: "s1.ts" }),
  finding("symbol-owner-superseded", "workspace", {
    evidence: { total: 5 },
  }),
  finding("requirement-rationale-missing", "REQ-r2", { source: "q.md" }),
  finding("requirement-rationale-missing", "REQ-r1", { source: "p.md" }),
  finding("requirement-rationale-missing", "workspace", {
    evidence: { total: 9 },
  }),
  finding("requirement-rationale-missing", "", { evidence: { total: "12" } }),
  finding("adr-unlinked", ""),
  finding("adr-unlinked", "ADR-1", {
    message: "unlinked",
    suggestion: "link it",
    source: "adr1.md",
  }),
  finding("adr-proposed", "ADR-2", { message: "proposed" }),
  finding("rule-key-arguments-missing", "R1/R2", {
    message: "predicate ns:pred/2 declares no key_arguments (b)",
    suggestion: "declare key_arguments",
  }),
  finding("rule-key-arguments-missing", "R0/R1", {
    message: "predicate ns:pred/2 declares no key_arguments (a)",
    suggestion: "ignored later suggestion",
  }),
  finding("rule-key-arguments-missing", "R1/R2", {
    message: "predicate ns:pred/2 declares no key_arguments (b)",
  }),
  finding("rule-key-arguments-missing", "", {
    message: "predicate a.b::q/12 declares no key_arguments",
  }),
  finding("rule-key-arguments-missing", "R3/R4", {
    message: "predicate p/2 declares no key_arguments",
  }),
  finding("rule-key-arguments-missing", "R5/R6"),
  finding("unrelated", "U1"),
];

describe("schema6ReviewActionsFromCheck", () => {
  test("maps review findings to stable review actions", () => {
    const result = schema6ReviewActionsFromCheck(DIAGNOSTICS);
    golden("schema6-review-actions", plain(result));
    const consumed = [...result.consumed];
    for (const skipped of [0, 3, 6, 22, 29, 30, 31])
      expect(consumed).not.toContain(skipped);
    expect(consumed).toContain(13);
    expect(consumed).toContain(21);
  });

  test("counts each queue at least as long as its page", () => {
    const result = schema6ReviewActionsFromCheck([
      finding("agent-requirement-unapproved", "R1", {
        evidence: { total: 0 },
      }),
      finding("agent-requirement-unapproved", "R2"),
      finding("symbol-owner-superseded", "S1", { evidence: { total: 0 } }),
      finding("requirement-rationale-missing", "Q1"),
    ]);
    expect(
      result.actions.map(
        (action) => (action.invocation as { instruction: string }).instruction,
      ),
    ).toEqual([
      "1 symbol(s) implement only superseded or deprecated requirements: S1. For each, kb_upsert the symbol with an implements link to the requirement that replaced its owner (evidence lists the replacements) when it still implements that behavior, or remove the symbol when the behavior is gone. Rerun kb_check for the next page.",
      "1 human- or agent-authored requirement(s) state no rationale: Q1. Ask the person who stated the intent why it matters, then kb_upsert the requirement with rationale set to that answer (or link the ADR that records the decision). Rerun kb_check for the next page.",
      "2 agent-authored requirement(s) have no human approval: R1, R2. Have a person read each one; when it states the intended behavior, kb_upsert it with origin.approved_by set to the reviewer (keep kind: agent and the rest of origin), in the same change and pull request as the requirement, not a separate one. Rerun kb_check for the next page.",
    ]);
    expect(
      schema6ReviewActionsFromCheck([
        finding("agent-requirement-unapproved", "workspace", {
          evidence: { total: 3 },
        }),
        finding("symbol-owner-superseded", "workspace"),
        finding("requirement-rationale-missing", ""),
      ]).actions,
    ).toEqual([]);
  });
});
