import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  SUBJECT_KEY_CONVENTION,
  type SemanticClaim,
  buildStableRequirementIds,
  buildStrictWriteSet,
  factSourcePath,
  isConventionalSubjectKey,
  modelRequirementClaims,
  normalizePropertyKey,
  normalizeSourceKey,
  normalizeSubjectKey,
  normalizeTextRef,
} from "../../src/utils/strict-modeling.js";

const id = (prefix: string, value: string) =>
  `${prefix}-${createHash("sha256").update(value).digest("hex").substring(0, 16).toUpperCase()}`;

const claim = (overrides: Partial<SemanticClaim> = {}): SemanticClaim => ({
  source: "docs/spec.md",
  subjectKey: "auth.session",
  propertyKey: "timeout",
  operator: "lte",
  value: 30,
  confidence: 0.95,
  ...overrides,
});

describe("key normalizers", () => {
  test("subject keys become dotted lowercase snake segments", () => {
    expect(normalizeSubjectKey("  Auth/Session\\Token  ")).toBe(
      "auth.session.token",
    );
    expect(normalizeSubjectKey("a..b")).toBe("a.b");
    expect(normalizeSubjectKey("a/.b")).toBe("a.b");
    expect(normalizeSubjectKey("a__b  c")).toBe("a_b_c");
    expect(normalizeSubjectKey("._a._")).toBe("a");
    expect(normalizeSubjectKey("a_ -b")).toBe("a_b");
    expect(() => normalizeSubjectKey(" ._ ")).toThrow(
      "Semantic claim subjectKey must normalize to a non-empty value",
    );
  });

  test("property keys become lowercase snake case", () => {
    expect(normalizePropertyKey("  Max Retries  ")).toBe("max_retries");
    expect(normalizePropertyKey("a__-b")).toBe("a_b");
    expect(normalizePropertyKey("_a_")).toBe("a");
    expect(() => normalizePropertyKey(" -- ")).toThrow(
      "Semantic claim propertyKey must normalize to a non-empty value",
    );
  });

  test("source keys become lowercase kebab case", () => {
    expect(normalizeSourceKey("  Docs/Spec.MD ")).toBe("docs-spec-md");
    expect(normalizeSourceKey("a--b")).toBe("a-b");
    expect(normalizeSourceKey("-a-")).toBe("a");
    expect(() => normalizeSourceKey(" / ")).toThrow(
      "Semantic claim source must normalize to a non-empty value",
    );
  });

  test("text refs prefer trimmed provenance, then the source", () => {
    expect(normalizeTextRef(" p ", "s")).toBe("p");
    expect(normalizeTextRef(undefined, " s ")).toBe("s");
    expect(normalizeTextRef("  ", "s")).toBe("s");
    expect(() => normalizeTextRef(undefined, " ")).toThrow(
      "Strict modeling requires claim provenance or source",
    );
  });

  test("the subject-key convention is dotted snake segments, whole", () => {
    for (const ok of ["a.b", "auth9.session_ttl.x_1", "a1_b2.c"]) {
      expect(isConventionalSubjectKey(ok)).toBe(true);
    }
    for (const bad of [
      "a",
      "xA.b",
      "a.b!",
      "1a.b",
      "a.1b",
      "a.B",
      "a_.b",
      "a._b",
      "a__b.c",
      "a.b__c",
      "a_!.b",
      "a.b_!",
      "a!.b",
    ]) {
      expect(isConventionalSubjectKey(bad)).toBe(false);
    }
    expect(SUBJECT_KEY_CONVENTION.test("ab.cd")).toBe(true);
    expect(isConventionalSubjectKey("ab_cd.ef_gh")).toBe(true);
    expect(isConventionalSubjectKey("ab_cd1.ef")).toBe(true);
    expect(isConventionalSubjectKey("a.bc_de1")).toBe(true);
  });
});

