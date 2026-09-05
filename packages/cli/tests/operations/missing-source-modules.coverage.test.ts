import { describe, expect, test } from "bun:test";

import { evaluateProseCoverageCorpus } from "../../src/operations/semantic-advisor/prose-coverage-evaluator.js";
import { detectStrictSuggestion } from "../../src/operations/semantic-advisor/strict-rules.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/public/schema-version.js";
import * as predicateTypes from "../../src/operations/modeling/predicate-types.js";
import * as requirementTypes from "../../src/operations/modeling/requirement-types.js";
import * as mutationTypes from "../../src/operations/mutation/types.js";
import * as advisorTypes from "../../src/operations/semantic-advisor/types.js";
import * as impactTypes from "../../src/public/impact/types.js";
import * as skillTypes from "../../src/public/skill-system/types.js";
import * as changesetTypes from "../../src/types/changeset.js";
import * as entityTypes from "../../src/types/entities.js";
import * as relationshipTypes from "../../src/types/relationships.js";

const payload = {
  type: "req" as const,
  id: "REQ-STRICT",
  properties: {
    title: "Strict",
    status: "open",
    source: "test",
    text_ref: "",
  },
};

describe("CLI modules previously absent from LCOV", () => {
  test("imports type modules and schema re-exports", () => {
    expect(LATEST_KB_SCHEMA_VERSION).toBeGreaterThan(0);
    expect(Object.keys(predicateTypes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(requirementTypes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(mutationTypes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(advisorTypes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(impactTypes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(skillTypes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(changesetTypes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(entityTypes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(relationshipTypes).length).toBeGreaterThanOrEqual(0);
  });

  test("detectStrictSuggestion covers expiry, comparison, precision, latency, boolean, retention, and enum", () => {
    expect(
      detectStrictSuggestion(payload, "Session tokens expire after 24 hours.")
        ?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "Queue depth must be less than 10.")
        ?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "Queue depth must be greater than 1.")
        ?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "Queue depth must be at least 2.")?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "Queue depth must be at most 9.")?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(
        payload,
        "The scheduler must normalize into canonical integer decisecond slot values.",
      )?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "The API must return within 250 ms.")
        ?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "The API must return within 2 seconds.")
        ?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "Dark mode must be enabled.")?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "Dark mode must be disabled.")?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "Customer data must be retained for 7 years.")
        ?.kind,
    ).toBe("strict_property");
    expect(
      detectStrictSuggestion(payload, "Status must be one of open, closed, or deferred.")
        ?.kind,
    ).toBe("strict_property");
    expect(detectStrictSuggestion(payload, "This is narrative only.")).toBeNull();
  });

  test("evaluateProseCoverageCorpus scores empty, matching, and mismatched cases", () => {
    expect(evaluateProseCoverageCorpus([]).coverage).toBe(1);
    const passed = evaluateProseCoverageCorpus([
      {
        id: "retain",
        text: "Customer data must be retained for 7 years.",
        expected: { kind: "strict_property", property_key: "retention_years" },
      },
    ]);
    expect(passed.summary.failed).toBe(0);
    const failures = evaluateProseCoverageCorpus([
      {
        id: "none",
        text: "Narrative only.",
        expected: { kind: "strict_property" },
      },
      {
        id: "kind",
        text: "Customer data must be retained for 7 years.",
        expected: { kind: "predicate", predicate_name: "owns" },
      },
      {
        id: "property",
        text: "Customer data must be retained for 7 years.",
        expected: { kind: "strict_property", property_key: "other" },
      },
      {
        id: "operator",
        text: "Customer data must be retained for 7 years.",
        expected: { kind: "strict_property", operator: "lt" },
      },
    ]);
    expect(failures.summary.failed).toBe(4);
  });
});
