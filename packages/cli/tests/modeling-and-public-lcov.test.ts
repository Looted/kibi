// implements REQ-002
// implements REQ-013
// implements REQ-mcp-suggest-predicates
import { afterEach, describe, expect, test } from "bun:test";
import { withExitCode } from "../src/cli-command.js";

afterEach(() => {
  process.exitCode = undefined;
});
import {
  recordEntityAudit,
  recordRelationshipAudits,
  buildEntityDeleteAuditGoal,
} from "../src/operations/mutation/audit.js";
import {
  buildFallbackClaim,
  extractHeuristicClaim,
} from "../src/operations/modeling/requirement-heuristics.js";
import {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
} from "../src/operations/modeling/requirement-modeler.js";
import {
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
} from "../src/operations/modeling/requirement-applyplan.js";
import {
  clampConfidence,
  cleanPredicate,
  cleanSubject,
  normalizeClaimValue,
  normalizeOptionalString,
  normalizeSourceFiles,
  normalizeText,
  stripListPrefix,
} from "../src/operations/modeling/requirement-utils.js";
import {
  loadExistingPredicateSchemas,
  predicateSchemaFromEntity,
  schemaForCandidate,
  stringArray,
  usageHintsFromEntity,
} from "../src/operations/modeling/predicate-loader.js";
import {
  buildEntityGoal,
  dedupeEntities,
  loadEntities,
  paginateResults,
  validateEntityType,
} from "../src/public/operations/discovery-entities.js";
import {
  OperationJsonDecodeError,
  runOperationJsonQuery,
  toPrologAtom,
  toPrologList,
} from "../src/public/operations/prolog-json.js";
import { createRequirementQualityDiagnostics } from "../src/public/impact/requirement-quality.js";
import {
  collectSymbols,
  isModuleOrConfig,
  narrowerExtractedSymbols,
  narrowerManifestSymbols,
} from "../src/public/impact/symbol-quality-model.js";
import type { ExtractionResult } from "../src/extractors/markdown.js";
import type { StrictWriteSet } from "../src/public/check-types.js";
import type { PrologQueryResult } from "../src/public/operations/runtime-types.js";

function entity(
  id: string,
  type: string,
  extras: Record<string, unknown> = {},
): ExtractionResult {
  return {
    entity: {
      id,
      type,
      title: id,
      status: "open",
      source: `${id}.md`,
      ...extras,
    },
    relationships: [],
    sourceFile: `${id}.md`,
  } as ExtractionResult;
}

