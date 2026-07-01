import { describe, expect, it } from "bun:test";
import { createSymbolQualityDiagnostics } from "../../src/public/impact-diagnostics.js";
import {
  makeQualitySymbolResult,
  makeRequirementResult,
} from "./impact-symbol-quality-fixtures.js";

describe("mixed-purpose symbol impact diagnostics", () => {
  it("emits mixed-purpose review for unrelated requirement tag clusters when narrower symbols exist", () => {
    const component = makeQualitySymbolResult({
      id: "SYM-UPLOAD-COMPONENT",
      title: "UploadComponent",
      sourceFile: "src/upload.ts",
      symbolKind: "class",
      symbolRole: "behavioral",
      relationshipTargets: ["REQ-UPLOAD", "REQ-MOBILE-SHELL", "REQ-ANNOTATION"],
    });
    const child = makeQualitySymbolResult({
      id: "SYM-UPLOAD-COMPONENT-ANNOTATE",
      title: "UploadComponent.annotate",
      sourceFile: "src/upload.ts",
      symbolKind: "method",
      symbolRole: "behavioral",
      relationshipTargets: ["REQ-ANNOTATION"],
    });

    const diagnostics = createSymbolQualityDiagnostics({
      manifestResults: [
        component,
        child,
        makeRequirementResult({ id: "REQ-UPLOAD", tags: ["upload"] }),
        makeRequirementResult({ id: "REQ-MOBILE-SHELL", tags: ["mobile"] }),
        makeRequirementResult({ id: "REQ-ANNOTATION", tags: ["annotation"] }),
      ],
      symbolsByFile: new Map(),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "component_mixed_purpose_review",
        severity: "review",
        blocking: false,
        category: "mixed-purpose",
        entityId: "SYM-UPLOAD-COMPONENT",
        evidence: expect.objectContaining({
          requirementTags: ["annotation", "mobile", "upload"],
          narrowerSymbolIds: ["SYM-UPLOAD-COMPONENT-ANNOTATE"],
        }),
      }),
    ]);
  });

  it("suppresses mixed-purpose review for cohesive shared requirement tags", () => {
    const component = makeQualitySymbolResult({
      id: "SYM-BILLING-COMPONENT",
      title: "BillingComponent",
      sourceFile: "src/billing.ts",
      symbolKind: "class",
      symbolRole: "behavioral",
      relationshipTargets: ["REQ-BILLING-LIST", "REQ-BILLING-PAY"],
    });
    const child = makeQualitySymbolResult({
      id: "SYM-BILLING-COMPONENT-PAY",
      title: "BillingComponent.pay",
      sourceFile: "src/billing.ts",
      symbolKind: "method",
      symbolRole: "behavioral",
      relationshipTargets: ["REQ-BILLING-PAY"],
    });

    expect(
      createSymbolQualityDiagnostics({
        manifestResults: [
          component,
          child,
          makeRequirementResult({ id: "REQ-BILLING-LIST", tags: ["billing"] }),
          makeRequirementResult({ id: "REQ-BILLING-PAY", tags: ["billing"] }),
        ],
        symbolsByFile: new Map(),
      }),
    ).toEqual([]);
  });

  it("keeps mixed-purpose weak-tag evidence non-warning and non-blocking", () => {
    const component = makeQualitySymbolResult({
      id: "SYM-UNTAGGED-COMPONENT",
      title: "UntaggedComponent",
      sourceFile: "src/untagged.ts",
      symbolKind: "class",
      symbolRole: "behavioral",
      relationshipTargets: ["REQ-A", "REQ-B"],
    });
    const child = makeQualitySymbolResult({
      id: "SYM-UNTAGGED-COMPONENT-A",
      title: "UntaggedComponent.a",
      sourceFile: "src/untagged.ts",
      symbolKind: "method",
      symbolRole: "behavioral",
      relationshipTargets: ["REQ-A"],
    });

    const diagnostics = createSymbolQualityDiagnostics({
      manifestResults: [
        component,
        child,
        makeRequirementResult({ id: "REQ-A" }),
        makeRequirementResult({ id: "REQ-B" }),
      ],
      symbolsByFile: new Map(),
    });

    expect(
      diagnostics.every(
        (diagnostic) =>
          diagnostic.id !== "component_mixed_purpose_review" ||
          (diagnostic.severity === "info" && !diagnostic.blocking),
      ),
    ).toBe(true);
  });
});
