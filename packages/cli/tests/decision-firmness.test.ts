import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FIRMNESS,
  FIRMNESS_TYPES,
  FIRMNESS_VALUES,
  MIN_WHY_CHANGED_WORDS,
  WHY_THIS_CHANGED_HEADING,
  carriesFirmness,
  effectiveFirmness,
  firmnessIsImplicit,
  firmnessRef,
  isFirmness,
  originKind,
  supersedeAcknowledgement,
  whyThisChangedWords,
} from "../src/decision-firmness.js";

describe("firmness vocabulary", () => {
  test("values, default, types and supersede wording are stable", () => {
    expect(FIRMNESS_VALUES).toEqual(["firm", "default", "exploratory"]);
    expect(DEFAULT_FIRMNESS).toBe("default");
    expect(FIRMNESS_TYPES).toEqual(["req", "adr"]);
    expect(WHY_THIS_CHANGED_HEADING).toBe("Why this changed");
    expect(MIN_WHY_CHANGED_WORDS).toBe(12);
    expect(supersedeAcknowledgement("ADR-2", "ADR-1")).toBe("ADR-2 -> ADR-1");
  });

  test("only the listed values and types are recognized", () => {
    for (const value of FIRMNESS_VALUES) expect(isFirmness(value)).toBe(true);
    for (const value of ["FIRM", "", " firm", undefined, null, 1])
      expect(isFirmness(value)).toBe(false);
    expect(carriesFirmness("req")).toBe(true);
    expect(carriesFirmness("adr")).toBe(true);
    for (const type of ["fact", "scenario", "REQ", "", undefined, null])
      expect(carriesFirmness(type)).toBe(false);
  });
});

describe("effective firmness", () => {
  test("an authored value wins over the origin", () => {
    expect(effectiveFirmness("req", "exploratory", { kind: "agent" })).toBe(
      "exploratory",
    );
    expect(effectiveFirmness("adr", "firm", { kind: "agent" })).toBe("firm");
  });

  test("without a value, only an agent origin reads as default", () => {
    expect(effectiveFirmness("adr", undefined, { kind: "agent" })).toBe(
      "default",
    );
    for (const origin of [
      undefined,
      null,
      "agent",
      { kind: "Agent" },
      { kind: 1 },
      {},
    ])
      expect(effectiveFirmness("req", null, origin)).toBe("firm");
  });

  test("types without firmness have none", () => {
    expect(
      effectiveFirmness("fact", "firm", { kind: "agent" }),
    ).toBeUndefined();
    expect(effectiveFirmness(undefined, undefined)).toBeUndefined();
  });

  test("firmness is implicit only on decision types without a value", () => {
    expect(firmnessIsImplicit("req", undefined)).toBe(true);
    expect(firmnessIsImplicit("adr", "bogus")).toBe(true);
    expect(firmnessIsImplicit("req", "firm")).toBe(false);
    expect(firmnessIsImplicit("fact", undefined)).toBe(false);
  });

  test("originKind reads a string kind from an object", () => {
    expect(originKind({ kind: "human", ref: "x" })).toBe("human");
    for (const origin of [undefined, null, "agent", 3, { kind: 3 }, {}])
      expect(originKind(origin)).toBeUndefined();
  });
});

describe("firmness reference", () => {
  test("origin.ref is trimmed and preferred over approval_ref", () => {
    expect(
      firmnessRef({
        type: "req",
        origin: { kind: "human", ref: "  PR#12 " },
        approval_ref: "TICKET-4",
      }),
    ).toBe("PR#12");
  });

  test("a blank or non-string origin.ref falls back to a requirement's approval_ref", () => {
    for (const origin of [undefined, null, "PR#1", { ref: "   " }, { ref: 7 }])
      expect(firmnessRef({ type: "req", origin, approval_ref: " T-4 " })).toBe(
        "T-4",
      );
  });

  test("approval_ref counts only on requirements and only when non-blank", () => {
    expect(firmnessRef({ type: "adr", approval_ref: "T-4" })).toBeUndefined();
    expect(firmnessRef({ type: "req", approval_ref: "  " })).toBeUndefined();
    expect(firmnessRef({ type: "req", approval_ref: 4 })).toBeUndefined();
    expect(firmnessRef({ type: "req" })).toBeUndefined();
  });
});

describe("why this changed", () => {
  test("counts only tokens that carry a letter or digit", () => {
    expect(
      whyThisChangedWords(
        "## Why this changed\n\nalpha   beta\n\n-- — . * 42 é\n",
      ),
    ).toBe(4);
  });

  test("the heading match ignores case, spacing and leading emphasis", () => {
    for (const heading of [
      "## WHY THIS CHANGED",
      "## Why  this\tchanged: evidence",
      "## Why this  changed",
      "## **Why this changed**",
      "## _`Why this changed`_",
      "# Why this changed?",
    ])
      expect(whyThisChangedWords(`${heading}\n\none two three\n`)).toBe(3);
  });

  test("other headings do not open the section", () => {
    for (const heading of [
      "## Reason why this changed",
      "## Why this changes",
      "## Why this changedness",
      "## Whythis changed",
    ])
      expect(whyThisChangedWords(`${heading}\n\none two three\n`)).toBe(0);
    expect(whyThisChangedWords("Why this changed\n\none two\n")).toBe(0);
  });

  test("the section ends at a heading of the same or a higher level", () => {
    expect(
      whyThisChangedWords(
        "intro words here\n\n### Why this changed\n\none\n\n#### Detail\n\ntwo three\n\n### Next\n\nnot counted\n",
      ),
    ).toBe(3);
    expect(
      whyThisChangedWords(
        "### Why this changed\n\none\n\n## Decision\n\nnot counted here\n",
      ),
    ).toBe(1);
  });

  test("a nested Why this changed heading stays inside the open section", () => {
    expect(
      whyThisChangedWords(
        "## Why this changed\n\na\n\n### Why this changed\n\nb\n\n### Other\n\nc\n\n## End\n\nskip\n",
      ),
    ).toBe(3);
  });

  test("a later Why this changed section counts too", () => {
    expect(
      whyThisChangedWords(
        "## Why this changed\n\none\n\n## Other\n\nskip me\n\n## Why this changed\n\ntwo three\n",
      ),
    ).toBe(3);
  });

  test("a section that ends can be followed by a new one at the closing heading", () => {
    expect(
      whyThisChangedWords(
        "### Why this changed\n\none\n\n## Why this changed\n\ntwo\n",
      ),
    ).toBe(2);
  });
});
