import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as aggregatedChecks from "../../src/commands/aggregated-checks.js";
import type { ExtractionResult } from "../../src/extractors/markdown.js";
import type { PrologProcess } from "../../src/prolog.js";
import type { Violation } from "../../src/public/check-types.js";
import * as snapshotKnowledge from "../../src/traceability/snapshot-knowledge.js";
import {
  collectIntroducedConsistencyViolations,
  formatConsistencyViolations,
  stagesKnowledge,
} from "../../src/traceability/staged-consistency.js";
import * as tempKb from "../../src/traceability/temp-kb.js";

afterEach(() => {
  mock.restore();
});

function result(
  id: string,
  type: string,
  relationships: Array<[string, string]> = [],
): ExtractionResult {
  return {
    entity: {
      id,
      type,
      title: id,
      status: "active",
      created_at: "t",
      updated_at: "t",
      source: "s",
    },
    relationships: relationships.map(([from, to]) => ({
      type: "relates_to",
      from,
      to,
    })),
  } as ExtractionResult;
}

function violation(rule: string, entityId: string, description: string) {
  return { rule, entityId, description } as Violation;
}

type Harness = {
  events: string[];
  projected: ExtractionResult[][];
  rules: Array<Set<string> | null>;
  snapshotCalls: unknown[][];
};

function harness(
  outcomes: Violation[][],
  options: { failChecks?: boolean } = {},
): Harness {
  const h: Harness = {
    events: [],
    projected: [],
    rules: [],
    snapshotCalls: [],
  };
  let run = 0;
  spyOn(tempKb, "createTempKb").mockImplementation(async () => {
    run += 1;
    h.events.push(`create ${run}`);
    return {
      tempDir: `/tmp-${run}`,
      kbPath: "kb",
      overlayPath: "overlay",
      prolog: { name: `prolog-${run}` } as unknown as PrologProcess,
    };
  });
  spyOn(tempKb, "projectStagedEntities").mockImplementation(
    async (prolog, knowledge) => {
      h.events.push(
        `project ${(prolog as unknown as { name: string }).name} ${knowledge.length}`,
      );
      h.projected.push(knowledge);
    },
  );
  spyOn(tempKb, "cleanupTempKb").mockImplementation(async (dir) => {
    h.events.push(`cleanup ${dir}`);
  });
  spyOn(aggregatedChecks, "runAggregatedChecks").mockImplementation(
    async (prolog, rules) => {
      h.events.push(`check ${(prolog as unknown as { name: string }).name}`);
      h.rules.push(rules);
      if (options.failChecks) throw new Error("check exploded");
      return outcomes.shift() ?? [];
    },
  );
  spyOn(snapshotKnowledge, "readSnapshotKnowledge").mockImplementation(
    (...args: unknown[]) => {
      h.snapshotCalls.push(args);
      return [result("REQ-base", "req")];
    },
  );
  return h;
}

const readGit = (_args: readonly string[]) => Buffer.from("");
const readBlobs = (_oids: readonly string[]) => new Map<string, Buffer>();
const snapshot = { baseTree: "BASE", headTree: "HEAD", readGit, readBlobs };

describe("stagesKnowledge", () => {
  test("accepts entity documents in every lane", () => {
    for (const lane of ["requirements", "scenarios", "facts", "adr"]) {
      expect(stagesKnowledge([`.kb/${lane}/X.md`])).toBe(true);
    }
  });

  test("rejects entity lane files that are not markdown", () => {
    expect(stagesKnowledge([".kb/requirements/X.yaml"])).toBe(false);
    expect(stagesKnowledge([".kb/requirements/X.md.bak"])).toBe(false);
  });

  test("accepts relationship shards in yaml and yml", () => {
    expect(stagesKnowledge([".kb/relationships/a.yaml"])).toBe(true);
    expect(stagesKnowledge([".kb/relationships/a.yml"])).toBe(true);
  });

  test("rejects other relationship files and other directories", () => {
    expect(stagesKnowledge([".kb/relationships/a.yaml.orig"])).toBe(false);
    expect(stagesKnowledge([".kb/relationships/a.json"])).toBe(false);
    expect(stagesKnowledge([".kb/relationships/ayaml"])).toBe(false);
    expect(stagesKnowledge(["docs/.kb/relationships/a.yaml"])).toBe(false);
    expect(stagesKnowledge([".kb/symbols.yaml"])).toBe(false);
    expect(stagesKnowledge(["src/a.md"])).toBe(false);
    expect(stagesKnowledge([])).toBe(false);
  });

  test("is true when any path touches knowledge", () => {
    expect(
      stagesKnowledge(["src/a.ts", ".kb/relationships/r.yaml", "README.md"]),
    ).toBe(true);
  });
});

describe("formatConsistencyViolations", () => {
  test("renders violations with and without a source", () => {
    expect(
      formatConsistencyViolations([
        { ...violation("r1", "REQ-1", "first"), source: "a.md" } as Violation,
        violation("r2", "REQ-2", "second"),
      ]),
    ).toStrictEqual([
      "Found 2 consistency violation(s) introduced by the staged changes:",
      "",
      "[r1] REQ-1",
      "  Source: a.md",
      "  first",
      "",
      "[r2] REQ-2",
      "  second",
      "",
    ]);
  });

  test("shows a violation's suggestion", () => {
    expect(
      formatConsistencyViolations([
        {
          ...violation("r1", "REQ-1", "first"),
          suggestion: "fix it",
        } as Violation,
      ]),
    ).toStrictEqual([
      "Found 1 consistency violation(s) introduced by the staged changes:",
      "",
      "[r1] REQ-1",
      "  first",
      "  Suggestion: fix it",
      "",
    ]);
  });

  test("uses the given kind", () => {
    expect(formatConsistencyViolations([], "context")).toStrictEqual([
      "Found 0 context violation(s) introduced by the staged changes:",
      "",
    ]);
  });
});

