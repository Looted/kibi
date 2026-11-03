import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildActionsFromStatus,
  buildMigrationPlan,
  digestMigrationPlan,
  migrationAction,
} from "../../../src/public/operations/migration-plan.js";

const root = mkdtempSync(path.join(tmpdir(), "kibi-migration-plan-cov-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const current = {
  status: "current",
  currentVersion: 13,
  latestVersion: 13,
  needsMigration: false,
  warning: null,
  configHash: null,
} as const;

describe("buildActionsFromStatus", () => {
  test("the resync depends on the store recovery that runs first", () => {
    const plan = buildActionsFromStatus({
      workspaceRoot: root,
      branchStore: { state: "missing", path: ".kb/branches/x" },
      staleReasons: [{ code: "compiler_changed", path: "a.md" }],
      configStatus: current,
    });
    const resync = plan.actions.find(
      (action) => action.id === "freshness-resync",
    );
    expect(resync?.dependsOn).toStrictEqual(["branch-store-ensure"]);
    expect(resync?.affectedFiles).toStrictEqual(["a.md"]);
  });
});

describe("digestMigrationPlan", () => {
  test("groups the non-automatic actions, most numerous first", () => {
    const review = (id: string, code: string, state?: "ready" | "blocked") =>
      migrationAction({
        id,
        code,
        category: "quality",
        safety: "review",
        ...(state ? { state } : {}),
        invocation: { kind: "review", instruction: "look" },
        dispositionRequired: true,
      });
    const plan = buildMigrationPlan({
      actions: [
        review("r1", "b_code"),
        review("r2", "a_code"),
        review("r3", "a_code"),
        review("r4", "c_code"),
        review("r5", "c_code", "blocked"),
        review("r6", "c_code", "blocked"),
      ],
    });
    expect(
      digestMigrationPlan(plan).actionGroups.map((group) => [
        group.code,
        group.state,
        group.count,
      ]),
    ).toStrictEqual([
      ["a_code", "ready", 2],
      ["c_code", "blocked", 2],
      ["b_code", "ready", 1],
      ["c_code", "ready", 1],
    ]);
  });
});
