import { describe, expect, test } from "bun:test";
import { migrationApplyContractViolations } from "../scoring/cell";
import type { CellEvidence } from "../scoring/cell";

const PLAN = {
  version: "kibi.migration-plan.v2",
  planHash: "c".repeat(64),
  actions: [
    {
      id: "symbol-symbol_refresh_coordinates-SYM-X",
      code: "symbol_refresh_coordinates",
      state: "ready",
      safety: "automatic",
      autoApplicable: true,
      invocation: {
        kind: "cli",
        command_argv: ["kibi", "sync", "--refresh-symbol-coordinates"],
      },
    },
  ],
};

const CONTRACT = {
  requiredCalls: [{ tool: "kb_apply_plan" }],
  forbiddenTools: ["kb_upsert", "kb_delete"],
  exactMigrationApply: {
    actionCode: "symbol_refresh_coordinates",
    invocationCommandArgv: ["kibi", "sync", "--refresh-symbol-coordinates"],
  },
};

type RawCall = {
  tool: string;
  args: Record<string, unknown>;
  resultOk: boolean;
  result?: Record<string, unknown>;
};

function evidenceFrom(rawCalls: readonly RawCall[]): CellEvidence {
  return {
    finalState: { complete: true, integrityValid: true, claims: [] },
    broker: {
      complete: true,
      integrityValid: true,
      claims: [],
      orderedCalls: rawCalls.map((call, index) => ({
        tool: call.tool,
        predicate: `sequence=${index + 1}`,
      })),
      rawCalls,
    },
    diagnostic: { complete: true, integrityValid: true, claims: [] },
    codex: { complete: true, integrityValid: true, claims: [] },
    isolation: { observedSentinels: [], violations: [] },
  };
}

describe("production migration-plan response shape", () => {
  test("accepts migrationPlan with its own hash, actions, and unchanged apply plan", () => {
    const result = migrationApplyContractViolations(
      CONTRACT,
      evidenceFrom([
        {
          tool: "kb_coverage",
          args: {},
          resultOk: true,
          result: {
            structuredContent: {
              kibiProtocol: 1,
              data: { migrationPlan: PLAN },
            },
          },
        },
        {
          tool: "kb_apply_plan",
          args: {
            approvedPlanHash: PLAN.planHash,
            approvedActionIds: [PLAN.actions[0]?.id],
            plan: PLAN,
          },
          resultOk: true,
          result: {
            structuredContent: {
              kibiProtocol: 1,
              data: { outcome: "applied", effects: [] },
            },
          },
        },
      ]),
    );

    expect(result).toEqual([]);
  });

  test("rejects a selected action with the wrong typed invocation argv", () => {
    const wrongArgvPlan = {
      ...PLAN,
      actions: [
        {
          ...PLAN.actions[0],
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "sync"],
          },
        },
      ],
    };
    const result = migrationApplyContractViolations(
      CONTRACT,
      evidenceFrom([
        {
          tool: "kb_coverage",
          args: {},
          resultOk: true,
          result: {
            structuredContent: {
              kibiProtocol: 1,
              data: { migrationPlan: wrongArgvPlan },
            },
          },
        },
        {
          tool: "kb_apply_plan",
          args: {
            approvedPlanHash: wrongArgvPlan.planHash,
            approvedActionIds: [wrongArgvPlan.actions[0]?.id],
            plan: wrongArgvPlan,
          },
          resultOk: true,
          result: {
            structuredContent: {
              kibiProtocol: 1,
              data: { outcome: "applied", effects: [] },
            },
          },
        },
      ]),
    );

    expect(result).toContain(
      "selected action invocation.command_argv must equal exactMigrationApply.invocationCommandArgv",
    );
  });
});