describe("requirement modeling remaining branches", () => {
  test("normalizes text, sources, confidence, and claim values", () => {
    expect(normalizeText("  keep  ")).toBe("keep");
    expect(() => normalizeText("   ")).toThrow(/non-empty/);
    expect(normalizeOptionalString("  ")).toBeUndefined();
    expect(normalizeOptionalString("src")).toBe("src");
    expect(normalizeSourceFiles([" a.md ", "a.md", "", "b.md"])).toEqual([
      "a.md",
      "b.md",
    ]);
    expect(clampConfidence(undefined)).toBe(0.8);
    expect(clampConfidence(2)).toBe(1);
    expect(clampConfidence(-1)).toBe(0);
    expect(normalizeClaimValue("x")).toBe("x");
    expect(normalizeClaimValue(3)).toBe(3);
    expect(normalizeClaimValue(true)).toBe(true);
    expect(() => normalizeClaimValue(Number.NaN)).toThrow(/finite/);
    expect(() => normalizeClaimValue({})).toThrow(/string, number, or boolean/);
    expect(stripListPrefix("- item")).toBe("item");
    expect(stripListPrefix("1) item")).toBe("item");
    expect(cleanSubject("the Widget")).toBe("Widget");
    expect(cleanPredicate("   ")).toBe("statement");
  });

  test("extracts retention, enabled, forbid, require, and fallback claims", () => {
    expect(
      extractHeuristicClaim(
        "Customer data must be retained for 7 years.",
        "docs/keep.md",
        0.9,
        "advisor",
      )?.claim.propertyKey,
    ).toBe("Retention Years");
    expect(
      extractHeuristicClaim(
        "Audit log must be retained for 30 days.",
        "docs/keep.md",
        0.9,
        undefined,
      )?.claim.propertyKey,
    ).toBe("Retention Days");
    expect(
      extractHeuristicClaim(
        "Feature flag must be retained for 2 months.",
        "docs/keep.md",
        0.9,
        undefined,
      )?.claim.propertyKey,
    ).toBe("Retention Months");
    expect(
      extractHeuristicClaim(
        "Dark mode must be enabled.",
        "docs/ui.md",
        0.8,
        undefined,
      )?.claim.value,
    ).toBe(true);
    expect(
      extractHeuristicClaim(
        "Legacy path must be disabled.",
        "docs/ui.md",
        0.8,
        undefined,
      )?.claim.value,
    ).toBe(false);
    expect(
      extractHeuristicClaim(
        "Agents must not edit compiled stores.",
        "docs/kb.md",
        0.8,
        undefined,
      )?.claim.value,
    ).toBe("forbid");
    expect(
      extractHeuristicClaim(
        "Agents must persist inventories.",
        "docs/kb.md",
        0.8,
        undefined,
      )?.claim.value,
    ).toBe("require");
    expect(
      extractHeuristicClaim("Just a note.", "docs/note.md", 0.8, undefined),
    ).toBeNull();
    const fallback = buildFallbackClaim(
      "Just a note.",
      "path/to/REQ-note.md",
      0.99,
      "review",
    );
    expect(fallback.extractionMode).toBe("fallback");
    expect(fallback.claim.confidence).toBeLessThanOrEqual(0.69);
    expect(fallback.claim.subjectKey).toBe("REQ note");
    expect(
      buildFallbackClaim("x", "", 0.5, undefined).claim.subjectKey,
    ).toBe("Requirement");
  });

  test("models explicit, heuristic, and fallback requirement claims", () => {
    expect(estimateNormativeSignalConfidence("please consider this")).toBe(0);
    expect(estimateNormativeSignalConfidence("Agents shall persist facts")).toBe(
      0.86,
    );
    expect(estimateNormativeSignalConfidence("Agents must persist facts")).toBe(
      0.84,
    );
    expect(
      estimateNormativeSignalConfidence(
        "Agents should persist facts",
        "Requirements",
      ),
    ).toBe(0.86);
    expect(() =>
      extractRequirementClaim({ text: "Agents must persist facts." }),
    ).toThrow(/source/);
    const provided = extractRequirementClaim({
      text: "  Agents must persist facts.  ",
      source: "docs/a.md",
      sourceFiles: ["docs/a.md", "docs/a.md"],
      subjectKey: "agents",
      propertyKey: "persist facts",
      operator: "polarity",
      value: "require",
      provenance: "advisor",
    });
    expect(provided.extractionMode).toBe("provided");
    expect(() =>
      extractRequirementClaim({
        text: "Agents must persist facts.",
        source: "docs/a.md",
        subjectKey: "agents",
      }),
    ).toThrow(/must all be provided/);
    expect(
      extractRequirementClaim({
        text: "Customer data must be retained for 7 years.",
        source: "docs/keep.md",
      }).extractionMode,
    ).toBe("heuristic");
    expect(
      extractRequirementClaim({
        text: "A vague note.",
        sourceFiles: ["docs/note.md"],
      }).extractionMode,
    ).toBe("fallback");
  });

  test("maps strict and observation write sets to apply plans", () => {
    const observation = {
      isStrict: false,
      observationFact: {
        type: "fact",
        id: "FACT-OBS",
        properties: { title: "note" },
      },
    } as unknown as StrictWriteSet;
    expect(strictWriteSetToApplyPlan(observation)).toEqual([
      {
        type: "fact",
        id: "FACT-OBS",
        properties: { title: "note" },
        relationships: [],
      },
    ]);
    expect(writeSetPrimaryEntityId(observation)).toBe("FACT-OBS");
    const strict = {
      isStrict: true,
      subjectFact: { type: "fact", id: "FACT-S", properties: {} },
      propertyFact: { type: "fact", id: "FACT-P", properties: {} },
      req: { type: "req", id: "REQ-1", properties: {} },
      relationships: [{ type: "constrains", from: "REQ-1", to: "FACT-S" }],
    } as unknown as StrictWriteSet;
    expect(strictWriteSetToApplyPlan(strict)).toHaveLength(3);
    expect(writeSetPrimaryEntityId(strict)).toBe("REQ-1");
  });
});

