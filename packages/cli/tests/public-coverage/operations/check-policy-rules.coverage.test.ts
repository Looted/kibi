import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CHECK_POLICY_CAPABILITY_ID,
  CHECK_POLICY_CONTRACT_VERSION,
  type CheckPolicyDocument,
} from "kibi-plugin-sdk";
import {
  POLICY_MARKERS_RULE,
  POLICY_OWNERSHIP_RULE,
  collectCheckPolicyViolations,
} from "../../../src/public/operations/check-policy-rules.js";

const document: CheckPolicyDocument = {
  contractVersion: CHECK_POLICY_CONTRACT_VERSION,
  id: "ui-design",
  title: "UI design coverage",
  ownership: [
    {
      id: "ui-component-ownership",
      description: "UI components implement a design requirement",
      include: ["src/**/*.component.ts"],
      requirePredicates: ["ui_pattern"],
    },
  ],
  markers: [
    {
      id: "ui-pattern-markers",
      description: "Pattern markers stay in implementing files",
      patternPredicate: "ui_pattern",
      patternArgument: 0,
      markerPredicate: "pattern_marker",
      markerPatternArgument: 0,
      markerArgument: 1,
      siblingExtensions: [".html"],
    },
  ],
};

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-check-policy-cov-"));
  roots.push(root);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "consumer",
      devDependencies: { "ui-policy-plugin": "0.1.0" },
      kibi: {
        plugins: [
          {
            package: "ui-policy-plugin",
            capabilities: { [CHECK_POLICY_CAPABILITY_ID]: { mode: "augment" } },
          },
        ],
      },
    }),
  );
  const pluginRoot = join(root, "node_modules", "ui-policy-plugin");
  mkdirSync(pluginRoot, { recursive: true });
  writeFileSync(
    join(pluginRoot, "package.json"),
    JSON.stringify({
      name: "ui-policy-plugin",
      version: "0.1.0",
      type: "module",
      main: "index.js",
      kibi: { checkPolicy: "check-policy.json" },
    }),
  );
  writeFileSync(join(pluginRoot, "index.js"), "export {};\n");
  writeFileSync(
    join(pluginRoot, "check-policy.json"),
    JSON.stringify(document),
  );
  mkdirSync(join(root, "src/app"), { recursive: true });
  writeFileSync(join(root, "src/app/list.component.ts"), "// virtual-scroll\n");
  return root;
}

type Answers = Record<
  string,
  { success: boolean; bindings?: Record<string, string>; error?: string }
>;

function port(answers: Answers) {
  const goals: string[] = [];
  return {
    goals,
    async query(goal: string) {
      goals.push(goal);
      for (const [needle, answer] of Object.entries(answers))
        if (goal.includes(needle))
          return { bindings: {}, ...answer } as {
            success: boolean;
            bindings: Record<string, string>;
            error?: string;
          };
      return { success: true, bindings: {} };
    },
  };
}

const RULES = new Set([POLICY_OWNERSHIP_RULE, POLICY_MARKERS_RULE]);

describe("collectCheckPolicyViolations", () => {
  test("reads the KB and evaluates the active policy", async () => {
    const root = workspace();
    const prolog = port({
      "kb_query_entities('symbol'": {
        success: true,
        bindings: {
          Results: `[['SYM-list',symbol,[title='ListComponent',sourceFile='src/app/list.component.ts',tags=['ui']]],['SYM-orphan',symbol,[title='OrphanComponent',sourceFile='src/app/orphan.component.ts',tags='solo']],['SYM-test',symbol,[title='Spec',sourceFile='src/app/x.component.ts']],['SYM-out',symbol,[title='Out',sourceFile='../elsewhere.ts']],['SYM-nofile',symbol,[title='NoFile']]]`,
        },
      },
      executable_test_symbol: {
        success: true,
        bindings: { Rows: "[['SYM-test']]" },
      },
      "kb_relationship(implements": {
        success: true,
        bindings: { Rows: "[['SYM-list','REQ-1']]" },
      },
      requires_predicate: {
        success: true,
        bindings: { Rows: "[['REQ-1','FACT-1'],['REQ-1','FACT-2']]" },
      },
      current_req: { success: true, bindings: { Rows: "[['REQ-1']]" } },
      predicate_fact: {
        success: true,
        bindings: {
          Rows: "[['FACT-1',ui_pattern,['list'],assert],['FACT-2',pattern_marker,['list','virtual_scroll'],assert],['FACT-3',pattern_marker,['list','sticky'],assert],['FACT-4',other,'one',assert]]",
        },
      },
    });
    const violations = await collectCheckPolicyViolations(prolog, RULES, root);
    expect(
      violations.map((violation) => [violation.rule, violation.entityId]),
    ).toStrictEqual([
      [POLICY_OWNERSHIP_RULE, "SYM-orphan"],
      [POLICY_MARKERS_RULE, "SYM-list"],
    ]);
    expect(violations[1]?.description).toBe(
      "SYM-list implements REQ-1, which uses pattern 'list', but none of src/app/list.component.ts, src/app/list.component.html contains its marker 'sticky'",
    );
  });

  test("a failed KB read names what could not be read", async () => {
    const root = workspace();
    await expect(
      collectCheckPolicyViolations(
        port({
          "kb_query_entities('symbol'": {
            success: true,
            bindings: { Results: "[]" },
          },
          executable_test_symbol: { success: false, error: "boom" },
        }),
        RULES,
        root,
      ),
    ).rejects.toThrow(
      "Unable to read executable test symbols for check policies: boom",
    );
    await expect(
      collectCheckPolicyViolations(
        port({
          "kb_query_entities('symbol'": {
            success: true,
            bindings: { Results: "[]" },
          },
          executable_test_symbol: { success: false },
        }),
        RULES,
        root,
      ),
    ).rejects.toThrow(
      "Unable to read executable test symbols for check policies: query failed",
    );
  });

  test("missing Rows bindings read as empty", async () => {
    const root = workspace();
    expect(
      await collectCheckPolicyViolations(
        port({
          "kb_query_entities('symbol'": {
            success: true,
            bindings: { Results: "[]" },
          },
        }),
        RULES,
        root,
      ),
    ).toStrictEqual([]);
  });
});
