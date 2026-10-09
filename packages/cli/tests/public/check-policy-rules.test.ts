import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CHECK_POLICY_CAPABILITY_ID,
  CHECK_POLICY_CONTRACT_VERSION,
  type CheckPolicyDocument,
  validateCheckPolicyDocument,
} from "kibi-plugin-sdk";

import { readActiveCheckPolicies } from "../../src/plugins/check-policies";
import {
  type CheckPolicyEvaluationInput,
  POLICY_MARKERS_RULE,
  POLICY_OWNERSHIP_RULE,
  evaluateCheckPolicies,
  workspaceSourcePath,
} from "../../src/public/operations/check-policy-rules";

const document: CheckPolicyDocument = {
  contractVersion: CHECK_POLICY_CONTRACT_VERSION,
  id: "ui-design",
  title: "UI design coverage",
  ownership: [
    {
      id: "ui-component-ownership",
      description: "UI components implement a design requirement",
      include: ["src/**/*.component.ts"],
      exclude: ["**/*.spec.ts"],
      symbolTitlePattern: "Component$",
      requirePredicates: ["ui_pattern"],
      exemptTag: "review:ui-unconstrained",
    },
  ],
  markers: [
    {
      id: "ui-pattern-markers",
      description: "Pattern markers stay in implementing files",
      patternPredicate: "ui_pattern",
      patternArgument: 1,
      markerPredicate: "pattern_marker",
      markerPatternArgument: 0,
      markerArgument: 1,
      siblingExtensions: [".html"],
    },
  ],
};

const RULES = new Set([POLICY_OWNERSHIP_RULE, POLICY_MARKERS_RULE]);

function input(
  overrides: Partial<CheckPolicyEvaluationInput> = {},
): CheckPolicyEvaluationInput {
  return {
    policies: [
      { packageName: "kibi-plugin-ui", packageVersion: "0.1.0", document },
    ],
    loadErrors: [],
    symbols: [
      {
        id: "SYM-list",
        title: "ItemListComponent",
        sourceFile: "src/app/list/item-list.component.ts",
        tags: [],
      },
      {
        id: "SYM-list-label",
        title: "ItemListComponent.label",
        sourceFile: "src/app/list/item-list.component.ts",
        tags: [],
      },
      {
        id: "SYM-store",
        title: "ItemStore",
        sourceFile: "src/app/list/item.store.ts",
        tags: [],
      },
    ],
    implementsEdges: [["SYM-list", "REQ-list-pattern"]],
    currentRequirements: new Set(["REQ-list-pattern"]),
    requiresPredicateEdges: [["REQ-list-pattern", "FACT-list-pattern"]],
    predicateFacts: [
      {
        id: "FACT-list-pattern",
        name: "ui_pattern",
        args: ["item_list", "line_dots_timeline"],
        polarity: "assert",
      },
      {
        id: "FACT-dot",
        name: "pattern_marker",
        args: ["line_dots_timeline", "timeline_dot"],
        polarity: "assert",
      },
      {
        id: "FACT-connector",
        name: "pattern_marker",
        args: ["line_dots_timeline", "timeline-connector"],
        polarity: "assert",
      },
    ],
    readFile: (path) =>
      path === "src/app/list/item-list.component.html"
        ? '<ol><li><span class="timeline-dot"></span><span data-testid="timeline-connector"></span></li></ol>'
        : path === "src/app/list/item-list.component.ts"
          ? "export class ItemListComponent {}"
          : undefined,
    ...overrides,
  };
}

