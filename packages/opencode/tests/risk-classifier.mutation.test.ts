import { describe, expect, test } from "bun:test";
import { type ClassifyRiskParams, classifyRisk } from "../src/risk-classifier";

function classify(overrides: Partial<ClassifyRiskParams>) {
  return classifyRisk({
    pathKind: "code",
    isUnderKb: false,
    hasMustPriority: false,
    hasDurableComment: false,
    fileContent: "",
    ...overrides,
  });
}

const MISSING = [
  "Code file contains exports without // implements REQ-<area>-<behavior> annotation",
];
const DURABLE = [
  "Durable knowledge comment detected — traceability review recommended",
];

describe("classifyRisk reasons", () => {
  test("derived .kb state", () => {
    expect(classify({ pathKind: "kb", isUnderKb: true })).toStrictEqual({
      riskClass: "manual_kb_edit",
      reasons: [
        "File is opaque or derived `.kb/` runtime state — manual edits bypass KB validation",
      ],
    });
  });

  test("a kb path kind outside .kb is unhandled", () => {
    expect(classify({ pathKind: "kb" })).toStrictEqual({
      riskClass: "safe_docs_only",
      reasons: ["File type is unhandled — defaulting to safe classification"],
    });
  });

  test("tests", () => {
    expect(classify({ pathKind: "test" })).toStrictEqual({
      riskClass: "safe_test_only",
      reasons: ["File is a test file — edits are low risk"],
    });
  });

  test("requirements", () => {
    expect(classify({ pathKind: "requirement" })).toStrictEqual({
      riskClass: "req_policy_candidate",
      reasons: ["File is a requirement document — policy checks recommended"],
    });
  });

  test.each(["scenario", "adr", "fact", "flag", "event", "symbol"] as const)(
    "structural %s docs",
    (pathKind) => {
      expect(classify({ pathKind })).toStrictEqual({
        riskClass: "kb_doc_structural",
        reasons: [
          "File is structural KB documentation — relationship and field validation recommended",
        ],
      });
    },
  );

  test("unknown files", () => {
    expect(classify({ pathKind: "unknown" })).toStrictEqual({
      riskClass: "safe_docs_only",
      reasons: ["File is not a code or KB document — low risk"],
    });
  });

  test("code without exports", () => {
    expect(classify({ fileContent: "const x = 1;" })).toStrictEqual({
      riskClass: "safe_docs_only",
      reasons: ["Code file has no detected export patterns — low risk"],
    });
  });

  test("traced code without a durable comment is a behavior candidate", () => {
    expect(
      classify({ fileContent: "// implements REQ-a\nexport const x = 1;" }),
    ).toStrictEqual({
      riskClass: "behavior_candidate",
      reasons: [
        "Code file contains exportable constructs — discovery guidance applies",
      ],
    });
  });

  test("untraced code lists only the missing annotation", () => {
    expect(classify({ fileContent: "export const x = 1;" })).toStrictEqual({
      riskClass: "traceability_candidate",
      reasons: MISSING,
    });
  });

  test("traced code with a durable comment lists only the comment", () => {
    expect(
      classify({
        fileContent: "// implements REQ-a\nexport const x = 1;",
        hasDurableComment: true,
      }),
    ).toStrictEqual({ riskClass: "traceability_candidate", reasons: DURABLE });
  });
});

describe("classifyRisk patterns", () => {
  test.each([
    "export  const x = 1;",
    "class  Foo {}",
    "function  foo() {}",
    "def  foo():",
  ])("%p has behavior", (fileContent) => {
    expect(classify({ fileContent }).riskClass).toBe("traceability_candidate");
  });

  test("traceability allows several spaces", () => {
    expect(
      classify({ fileContent: "// implements  REQ-a\nexport const x = 1;" })
        .riskClass,
    ).toBe("behavior_candidate");
  });
});
