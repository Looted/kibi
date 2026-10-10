// implements REQ-cli-status-pre-first-sync
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Kibi compiles one store per branch and never copies another branch's. A
 * branch created without the post-checkout hook therefore starts with no
 * store, and the first engine attach creates an empty one. Before the fix
 * kb_status only said `branch_store_missing` (fixed by `kibi branch ensure`,
 * which creates an empty manifest), kb_check reported one
 * source-relationship-parity violation per authored relationship, and the
 * migration plan had no step that compiles the store.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type StaleReason = {
  code: string;
  detail: string;
  remediation: { command_argv: string[] };
};
type PlanAction = {
  id: string;
  code: string;
  dependsOn: string[];
  invocation: { kind: string; command_argv?: string[] };
};
type MigrationPlan = Json & { planHash: string; actions: PlanAction[] };
type StatusData = {
  syncState: string;
  staleReasons: StaleReason[];
  migrationPlan: MigrationPlan;
};

function status(ws: ConsumerWorkspace): StatusData {
  return (ws.json(["status"], {}) as { data: StatusData }).data;
}

function checkResult(ws: ConsumerWorkspace): Array<{
  rule: string;
  description: string;
  suggestion: string;
}> {
  const result = ws.json(["check", "--format", "json"]);
  return (result.structuredContent as Json).violations as Array<{
    rule: string;
    description: string;
    suggestion: string;
  }>;
}

function authorLinkedRequirement(ws: ConsumerWorkspace): void {
  ws.write(
    ".kb/scenarios/SCEN-demo-login.md",
    doc(
      "id: SCEN-demo-login\ntitle: User logs in\nstatus: active",
      "## Context\n\nA user signs in with a password.\n",
    ),
  );
  ws.write(
    ".kb/requirements/REQ-demo-login.md",
    doc(
      "id: REQ-demo-login\ntitle: Users can log in\nstatus: open\nlinks:\n  - type: specified_by\n    target: SCEN-demo-login",
      "## Context\n\nUsers must be able to log in.\n",
    ),
  );
}

describe("a new branch whose store was never compiled", () => {
  test("status, check and the migration plan name kibi sync, and applying the plan compiles the store", () => {
    const ws = createConsumerWorkspace("kibi-fresh-branch-store-");
    workspace = ws;
    authorLinkedRequirement(ws);
    ws.sync();
    ws.git("commit", "-qm", "kb");
    // No hooks run (core.hooksPath=/dev/null): nothing compiles the branch.
    ws.git("checkout", "-q", "-b", "feature/login");

    const before = status(ws);
    const reason = before.staleReasons.find(
      (row) => row.code === "branch_store_not_compiled",
    );
    expect(reason?.detail).toContain(
      "The KB store for branch feature/login does not exist yet, while .kb/ holds 2 authored source file(s).",
    );
    expect(reason?.remediation.command_argv).toEqual(["kibi", "sync"]);
    expect(before.staleReasons.map((row) => row.code)).not.toContain(
      "branch_store_missing",
    );
    const compile = before.migrationPlan.actions.find(
      (action) => action.id === "branch-store-compile",
    );
    expect(compile).toMatchObject({
      code: "branch_store_not_compiled",
      dependsOn: ["branch-store-ensure"],
      invocation: { kind: "cli", command_argv: ["kibi", "sync"] },
    });

    // kb_check attaches an engine (which creates an empty store) and reports
    // one blocking finding instead of a parity violation per relationship.
    const violations = checkResult(ws);
    expect(violations.map((violation) => violation.rule)).toEqual([
      "branch-store-not-compiled",
    ]);
    expect(violations[0]?.description).toContain(
      "is empty (generation-1:0: nothing compiled)",
    );
    expect(violations[0]?.suggestion).toContain("Run kibi sync");

    const empty = status(ws);
    expect(empty.syncState).toBe("stale");
    const plan = empty.migrationPlan;
    const actionIds = plan.actions
      .filter((action) => action.id.startsWith("branch-store-"))
      .map((action) => action.id);
    expect(actionIds).toEqual(["branch-store-compile"]);

    const applied = ws.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
      approvedActionIds: actionIds,
    }) as { status: string; data: { outcome: string } };
    expect(applied.data.outcome).toBe("applied");

    expect(checkResult(ws).map((violation) => violation.rule)).not.toContain(
      "branch-store-not-compiled",
    );
    expect(status(ws).staleReasons.map((row) => row.code)).not.toContain(
      "branch_store_not_compiled",
    );
  }, 240_000);
});
