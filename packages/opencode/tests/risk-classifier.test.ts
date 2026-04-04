import { describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import {
  type ClassifyRiskParams,
  type RiskClass,
  type RiskClassification,
  classifyRisk,
} from "../src/risk-classifier";

// implements REQ-opencode-kibi-plugin-v1

/** Helper to build params with sensible defaults. */
function makeParams(
  overrides: Partial<ClassifyRiskParams> & Pick<ClassifyRiskParams, "pathKind">,
): ClassifyRiskParams {
  return {
    isUnderKb: false,
    hasMustPriority: false,
    hasDurableComment: false,
    fileContent: "",
    ...overrides,
  };
}

const CODE_WITH_EXPORTS = `
export function handleLogin() { return true; }
export class UserService { }
`;

const CODE_WITHOUT_EXPORTS = `
const x = 1;
const y = x + 1;
console.log(y);
`;

const CODE_WITH_TRACEABILITY = `
// implements REQ-001
export function handleLogin() { return true; }
`;

const CODE_WITH_SLUG_TRACEABILITY = `
// implements REQ-opencode-smart-enforcement-v1
export function handlePrompt() { return true; }
`;

const CODE_WITH_CLASS = `
class MyComponent {
  render() { return "<div/>"; }
}
`;

const CODE_WITH_NAMED_FUNCTION = `
function processData(input) {
  return input.map(x => x * 2);
}
`;

const PYTHON_WITH_DEF = `
def handle_login(user):
    return True
`;

describe("risk-classifier classifyRisk", () => {
  // ─── manual_kb_edit ────────────────────────────────────────

  describe("manual_kb_edit", () => {
    it("classifies .kb/ files regardless of pathKind", () => {
      for (const pathKind of [
        "code",
        "test",
        "requirement",
        "unknown",
      ] as const) {
        const result = classifyRisk(makeParams({ pathKind, isUnderKb: true }));
        assert.equal(
          result.riskClass,
          "manual_kb_edit",
          `pathKind=${pathKind}`,
        );
        assert.ok(result.reasons.length > 0);
      }
    });

    it("classifies .kb/ files even with exports in content", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          isUnderKb: true,
          fileContent: CODE_WITH_EXPORTS,
        }),
      );
      assert.equal(result.riskClass, "manual_kb_edit");
    });
  });

  // ─── safe_test_only ────────────────────────────────────────

  describe("safe_test_only", () => {
    it("classifies pathKind=test as safe_test_only", () => {
      const result = classifyRisk(makeParams({ pathKind: "test" }));
      assert.equal(result.riskClass, "safe_test_only");
    });

    it("classifies test even with durable comment", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "test", hasDurableComment: true }),
      );
      assert.equal(result.riskClass, "safe_test_only");
    });

    it("classifies test even with must priority context", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "test", hasMustPriority: true }),
      );
      assert.equal(result.riskClass, "safe_test_only");
    });
  });

  // ─── req_policy_candidate ──────────────────────────────────

  describe("req_policy_candidate", () => {
    it("classifies requirement pathKind", () => {
      const result = classifyRisk(makeParams({ pathKind: "requirement" }));
      assert.equal(result.riskClass, "req_policy_candidate");
      assert.equal(result.reasons.length, 1);
    });

    it("adds reason for must-priority requirements", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "requirement", hasMustPriority: true }),
      );
      assert.equal(result.riskClass, "req_policy_candidate");
      assert.equal(result.reasons.length, 2);
      assert.ok(
        result.reasons.some((r) => r.includes("priority:must")),
        "Should mention must priority",
      );
    });

    it("non-must requirement has single reason", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "requirement", hasMustPriority: false }),
      );
      assert.equal(result.reasons.length, 1);
    });
  });

  // ─── kb_doc_structural ─────────────────────────────────────

  describe("kb_doc_structural", () => {
    it("classifies scenario pathKind", () => {
      const result = classifyRisk(makeParams({ pathKind: "scenario" }));
      assert.equal(result.riskClass, "kb_doc_structural");
    });

    it("classifies adr pathKind", () => {
      const result = classifyRisk(makeParams({ pathKind: "adr" }));
      assert.equal(result.riskClass, "kb_doc_structural");
    });

    it("classifies fact pathKind", () => {
      const result = classifyRisk(makeParams({ pathKind: "fact" }));
      assert.equal(result.riskClass, "kb_doc_structural");
    });

    it("classifies flag/event/symbol pathKinds", () => {
      for (const pathKind of ["flag", "event", "symbol"] as const) {
        const result = classifyRisk(makeParams({ pathKind }));
        assert.equal(
          result.riskClass,
          "kb_doc_structural",
          `pathKind=${pathKind}`,
        );
      }
    });
  });

  // ─── safe_docs_only ────────────────────────────────────────

  describe("safe_docs_only", () => {
    it("classifies unknown pathKind as safe", () => {
      const result = classifyRisk(makeParams({ pathKind: "unknown" }));
      assert.equal(result.riskClass, "safe_docs_only");
    });

    it("classifies code without exports as safe", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: CODE_WITHOUT_EXPORTS }),
      );
      assert.equal(result.riskClass, "safe_docs_only");
    });

    it("classifies empty code file as safe", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: "" }),
      );
      assert.equal(result.riskClass, "safe_docs_only");
    });
  });

  // ─── traceability_candidate ────────────────────────────────

  describe("traceability_candidate", () => {
    it("detects missing traceability in code with exports", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: CODE_WITH_EXPORTS }),
      );
      assert.equal(result.riskClass, "traceability_candidate");
      assert.ok(
        result.reasons.some((r) => r.includes("REQ-xxx")),
        "Should mention missing traceability",
      );
    });

    it("detects class without traceability", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: CODE_WITH_CLASS }),
      );
      assert.equal(result.riskClass, "traceability_candidate");
    });

    it("detects named function without traceability", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: CODE_WITH_NAMED_FUNCTION }),
      );
      assert.equal(result.riskClass, "traceability_candidate");
    });

    it("flags durable comment even with traceability present", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          fileContent: CODE_WITH_TRACEABILITY,
          hasDurableComment: true,
        }),
      );
      assert.equal(result.riskClass, "traceability_candidate");
      assert.ok(
        result.reasons.some((r) => r.includes("Durable knowledge")),
        "Should mention durable comment",
      );
    });

    it("provides both reasons when durable comment AND missing traceability", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          fileContent: CODE_WITH_EXPORTS,
          hasDurableComment: true,
        }),
      );
      assert.equal(result.riskClass, "traceability_candidate");
      assert.equal(result.reasons.length, 2);
    });
  });

  // ─── behavior_candidate ────────────────────────────────────

  describe("behavior_candidate", () => {
    it("classifies code with exports and traceability present", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: CODE_WITH_TRACEABILITY }),
      );
      assert.equal(result.riskClass, "behavior_candidate");
    });

    it("accepts slug-style REQ identifiers in traceability comments", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          fileContent: CODE_WITH_SLUG_TRACEABILITY,
        }),
      );
      assert.equal(result.riskClass, "behavior_candidate");
    });

    it("treats python def as behavior-bearing code", () => {
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: PYTHON_WITH_DEF }),
      );
      assert.equal(result.riskClass, "traceability_candidate");
    });

    it("does not escalate when no durable comment", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          fileContent: CODE_WITH_TRACEABILITY,
          hasDurableComment: false,
        }),
      );
      assert.equal(result.riskClass, "behavior_candidate");
    });
  });

  // ─── edge cases and false positive prevention ──────────────

  describe("edge cases", () => {
    it("manual_kb_edit takes precedence over all other pathKinds", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "requirement",
          isUnderKb: true,
          hasMustPriority: true,
        }),
      );
      assert.equal(result.riskClass, "manual_kb_edit");
    });

    it("test takes precedence over requirement", () => {
      const result = classifyRisk(makeParams({ pathKind: "test" }));
      assert.equal(result.riskClass, "safe_test_only");
    });

    it("requirement takes precedence over structural doc", () => {
      const result = classifyRisk(makeParams({ pathKind: "requirement" }));
      assert.equal(result.riskClass, "req_policy_candidate");
    });

    it("export const triggers behavior detection", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          fileContent: "export const API_URL = 'https://example.com';",
        }),
      );
      assert.ok(
        ["traceability_candidate", "behavior_candidate"].includes(
          result.riskClass,
        ),
      );
    });

    it("export let triggers behavior detection", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          fileContent: "export let counter = 0;",
        }),
      );
      assert.ok(
        ["traceability_candidate", "behavior_candidate"].includes(
          result.riskClass,
        ),
      );
    });

    it("export var triggers behavior detection", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          fileContent: "export var config = {};",
        }),
      );
      assert.ok(
        ["traceability_candidate", "behavior_candidate"].includes(
          result.riskClass,
        ),
      );
    });

    it("comment with implements REQ- is detected as traceable", () => {
      const content = `
// implements REQ-042
export function myFunc() {}
`;
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: content }),
      );
      assert.equal(result.riskClass, "behavior_candidate");
    });

    it("implements REQ- in multiline comment is detected", () => {
      const content = `
/* implements REQ-099 */
export function myFunc() {}
`;
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: content }),
      );
      assert.equal(result.riskClass, "behavior_candidate");
    });

    it("implements req- (lowercase) is detected", () => {
      const content = `
// implements req-123
export class MyClass {}
`;
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: content }),
      );
      assert.equal(result.riskClass, "behavior_candidate");
    });

    it("plain import statement does not trigger behavior detection", () => {
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          fileContent: 'import { something } from "./module";\n',
        }),
      );
      assert.equal(result.riskClass, "safe_docs_only");
    });

    it("'class' keyword in comment triggers behavior regex (known v1 limitation)", () => {
      // The v1 regex matches \bclass\s+\w+ in comments too — this is a known limitation.
      // Full AST parsing would be needed to distinguish, but v1 uses cheap regex only.
      const content = `
// This is about a CSS class name
const el = document.querySelector('.my-class');
`;
      const result = classifyRisk(
        makeParams({ pathKind: "code", fileContent: content }),
      );
      assert.equal(result.riskClass, "traceability_candidate");
    });

    it("traceability_candidate with only durable comment (no export)", () => {
      // No exports, so even with durable comment, it's safe
      const result = classifyRisk(
        makeParams({
          pathKind: "code",
          fileContent: CODE_WITHOUT_EXPORTS,
          hasDurableComment: true,
        }),
      );
      assert.equal(result.riskClass, "safe_docs_only");
    });
  });

  // ─── all 7 risk classes reachable ──────────────────────────

  describe("all risk classes are reachable", () => {
    const classes: RiskClass[] = [
      "safe_docs_only",
      "safe_test_only",
      "kb_doc_structural",
      "req_policy_candidate",
      "behavior_candidate",
      "traceability_candidate",
      "manual_kb_edit",
    ];

    it("covers every RiskClass value", () => {
      const reached = new Set<RiskClass>();

      reached.add(classifyRisk(makeParams({ pathKind: "unknown" })).riskClass);
      reached.add(classifyRisk(makeParams({ pathKind: "test" })).riskClass);
      reached.add(classifyRisk(makeParams({ pathKind: "scenario" })).riskClass);
      reached.add(
        classifyRisk(makeParams({ pathKind: "requirement" })).riskClass,
      );
      reached.add(
        classifyRisk(
          makeParams({
            pathKind: "code",
            fileContent: CODE_WITH_TRACEABILITY,
          }),
        ).riskClass,
      );
      reached.add(
        classifyRisk(
          makeParams({ pathKind: "code", fileContent: CODE_WITH_EXPORTS }),
        ).riskClass,
      );
      reached.add(
        classifyRisk(makeParams({ pathKind: "code", isUnderKb: true }))
          .riskClass,
      );

      for (const cls of classes) {
        assert.ok(reached.has(cls), `RiskClass "${cls}" was not reached`);
      }
      assert.equal(
        reached.size,
        classes.length,
        "Should reach exactly 7 classes",
      );
    });
  });
});
