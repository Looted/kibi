import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  CHECK_POLICY_CONTRACT_VERSION,
  type CheckPolicyDocument,
} from "kibi-plugin-sdk";
import * as checkPolicies from "../../../src/plugins/check-policies.js";
import {
  type CheckPolicyEvaluationInput,
  POLICY_MARKERS_RULE,
  POLICY_OWNERSHIP_RULE,
  type PolicyPredicateFact,
  collectCheckPolicyViolations,
  evaluateCheckPolicies,
  workspaceSourcePath,
} from "../../../src/public/operations/check-policy-rules.js";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import type { PrologQueryResult } from "../../../src/public/operations/runtime-types.js";
import { expectGolden } from "../helpers/golden.js";

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-check-policy-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

const BOTH = new Set([POLICY_OWNERSHIP_RULE, POLICY_MARKERS_RULE]);

const DOCUMENT: CheckPolicyDocument = {
  contractVersion: CHECK_POLICY_CONTRACT_VERSION,
  id: "ui-design",
  title: "UI design",
  ownership: [
    {
      id: "widgets",
      description: "Widgets implement a design requirement",
      include: ["src/**/*.ts"],
      exclude: ["**/*.spec.ts"],
      symbolTitlePattern: "Widget$",
      requirePredicates: ["ui_pattern", "ui_role"],
      exemptTag: "review:free",
    },
    {
      id: "library",
      description: "Library code follows a rule",
      include: ["lib/**"],
      requirePredicates: ["lib_rule"],
    },
  ],
  markers: [
    {
      id: "ui-markers",
      description: "Markers stay",
      patternPredicate: "ui_pattern",
      patternArgument: 1,
      markerPredicate: "pattern_marker",
      markerPatternArgument: 0,
      markerArgument: 1,
      siblingExtensions: [".html", ".ts"],
    },
    {
      id: "lib-markers",
      description: "Library markers stay",
      patternPredicate: "lib_rule",
      patternArgument: 0,
      markerPredicate: "pattern_marker",
      markerPatternArgument: 0,
      markerArgument: 1,
    },
    {
      id: "alt-markers",
      description: "Alternative markers stay",
      patternPredicate: "ui_pattern",
      patternArgument: 5,
      markerPredicate: "alt_marker",
      markerPatternArgument: 2,
      markerArgument: 0,
    },
  ],
};

const policy = (
  document: CheckPolicyDocument,
  packageName = "kibi-plugin-ui",
) => ({
  packageName,
  packageVersion: "1.0.0",
  document,
});

const fact = (
  id: string,
  name: string,
  args: string[],
  polarity = "assert",
): PolicyPredicateFact => ({ id, name, args, polarity });

const symbol = (
  id: string,
  title: string,
  sourceFile: string,
  tags: string[] = [],
) => ({ id, title, sourceFile, tags });

function input(
  overrides: Partial<CheckPolicyEvaluationInput> = {},
): CheckPolicyEvaluationInput {
  const files: Record<string, string> = {
    "src/a.ts": "<div data-card>",
    "src/a.html": "<h1 class='card-title'>",
  };
  return {
    policies: [
      policy(DOCUMENT),
      policy(
        {
          contractVersion: CHECK_POLICY_CONTRACT_VERSION,
          id: "empty",
          title: "Empty",
        },
        "kibi-plugin-empty",
      ),
    ],
    loadErrors: [{ packageName: "kibi-plugin-broken", message: "missing" }],
    symbols: [
      symbol("S-owned", "OwnedWidget", "src/a.ts"),
      symbol("S-owned-2", "SecondWidget", "src/a.ts"),
      symbol("S-unowned", "LonelyWidget", "src/b.ts"),
      symbol("S-retired", "OldWidget", "src/c.ts"),
      symbol("S-denied", "DenyWidget", "src/d.ts"),
      symbol("S-other", "OtherWidget", "src/e.ts"),
      symbol("S-ghost", "GhostWidget", "src/f.ts"),
      symbol("S-spec", "SpecWidget", "src/a.spec.ts"),
      symbol("S-helper", "helper", "src/a.ts"),
      symbol("S-free", "FreeWidget", "src/g.ts", ["review:free"]),
      symbol("S-blank", "BlankWidget", ""),
      symbol("S-role", "RoleWidget", "src/r.ts"),
      symbol("S-short", "ShortWidget", "src/h.ts"),
      symbol("S-lib", "anything", "lib/x.ts"),
      symbol("S-lib-2", "other", "lib/y.ts"),
      symbol("S-lib-3", "marked", "lib/z.ts"),
    ],
    implementsEdges: [
      ["S-owned", "REQ-ui"],
      ["S-owned-2", "REQ-ui"],
      ["S-retired", "REQ-old"],
      ["S-denied", "REQ-deny"],
      ["S-other", "REQ-other"],
      ["S-ghost", "REQ-ghost"],
      ["S-role", "REQ-role"],
      ["S-short", "REQ-short"],
      ["S-lib", "REQ-lib"],
      ["S-lib-3", "REQ-lib-2"],
    ],
    currentRequirements: new Set([
      "REQ-ui",
      "REQ-deny",
      "REQ-other",
      "REQ-ghost",
      "REQ-role",
      "REQ-short",
      "REQ-lib",
      "REQ-lib-2",
    ]),
    requiresPredicateEdges: [
      ["REQ-ui", "F-other"],
      ["REQ-ui", "F-ui"],
      ["REQ-old", "F-ui"],
      ["REQ-deny", "F-deny"],
      ["REQ-other", "F-other"],
      ["REQ-ghost", "F-none"],
      ["REQ-role", "F-role"],
      ["REQ-short", "F-short"],
      ["REQ-lib", "F-lib"],
      ["REQ-lib-2", "F-lib-2"],
    ],
    predicateFacts: [
      fact("F-ui", "ui_pattern", ["x", "card"]),
      fact("F-deny", "ui_pattern", ["x", "card"], "deny"),
      fact("F-other", "other_pred", ["x", "card"]),
      fact("F-role", "ui_role", ["x", "card"]),
      fact("F-short", "ui_pattern", ["x"]),
      fact("F-lib", "lib_rule", ["lib-pattern"]),
      fact("F-lib-2", "lib_rule", ["lib-marked"]),
      fact("F-lm", "pattern_marker", ["lib-marked", "lib_mark"]),
      fact("F-m1", "pattern_marker", ["card", "data-card"]),
      fact("F-m2", "pattern_marker", ["card", "card_title"]),
      fact("F-m3", "pattern_marker", ["card", "missing_one"]),
      fact("F-m4", "pattern_marker", ["card", "missing_two"]),
      fact("F-m5", "pattern_marker", ["card", "missing_one"]),
      fact("F-m6", "pattern_marker", ["card", "denied-marker"], "deny"),
      fact("F-m7", "note", ["card", "noted-marker"]),
      fact("F-m8", "pattern_marker", ["card"]),
      fact("F-alt", "alt_marker", ["m-alt"]),
    ],
    readFile: (path) => files[path],
    ...overrides,
  };
}

