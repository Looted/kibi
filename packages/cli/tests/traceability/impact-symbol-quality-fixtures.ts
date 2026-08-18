import type { ExtractionResult } from "../../src/extractors/markdown.js";

type QualitySymbolFixture = {
  readonly id: string;
  readonly title: string;
  readonly sourceFile: string;
  readonly relationshipTargets?: readonly string[];
  readonly status?: string;
  readonly granularityReason?: string;
  readonly symbolKind?: string;
  readonly symbolRole?: string;
  readonly sourceLine?: number;
  readonly sourceColumn?: number;
  readonly sourceEndLine?: number;
  readonly sourceEndColumn?: number;
};

type RequirementFixture = {
  readonly id: string;
  readonly tags?: readonly string[];
};

export function makeQualitySymbolResult(
  fixture: QualitySymbolFixture,
): ExtractionResult {
  return {
    entity: {
      id: fixture.id,
      type: "symbol",
      title: fixture.title,
      status: fixture.status ?? "active",
      created_at: "2026-06-25T00:00:00.000Z",
      updated_at: "2026-06-25T00:00:00.000Z",
      source: ".kb/symbols.yaml",
      ...(fixture.granularityReason !== undefined
        ? { granularity_reason: fixture.granularityReason }
        : {}),
      ...(fixture.symbolKind !== undefined
        ? { symbol_kind: fixture.symbolKind }
        : {}),
      ...(fixture.symbolRole !== undefined
        ? { symbol_role: fixture.symbolRole }
        : {}),
      ...(fixture.sourceLine !== undefined
        ? { sourceLine: fixture.sourceLine }
        : {}),
      ...(fixture.sourceColumn !== undefined
        ? { sourceColumn: fixture.sourceColumn }
        : {}),
      ...(fixture.sourceEndLine !== undefined
        ? { sourceEndLine: fixture.sourceEndLine }
        : {}),
      ...(fixture.sourceEndColumn !== undefined
        ? { sourceEndColumn: fixture.sourceEndColumn }
        : {}),
    },
    sourceFile: fixture.sourceFile,
    relationships: (fixture.relationshipTargets ?? []).map((target) => ({
      type: "implements",
      from: fixture.id,
      to: target,
    })),
  };
}

export function makeRequirementResult(
  fixture: RequirementFixture,
): ExtractionResult {
  return {
    entity: {
      id: fixture.id,
      type: "req",
      title: fixture.id,
      status: "active",
      created_at: "2026-06-25T00:00:00.000Z",
      updated_at: "2026-06-25T00:00:00.000Z",
      source: `.kb/requirements/${fixture.id}.md`,
      ...(fixture.tags !== undefined ? { tags: [...fixture.tags] } : {}),
    },
    relationships: [],
  };
}
