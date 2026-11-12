import { describe, expect, test } from "bun:test";
import { RESTATEMENT_JACCARD } from "../../../src/entity-body-context.js";
import {
  NEAR_RESTATEMENT_JACCARD,
  findRestatement,
  normalizeRestatementText,
} from "../../../src/operations/bootstrap/claim-restatement.js";

const req = (id: string, title: string, semanticText = "") => ({
  id,
  title,
  semanticText,
});

describe("normalizeRestatementText", () => {
  test("lowercases and keeps only letter and number tokens", () => {
    expect(
      normalizeRestatementText("  Users MUST, export -- 2 Reports!  "),
    ).toBe("users must export 2 reports");
    expect(normalizeRestatementText("Zażółć gęślą")).toBe("zażółć gęślą");
    expect(normalizeRestatementText("...")).toBe("");
  });
});

describe("findRestatement", () => {
  test("uses the entity-context restatement threshold", () => {
    expect(NEAR_RESTATEMENT_JACCARD).toBe(RESTATEMENT_JACCARD);
  });

  test("nothing restates without claims or requirements", () => {
    expect(
      findRestatement([], [req("REQ-a", "Users export reports")]),
    ).toBeNull();
    expect(
      findRestatement([undefined, "  ", "!!"], [req("REQ-a", "", "")]),
    ).toBeNull();
    expect(findRestatement(["Users export reports"], [])).toBeNull();
  });

  test("an exact title match ignores case, spacing and punctuation", () => {
    expect(
      findRestatement(
        [undefined, "users   export REPORTS."],
        [req("REQ-a", "Users export reports")],
      ),
    ).toStrictEqual({
      kind: "exact",
      requirementId: "REQ-a",
      field: "title",
      score: 1,
    });
  });

  test("matches the whole semantic text or any one sentence of it", () => {
    const requirement = req(
      "REQ-a",
      "Export",
      "Users export reports. Admins delete accounts!  Guests read docs?\nOwners pay\n\nAuditors watch",
    );
    for (const claim of [
      "Users export reports. Admins delete accounts!  Guests read docs?\nOwners pay\n\nAuditors watch",
      "Users export reports",
      "Admins delete accounts",
      "Guests read docs",
      "Owners pay",
      "Auditors watch",
    ]) {
      expect(findRestatement([claim], [requirement])).toStrictEqual({
        kind: "exact",
        requirementId: "REQ-a",
        field: "semantic_text",
        score: 1,
      });
    }
    expect(
      findRestatement(
        ["Users export"],
        [req("REQ-b", "x", "Users export.reports now")],
      ),
    ).toBeNull();
    expect(
      findRestatement(
        ["reports"],
        [req("REQ-b", "x", "Users export. reports")],
      ),
    ).toStrictEqual({
      kind: "exact",
      requirementId: "REQ-b",
      field: "semantic_text",
      score: 1,
    });
    expect(
      findRestatement(
        ["Users export"],
        [req("REQ-b", "x", "Users export reports.\tnow")],
      ),
    ).toBeNull();
  });

  test("an empty claim never equals an empty reference", () => {
    expect(findRestatement(["?"], [req("REQ-a", "?", ". ")])).toBeNull();
  });

  test("checks requirements in id order and returns the first exact match", () => {
    const requirements = [
      req("REQ-c", "Users export reports"),
      req("REQ-b", "Users export reports"),
      req("REQ-d", "x"),
    ];
    expect(
      findRestatement(["Users export reports"], requirements)?.requirementId,
    ).toBe("REQ-b");
    expect(requirements.map((r) => r.id)).toStrictEqual([
      "REQ-c",
      "REQ-b",
      "REQ-d",
    ]);
    expect(
      findRestatement(
        ["Users export reports"],
        [
          req("REQ-b", "Users export reports"),
          req("REQ-c", "Users export reports"),
        ],
      )?.requirementId,
    ).toBe("REQ-b");
  });

  test("keeps the first of two requirements with the same id", () => {
    const first = { ...req("REQ-a", "Users export reports"), modeled: true };
    const second = req("REQ-a", "x", "Users export reports");
    expect(
      findRestatement(["Users export reports"], [first, second])?.field,
    ).toBe("title");
    expect(
      findRestatement(["Users export reports"], [second, first])?.field,
    ).toBe("semantic_text");
  });

  test("flags the closest near restatement at or above the threshold", () => {
    // 4 of 5 shared tokens: exactly the threshold.
    expect(
      findRestatement(["a b c d"], [req("REQ-a", "a b c d e")]),
    ).toStrictEqual({
      kind: "near",
      requirementId: "REQ-a",
      field: "title",
      score: 0.8,
    });
    // 6 of 7: rounded to two decimals.
    expect(
      findRestatement(["a b c d e f"], [req("REQ-a", "x", "a b c d e f g")]),
    ).toStrictEqual({
      kind: "near",
      requirementId: "REQ-a",
      field: "semantic_text",
      score: 0.86,
    });
    // 3 of 4 is below the threshold.
    expect(findRestatement(["a b c"], [req("REQ-a", "a b c d")])).toBeNull();
  });

  test("a later closer pair replaces a near match; a tie keeps the first", () => {
    const close = req("REQ-b", "a b c d e f g h i");
    expect(
      findRestatement(
        ["a b c d e f g h"],
        [req("REQ-a", "a b c d e f g h i j"), close],
      ),
    ).toStrictEqual({
      kind: "near",
      requirementId: "REQ-b",
      field: "title",
      score: 0.89,
    });
    expect(
      findRestatement(
        ["a b c d e f g h"],
        [close, req("REQ-c", "a b c d e f g h i j")],
      )?.requirementId,
    ).toBe("REQ-b");
    expect(
      findRestatement(
        ["a b c d"],
        [req("REQ-a", "a b c d e"), req("REQ-b", "a b c d f")],
      )?.requirementId,
    ).toBe("REQ-a");
  });

  test("an exact match wins over an earlier near match", () => {
    expect(
      findRestatement(
        ["a b c d"],
        [req("REQ-a", "a b c d e"), req("REQ-b", "A B C D")],
      ),
    ).toStrictEqual({
      kind: "exact",
      requirementId: "REQ-b",
      field: "title",
      score: 1,
    });
  });
});