describe("predicate loader remaining branches", () => {
  test("wraps schemas and parses entity facts", () => {
    const wrapped = schemaForCandidate({
      id: "FACT-SCHEMA-1",
      predicate_name: "unknown_pred",
      title: "Unknown",
      description: "desc",
      argument_names: ["x"],
      argument_types: ["entity"],
      argument_descriptions: ["an x"],
      aliases: ["alias"],
      paraphrase_templates: ["X must"],
      examples: ["ex"],
      tags: ["t"],
      keywords: ["unknown_pred"],
    });
    expect(wrapped.usage_hints.use_when.length).toBeGreaterThan(0);
    expect(predicateSchemaFromEntity({ fact_kind: "other" })).toEqual([]);
    expect(
      predicateSchemaFromEntity({
        fact_kind: "predicate_schema",
        predicate_name: "   ",
      }),
    ).toEqual([]);
    const schema = predicateSchemaFromEntity({
      fact_kind: "predicate_schema",
      predicate_name: "retains",
      title: "Retains",
      argument_names: ["subject", "  "],
      argument_types: ["entity"],
      argument_descriptions: ["who"],
      aliases: ["keeps"],
      tags: ["policy"],
      examples: ["ex"],
      paraphrase_templates: ["must retain"],
      use_when: ["retention"],
      do_not_use_when: ["delete"],
    });
    expect(schema[0]?.predicate_name).toBe("retains");
    expect(usageHintsFromEntity({})).toBeUndefined();
    expect(stringArray("nope")).toEqual([]);
  });

  test("loads existing schemas and records load failures", async () => {
    expect(await loadExistingPredicateSchemas(null, true, [])).toEqual([]);
    const warnings: string[] = [];
    expect(
      await loadExistingPredicateSchemas(
        { query: async () => ({ success: true, bindings: {} }) },
        false,
        warnings,
      ),
    ).toEqual([]);
    const failed = await loadExistingPredicateSchemas(
      {
        query: async () => ({ success: false, error: "boom", bindings: {} }),
      },
      true,
      warnings,
    );
    expect(failed).toEqual([]);
    expect(warnings[0]).toContain("could not be loaded");
    const loaded = await loadExistingPredicateSchemas(
      {
        query: async () => ({
          success: true,
          bindings: {
            Results:
              "[[FACT-SCHEMA-1,fact,[fact_kind=predicate_schema,predicate_name=retains,title=Retains]]]",
          },
        }),
      },
      true,
      [],
    );
    expect(loaded[0]?.predicate_name).toBe("retains");
  });
});

describe("audit and CLI exit helpers", () => {
  test("records entity and relationship audits and builds delete goals", async () => {
    const calls: string[] = [];
    const prolog = {
      query: async (goal: string): Promise<PrologQueryResult> => {
        calls.push(goal);
        return { success: true, bindings: {} };
      },
    };
    await recordEntityAudit(prolog, "created", {
      type: "req",
      id: "REQ-1",
      title: "Keep",
    });
    await recordRelationshipAudits(prolog, [
      { type: "constrains", from: "REQ-1", to: "FACT-1" },
    ]);
    expect(calls).toHaveLength(2);
    await expect(
      recordEntityAudit(
        { query: async () => ({ success: false, bindings: {} }) },
        "updated",
        { type: "req", id: "REQ-1" },
      ),
    ).rejects.toThrow(/Failed to record audit/);
    await expect(
      recordRelationshipAudits(
        { query: async () => ({ success: false, bindings: {} }) },
        [{ type: "constrains", from: "REQ-1", to: "FACT-1" }],
      ),
    ).rejects.toThrow(/relationship audit/);
    expect(
      buildEntityDeleteAuditGoal({
        id: "REQ-1",
        type: "req",
        title: "Keep",
        extra: 1,
      }),
    ).toContain("kb_retract_entity");
  });

  test("withExitCode assigns process.exitCode only when provided", async () => {
    const previous = process.exitCode;
    try {
      process.exitCode = undefined;
      await withExitCode(async () => undefined)();
      expect(process.exitCode).toBeUndefined();
      await withExitCode(async () => ({ exitCode: 7 }))();
      expect(process.exitCode).toBe(7);
    } finally {
      process.exitCode = previous;
    }
  });
});

