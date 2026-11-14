import { describe, expect, test } from "bun:test";
import {
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
} from "../../../src/operations/modeling/requirement-applyplan.js";
import type { StrictWriteSet } from "../../../src/public/check-types.js";

const fact = (type: string, id: string) => ({
  type,
  id,
  properties: { title: `${id} title` },
});

const strict = {
  isStrict: true,
  subjectFact: fact("fact", "FACT-subject"),
  propertyFact: fact("fact", "FACT-property"),
  req: fact("req", "REQ-1"),
  relationships: [
    { type: "constrains", from: "REQ-1", to: "FACT-subject", extra: 1 },
    { type: "requires_property", from: "REQ-1", to: "FACT-property" },
  ],
} as unknown as StrictWriteSet;

const observation = {
  isStrict: false,
  observationFact: fact("fact", "FACT-obs"),
} as unknown as StrictWriteSet;

describe("strictWriteSetToApplyPlan", () => {
  test("orders subject, property and requirement rows", () => {
    expect(strictWriteSetToApplyPlan(strict)).toStrictEqual([
      {
        type: "fact",
        id: "FACT-subject",
        properties: { title: "FACT-subject title" },
        relationships: [],
      },
      {
        type: "fact",
        id: "FACT-property",
        properties: { title: "FACT-property title" },
        relationships: [],
      },
      {
        type: "req",
        id: "REQ-1",
        properties: { title: "REQ-1 title" },
        relationships: [
          { type: "constrains", from: "REQ-1", to: "FACT-subject" },
          { type: "requires_property", from: "REQ-1", to: "FACT-property" },
        ],
      },
    ]);
  });

  test("carries the subject fact's document body", () => {
    const withBody = {
      ...strict,
      subjectFact: { ...fact("fact", "FACT-subject"), body: "Subject body" },
    } as unknown as StrictWriteSet;
    expect(strictWriteSetToApplyPlan(withBody)[0]).toStrictEqual({
      type: "fact",
      id: "FACT-subject",
      properties: { title: "FACT-subject title" },
      relationships: [],
      document: { body: "Subject body" },
    });
  });

  test("emits one observation row for a non-strict write set", () => {
    expect(strictWriteSetToApplyPlan(observation)).toStrictEqual([
      {
        type: "fact",
        id: "FACT-obs",
        properties: { title: "FACT-obs title" },
        relationships: [],
      },
    ]);
  });
});

describe("writeSetPrimaryEntityId", () => {
  test("is the requirement for strict sets and the observation otherwise", () => {
    expect(writeSetPrimaryEntityId(strict)).toBe("REQ-1");
    expect(writeSetPrimaryEntityId(observation)).toBe("FACT-obs");
  });
});