// executable_for TEST-capability-check-policy
describe("check policy rules", () => {
  test("a design-owned component that keeps its markers passes", () => {
    expect(evaluateCheckPolicies(input(), RULES)).toEqual([]);
  });

  test("a component owned only by a non-design requirement is reported", () => {
    const findings = evaluateCheckPolicies(
      input({
        implementsEdges: [["SYM-list", "REQ-extraction"]],
        currentRequirements: new Set(["REQ-extraction", "REQ-list-pattern"]),
      }),
      RULES,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: POLICY_OWNERSHIP_RULE,
      entityId: "SYM-list",
      source: "src/app/list/item-list.component.ts",
      evidence: {
        policyRule: "ui-component-ownership",
        implements: ["REQ-extraction"],
      },
    });
  });

  test("a superseded design requirement no longer owns the component", () => {
    const findings = evaluateCheckPolicies(
      input({ currentRequirements: new Set() }),
      new Set([POLICY_OWNERSHIP_RULE]),
    );
    expect(findings.map((finding) => finding.entityId)).toEqual(["SYM-list"]);
  });

  test("the exempt tag takes a symbol out of the ownership rule", () => {
    const findings = evaluateCheckPolicies(
      input({
        implementsEdges: [],
        symbols: [
          {
            id: "SYM-list",
            title: "ItemListComponent",
            sourceFile: "src/app/list/item-list.component.ts",
            tags: ["review:ui-unconstrained"],
          },
        ],
      }),
      RULES,
    );
    expect(findings).toEqual([]);
  });

  test("a rewrite that drops a pattern marker is reported per marker", () => {
    const findings = evaluateCheckPolicies(
      input({
        readFile: (path) =>
          path === "src/app/list/item-list.component.html"
            ? '<div class="card"><span data-testid="timeline-connector"></span></div>'
            : undefined,
      }),
      RULES,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: POLICY_MARKERS_RULE,
      entityId: "SYM-list",
      evidence: {
        requirement: "REQ-list-pattern",
        pattern: "line_dots_timeline",
        marker: "timeline_dot",
        searchedFiles: [
          "src/app/list/item-list.component.ts",
          "src/app/list/item-list.component.html",
        ],
      },
    });
  });

  test("symbols sharing an implementing file report a missing marker once", () => {
    const findings = evaluateCheckPolicies(
      input({
        implementsEdges: [
          ["SYM-list", "REQ-list-pattern"],
          ["SYM-list-label", "REQ-list-pattern"],
        ],
        readFile: (path) =>
          path === "src/app/list/item-list.component.html"
            ? '<span data-testid="timeline-connector"></span>'
            : undefined,
      }),
      new Set([POLICY_MARKERS_RULE]),
    );
    expect(findings.map((finding) => finding.evidence?.marker)).toEqual([
      "timeline_dot",
    ]);
  });

  test("symbols outside the workspace are out of scope instead of failing the check", () => {
    const outside = (sourceFile: string) => ({
      id: `SYM-${sourceFile}`,
      title: "ItemListComponent",
      sourceFile,
      tags: [],
    });
    const findings = evaluateCheckPolicies(
      input({
        symbols: [
          outside("/abs/src/app/a.component.ts"),
          outside("../other/src/app/a.component.ts"),
        ],
        implementsEdges: [],
      }),
      RULES,
    );
    expect(findings).toEqual([]);
    expect(workspaceSourcePath("/ws", "/ws/src/app/a.component.ts")).toBe(
      "src/app/a.component.ts",
    );
    expect(workspaceSourcePath("/ws", "./src/a.tsx")).toBe("src/a.tsx");
    expect(workspaceSourcePath("/ws", "/elsewhere/a.tsx")).toBeUndefined();
    expect(workspaceSourcePath("/ws", "src/../../a.tsx")).toBeUndefined();
  });

  test("only the selected rules run", () => {
    const findings = evaluateCheckPolicies(
      input({ implementsEdges: [] }),
      new Set([POLICY_MARKERS_RULE]),
    );
    expect(findings).toEqual([]);
  });

  test("a policy that cannot be read blocks instead of switching off", () => {
    const findings = evaluateCheckPolicies(
      input({
        policies: [],
        loadErrors: [
          { packageName: "kibi-plugin-ui", message: "not installed" },
        ],
      }),
      RULES,
    );
    expect(findings).toEqual([
      expect.objectContaining({
        rule: POLICY_OWNERSHIP_RULE,
        entityId: "kibi-plugin-ui",
      }),
    ]);
  });
});

