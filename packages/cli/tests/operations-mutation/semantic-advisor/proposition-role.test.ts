import { describe, expect, test } from "bun:test";
import { semanticClaimKey } from "../../../src/operations/semantic-advisor/clauses.js";
import {
  advisorPropositionRole,
  isDefinitionShape,
  legacyPropositionRoles,
  propositionRole,
} from "../../../src/operations/semantic-advisor/proposition-role.js";

describe("isDefinitionShape", () => {
  test.each([
    ["A session means one signed-in browser tab.", true],
    ["A session is defined as one tab.", true],
    ["Churn refers to cancelled plans.", true],
    ["This flow is called onboarding.", true],
    ["A session MEANS one tab.", true],
    ["A session must mean one tab.", false],
    ["Nothing defines anything here.", false],
    ["means nothing", false],
    ["   means nothing", false],
    ["If set, the flag means dark mode.", false],
    ["  when set, the flag means dark mode.", false],
    ["Whenever set, the flag means dark mode.", false],
    ["Provided that it is set, the flag means x.", false],
    ["Only if set, the flag means x.", false],
    ["Iffy flags means trouble.", true],
    ["Every note that refers to the clip is kept.", false],
    ["Every note which refers to the clip is kept.", false],
    ["Every person who is called Bob is here.", false],
    ["Every note that  refers to the clip is kept.", false],
    ["Every notethat refers to the clip.", true],
    ["Every thatch refers to roofs.", true],
    ["The meanstack is a thing.", false],
    ["A session means a user must sign in.", false],
    ["The flag set if needed means dark mode.", true],
    ["The flag womeans x.", false],
  ])("%p -> %p", (statement, expected) => {
    expect(isDefinitionShape(statement)).toBe(expected);
  });
});

describe("legacyPropositionRoles", () => {
  test("any definition verb was recorded as a definition", () => {
    expect(legacyPropositionRoles("Every note that refers to x")).toStrictEqual(
      ["definition"],
    );
    expect(legacyPropositionRoles("It IS CALLED x")).toStrictEqual([
      "definition",
    ]);
    expect(legacyPropositionRoles("Plain text")).toStrictEqual([]);
  });
});