describe("collectIntroducedConsistencyViolations", () => {
  test("skips the base tree when the staged tree is consistent", async () => {
    const h = harness([[]]);
    const knowledge = [
      result("REQ-1", "req", [["REQ-1", "REQ-2"]]),
      result("REQ-2", "req"),
    ];
    expect(
      await collectIntroducedConsistencyViolations(snapshot, knowledge),
    ).toStrictEqual([]);
    expect(h.events).toStrictEqual([
      "create 1",
      "project prolog-1 2",
      "check prolog-1",
      "cleanup /tmp-1",
    ]);
    expect(h.rules).toStrictEqual([
      new Set([
        "domain-contradictions",
        "scenario-feasibility",
        "exception-claim-keys",
        "kb-consistency",
      ]),
    ]);
    expect(h.snapshotCalls).toStrictEqual([]);
  });

  test("projects knowledge without symbols or their edges", async () => {
    const h = harness([[]]);
    const req = result("REQ-1", "req", [
      ["REQ-1", "SYM-1"],
      ["SYM-1", "REQ-1"],
      ["REQ-1", "SCEN-1"],
    ]);
    await collectIntroducedConsistencyViolations(snapshot, [
      req,
      result("SYM-1", "symbol", [["SYM-1", "REQ-1"]]),
      result("SCEN-1", "scenario"),
    ]);
    expect(h.projected).toStrictEqual([
      [
        {
          ...req,
          relationships: [{ type: "relates_to", from: "REQ-1", to: "SCEN-1" }],
        },
        result("SCEN-1", "scenario"),
      ],
    ]);
  });

  test("reports only violations the base tree does not have", async () => {
    const kept = violation("kb-consistency", "REQ-1", "new problem");
    const sameRuleOtherEntity = violation("kb-consistency", "REQ-2", "old");
    const sameEntityOtherText = violation("kb-consistency", "REQ-3", "now");
    const h = harness([
      [
        kept,
        violation("domain-contradictions", "REQ-9", "old"),
        sameRuleOtherEntity,
        sameEntityOtherText,
      ],
      [
        violation("domain-contradictions", "REQ-9", "old"),
        violation("kb-consistency", "REQ-X", "old"),
        violation("kb-consistency", "REQ-3", "then"),
        violation("scenario-feasibility", "REQ-1", "new problem"),
      ],
    ]);
    const found = await collectIntroducedConsistencyViolations(snapshot, [
      result("REQ-1", "req"),
    ]);
    expect(found).toStrictEqual([
      kept,
      sameRuleOtherEntity,
      sameEntityOtherText,
    ]);
    expect(h.snapshotCalls).toStrictEqual([[readGit, "BASE", readBlobs]]);
    expect(h.events).toStrictEqual([
      "create 1",
      "project prolog-1 1",
      "check prolog-1",
      "cleanup /tmp-1",
      "create 2",
      "project prolog-2 1",
      "check prolog-2",
      "cleanup /tmp-2",
    ]);
    expect(h.projected[1]).toStrictEqual([result("REQ-base", "req")]);
  });

  test("adds requirement-scoped rules and judges them on staged entities", async () => {
    const stagedNew = violation("must-positive-scenario", "REQ-1", "now");
    const stagedOld = violation("claim-subject-missing", "REQ-2", "now");
    const unstaged = violation("must-positive-scenario", "REQ-3", "now");
    const h = harness([
      [stagedOld, unstaged],
      [violation("claim-subject-missing", "REQ-2", "then")],
    ]);
    const evaluated: unknown[][] = [];
    const scoped = {
      rules: ["claim-subject-missing"],
      entityIds: new Set(["REQ-1", "REQ-2"]),
      async evaluate(...args: unknown[]) {
        evaluated.push(args);
        return evaluated.length === 1 ? [stagedNew] : [];
      },
    };
    const head = [result("REQ-1", "req")];
    const found = await collectIntroducedConsistencyViolations(
      snapshot,
      head,
      scoped,
    );
    // REQ-2's finding was already at the base, by rule and entity.
    expect(found).toStrictEqual([stagedNew]);
    expect(h.rules[0]).toStrictEqual(
      new Set([
        "domain-contradictions",
        "scenario-feasibility",
        "exception-claim-keys",
        "kb-consistency",
        "claim-subject-missing",
      ]),
    );
    expect(evaluated).toStrictEqual([
      [{ name: "prolog-1" }, "HEAD", head],
      [{ name: "prolog-2" }, "BASE", [result("REQ-base", "req")]],
    ]);
  });

  test("skips the base tree when scoped findings are all on unstaged entities", async () => {
    const h = harness([[violation("claim-subject-missing", "REQ-3", "x")]]);
    expect(
      await collectIntroducedConsistencyViolations(snapshot, [], {
        rules: [],
        entityIds: new Set(["REQ-1"]),
        evaluate: async () => [],
      }),
    ).toStrictEqual([]);
    expect(h.snapshotCalls).toStrictEqual([]);
  });

  test("drops findings of other rules when no scoped rules were asked for", async () => {
    harness([[violation("must-positive-scenario", "REQ-1", "x")]]);
    expect(
      await collectIntroducedConsistencyViolations(snapshot, []),
    ).toStrictEqual([]);
  });

  test("cleans up the temporary KB when a check fails", async () => {
    const h = harness([], { failChecks: true });
    await expect(
      collectIntroducedConsistencyViolations(snapshot, []),
    ).rejects.toThrow("check exploded");
    expect(h.events).toStrictEqual([
      "create 1",
      "project prolog-1 0",
      "check prolog-1",
      "cleanup /tmp-1",
    ]);
  });
});
