import { describe, expect, test } from "bun:test";
import * as generated from "../../src/public/symbol-granularity.generated.js";
import {
  ALLOWED_GRANULARITY_REASONS,
  ALLOWED_GRANULARITY_REASONS_PROSE,
  COARSE_GRANULARITY_REASONS,
  COARSE_GRANULARITY_REASONS_PARENTHESIZED,
  COARSE_GRANULARITY_REASONS_PROSE,
  ROLE_INFERENCE,
  SYMBOL_ROLES,
  type SymbolKind,
  TRACEABILITY_RELATIONSHIP_TYPES,
  coarseLinkBehavioralNames,
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  getSymbolRole,
  inferSymbolRole,
  inferSymbolRoleFromKind,
  isAllowedGranularityReason,
  isBehavioralSymbol,
  isCoarseGranularityReason,
  isSymbolRole,
  isTraceabilityRelationshipType,
  narrowerSymbols,
} from "../../src/public/symbol-granularity.js";

describe("re-exported vocabulary", () => {
  test("is the generated vocabulary", () => {
    expect(ALLOWED_GRANULARITY_REASONS).toBe(
      generated.ALLOWED_GRANULARITY_REASONS,
    );
    expect(ALLOWED_GRANULARITY_REASONS_PROSE).toBe(
      generated.ALLOWED_GRANULARITY_REASONS_PROSE,
    );
    expect(COARSE_GRANULARITY_REASONS).toBe(
      generated.COARSE_GRANULARITY_REASONS,
    );
    expect(COARSE_GRANULARITY_REASONS_PARENTHESIZED).toBe(
      generated.COARSE_GRANULARITY_REASONS_PARENTHESIZED,
    );
    expect(COARSE_GRANULARITY_REASONS_PROSE).toBe(
      generated.COARSE_GRANULARITY_REASONS_PROSE,
    );
    expect(ROLE_INFERENCE).toBe(generated.ROLE_INFERENCE);
    expect(SYMBOL_ROLES).toBe(generated.SYMBOL_ROLES);
    expect(TRACEABILITY_RELATIONSHIP_TYPES).toBe(
      generated.TRACEABILITY_RELATIONSHIP_TYPES,
    );
  });
});

describe("role inference", () => {
  test("follows ROLE_INFERENCE and defaults to unknown", () => {
    expect(inferSymbolRole("function")).toBe("behavioral");
    expect(inferSymbolRole("interface")).toBe("type-shape");
    expect(inferSymbolRole("bogus" as SymbolKind)).toBe("unknown");
    expect(inferSymbolRoleFromKind).toBe(inferSymbolRole);
  });

  test("getSymbolRole prefers the role, then the kind", () => {
    expect(getSymbolRole({ name: "a", role: "config", kind: "function" })).toBe(
      "config",
    );
    expect(getSymbolRole({ name: "a", kind: "enum" })).toBe("type-shape");
    expect(getSymbolRole({ name: "a" })).toBe("unknown");
  });

  test("isBehavioralSymbol", () => {
    expect(isBehavioralSymbol({ name: "a", kind: "method" })).toBe(true);
    expect(isBehavioralSymbol({ name: "a", kind: "type" })).toBe(false);
  });
});

describe("vocabulary guards", () => {
  test("isSymbolRole", () => {
    for (const role of SYMBOL_ROLES) expect(isSymbolRole(role)).toBe(true);
    expect(isSymbolRole("Behavioral")).toBe(false);
    expect(isSymbolRole(1)).toBe(false);
  });

  test("isTraceabilityRelationshipType", () => {
    for (const type of TRACEABILITY_RELATIONSHIP_TYPES)
      expect(isTraceabilityRelationshipType(type)).toBe(true);
    expect(isTraceabilityRelationshipType("relates_to")).toBe(false);
    expect(isTraceabilityRelationshipType(undefined)).toBe(false);
  });

  test("isAllowedGranularityReason", () => {
    for (const reason of ALLOWED_GRANULARITY_REASONS)
      expect(isAllowedGranularityReason(reason)).toBe(true);
    expect(isAllowedGranularityReason("other")).toBe(false);
    expect(isAllowedGranularityReason(null)).toBe(false);
  });

  test("isCoarseGranularityReason", () => {
    for (const reason of COARSE_GRANULARITY_REASONS)
      expect(isCoarseGranularityReason(reason)).toBe(true);
    expect(isCoarseGranularityReason("legacy-link")).toBe(false);
    expect(isCoarseGranularityReason(3)).toBe(false);
  });
});

describe("symbol name helpers", () => {
  test("getBehavioralSymbolNames lists behavioral names, properties last", () => {
    expect(
      getBehavioralSymbolNames([
        { name: "zeta", kind: "property" },
        { name: "beta", kind: "function" },
        { name: "alpha", kind: "property" },
        { name: "Shape", kind: "interface" },
        { name: "gamma", kind: "method" },
        { name: "beta", kind: "function" },
        { name: "delta", role: "behavioral" },
      ]),
    ).toStrictEqual(["beta", "delta", "gamma", "alpha", "zeta"]);
  });

  test("getNonBehavioralSymbolNames lists the rest sorted and unique", () => {
    expect(
      getNonBehavioralSymbolNames([
        { name: "Zed", kind: "type" },
        { name: "run", kind: "function" },
        { name: "Abc", kind: "interface" },
        { name: "Zed", kind: "type" },
        { name: "x" },
      ]),
    ).toStrictEqual(["Abc", "Zed", "x"]);
  });

  test("narrowerSymbols keeps members when the symbol is declared", () => {
    const candidates = [
      { name: "Upload" },
      { name: "Upload.run" },
      { name: "UploadMore" },
      { name: "other" },
    ];
    expect(
      narrowerSymbols("Upload", candidates, [{ name: "Upload" }]),
    ).toStrictEqual([{ name: "Upload.run" }]);
  });

  test("narrowerSymbols keeps every other symbol when undeclared", () => {
    const candidates = [
      { name: "Upload" },
      { name: "Upload.run" },
      { name: "x" },
    ];
    expect(
      narrowerSymbols("Upload", candidates, [{ name: "y" }]),
    ).toStrictEqual([{ name: "Upload.run" }, { name: "x" }]);
  });

  test("coarseLinkBehavioralNames", () => {
    expect(
      coarseLinkBehavioralNames("Upload", [
        { name: "Upload", kind: "class" },
        { name: "Upload.run", kind: "method" },
        { name: "Upload.Shape", kind: "interface" },
        { name: "helper", kind: "function" },
      ]),
    ).toStrictEqual(["Upload.run"]);
    expect(
      coarseLinkBehavioralNames("file.ts", [
        { name: "helper", kind: "function" },
        { name: "Shape", kind: "type" },
      ]),
    ).toStrictEqual(["helper"]);
  });
});