describe("discovery entities and Prolog JSON helpers", () => {
  test("builds goals, validates types, paginates, and loads entities", async () => {
    expect(() => validateEntityType("nope")).toThrow(/Invalid type/);
    validateEntityType("req");
    expect(buildEntityGoal({ sourceFile: "a.md", type: "req" })).toContain(
      "kb_entities_by_source",
    );
    expect(buildEntityGoal({ sourceFile: "a.md" })).toContain(
      "kb_entities_by_source",
    );
    expect(buildEntityGoal({ id: "REQ-1", type: "req" })).toContain("REQ-1");
    expect(buildEntityGoal({ id: "REQ-1" })).toContain("REQ-1");
    expect(buildEntityGoal({ tags: ["a"], type: "req" })).toContain(
      "kb_entities_by_tag",
    );
    expect(buildEntityGoal({ tags: ["a"] })).toContain("kb_entities_by_tag");
    expect(buildEntityGoal({ type: "req" })).toContain("kb_entity(Id");
    expect(buildEntityGoal({})).toContain("kb_entity(Id, Type, Props)");
    expect(paginateResults([1, 2, 3], 1, 1)).toEqual([2]);
    expect(
      dedupeEntities([
        { type: "req", id: "REQ-1" },
        { type: "req", id: "REQ-1" },
      ]),
    ).toHaveLength(1);
    await expect(
      loadEntities({ query: async () => ({ success: false, bindings: {} }) }, {}),
    ).rejects.toThrow(/Query failed/);
    const tagged = await loadEntities(
      {
        query: async () => ({
          success: true,
          bindings: {
            Results:
              "[[REQ-1,req,[title=Keep,tags=[keep]]],[REQ-2,req,[title=Drop,tags=[other]]]]",
          },
        }),
      },
      { tags: ["keep"] },
    );
    expect(tagged.map((row) => row.id)).toEqual(["REQ-1"]);
    const single = await loadEntities(
      {
        query: async () => ({
          success: true,
          bindings: {
            Result: "[REQ-9,req,[title=One]]",
          },
        }),
      },
      {},
    );
    expect(single[0]?.id).toBe("REQ-9");
  });

  test("decodes operation JSON and formats Prolog terms", async () => {
    expect(toPrologAtom()).toBe("none");
    expect(toPrologAtom("")).toBe("none");
    expect(toPrologAtom("req")).toBe("'req'");
    expect(toPrologList()).toBe("[]");
    expect(toPrologList(["a", "b"])).toBe("['a','b']");
    await expect(
      runOperationJsonQuery(
        { query: async () => ({ success: false, bindings: {} }) },
        "status.pl",
        "goal",
        "status",
      ),
    ).rejects.toThrow(/query failed/);
    await expect(
      runOperationJsonQuery(
        { query: async () => ({ success: true, bindings: {} }) },
        "status.pl",
        "goal",
        "status",
      ),
    ).rejects.toThrow(/no JsonString/);
    await expect(
      runOperationJsonQuery(
        {
          query: async () => ({
            success: true,
            bindings: { JsonString: 12 },
          }),
        },
        "status.pl",
        "goal",
        "status",
      ),
    ).rejects.toBeInstanceOf(OperationJsonDecodeError);
    await expect(
      runOperationJsonQuery(
        {
          query: async () => ({
            success: true,
            bindings: { JsonString: "{not-json" },
          }),
        },
        "status.pl",
        "goal",
        "status",
      ),
    ).rejects.toBeInstanceOf(OperationJsonDecodeError);
    await expect(
      runOperationJsonQuery(
        {
          query: async () => ({
            success: true,
            bindings: { JsonString: '"not-object"' },
          }),
        },
        "status.pl",
        "goal",
        "status",
      ),
    ).rejects.toBeInstanceOf(OperationJsonDecodeError);
    const decoded = await runOperationJsonQuery<{ ok: boolean }>(
      {
        query: async () => ({
          success: true,
          bindings: { JsonString: '{"ok":true}' },
        }),
      },
      "status.pl",
      "goal",
      "status",
    );
    expect(decoded.ok).toBe(true);
    await expect(
      runOperationJsonQuery(
        {
          oneShotMode: false,
          storageStatus: async () => ({ success: true, bindings: {} }),
          query: async (goal: string) =>
            goal.includes("use_module")
              ? { success: false, error: "load", bindings: {} }
              : { success: true, bindings: { JsonString: "{}" } },
        } as never,
        "discovery.pl",
        "goal",
        "discovery",
      ),
    ).rejects.toThrow(/module load failed/);
  });
});

