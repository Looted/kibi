import { describe, expect, it } from "bun:test";
import {
  createSymbolQualityDiagnostics,
  hasBlockingImpactDiagnostics,
} from "../../src/public/impact-diagnostics.js";
import type { ExtractedSymbol } from "../../src/traceability/symbol-extract.js";
import { makeQualitySymbolResult } from "./impact-symbol-quality-fixtures.js";

function extractedSymbol(name: string): ExtractedSymbol {
  return {
    id: `EXTRACTED-${name}`,
    name,
    kind: "method",
    role: "behavioral",
    location: { file: "src/settings.ts", startLine: 10, endLine: 12 },
    hunkRanges: [{ start: 10, end: 12 }],
    reqLinks: [],
  };
}

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

  it("infers aggregate kinds and roles from symbol titles", () => {
    const service = makeQualitySymbolResult({
      id: "SYM-USER-SERVICE-INFERRED",
      title: "UserService",
      sourceFile: "src/user-service.ts",
      relationshipTargets: ["REQ-A", "REQ-B", "REQ-C", "REQ-D", "REQ-E"],
    });

    const diagnostics = createSymbolQualityDiagnostics({
      manifestResults: [service],
      symbolsByFile: new Map(),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "multi_requirement_symbol_review",
        evidence: expect.objectContaining({
          threshold: 4,
          symbolKind: "service",
          symbolRole: "behavioral",
        }),
      }),
    ]);
  });

  it("reviews module or config symbols with broad ownership unless they have valid granularity reasons", () => {
    const moduleSymbol = makeQualitySymbolResult({
      id: "SYM-SETTINGS-MODULE",
      title: "SettingsModule",
      sourceFile: "src/settings.ts",
      relationshipTargets: ["REQ-A", "REQ-B", "REQ-C", "REQ-D", "REQ-E"],
    });
    const configSymbol = makeQualitySymbolResult({
      id: "SYM-SETTINGS-CONFIG",
      title: "SettingsConfig",
      sourceFile: "src/settings.ts",
      symbolKind: "config",
      relationshipTargets: ["REQ-A", "REQ-B", "REQ-C"],
    });

    const diagnostics = createSymbolQualityDiagnostics({
      manifestResults: [moduleSymbol, configSymbol],
      symbolsByFile: new Map(),
    });

    expect(diagnostics.map((diagnostic) => diagnostic.entityId)).toEqual([
      "SYM-SETTINGS-MODULE",
      "SYM-SETTINGS-CONFIG",
    ]);
  });

  it("skips inactive, unscoped, and source-less symbols during quality collection", () => {
    const inactive = makeQualitySymbolResult({
      id: "SYM-INACTIVE",
      title: "inactive",
      sourceFile: "src/inactive.ts",
      status: "deprecated",
      relationshipTargets: ["REQ-A", "REQ-B", "REQ-C"],
    });
    const unscoped = makeQualitySymbolResult({
      id: "SYM-UNSCOPED",
      title: "unscoped",
      sourceFile: "src/unscoped.ts",
      relationshipTargets: ["REQ-A", "REQ-B", "REQ-C"],
    });
    const sourceful = makeQualitySymbolResult({
      id: "SYM-NO-SOURCE",
      title: "noSource",
      sourceFile: "src/no-source.ts",
      relationshipTargets: ["REQ-A", "REQ-B", "REQ-C"],
    });
    const { sourceFile: _sourceFile, ...withoutSource } = sourceful;

    expect(
      createSymbolQualityDiagnostics({
        manifestResults: [inactive, unscoped, withoutSource],
        activeEntityIds: new Set(["SYM-INACTIVE", "SYM-NO-SOURCE"]),
        symbolsByFile: new Map(),
      }),
    ).toEqual([]);
  });

  it("uses extracted narrower behavioral symbols as mixed-purpose evidence", () => {
    const component = makeQualitySymbolResult({
      id: "SYM-SETTINGS-COMPONENT",
      title: "SettingsComponent",
      sourceFile: "src/settings.ts",
      symbolKind: "class",
      relationshipTargets: ["REQ-A", "REQ-B", "REQ-C"],
    });
    const requirements = [
      makeQualitySymbolResult({
        id: "SYM-OTHER",
        title: "other",
        sourceFile: "src/other.ts",
      }),
    ];

    const diagnostics = createSymbolQualityDiagnostics({
      manifestResults: [
        component,
        ...requirements,
        {
          entity: {
            id: "REQ-A",
            type: "req",
            title: "A",
            status: "active",
            created_at: "2026-06-25T00:00:00.000Z",
            updated_at: "2026-06-25T00:00:00.000Z",
            source: ".kb/requirements/REQ-A.md",
            tags: ["a"],
          },
          relationships: [],
        },
        {
          entity: {
            id: "REQ-B",
            type: "req",
            title: "B",
            status: "active",
            created_at: "2026-06-25T00:00:00.000Z",
            updated_at: "2026-06-25T00:00:00.000Z",
            source: ".kb/requirements/REQ-B.md",
            tags: ["b"],
          },
          relationships: [],
        },
        {
          entity: {
            id: "REQ-C",
            type: "req",
            title: "C",
            status: "active",
            created_at: "2026-06-25T00:00:00.000Z",
            updated_at: "2026-06-25T00:00:00.000Z",
            source: ".kb/requirements/REQ-C.md",
            tags: ["c"],
          },
          relationships: [],
        },
      ],
      symbolsByFile: new Map([
        ["src/settings.ts", [extractedSymbol("SettingsComponent.save")]],
      ]),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "component_mixed_purpose_review",
        evidence: expect.objectContaining({
          narrowerSymbolIds: ["EXTRACTED-SettingsComponent.save"],
        }),
      }),
    ]);
  });

  it("suppresses mixed-purpose review when every target shares a requirement tag", () => {
    const component = makeQualitySymbolResult({
      id: "SYM-SHARED-COMPONENT",
      title: "SharedComponent",
      sourceFile: "src/shared.ts",
      symbolKind: "class",
      relationshipTargets: ["REQ-A", "REQ-B", "REQ-C"],
    });
    const child = makeQualitySymbolResult({
      id: "SYM-SHARED-COMPONENT-CHILD",
      title: "SharedComponent.child",
      sourceFile: "src/shared.ts",
      symbolKind: "method",
      relationshipTargets: ["REQ-A"],
    });
    const requirements = ["REQ-A", "REQ-B", "REQ-C"].map((id) => ({
      entity: {
        id,
        type: "req",
        title: id,
        status: "active",
        created_at: "2026-06-25T00:00:00.000Z",
        updated_at: "2026-06-25T00:00:00.000Z",
        source: `.kb/requirements/${id}.md`,
        tags: ["shared", id.toLowerCase()],
      },
      relationships: [],
    }));

    expect(
      createSymbolQualityDiagnostics({
        manifestResults: [component, child, ...requirements],
        symbolsByFile: new Map(),
      }).filter(
        (diagnostic) => diagnostic.id === "component_mixed_purpose_review",
      ),
    ).toEqual([]);
  });
});
