import { describe, expect, test } from "bun:test";
import { slimAnsweredMatches } from "../src/public/operations/discovery-executors.js";
import { type SearchAnswer, answerQuotedIds } from "../src/search-answer.js";

const requirement = (
  id: string,
  statement: string | undefined,
  facts: { id: string; claim?: string }[] = [],
) => ({
  id,
  title: id,
  score: 1,
  via: "direct",
  ...(statement === undefined ? {} : { statement }),
  why: { recorded: false as const },
  facts: facts.map((fact) => ({ title: fact.id, ...fact })),
  scenarios: [],
  tests: [],
  adrs: [],
  verdict: { status: "none" as const, witnesses: [] },
  exceptions: [],
  unknowns: [],
});

describe("answerQuotedIds", () => {
  test("names requirements with a whole statement and facts with a claim", () => {
    const answer = {
      governing: [
        requirement("REQ-whole", "Exports must be CSV.", [
          { id: "FACT-claimed", claim: "export format eq csv" },
          { id: "FACT-bare" },
        ]),
        requirement("REQ-clipped", "Exports must be CSV and…"),
        requirement("REQ-silent", undefined),
      ],
      ungoverned: [
        { id: "FACT-loose", title: "t", type: "fact", rank: 2, claim: "a" },
        { id: "SCEN-loose", title: "t", type: "scenario", rank: 3 },
      ],
    } as unknown as SearchAnswer;
    expect([...answerQuotedIds(answer)].sort()).toEqual([
      "FACT-claimed",
      "FACT-loose",
      "REQ-whole",
    ]);
  });
});

describe("slimAnsweredMatches", () => {
  const match = (entity: Record<string, unknown>) => ({
    entity: { status: "open", tags: ["x"], ...entity },
    score: 0.5,
    reasons: ["title"],
    snippet: "text",
    evidence: { normalizedScore: 0.5 },
  });

  test("keeps only the identity, score and reasons of a quoted entity", () => {
    const quoted = match({ id: "REQ-a", type: "req", title: "A" });
    const other = match({ id: "REQ-b", type: "req", title: "B" });
    const untitled = match({ id: "FACT-c" });
    const unnamed = match({ id: 7 });
    const slim = slimAnsweredMatches(
      [quoted, other, untitled, unnamed],
      new Set(["REQ-a", "FACT-c"]),
    );
    expect(slim).toEqual([
      {
        entity: { id: "REQ-a", type: "req", title: "A" },
        score: 0.5,
        reasons: ["title"],
      },
      other,
      { entity: { id: "FACT-c" }, score: 0.5, reasons: ["title"] },
      unnamed,
    ] as never);
    expect(slim[1]).toBe(other);
  });

  test("returns the page as it is when the answer quotes nothing", () => {
    const page = [match({ id: "REQ-a" })];
    expect(slimAnsweredMatches(page, new Set())).toBe(page);
  });
});