describe("workspaceSourcePath", () => {
  test("keeps workspace paths and drops the rest", () => {
    const root = "/work/space";
    expect(workspaceSourcePath(root, "src\\a.ts")).toBe("src/a.ts");
    expect(workspaceSourcePath(root, "./src/a.ts")).toBe("src/a.ts");
    expect(workspaceSourcePath(root, "/work/space/src/a.ts")).toBe("src/a.ts");
    expect(workspaceSourcePath(root, "src/a:/b")).toBe("src/a:/b");
    expect(workspaceSourcePath(root, "src/dir/")).toBe("src/dir/");
    for (const outside of ["/elsewhere/a.ts", "..", "../x", "C:/x"])
      expect(workspaceSourcePath(root, outside)).toBeUndefined();
  });
});

describe("evaluateCheckPolicies", () => {
  test("reports ownership and marker gaps of every policy rule", () => {
    expectGolden("check-policy-findings", evaluateCheckPolicies(input(), BOTH));
  });

  test("keeps to the selected rules", () => {
    const rulesOf = (rules: string[], overrides = {}) =>
      evaluateCheckPolicies(input(overrides), new Set(rules)).map(
        (row) => `${row.rule} ${row.entityId}`,
      );
    expect(rulesOf([])).toEqual([]);
    expect(
      rulesOf([POLICY_OWNERSHIP_RULE]).every((row) =>
        row.startsWith("policy-ownership "),
      ),
    ).toBe(true);
    expect(rulesOf([POLICY_MARKERS_RULE], { policies: [] })).toEqual([
      "policy-markers kibi-plugin-broken",
    ]);
  });
});

