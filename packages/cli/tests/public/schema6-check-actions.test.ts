import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSchema6MigrationFragment } from "../../src/operations/migration/schema6.js";
import { partitionCheckFindings } from "../../src/public/operations/check-helpers.js";
import {
  buildActionsFromCheck,
  buildMigrationPlan,
  mergeMigrationPlans,
} from "../../src/public/operations/migration-plan.js";
import {
  AGENT_REQUIREMENT_REVIEW_LIMIT,
  evaluateOriginReview,
} from "../../src/public/operations/origin-review.js";
import {
  UPLOAD_TEXT,
  writeCurrentRequirement,
  writeManifest,
  writeUnapprovedException,
} from "../helpers/schema6-fixture.js";

const CHECKS_PL = path.resolve(import.meta.dir, "../../../core/src/checks.pl");

function keyArgumentsFinding(
  pair: string,
  predicate: string,
): Record<string, unknown> {
  const [reqA, reqB] = pair.split("/");
  return {
    id: "rule.rule-key-arguments-missing",
    severity: "warning",
    blocking: false,
    entityId: pair,
    source: "",
    message: `Opposing rules FACT-A (${reqA}) and FACT-B (${reqB}) stay unresolved because predicate ${predicate} declares no key_arguments; declaring key_arguments [positions 1] would decide the pair`,
    suggestion: `If the remaining arguments of ${predicate} are determined by [positions 1], add key_arguments to its predicate_schema fact`,
  };
}