describe("stable ids", () => {
  test("hash a stable key of source, subject, property, operator and value", () => {
    const stableKey = "docs-spec-md:auth.session:timeout:lte:30";
    expect(buildStableRequirementIds(claim())).toStrictEqual({
      stableKey,
      reqId: id("REQ-AUTO", `req:${stableKey}`),
      subjectFactId: id("FACT-SUBJECT", `subject:${stableKey}`),
      propertyFactId: id("FACT-PROP", `property:${stableKey}`),
      observationFactId: id("FACT-OBS", `observation:${stableKey}`),
      normalizedSource: "docs-spec-md",
      normalizedSubjectKey: "auth.session",
      normalizedPropertyKey: "timeout",
      normalizedValue: "30",
    });
  });

  test("normalize string and set values", () => {
    const value = (v: SemanticClaim["value"]) =>
      buildStableRequirementIds(claim({ operator: "eq", value: v }))
        .normalizedValue;
    expect(value("  Hello  World!! ")).toBe("hello_world");
    expect(value("a__b")).toBe("a_b");
    expect(value("v1.2-x")).toBe("v1.2-x");
    expect(value("_a_")).toBe("a");
    expect(value("   ")).toBe("empty");
    expect(value(["b", "a", "b"])).toBe("a_b");
    expect(value(true)).toBe("true");
  });
});

describe("buildStrictWriteSet", () => {
  test("a confident claim models a requirement with subject and property facts", () => {
    const ids = buildStableRequirementIds(claim());
    const tags = [
      "strict-modeling",
      "confidence:0.95",
      "confidence-band:high",
      "provenance:docs-spec-md",
    ];
    expect(
      buildStrictWriteSet({
        claim: claim(),
        statement: "  Sessions time out.  ",
      }),
    ).toStrictEqual({
      req: {
        type: "req",
        id: ids.reqId,
        properties: {
          id: ids.reqId,
          title: "Sessions time out.",
          status: "open",
          source: `.kb/requirements/${ids.reqId}.md`,
          text_ref: "docs/spec.md",
          tags: [...tags, "lane:strict"],
        },
      },
      subjectFact: {
        type: "fact",
        id: ids.subjectFactId,
        properties: {
          id: ids.subjectFactId,
          title: "Auth Session",
          status: "active",
          source: `.kb/facts/${ids.subjectFactId}.md`,
          text_ref: "docs/spec.md",
          tags: [...tags, "lane:strict", "fact:subject"],
          fact_kind: "subject",
          subject_key: "auth.session",
          canonical_key: "auth.session",
        },
        body: `Definition not stated: the subject auth.session is named by requirement ${ids.reqId} ("Sessions time out."). The people who own that source can say what it is in the product and what it is not.\n`,
      },
      propertyFact: {
        type: "fact",
        id: ids.propertyFactId,
        properties: {
          id: ids.propertyFactId,
          title: "Timeout <= 30",
          status: "active",
          source: `.kb/facts/${ids.propertyFactId}.md`,
          text_ref: "docs/spec.md",
          tags: [...tags, "lane:strict", "fact:property_value"],
          fact_kind: "property_value",
          subject_key: "auth.session",
          property_key: "timeout",
          canonical_key: ids.stableKey,
          operator: "lte",
          value_type: "int",
          value_int: 30,
        },
      },
      relationships: [
        {
          type: "constrains",
          from: ids.reqId,
          to: ids.subjectFactId,
          source: "docs/spec.md",
          confidence: 0.95,
        },
        {
          type: "requires_property",
          from: ids.reqId,
          to: ids.propertyFactId,
          source: "docs/spec.md",
          confidence: 0.95,
        },
      ],
      isStrict: true,
      confidence: 0.95,
    });
  });

  test("an unconfident claim models only an observation fact", () => {
    const c = claim({ confidence: 0.69, provenance: "line 4" });
    const ids = buildStableRequirementIds(c);
    expect(buildStrictWriteSet({ claim: c, statement: "S" })).toStrictEqual({
      observationFact: {
        type: "fact",
        id: ids.observationFactId,
        properties: {
          id: ids.observationFactId,
          title: "S",
          status: "active",
          source: `.kb/facts/${ids.observationFactId}.md`,
          text_ref: "line 4",
          tags: [
            "strict-modeling",
            "confidence:0.69",
            "confidence-band:low",
            "provenance:line-4",
            "lane:observation",
            "review:required",
          ],
          fact_kind: "observation",
          subject_key: "auth.session",
          property_key: "timeout",
          canonical_key: ids.stableKey,
        },
      },
      relationships: [],
      isStrict: false,
      confidence: 0.69,
    });
  });

  test("confidence is clamped, rounded and banded", () => {
    const write = (confidence: number) =>
      buildStrictWriteSet({ claim: claim({ confidence }), statement: "S" });
    const band = (confidence: number) => {
      const set = write(confidence);
      const tags = set.isStrict
        ? set.req.properties.tags
        : set.observationFact.properties.tags;
      return [set.confidence, set.isStrict, tags?.[2]];
    };
    expect(band(0.7)).toStrictEqual([0.7, true, "confidence-band:low"]);
    expect(band(0.8)).toStrictEqual([0.8, true, "confidence-band:medium"]);
    expect(band(0.9)).toStrictEqual([0.9, true, "confidence-band:high"]);
    expect(band(0.894)).toStrictEqual([0.89, true, "confidence-band:medium"]);
    expect(band(7)).toStrictEqual([1, true, "confidence-band:high"]);
    expect(band(-1)).toStrictEqual([0, false, "confidence-band:low"]);
    expect(band(Number.NaN)).toStrictEqual([0, false, "confidence-band:low"]);
  });

  test("a given requirement id replaces the minted one, trimmed", () => {
    const set = buildStrictWriteSet({
      claim: claim(),
      statement: "S",
      requirementId: "  REQ-auth-timeout ",
    });
    expect(set.isStrict && set.req.id).toBe("REQ-auth-timeout");
    const blank = buildStrictWriteSet({
      claim: claim(),
      statement: "S",
      requirementId: "  ",
    });
    expect(blank.isStrict && blank.req.id).toBe(
      buildStableRequirementIds(claim()).reqId,
    );
  });

  test("an empty statement is refused", () => {
    expect(() =>
      buildStrictWriteSet({ claim: claim(), statement: "  " }),
    ).toThrow("Strict modeling requires a non-empty prose statement");
  });
});

