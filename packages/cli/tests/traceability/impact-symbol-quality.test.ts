import { describe, expect, it } from "bun:test";
import {
  createSymbolQualityDiagnostics,
  hasBlockingImpactDiagnostics,
} from "../../src/public/impact-diagnostics.js";
import { makeQualitySymbolResult } from "./impact-symbol-quality-fixtures.js";

describe("symbol quality impact diagnostics", () => {
  it("emits multi-requirement review for a function symbol implementing three requirements", () => {
    const symbol = makeQualitySymbolResult({
      id: "SYM-UPLOAD-PROCESS-FILE",
      title: "processFile",
      sourceFile: "src/upload.ts",
      symbolKind: "function",
      symbolRole: "behavioral",
      relationshipTargets: ["REQ-UPLOAD", "REQ-VALIDATE", "REQ-AUDIT"],
    });

    const diagnostics = createSymbolQualityDiagnostics({
      manifestResults: [symbol],
      symbolsByFile: new Map(),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "multi_requirement_symbol_review",
        severity: "review",
        blocking: false,
        entityId: "SYM-UPLOAD-PROCESS-FILE",
        evidence: expect.objectContaining({
          targetIds: ["REQ-AUDIT", "REQ-UPLOAD", "REQ-VALIDATE"],
          targetCount: 3,
          threshold: 2,
          symbolKind: "function",
          symbolRole: "behavioral",
          sourceFile: "src/upload.ts",
        }),
      }),
    ]);
    expect(hasBlockingImpactDiagnostics(diagnostics)).toBe(false);
  });

  it("emits multi-requirement review for a class symbol implementing five requirements", () => {
    const symbol = makeQualitySymbolResult({
      id: "SYM-USER-SERVICE",
      title: "UserService",
      sourceFile: "src/user-service.ts",
      symbolKind: "class",
      symbolRole: "behavioral",
      relationshipTargets: [
        "REQ-AUTH",
        "REQ-BILLING",
        "REQ-NOTIFICATIONS",
        "REQ-PROFILE",
        "REQ-REPORTING",
      ],
    });

    const diagnostics = createSymbolQualityDiagnostics({
      manifestResults: [symbol],
      symbolsByFile: new Map(),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "multi_requirement_symbol_review",
        severity: "review",
        blocking: false,
        evidence: expect.objectContaining({
          targetCount: 5,
          threshold: 4,
          symbolKind: "class",
        }),
      }),
    ]);
  });

  it("suppresses multi-requirement review for an intentional module-level symbol", () => {
    const symbol = makeQualitySymbolResult({
      id: "SYM-UPLOAD-MODULE",
      title: "upload-module",
      sourceFile: "src/upload.ts",
      symbolKind: "variable",
      symbolRole: "module",
      granularityReason: "module-level-behavior",
      relationshipTargets: [
        "REQ-UPLOAD",
        "REQ-MOBILE",
        "REQ-ANNOTATION",
        "REQ-REVIEW",
        "REQ-AUDIT",
      ],
    });

    expect(
      createSymbolQualityDiagnostics({
        manifestResults: [symbol],
        symbolsByFile: new Map(),
      }),
    ).toEqual([]);
  });

  it("emits duplicate-coordinate review for duplicate active title and source without identity evidence", () => {
    const first = makeQualitySymbolResult({
      id: "SYM-DUP-A",
      title: "UploadComponent",
      sourceFile: "src/upload.ts",
      symbolKind: "class",
      symbolRole: "behavioral",
    });
    const second = makeQualitySymbolResult({
      id: "SYM-DUP-B",
      title: "UploadComponent",
      sourceFile: "src/upload.ts",
      symbolKind: "class",
      symbolRole: "behavioral",
    });

    const diagnostics = createSymbolQualityDiagnostics({
      manifestResults: [first, second],
      symbolsByFile: new Map(),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "duplicate_symbol_coordinate_review",
        severity: "review",
        blocking: false,
        category: "coordinate",
        evidence: expect.objectContaining({
          candidateIds: ["SYM-DUP-A", "SYM-DUP-B"],
          title: "UploadComponent",
          sourceFile: "src/upload.ts",
        }),
      }),
    ]);
  });

  it("suppresses duplicate-coordinate review for distinct members or coordinates", () => {
    const memberA = makeQualitySymbolResult({
      id: "SYM-MEMBER-A",
      title: "UploadComponent.open",
      sourceFile: "src/upload.ts",
      sourceLine: 10,
      sourceColumn: 2,
      sourceEndLine: 12,
      sourceEndColumn: 3,
    });
    const memberB = makeQualitySymbolResult({
      id: "SYM-MEMBER-B",
      title: "UploadComponent.close",
      sourceFile: "src/upload.ts",
      sourceLine: 14,
      sourceColumn: 2,
      sourceEndLine: 16,
      sourceEndColumn: 3,
    });
    const coordinateA = makeQualitySymbolResult({
      id: "SYM-COORD-A",
      title: "UploadComponent",
      sourceFile: "src/upload.ts",
      sourceLine: 1,
      sourceColumn: 1,
      sourceEndLine: 20,
      sourceEndColumn: 2,
    });
    const coordinateB = makeQualitySymbolResult({
      id: "SYM-COORD-B",
      title: "UploadComponent",
      sourceFile: "src/upload.ts",
      sourceLine: 22,
      sourceColumn: 1,
      sourceEndLine: 40,
      sourceEndColumn: 2,
    });

    expect(
      createSymbolQualityDiagnostics({
        manifestResults: [memberA, memberB, coordinateA, coordinateB],
        symbolsByFile: new Map(),
      }).filter(
        (diagnostic) => diagnostic.id === "duplicate_symbol_coordinate_review",
      ),
    ).toEqual([]);
  });
});