describe("requirement and symbol quality models", () => {
  test("emits broad, status, and logical coverage reviews", () => {
    const broad = entity("REQ-BROAD", "req", { status: "open" });
    broad.relationships = Array.from({ length: 7 }, (_, index) => ({
      type: "specified_by",
      from: "REQ-BROAD",
      to: `SCEN-${index}`,
    }));
    const symbols = Array.from({ length: 9 }, (_, index) => {
      const symbol = entity(`SYM-${index}`, "symbol");
      symbol.relationships = [
        { type: "implements", from: `SYM-${index}`, to: "REQ-BROAD" },
      ];
      return symbol;
    });
    const diagnostics = createRequirementQualityDiagnostics({
      manifestResults: [
        broad,
        entity("REQ-PASS", "req", { status: "passing" }),
        entity("REQ-LOGIC", "req", { status: "open" }),
        ...Array.from({ length: 7 }, (_, index) =>
          entity(`SCEN-${index}`, "scenario"),
        ),
        ...symbols,
      ],
    });
    expect(diagnostics.some((item) => item.id === "broad_requirement_review")).toBe(
      true,
    );
    expect(diagnostics.some((item) => item.id === "requirement_status_review")).toBe(
      true,
    );
    expect(diagnostics.some((item) => item.id === "logical_coverage_review")).toBe(
      true,
    );
    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [
          entity("REQ-OK", "req", { status: "open", logic_claims: ["C1"] }),
        ],
        hardViolationEntityIds: new Set(["REQ-OK"]),
      }),
    ).toEqual([]);
  });

  test("collects and narrows symbol metadata", () => {
    const parent = entity("SYM-MOD", "symbol", {
      title: "Widget",
      status: "active",
      symbol_role: "module",
    });
    const child = entity("SYM-FN", "symbol", {
      title: "Widget.run",
      status: "active",
      symbol_role: "behavioral",
    });
    parent.sourceFile = "src/widget.ts";
    child.sourceFile = "src/widget.ts";
    const symbols = collectSymbols({
      manifestResults: [parent, child, entity("REQ-1", "req")],
    });
    expect(symbols).toHaveLength(2);
    expect(isModuleOrConfig(symbols[0]!)).toBe(true);
    expect(narrowerManifestSymbols(symbols[0]!, symbols).map((s) => s.id)).toEqual([
      "SYM-FN",
    ]);
    expect(
      narrowerExtractedSymbols(
        symbols[0]!,
        new Map([
          [
            "src/widget.ts",
            [
              { name: "Widget.run", role: "behavioral" },
              { name: "Widget", role: "module" },
              { name: "other", role: "behavioral" },
            ],
          ],
        ]),
      ).map((item) => item.name),
    ).toEqual(["Widget.run"]);
    expect(
      collectSymbols({
        manifestResults: [parent],
        activeEntityIds: new Set(["missing"]),
      }),
    ).toEqual([]);
  });
});
