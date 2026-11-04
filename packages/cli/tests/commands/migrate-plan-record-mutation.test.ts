// implements REQ-cli-schema-migration
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
  type PrintedPlan,
  describePlanChange,
  findPrintedPlan,
  recordPrintedPlan,
} from "../../src/commands/migrate-plan-record.js";
import type { MigrationPlan } from "../../src/public/operations/migration-plan.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-plan-record-mut-"));
  roots.push(root);
  return root;
}

const EXPECTED = {
  branch: "develop",
  kbBranch: "develop",
  kbSnapshotId: "snap",
  workspaceSnapshot: "ws",
  configHash: "cfg",
};

function plan(
  planHash: string,
  actions: { id: string; code: string; state: string; extra?: string }[] = [],
  expected: Record<string, string | null> = EXPECTED,
): MigrationPlan {
  return { planHash, expected, actions } as unknown as MigrationPlan;
}

const recordFile = (root: string) =>
  path.join(root, ".kb", "migrations", "printed-plans.json");

function writeRecords(root: string, contents: string): void {
  mkdirSync(path.dirname(recordFile(root)), { recursive: true });
  writeFileSync(recordFile(root), contents);
}

const readRecords = (root: string) =>
  JSON.parse(readFileSync(recordFile(root), "utf8")) as PrintedPlan[];

describe("recordPrintedPlan", () => {
  test("writes the entry with only each action's id, code and state", () => {
    const root = workspace();
    recordPrintedPlan(
      root,
      plan("h1", [{ id: "a", code: "C", state: "safe", extra: "x" }]),
      new Date(5000),
    );
    expect(readFileSync(recordFile(root), "utf8")).toBe(
      `${JSON.stringify(
        [
          {
            planHash: "h1",
            printedAt: new Date(5000).toISOString(),
            expected: EXPECTED,
            actions: [{ id: "a", code: "C", state: "safe" }],
          },
        ],
        null,
        2,
      )}\n`,
    );
  });

  test("keeps the eight newest distinct plans, newest first", () => {
    const root = workspace();
    for (let index = 0; index < 10; index++)
      recordPrintedPlan(root, plan(`h${index}`), new Date(index));
    recordPrintedPlan(root, plan("h5"), new Date(99));
    expect(readRecords(root).map((record) => record.planHash)).toStrictEqual([
      "h5",
      "h9",
      "h8",
      "h7",
      "h6",
      "h4",
      "h3",
      "h2",
    ]);
  });

  test("drops malformed records and starts over from unreadable files", () => {
    const valid = { planHash: "ok", printedAt: "t", actions: [] };
    for (const [contents, kept] of [
      [
        JSON.stringify([
          1,
          "str",
          null,
          { planHash: 2, actions: [] },
          { planHash: "nolist", actions: "x" },
          { actions: [] },
          valid,
        ]),
        ["new", "ok"],
      ],
      ['{"planHash":"ok","actions":[]}', ["new"]],
      ["not json", ["new"]],
    ] as const) {
      const root = workspace();
      writeRecords(root, contents);
      recordPrintedPlan(root, plan("new"), new Date(0));
      expect(readRecords(root).map((record) => record.planHash)).toStrictEqual([
        ...kept,
      ]);
    }
    const fresh = workspace();
    recordPrintedPlan(fresh, plan("new"), new Date(0));
    expect(readRecords(fresh)).toHaveLength(1);
  });

  test("defaults the print time to now", () => {
    const root = workspace();
    const before = Date.now();
    recordPrintedPlan(root, plan("h1"));
    const printedAt = Date.parse(findPrintedPlan(root, "h1")?.printedAt ?? "");
    expect(printedAt).toBeGreaterThanOrEqual(before);
    expect(printedAt).toBeLessThanOrEqual(Date.now());
  });
});

describe("findPrintedPlan", () => {
  test("finds the record with the hash among several", () => {
    const root = workspace();
    recordPrintedPlan(root, plan("h1"), new Date(1));
    recordPrintedPlan(root, plan("h2"), new Date(2));
    expect(findPrintedPlan(root, "h1")?.printedAt).toBe(
      new Date(1).toISOString(),
    );
    expect(findPrintedPlan(root, "h3")).toBeUndefined();
    expect(findPrintedPlan(workspace(), "h1")).toBeUndefined();
  });
});

describe("describePlanChange", () => {
  const printed = (
    expected: Record<string, string | null> | undefined,
  ): PrintedPlan =>
    ({ planHash: "h1", printedAt: "t", expected, actions: [] }) as never;

  test("names each changed input by its label", () => {
    expect(
      describePlanChange(
        printed(EXPECTED),
        plan("h2", [], {
          branch: "main",
          kbBranch: "kb-main",
          kbSnapshotId: "snap2",
          workspaceSnapshot: "ws2",
          configHash: null,
        }),
      ),
    ).toStrictEqual([
      "the Git branch changed (develop -> main)",
      "the KB branch changed (develop -> kb-main)",
      "the KB snapshot changed (snap -> snap2)",
      "the workspace files changed (ws -> ws2)",
      "the KB config changed (cfg -> none)",
    ]);
  });

  test("reads a record without inputs as having none", () => {
    expect(
      describePlanChange(printed(undefined), plan("h2", [], EXPECTED)),
    ).toStrictEqual([
      "the Git branch changed (none -> develop)",
      "the KB branch changed (none -> develop)",
      "the KB snapshot changed (none -> snap)",
      "the workspace files changed (none -> ws)",
      "the KB config changed (none -> cfg)",
    ]);
  });

  test("shortens only whole long hex hashes", () => {
    const hex = "0123456789abcdefABCD";
    expect(
      describePlanChange(
        printed({
          ...EXPECTED,
          kbSnapshotId: hex,
          workspaceSnapshot: `x${hex}`,
        }),
        plan("h2", [], {
          ...EXPECTED,
          kbSnapshotId: "0123456789abcdefABC",
          workspaceSnapshot: `${hex}x`,
        }),
      ),
    ).toStrictEqual([
      "the KB snapshot changed (0123456789ab -> 0123456789abcdefABC)",
      `the workspace files changed (x${hex} -> ${hex}x)`,
    ]);
  });
});