describe("propositionRole", () => {
  test.each([
    // examples
    ["For example, export a CSV.", true, "example"],
    ["  for example the user must export.", true, "example"],
    ["e.g. a CSV export", true, "example"],
    ["Example: a CSV export", true, "example"],
    ["Example : a CSV export", true, "example"],
    ["Illustrative: a CSV export", true, "example"],
    ["Illustrative example: a CSV export", true, "example"],
    ["Exports such as CSV are common.", false, "example"],
    ["Exports, for example CSV, are common.", false, "example"],
    ["Exports e.g.CSV are common.", false, "example"],
    ["Exports e.g. CSV are common.", false, "descriptive"],
    ["This is illustrative only.", false, "example"],
    ["Users must export formats such as CSV.", true, "normative"],
    ["Exports such as CSV are common.", true, "example"],
    ["Examples matter.", false, "descriptive"],
    ["The exampled text.", false, "descriptive"],
    ["e.gx.", false, "descriptive"],
    // rationale
    ["Rationale: exports help audits.", true, "rationale"],
    ["  rationale : exports help audits.", true, "rationale"],
    ["Exports exist because audits need them.", false, "rationale"],
    ["Exports exist so that audits work.", false, "rationale"],
    ["Exports exist in order to audit.", false, "rationale"],
    ["Exports exist; the rationale is audits.", false, "rationale"],
    ["Exports exist, therefore audits work.", false, "rationale"],
    ["Users must export because audits need them.", true, "normative"],
    ["Exports existbecause audits.", false, "descriptive"],
    ["The rationale-free note.", false, "rationale"],
    ["The rationales list.", false, "descriptive"],
    ["Therationale list.", false, "descriptive"],
    // subjective
    ["The page should feel welcoming", true, "subjective"],
    ["The page should feel comfortable", true, "subjective"],
    ["The page should feel energetic", true, "subjective"],
    ["The page should feel welcoming and comfortable", true, "subjective"],
    [
      "The page should feel welcoming and comfortable and energetic",
      true,
      "subjective",
    ],
    ["The page should look complete", true, "subjective"],
    ["The page should seem complete", true, "subjective"],
    ["The page SHOULD   FEEL   WELCOMING", true, "subjective"],
    ["The page should feel welcoming to new users", true, "subjective"],
    ["The page should feel welcoming for new users", true, "subjective"],
    ["The page should feel welcoming to new users, always", true, "normative"],
    ["The page should feel welcoming to new and old users", true, "normative"],
    ["The page should feel welcoming or else", true, "normative"],
    ["The page should feel welcoming within 2 seconds", true, "normative"],
    ["The page should feel welcoming at least once", true, "normative"],
    ["The page should feel welcoming to at most users", true, "normative"],
    ["The page should feel welcoming to exactly users", true, "normative"],
    ["The page should feel welcoming within reason", true, "normative"],
    ["The page should feel welcoming to no more than users", true, "normative"],
    ["The page should feel welcoming and must load", true, "normative"],
    ["The page should feel welcoming; it must load", true, "normative"],
    ["The page should feel warm", true, "normative"],
    ["The page should feel welcomingly", true, "normative"],
    ["The page should feel welcoming, then", true, "normative"],
    ["The page should feel welcoming.", true, "normative"],
    ["The page feels comfortable.", false, "subjective"],
    ["The page looks complete.", false, "subjective"],
    ["The page seems complete.", false, "subjective"],
    ["This is subjective.", false, "subjective"],
    ["Users prefer dark mode.", false, "subjective"],
    ["Users must prefer dark mode.", true, "normative"],
    ["The prefers list.", false, "descriptive"],
    // definitions, conditions, exceptions
    ["A session means one browser tab.", false, "definition"],
    ["If the user is signed in, the export starts.", true, "condition"],
    ["When the user signs in, show the export.", false, "condition"],
    ["Whenever x, y.", false, "condition"],
    ["Provided that x, y.", false, "condition"],
    ["Only if x, y.", false, "condition"],
    ["  if x, y.", false, "condition"],
    ["Exports run unless paused.", false, "exception"],
    ["Exports run except on Sundays.", false, "exception"],
    ["Admins are exempt.", false, "exception"],
    ["Exports run apart from Sundays.", false, "exception"],
    ["Exports run exceptionally.", false, "descriptive"],
    ["Users must export reports.", true, "normative"],
    ["Users export reports.", false, "descriptive"],
    ["Exports run if paused", false, "descriptive"],
    ["The page should feel welcoming  and comfortable", true, "subjective"],
    ["The page should feel welcoming and  comfortable", true, "subjective"],
    ["The page should look  complete", true, "subjective"],
    ["The page should feel welcoming really to users", true, "normative"],
    ["The page should feel welcoming to  users", true, "subjective"],
    ["Users may should feel welcoming to only", true, "normative"],
    ["Illustrative: users must export", true, "example"],
    ["Illustrative example: users must export", true, "example"],
    ["Users must export, rationale: audits", true, "normative"],
  ])("%p (normative %p) -> %p", (statement, normative, expected) => {
    expect(propositionRole(statement, normative) as string).toBe(expected);
  });

  test("explanatory words only exempt clauses without an asserted obligation", () => {
    expect(propositionRole("Users export because audits need it.", true)).toBe(
      "rationale",
    );
    expect(propositionRole("Exports such as CSV help.", true)).toBe("example");
    expect(propositionRole("Users feel comfortable.", true)).toBe("subjective");
  });
});

describe("advisorPropositionRole", () => {
  const text =
    "Users must export reports. Exports exist because audits need them.";
  test("returns the role of the clause with that claim key", () => {
    expect(
      advisorPropositionRole(
        text,
        semanticClaimKey("Users must export reports"),
      ),
    ).toBe("normative");
    expect(
      advisorPropositionRole(
        text,
        semanticClaimKey("Exports exist because audits need them"),
      ),
    ).toBe("rationale");
    expect(advisorPropositionRole(text, "CLAIM-NONE")).toBeNull();
  });

  test("uses supplied clauses when given", () => {
    expect(
      advisorPropositionRole(text, semanticClaimKey("Reports are nice"), [
        "Reports are nice",
      ]),
    ).toBe("descriptive");
    expect(
      advisorPropositionRole(
        text,
        semanticClaimKey("Users must export reports"),
        ["Other"],
      ),
    ).toBeNull();
  });
});