// executable_for TEST-ui-plugin-design-policy
describe("the kibi-plugin-ui policy", () => {
  const uiPolicy = validateCheckPolicyDocument(
    JSON.parse(
      readFileSync(
        join(import.meta.dir, "../../../plugin-ui/check-policy.json"),
        "utf8",
      ),
    ),
  );

  test("asks for design ownership of components only", () => {
    const symbol = (id: string, title: string, sourceFile: string) => ({
      id,
      title,
      sourceFile,
      tags: [],
    });
    const findings = evaluateCheckPolicies(
      input({
        policies: [
          {
            packageName: "kibi-plugin-ui",
            packageVersion: "0.1.0",
            document: uiPolicy,
          },
        ],
        implementsEdges: [],
        predicateFacts: [],
        symbols: [
          symbol("SYM-feed", "ActivityFeed", "src/feed/ActivityFeed.tsx"),
          symbol(
            "SYM-feed-props",
            "ActivityFeedProps",
            "src/feed/ActivityFeed.tsx",
          ),
          symbol(
            "SYM-feed-context",
            "ActivityFeedContext",
            "src/feed/ActivityFeed.tsx",
          ),
          symbol(
            "SYM-feed-variant",
            "ActivityFeedVariant",
            "src/feed/ActivityFeed.tsx",
          ),
          symbol(
            "SYM-feed-hook",
            "useActivityFeed",
            "src/feed/ActivityFeed.tsx",
          ),
          symbol(
            "SYM-feed-story",
            "Default",
            "src/feed/ActivityFeed.stories.tsx",
          ),
          symbol(
            "SYM-list",
            "ItemListComponent",
            "src/app/item-list.component.ts",
          ),
          symbol(
            "SYM-list-member",
            "ItemListComponent.select",
            "src/app/item-list.component.ts",
          ),
          symbol("SYM-store", "ItemStore", "src/app/item.store.ts"),
        ],
      }),
      RULES,
    );
    expect(findings.map((finding) => finding.entityId)).toEqual([
      "SYM-feed",
      "SYM-list",
    ]);
  });
});

describe("reading active check policies", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0))
      rmSync(root, { recursive: true, force: true });
  });

  function workspace(pluginKibi: unknown, policy: unknown): string {
    const root = mkdtempSync(join(tmpdir(), "kibi-check-policy-"));
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
              capabilities: {
                [CHECK_POLICY_CAPABILITY_ID]: { mode: "augment" },
              },
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
        kibi: pluginKibi,
      }),
    );
    // Importing this module would throw: reading a policy must never import it.
    writeFileSync(
      join(pluginRoot, "index.js"),
      'throw new Error("plugin module imported");\n',
    );
    writeFileSync(
      join(pluginRoot, "check-policy.json"),
      JSON.stringify(policy),
    );
    return root;
  }

  test("reads the declared policy document without importing the plugin", () => {
    const root = workspace({ checkPolicy: "check-policy.json" }, document);
    const result = readActiveCheckPolicies(root);
    expect(result.errors).toEqual([]);
    expect(result.policies).toEqual([
      { packageName: "ui-policy-plugin", packageVersion: "0.1.0", document },
    ]);
  });

  test("reports a missing path, an escaping path and an invalid document", () => {
    expect(
      readActiveCheckPolicies(workspace({}, document)).errors[0]?.message,
    ).toContain("kibi.checkPolicy");
    expect(
      readActiveCheckPolicies(
        workspace({ checkPolicy: "../../package.json" }, document),
      ).errors[0]?.message,
    ).toContain("outside package root");
    expect(
      readActiveCheckPolicies(
        workspace(
          { checkPolicy: "check-policy.json" },
          { ...document, id: "Bad Id" },
        ),
      ).errors[0]?.message,
    ).toContain("kebab-case");
  });

  test("a workspace without an activated policy reads nothing", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-check-policy-none-"));
    roots.push(root);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "consumer" }),
    );
    expect(readActiveCheckPolicies(root)).toEqual({ policies: [], errors: [] });
  });
});