describe("collectCheckPolicyViolations", () => {
  const COLLECT: CheckPolicyDocument = {
    contractVersion: CHECK_POLICY_CONTRACT_VERSION,
    id: "collect",
    title: "Collect",
    ownership: [
      {
        id: "all",
        description: "Everything is owned",
        include: ["src/**"],
        symbolTitlePattern: "^S-|Widget$",
        requirePredicates: ["ui_pattern"],
        exemptTag: "review:free",
      },
    ],
    markers: [
      {
        id: "markers",
        description: "Markers stay",
        patternPredicate: "ui_pattern",
        patternArgument: 0,
        markerPredicate: "pattern_marker",
        markerPatternArgument: 0,
        markerArgument: 1,
      },
    ],
  };
  const ROWS: Record<string, string> = {
    executable_test_symbol: "[['S-test']]",
    "kb_relationship(implements":
      "[['S-own','REQ-1'],['S-own-2','REQ-1'],['S-gone','REQ-1'],['S-gone-2','REQ-1']]",
    requires_predicate: "[['REQ-1','F-1'],['REQ-1','F-3']]",
    current_req: "[['REQ-1']]",
    predicate_fact:
      "[['F-1',ui_pattern,card,assert],['F-2',pattern_marker,[card,'data-card'],assert],['F-3',ui_pattern,'',assert],['F-4',pattern_marker,['',blank_mark],assert]]",
  };
  const engine = (failing?: string, bare = false, error = "no") => ({
    query: async (goal: string): Promise<PrologQueryResult> => {
      const key = Object.keys(ROWS).find((name) => goal.includes(name));
      if (key !== undefined && key === failing)
        return {
          success: false,
          bindings: {},
          ...(error === "" ? {} : { error }),
        };
      if (bare) return { success: true, bindings: {} };
      return { success: true, bindings: { Rows: ROWS[key ?? ""] ?? "[]" } };
    },
  });
  const setup = (
    read: checkPolicies.CheckPolicyReadResult = {
      policies: [policy(COLLECT)],
      errors: [],
    },
  ) => {
    const active = spyOn(checkPolicies, "readActiveCheckPolicies");
    active.mockReturnValue(read);
    const load = spyOn(entities, "loadEntitiesPaged").mockResolvedValue([
      {
        id: "S-a",
        title: "AWidget",
        sourceFile: "src/a.ts",
        tags: "review:free",
      },
      { id: "S-b", sourceFile: "src/b.ts" },
      { id: "S-c", title: "CWidget", sourceFile: 5 },
      { title: "NoIdWidget", sourceFile: "src/n.ts" },
      { id: "", title: "EmptyIdWidget", sourceFile: "src/n.ts" },
      { id: "S-test", title: "TWidget", sourceFile: "src/t.ts" },
      { id: "S-out", title: "OWidget", sourceFile: "../out.ts" },
      {
        id: "S-tags",
        title: "TagsWidget",
        sourceFile: "src/x.ts",
        tags: ["review:free", 5],
      },
      { id: "S-empty-tag", title: "EWidget", sourceFile: "src/e.ts", tags: "" },
      { id: "S-number-tag", title: "NWidget", sourceFile: "src/m.ts", tags: 5 },
      { id: "S-own", title: "OwnWidget", sourceFile: "src/own.ts" },
      { id: "S-own-2", title: "Own2Widget", sourceFile: "src/own.ts" },
      { id: "S-gone", title: "GoneWidget", sourceFile: "src/gone.ts" },
      { id: "S-gone-2", title: "Gone2Widget", sourceFile: "src/gone.ts" },
    ]);
    spies.push(active, load);
    return { active, load };
  };

  test("returns at once without a policy rule or an active policy", async () => {
    const root = workspace();
    const { active, load } = setup({
      policies: [],
      errors: [{ packageName: "kibi-plugin-x", message: "gone" }],
    });
    expect(
      await collectCheckPolicyViolations(engine(), new Set(["other"]), root),
    ).toEqual([]);
    expect(active).not.toHaveBeenCalled();
    expectGolden(
      "check-policy-load-errors",
      await collectCheckPolicyViolations(
        engine(),
        new Set([POLICY_MARKERS_RULE]),
        root,
      ),
    );
    expect(load).not.toHaveBeenCalled();
  });

  test("reads the KB once and each file once", async () => {
    const root = workspace({ "src/own.ts": "<div data-card>" });
    const { load } = setup();
    const reads = spyOn(fs, "readFileSync");
    spies.push(reads);
    const prolog = engine();
    const found = await collectCheckPolicyViolations(
      prolog,
      new Set([POLICY_OWNERSHIP_RULE, POLICY_MARKERS_RULE]),
      root,
    );
    expect(load).toHaveBeenCalledWith(prolog, "symbol", 200);
    expectGolden(
      "check-policy-collected",
      found.map((row) => `${row.rule} ${row.entityId}`),
    );
    const readOf = (file: string) =>
      reads.mock.calls.filter(([path]) => String(path) === join(root, file))
        .length;
    expect([readOf("src/own.ts"), readOf("src/gone.ts")]).toEqual([1, 1]);
    expect(
      (
        await collectCheckPolicyViolations(
          engine(),
          new Set([POLICY_OWNERSHIP_RULE]),
          root,
        )
      ).map((row) => row.entityId),
    ).toEqual(
      found
        .filter((row) => row.rule === POLICY_OWNERSHIP_RULE)
        .map((row) => row.entityId),
    );
  });

  test("reads a missing binding as no rows", async () => {
    const root = workspace();
    setup();
    expect(
      (
        await collectCheckPolicyViolations(engine(undefined, true), BOTH, root)
      ).map((row) => row.entityId),
    ).toContain("S-own");
  });

  test("names the relationship it cannot read", async () => {
    const root = workspace();
    setup();
    const messages: string[] = [];
    for (const failing of Object.keys(ROWS)) {
      messages.push(
        await collectCheckPolicyViolations(engine(failing), BOTH, root).then(
          () => "none",
          (error: Error) => error.message,
        ),
      );
    }
    expect(messages).toEqual([
      "Unable to read executable test symbols for check policies: no",
      "Unable to read implements relationships for check policies: no",
      "Unable to read requires_predicate relationships for check policies: no",
      "Unable to read current requirements for check policies: no",
      "Unable to read predicate facts for check policies: no",
    ]);
    await expect(
      collectCheckPolicyViolations(
        engine("current_req", false, ""),
        BOTH,
        root,
      ),
    ).rejects.toThrow(
      "Unable to read current requirements for check policies: query failed",
    );
  });
});