describe("property facts per operator", () => {
  const property = (overrides: Partial<SemanticClaim>) => {
    const set = buildStrictWriteSet({
      claim: claim({ propertyKey: "max_login.retry-count", ...overrides }),
      statement: "S",
    });
    if (!set.isStrict) throw new Error("expected a strict write set");
    const {
      title,
      operator,
      value_type,
      value_int,
      value_number,
      value_string,
      value_bool,
      value_set,
      polarity,
    } = set.propertyFact.properties as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries({
        title,
        operator,
        value_type,
        value_int,
        value_number,
        value_string,
        value_bool,
        value_set,
        polarity,
      }).filter(([, v]) => v !== undefined),
    );
  };

  test("comparison operators", () => {
    for (const [operator, label] of [
      ["eq", "="],
      ["neq", "!="],
      ["gte", ">="],
      ["gt", ">"],
      ["lt", "<"],
      ["lte", "<="],
    ] as const) {
      expect(property({ operator, value: 3 })).toStrictEqual({
        title: `Max Login Retry Count ${label} 3`,
        operator,
        value_type: "int",
        value_int: 3,
      });
    }
    expect(property({ operator: "eq", value: 2.5 })).toStrictEqual({
      title: "Max Login Retry Count = 2.5",
      operator: "eq",
      value_type: "number",
      value_number: 2.5,
    });
    expect(property({ operator: "eq", value: "fast" })).toStrictEqual({
      title: "Max Login Retry Count = fast",
      operator: "eq",
      value_type: "string",
      value_string: "fast",
    });
    expect(property({ operator: "neq", value: false })).toStrictEqual({
      title: "Max Login Retry Count != false",
      operator: "neq",
      value_type: "bool",
      value_bool: false,
    });
  });

  test("an ordering comparison stores a numeric string as a number", () => {
    for (const operator of ["gt", "gte", "lt", "lte"] as const) {
      expect(property({ operator, value: " -2 " }).value_int).toBe(-2);
    }
    expect(property({ operator: "gt", value: "2.5" }).value_number).toBe(2.5);
    for (const value of ["x2", "2x", "1 2", "2.", "2.x", "2.55x", "- 2"]) {
      expect(property({ operator: "gt", value }).value_string).toBe(value);
    }
    expect(property({ operator: "gt", value: "12.55" }).value_number).toBe(
      12.55,
    );
    expect(property({ operator: "eq", value: "5" }).value_string).toBe("5");
    expect(property({ operator: "gt", value: true }).value_bool).toBe(true);
  });

  test("bool, polarity and matches", () => {
    expect(property({ operator: "bool", value: " TRUE " })).toStrictEqual({
      title: "Max Login Retry Count =  TRUE ",
      operator: "eq",
      value_type: "bool",
      value_bool: true,
    });
    expect(property({ operator: "bool", value: "false" }).value_bool).toBe(
      false,
    );
    expect(property({ operator: "bool", value: true }).value_bool).toBe(true);
    for (const value of ["yes", 1]) {
      expect(() => property({ operator: "bool", value })).toThrow(
        "Boolean claims must use a boolean or the string 'true'/'false'",
      );
    }
    expect(property({ operator: "polarity", value: " Forbid " })).toStrictEqual(
      {
        title: "Max Login Retry Count forbidden",
        operator: "eq",
        value_type: "bool",
        value_bool: true,
        polarity: "forbid",
      },
    );
    expect(property({ operator: "polarity", value: "require" }).title).toBe(
      "Max Login Retry Count required",
    );
    expect(property({ operator: "polarity", value: true }).polarity).toBe(
      "require",
    );
    expect(property({ operator: "polarity", value: false }).polarity).toBe(
      "forbid",
    );
    for (const value of ["maybe", 1, ["re", "quire"]]) {
      expect(() =>
        property({ operator: "polarity", value: value as never }),
      ).toThrow(
        "Polarity claims must use a boolean or the string 'require'/'forbid'",
      );
    }
    expect(property({ operator: "matches", value: "^a+$" })).toStrictEqual({
      title: "Max Login Retry Count matches ^a+$",
      operator: "matches",
      value_type: "string",
      value_string: "^a+$",
    });
  });

  test("set values", () => {
    for (const [operator, label] of [
      ["includes", "includes"],
      ["subset_of", "within"],
      ["excludes", "excludes"],
      ["eq", "="],
    ] as const) {
      expect(property({ operator, value: ["b", "a", "b"] })).toStrictEqual({
        title: `Max Login Retry Count ${label} b, a, b`,
        operator,
        value_type: "set",
        value_set: ["a", "b"],
      });
    }
  });
});

describe("modelRequirementClaims and fact paths", () => {
  test("keeps the first write set per stable id", () => {
    const strict = { claim: claim(), statement: "first" };
    const observation = {
      claim: claim({ confidence: 0.1 }),
      statement: "observed",
    };
    const modeled = modelRequirementClaims([
      strict,
      { claim: claim(), statement: "second" },
      observation,
      { ...observation, statement: "again" },
    ]);
    expect(modeled.map((set) => set.isStrict)).toStrictEqual([true, false]);
    expect(modeled[0]?.isStrict && modeled[0].req.properties.title).toBe(
      "first",
    );
    expect(
      !modeled[1]?.isStrict && modeled[1]?.observationFact.properties.title,
    ).toBe("observed");
  });

  test("a fact lives at .kb/facts/<id>.md", () => {
    expect(factSourcePath("FACT-a")).toBe(".kb/facts/FACT-a.md");
  });

  test("a subject key with mixed separators titles every segment", () => {
    const set = buildStrictWriteSet({
      claim: claim({ subjectKey: "auth._x" }),
      statement: "S",
    });
    expect(set.isStrict && set.subjectFact.properties.title).toBe("Auth X");
  });
});
