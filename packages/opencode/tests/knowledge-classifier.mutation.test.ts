import { describe, expect, test } from "bun:test";
import { classifyKnowledge } from "../src/knowledge-classifier";

const FILLER = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do";

const REASONING = {
  fact: "Contains strict domain fact cues (invariants, properties, limits, cardinalities) for the strict fact lane",
  req: 'Contains system behavior or obligation cues like "system must", "user can", or "shall"',
  adr: 'Contains decision or tradeoff cues like "we chose", "because", or "constraint"',
  scenario:
    'Contains behavior example cues like "given/when/then" or "user flow"',
  test: 'Contains verification cues like "verify", "assert", or "expected"',
} as const;

describe("classifyKnowledge length gate", () => {
  test("49 trimmed characters are too short, 50 are enough", () => {
    const fortyNine = `invariant ${"x".repeat(39)}`;
    expect(fortyNine.length).toBe(49);
    expect(classifyKnowledge(`   ${fortyNine}   `)).toBeNull();
    expect(classifyKnowledge(`${fortyNine}x`)?.type).toBe("fact");
  });

  test("long text without cues has no suggestion", () => {
    expect(classifyKnowledge(FILLER)).toBeNull();
  });
});

describe("classifyKnowledge confidence", () => {
  test.each([
    ["fact", ["invariant"]],
    ["fact", ["invariant", "cardinality"]],
    ["req", ["shall"]],
    ["req", ["shall", "capability"]],
    ["adr", ["rationale"]],
    ["adr", ["rationale", "tradeoff"]],
    ["scenario", ["user flow"]],
    ["scenario", ["user flow", "example interaction"]],
    ["test", ["assert"]],
    ["test", ["assert", "verify"]],
  ] as const)("%s with %p is medium", (type, cues) => {
    expect(classifyKnowledge(`${cues.join(" ")} ${FILLER}`)).toStrictEqual({
      type,
      confidence: "medium",
      reasoning: REASONING[type],
    });
  });

  test.each([
    ["fact", ["invariant", "cardinality", "never"]],
    ["req", ["shall", "capability", "permission"]],
    ["adr", ["rationale", "tradeoff", "we chose"]],
    ["scenario", ["user flow", "example interaction", "acceptance criteria"]],
    ["test", ["assert", "verify", "expected"]],
  ] as const)("%s with three cues is high", (type, cues) => {
    expect(classifyKnowledge(`${cues.join(" ")} ${FILLER}`)).toStrictEqual({
      type,
      confidence: "high",
      reasoning: REASONING[type],
    });
  });
});
