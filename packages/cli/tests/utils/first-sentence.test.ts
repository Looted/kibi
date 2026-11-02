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
    expect(requirement?.properties.title).toBe(
      "The greet function must never call console.log",
    );
  });
});