describe("schema 6 review actions from check findings", () => {
  test("the Prolog finding text still names the predicate the way the plan parses it", () => {
    expect(readFileSync(CHECKS_PL, "utf8")).toContain(
      "because predicate ~w:~w/~w declares no key_arguments",
    );
  });

  test("groups key-argument findings into one review per predicate", () => {
    const actions = buildActionsFromCheck({
      qualityDiagnostics: [
        keyArgumentsFinding("REQ-a/REQ-b", "acme:holds_role/3"),
        keyArgumentsFinding("REQ-c/REQ-d", "acme:holds_role/3"),
        keyArgumentsFinding("REQ-a/REQ-e", "default:can_access/2"),
      ],
    });

    expect(actions.map((action) => action.id)).toEqual([
      "review-predicate-key-arguments-acme-holds_role-3",
      "review-predicate-key-arguments-default-can_access-2",
    ]);
    expect(actions[0]).toMatchObject({
      code: "review_predicate_key_arguments",
      safety: "review",
      dispositionRequired: true,
      affectedEntityIds: ["REQ-a", "REQ-b", "REQ-c", "REQ-d"],
      evidence: {
        predicate: "acme:holds_role/3",
        rulePairs: ["REQ-a/REQ-b", "REQ-c/REQ-d"],
      },
    });
  });

  test("maps exception and feasibility findings to stable per-entity reviews", () => {
    const actions = buildActionsFromCheck({
      qualityDiagnostics: [
        {
          id: "rule.exception-unapproved",
          entityId: "REQ-exc",
          source: ".kb/requirements/REQ-exc.md",
          message: "Exception REQ-exc exempts REQ-base but has no approved_by",
          evidence: { exceptionId: "REQ-exc", exempts: ["REQ-base"] },
        },
        {
          id: "rule.exception-approval-self-attested",
          entityId: "REQ-exc2",
          suggestion: "Have dana confirm the exception",
          evidence: { exempts: ["REQ-base"] },
        },
        {
          id: "rule.scenario-feasibility-unknown",
          entityId: "SCEN-upload",
          message: "Scenario expects success but assumes nothing",
          suggestion: "Link the property values the scenario relies on",
        },
        { id: "advisory.other", entityId: "REQ-z", suggestion: "Look." },
      ],
    });

    expect(actions.map((action) => [action.id, action.code])).toEqual([
      ["review-exception-unapproved-REQ-exc", "review_exception_unapproved"],
      [
        "review-exception-approval-self-attested-REQ-exc2",
        "review_exception_approval_self_attested",
      ],
      [
        "review-scenario-feasibility-unknown-SCEN-upload",
        "review_scenario_feasibility_unknown",
      ],
      ["diagnostic-advisory.other-REQ-z-4", "quality_advisory.other"],
    ]);
    expect(actions[0]?.affectedEntityIds).toEqual(["REQ-base", "REQ-exc"]);
    expect(actions[0]?.affectedFiles).toEqual([".kb/requirements/REQ-exc.md"]);
  });

  test("agent-requirement findings become one review queue, not one action per requirement", () => {
    const total = AGENT_REQUIREMENT_REVIEW_LIMIT + 2;
    const requirements = Array.from({ length: total }, (_, index) => ({
      id: `REQ-agent-${String(index).padStart(2, "0")}`,
      type: "req",
      status: "open",
      source: `.kb/requirements/REQ-agent-${String(index).padStart(2, "0")}.md`,
      origin: { kind: "agent" },
    }));
    const { qualityDiagnostics } = partitionCheckFindings(
      evaluateOriginReview(
        {
          requirements,
          exempts: [],
          superseded: new Set(),
        },
        new Set(["agent-requirement-unapproved"]),
      ),
    );
    expect(qualityDiagnostics).toHaveLength(AGENT_REQUIREMENT_REVIEW_LIMIT + 1);

    const actions = buildActionsFromCheck({
      qualityDiagnostics: qualityDiagnostics as unknown as Record<
        string,
        unknown
      >[],
    });

    expect(actions.map((action) => [action.id, action.code])).toEqual([
      [
        "review-agent-requirements-unapproved",
        "review_agent_requirements_unapproved",
      ],
    ]);
    const listed = requirements
      .slice(0, AGENT_REQUIREMENT_REVIEW_LIMIT)
      .map((requirement) => requirement.id);
    expect(actions[0]?.affectedEntityIds).toEqual(listed);
    expect(actions[0]?.evidence).toEqual({ requirements: listed, total });
    expect(actions[0]?.invocation).toMatchObject({ kind: "review" });
    expect(JSON.stringify(actions[0]?.invocation)).toContain(
      `${total} agent-authored requirement(s) have no human approval; these ${AGENT_REQUIREMENT_REVIEW_LIMIT} come first`,
    );
  });

  test("the same exception planned from sources and from a check merges into one action", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-schema6-merge-"));
    try {
      writeManifest(root, 5);
      writeCurrentRequirement(root, "REQ-base", UPLOAD_TEXT);
      writeUnapprovedException(root, "REQ-exc", "REQ-base");
      const fromSources = buildSchema6MigrationFragment({
        workspaceRoot: root,
        currentSchemaVersion: 5,
      });
      const fromCheck = buildActionsFromCheck({
        qualityDiagnostics: [
          {
            id: "rule.exception-unapproved",
            entityId: "REQ-exc",
            evidence: { exceptionId: "REQ-exc", exempts: ["REQ-base"] },
          },
        ],
      });

      const merged = mergeMigrationPlans([
        buildMigrationPlan({ actions: fromSources.actions }),
        buildMigrationPlan({ actions: fromCheck }),
      ]);
      const reviews = merged.actions.filter(
        (action) => action.code === "review_exception_unapproved",
      );
      expect(reviews.map((action) => action.id)).toEqual([
        "review-exception-unapproved-REQ-exc",
      ]);
      expect(reviews[0]?.affectedEntityIds).toEqual(["REQ-base", "REQ-exc"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("lifecycle violations map to one close action, cycle reviews, one source repair action and a sync", () => {
    const actions = buildActionsFromCheck({
      violations: [
        {
          rule: "superseded-requirement-open",
          entityId: "REQ-old",
          source: ".kb/requirements/REQ-old.md",
          evidence: { supersededBy: ["REQ-new"], status: "open" },
        },
        {
          rule: "superseded-requirement-open",
          entityId: "REQ-loop-a",
          evidence: {
            cycle: ["REQ-loop-a", "REQ-loop-b"],
            edges: [
              ["REQ-loop-a", "REQ-loop-b"],
              ["REQ-loop-b", "REQ-loop-a"],
            ],
          },
        },
        {
          rule: "source-path-dangling",
          entityId: "ADR-001",
          source: ".kb/adr/ADR-001.md",
          evidence: {
            value: "documentation/adr/ADR-001.md",
            file: ".kb/adr/ADR-001.md",
            rewrite: ".kb/adr/ADR-001.md",
          },
        },
        {
          rule: "source-path-dangling",
          entityId: "FACT-STD-001",
          source: ".kb/facts/FACT-STD-001.md",
          evidence: {
            value: "memory-bank/techContext.md",
            file: ".kb/facts/FACT-STD-001.md",
            remove: "dangling",
          },
        },
        {
          rule: "source-path-dangling",
          entityId: "FACT-ATOMIC",
          source: ".kb/facts/FACT-ATOMIC.md",
          evidence: {
            value: "documentation/facts/FACT-atomic.md",
            file: ".kb/facts/FACT-ATOMIC.md",
            remove: "self",
          },
        },
        {
          rule: "source-path-dangling",
          entityId: "FACT-MULTI",
          source: ".kb/facts/FACT-MULTI.md",
          evidence: {
            value: ["memory-bank/a.md"],
            file: ".kb/facts/FACT-MULTI.md",
            remove: "dangling",
            refused:
              "the source field spans several lines, or editing it would change other frontmatter fields",
          },
        },
      ],
    });

    // Only the value Kibi cannot edit safely needs a person.
    expect(actions.map((action) => [action.id, action.code])).toEqual([
      [
        "review-supersession-cycle-REQ-loop-a-REQ-loop-b",
        "review_supersession_cycle",
      ],
      ["review-source-path-dangling-FACT-MULTI", "review_source_path_dangling"],
      ["close-superseded-requirements", "close_superseded_requirements"],
      ["source-path-rewrite", "source_path_rewrite"],
      ["migration-sync", "migration_sync"],
    ]);
    const byCode = new Map(actions.map((action) => [action.code, action]));
    expect(byCode.get("close_superseded_requirements")).toMatchObject({
      safety: "automatic",
      autoApplicable: true,
      affectedEntityIds: ["REQ-old"],
      affectedFiles: [".kb/requirements/REQ-old.md"],
      evidence: {
        requirements: [
          { id: "REQ-old", status: "open", supersededBy: ["REQ-new"] },
        ],
      },
    });
    expect(byCode.get("review_supersession_cycle")).toMatchObject({
      safety: "review",
      dispositionRequired: true,
      affectedEntityIds: ["REQ-loop-a", "REQ-loop-b"],
    });
    expect(
      JSON.stringify(byCode.get("review_supersession_cycle")?.invocation),
    ).toContain(
      "REQ-loop-a supersedes REQ-loop-b; REQ-loop-b supersedes REQ-loop-a",
    );
    expect(byCode.get("source_path_rewrite")).toMatchObject({
      safety: "automatic",
      autoApplicable: true,
      affectedEntityIds: ["ADR-001", "FACT-ATOMIC", "FACT-STD-001"],
      affectedFiles: [
        ".kb/adr/ADR-001.md",
        ".kb/facts/FACT-ATOMIC.md",
        ".kb/facts/FACT-STD-001.md",
      ],
      evidence: {
        count: 3,
        rewrites: [
          {
            entityId: "ADR-001",
            file: ".kb/adr/ADR-001.md",
            from: "documentation/adr/ADR-001.md",
            to: ".kb/adr/ADR-001.md",
          },
        ],
        removals: [
          {
            entityId: "FACT-ATOMIC",
            file: ".kb/facts/FACT-ATOMIC.md",
            from: "documentation/facts/FACT-atomic.md",
            reason: "self",
          },
          {
            entityId: "FACT-STD-001",
            file: ".kb/facts/FACT-STD-001.md",
            from: "memory-bank/techContext.md",
            reason: "dangling",
          },
        ],
      },
    });
    const review = byCode.get("review_source_path_dangling");
    expect(review).toMatchObject({
      safety: "review",
      dispositionRequired: true,
      affectedFiles: [".kb/facts/FACT-MULTI.md"],
      evidence: {
        source: ["memory-bank/a.md"],
        refused:
          "the source field spans several lines, or editing it would change other frontmatter fields",
      },
    });
    expect(
      review?.invocation.kind === "review" ? review.invocation.instruction : "",
    ).toContain("The compiled source is always the entity's own file");
    expect(byCode.get("migration_sync")?.dependsOn).toEqual([
      "close-superseded-requirements",
      "source-path-rewrite",
    ]);
  });

  test("symbol-owner and rationale findings become review queues; ADR findings one review each", () => {
    const actions = buildActionsFromCheck({
      qualityDiagnostics: [
        {
          id: "rule.symbol-owner-superseded",
          entityId: "SYM-b",
          source: "src/b.ts",
          evidence: { owners: ["REQ-old"], replacements: ["REQ-new"] },
        },
        {
          id: "rule.symbol-owner-superseded",
          entityId: "SYM-a",
          source: "src/a.ts",
          evidence: { owners: ["REQ-old"], replacements: [] },
        },
        {
          id: "rule.symbol-owner-superseded",
          entityId: "workspace",
          evidence: { total: 30, listed: 25 },
        },
        {
          id: "rule.requirement-rationale-missing",
          entityId: "REQ-why",
          source: ".kb/requirements/REQ-why.md",
          evidence: { origin: { kind: "human" } },
        },
        {
          id: "rule.adr-unlinked",
          entityId: "ADR-003",
          source: ".kb/adr/ADR-003.md",
          message:
            "Accepted ADR ADR-003 is not linked to any requirement or ADR",
          suggestion: "Link ADR-003 to the requirements it explains",
        },
        {
          id: "rule.adr-proposed",
          entityId: "ADR-012",
          message: "ADR ADR-012 is still proposed",
          suggestion: "Ask the decision owner to accept or withdraw ADR-012",
        },
      ],
    });

    expect(actions.map((action) => [action.id, action.code])).toEqual([
      ["review-adr-unlinked-ADR-003", "review_adr_unlinked"],
      ["review-adr-proposed-ADR-012", "review_adr_proposed"],
      ["review-symbol-owner-superseded", "review_symbol_owner_superseded"],
      [
        "review-requirement-rationale-missing",
        "review_requirement_rationale_missing",
      ],
    ]);
    const symbols = actions.find(
      (action) => action.code === "review_symbol_owner_superseded",
    );
    expect(symbols?.affectedEntityIds).toEqual(["SYM-a", "SYM-b"]);
    expect(symbols?.affectedFiles).toEqual(["src/a.ts", "src/b.ts"]);
    expect(JSON.stringify(symbols?.invocation)).toContain(
      "30 symbol(s) implement only superseded or deprecated requirements; these 2 come first",
    );
    const rationale = actions.find(
      (action) => action.code === "review_requirement_rationale_missing",
    );
    expect(rationale?.evidence).toEqual({
      requirements: ["REQ-why"],
      total: 1,
    });
    expect(actions[0]?.affectedFiles).toEqual([".kb/adr/ADR-003.md"]);
  });
});
