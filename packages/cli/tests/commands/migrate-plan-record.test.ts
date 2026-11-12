import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  describePlanChange,
  findPrintedPlan,
  recordPrintedPlan,
} from "../../src/commands/migrate-plan-record.js";
import { planChangedMessage } from "../../src/commands/migrate.js";
import type { MigrationPlan } from "../../src/public/operations/migration-plan.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-plan-record-"));
  roots.push(root);
  return root;
}

const EXPECTED = {
  branch: "develop",
  kbBranch: "develop",
  kbSnapshotId: "a".repeat(64),
  workspaceSnapshot: "b".repeat(64),
  configHash: null,
};

function plan(
  planHash: string,
  actions: { id: string; code: string; state: string }[],
): MigrationPlan {
  return { planHash, expected: EXPECTED, actions } as unknown as MigrationPlan;
}

const recordFile = (root: string) =>
  path.join(root, ".kb", "migrations", "printed-plans.json");

describe("printed migration plans", () => {
  test("a newer print of the same plan replaces the older one", () => {
    const root = workspace();
    recordPrintedPlan(
      root,
      plan("h1", [{ id: "a", code: "C", state: "safe" }]),
      new Date(0),
    );
    recordPrintedPlan(root, plan("h2", []), new Date(1000));
    recordPrintedPlan(
      root,
      plan("h1", [{ id: "a", code: "C", state: "safe" }]),
      new Date(2000),
    );
    const records = JSON.parse(readFileSync(recordFile(root), "utf8")) as {
      planHash: string;
      printedAt: string;
    }[];
    expect(records.map((record) => record.planHash)).toEqual(["h1", "h2"]);
    expect(findPrintedPlan(root, "h1")?.printedAt).toBe(
      new Date(2000).toISOString(),
    );
  });

  test("a record file that is not a list holds no plans", () => {
    const root = workspace();
    mkdirSync(path.dirname(recordFile(root)), { recursive: true });
    writeFileSync(recordFile(root), '{"planHash":"h1"}\n');
    expect(findPrintedPlan(root, "h1")).toBeUndefined();
  });

  test("a plan that cannot be recorded is ignored", () => {
    const root = workspace();
    // .kb is a file, so the record's folder cannot be made.
    writeFileSync(path.join(root, ".kb"), "");
    expect(() => recordPrintedPlan(root, plan("h1", []))).not.toThrow();
    expect(findPrintedPlan(root, "h1")).toBeUndefined();
  });

  test("a change lists added, removed and restated actions and the moved snapshot", () => {
    const root = workspace();
    recordPrintedPlan(
      root,
      plan("h1", [
        { id: "keep", code: "K", state: "safe" },
        { id: "gone", code: "G", state: "safe" },
      ]),
    );
    const printed = findPrintedPlan(root, "h1");
    if (printed === undefined) throw new Error("plan not recorded");
    const current = {
      planHash: "h2",
      expected: {
        ...EXPECTED,
        kbSnapshotId: "c".repeat(64),
        configHash: "cfg",
      },
      actions: [
        { id: "keep", code: "K", state: "review" },
        { id: "new", code: "N", state: "safe" },
      ],
    } as unknown as MigrationPlan;
    expect(describePlanChange(printed, current)).toEqual([
      "keep went from safe to review",
      "added safe N: new",
      "removed safe G: gone",
      "the KB snapshot changed (aaaaaaaaaaaa -> cccccccccccc)",
      "the KB config changed (none -> cfg)",
    ]);
  });

  test("a changed hash with the same actions and inputs says only details changed", () => {
    const root = workspace();
    const actions = [{ id: "a", code: "C", state: "safe" }];
    recordPrintedPlan(root, plan("h1", actions), new Date(0));
    const message = planChangedMessage(root, "h1", plan("h2", actions));
    expect(message).toContain(
      "The migration plan changed since h1 was printed (1970-01-01T00:00:00.000Z); its hash is now h2.",
    );
    expect(message).toContain(
      "Its actions and inputs are the same; only their details changed.",
    );
    expect(message).toContain("kibi migrate --apply-safe h2");
  });

  test("a hash Kibi never printed here says it cannot tell what changed", () => {
    const message = planChangedMessage(workspace(), "h0", plan("h2", []));
    expect(message).toContain("Kibi has no record of printing h0 here");
    expect(message).not.toContain("What changed");
  });
});
