import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { observationPlan } from "../../../src/operations/semantic-advisor/observation-plan.js";

const short = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 12);

describe("observationPlan", () => {
  test("builds one review observation fact with quoted multi-line prose", () => {
    const payload = {
      id: " REQ-x ",
      properties: { text_ref: " Line one\nline two ", source: "docs/a.md" },
    };
    expect(
      observationPlan(payload, "Ambiguous claim", ["review:ambiguity"]),
    ).toStrictEqual([
      {
        type: "fact",
        id: `FACT-OBS-${short("REQ-x.Ambiguous claim.Line one\nline two")}`,
        properties: {
          title: "Ambiguous claim",
          status: "active",
          source: "docs/a.md",
          fact_kind: "observation",
          text_ref: "Line one\nline two",
          tags: ["review:ambiguity"],
        },
        document: {
          body: "Ambiguous claim. The semantic advisor suggested this review observation because the prose below is not safely grounded by a typed fact; it stays open until a reviewer models, rewords or dismisses the claim.\n\n> Line one\n> line two",
        },
        relationships: [],
      },
    ]);
  });

  test("quotes every line break, not only the first", () => {
    const [step] = observationPlan(
      { properties: { title: "a\nb\nc" } },
      "T",
      [],
    );
    expect(
      (step?.document as { body: string }).body.endsWith("> a\n> b\n> c"),
    ).toBe(true);
  });
});
