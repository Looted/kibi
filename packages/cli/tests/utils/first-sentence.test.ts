import { describe, expect, test } from "bun:test";
import { executeSemanticAdvisor } from "../../src/public/operations/specs/semantic.js";
import { firstSentence } from "../../src/utils/first-sentence.js";

// implements REQ-mcp-semantic-advisor-preflight

describe("firstSentence", () => {
  test("a dot inside a path, dotted name or version does not end the sentence", () => {
    expect(
      firstSentence("The matcher in src/match.c must never call malloc"),
    ).toBe("The matcher in src/match.c must never call malloc");
    expect(
      firstSentence("The greet function must never call console.log."),
    ).toBe("The greet function must never call console.log");
    expect(firstSentence("The app must never call exec.Command")).toBe(
      "The app must never call exec.Command",
    );
    expect(
      firstSentence("Clients must send API v1.2 headers. Old ones fail."),
    ).toBe("Clients must send API v1.2 headers");
  });

  test("a sentence ends at a dot before whitespace and an uppercase letter", () => {
    expect(firstSentence("Totals round half up. Cents are kept.")).toBe(
      "Totals round half up",
    );
    expect(firstSentence("Is the cart empty? Then show a hint.")).toBe(
      "Is the cart empty?",
    );
    expect(firstSentence("Exports must stop. ")).toBe("Exports must stop");
  });

  test("a dot before lowercase text, an abbreviation or inside backticks does not end it", () => {
    expect(
      firstSentence("Use a tool, e.g. Prettier, to format. Then commit."),
    ).toBe("Use a tool, e.g. Prettier, to format");
    expect(firstSentence("Write the file. then exit")).toBe(
      "Write the file. then exit",
    );
    expect(
      firstSentence("The CLI must print `done. Next` on exit. Nothing else."),
    ).toBe("The CLI must print `done. Next` on exit");
  });
});

describe("requirement titles from the semantic advisor", () => {
  test("keep a dotted callee whole in the suggested requirement title", async () => {
    const result = await executeSemanticAdvisor({
      id: "REQ-GREET",
      text: "The greet function must never call console.log.",
    });
    const requirement = result.structuredContent.receipt.suggestions
      .flatMap((suggestion) => suggestion.applyPlan ?? [])
      .find((step) => step.type === "req");
    const properties = requirement?.properties as { title?: unknown };
    expect(properties?.title).toBe(
      "The greet function must never call console.log",
    );
  });
});

describe("firstSentence boundaries", () => {
  test("trims surrounding whitespace", () => {
    expect(firstSentence("  Hello world  ")).toBe("Hello world");
  });

  test("ends at ? and ! and keeps that mark", () => {
    expect(firstSentence("Is it safe? Yes it is.")).toBe("Is it safe?");
    expect(firstSentence("Stop! Go now.")).toBe("Stop!");
  });

  test("a sentence end needs whitespace then an uppercase letter", () => {
    expect(firstSentence("One.  Two")).toBe("One");
    expect(firstSentence('One. "Two" said')).toBe("One");
    expect(firstSentence("One. two")).toBe("One. two");
    expect(firstSentence("One.Two")).toBe("One.Two");
  });

  test("drops every closing dot and the space before it", () => {
    expect(firstSentence("Wait... Next one")).toBe("Wait");
    expect(firstSentence("Spaced . Next")).toBe("Spaced");
  });

  test("an abbreviation at the very start does not end the sentence", () => {
    expect(firstSentence("etc. Then more")).toBe("etc. Then more");
    expect(firstSentence("Use (e.g. Foo) here")).toBe("Use (e.g. Foo) here");
    expect(firstSentence("Tetc. Then")).toBe("Tetc");
  });

  test("dots inside backticks are ignored until the quote closes", () => {
    expect(firstSentence("Call `a. B` now. Then")).toBe("Call `a. B` now");
  });
});
