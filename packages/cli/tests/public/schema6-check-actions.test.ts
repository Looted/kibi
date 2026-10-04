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
      evaluateOriginReview({
        requirements,
        exempts: [],
        superseded: new Set(),
      }),
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
});
