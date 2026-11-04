import { describe, expect, test } from "bun:test";

import { analyzePrologQueryPlanSafety } from "../../src/utils/prolog-query-plan-safety.js";

describe("analyzePrologQueryPlanSafety", () => {
  test("flags negation before a generator in the same clause", () => {
    const result = analyzePrologQueryPlanSafety(`
unsafe_rule(Id) :-
    \\+ kb_entity(Id, req, _),
    kb_relationship(specified_by, Id, ScenarioId),
    kb_entity(ScenarioId, scenario, _).
`);

    expect(result).toEqual([
      {
        predicate: "unsafe_rule",
        line: 3,
        description:
          "Negation appears before later generator calls in the same clause.",
        suggestion:
          "Move kb_entity/kb_relationship/member/findall generators before \\+/1 so variables are bound before negation.",
      },
    ]);
  });

  test("allows clauses that bind variables before negation", () => {
    const result = analyzePrologQueryPlanSafety(`
safe_rule(Id) :-
    kb_relationship(specified_by, Id, ScenarioId),
    kb_entity(ScenarioId, scenario, _),
    \\+ kb_entity(Id, req, _).
`);

    expect(result).toEqual([]);
  });
});

const violation = (predicate: string, line: number) => ({
  predicate,
  line,
  description:
    "Negation appears before later generator calls in the same clause.",
  suggestion:
    "Move kb_entity/kb_relationship/member/findall generators before \\+/1 so variables are bound before negation.",
});

describe("analyzePrologQueryPlanSafety clause scanning", () => {
  test("recognises every generator, with or without a space before (", () => {
    for (const generator of [
      "kb_entity(",
      "kb_relationship(",
      "member(",
      "memberchk(",
      "findall(",
      "setof(",
      "bagof(",
      "findall (",
    ]) {
      expect(
        analyzePrologQueryPlanSafety(`r(X) :-\n  \\+ q(X),\n  ${generator}X).`),
      ).toStrictEqual([violation("r", 2)]);
    }
    expect(
      analyzePrologQueryPlanSafety("r(X) :-\n  \\+ q(X),\n  my_member(X)."),
    ).toStrictEqual([]);
  });

  test("a negation on the first clause line counts", () => {
    expect(
      analyzePrologQueryPlanSafety("r(X) :- \\+q(X),\n  member(X, L)."),
    ).toStrictEqual([violation("r", 1)]);
  });

  test("a clause without negation is safe", () => {
    expect(
      analyzePrologQueryPlanSafety("r(X) :-\n  member(X, L),\n  kb_entity(X)."),
    ).toStrictEqual([]);
  });

  test("blank lines inside a clause keep their place in the line count", () => {
    expect(
      analyzePrologQueryPlanSafety("r(X) :-\n\n  \\+ q(X),\n  member(X, L)."),
    ).toStrictEqual([violation("r", 3)]);
  });

  test("whitespace-only lines between clauses are skipped", () => {
    expect(
      analyzePrologQueryPlanSafety(
        "   \nr(X) :-\n  \\+ q(X),\n  member(X, L).",
      ),
    ).toStrictEqual([violation("r", 3)]);
  });

  test("a clause ends at a dot followed by trailing whitespace", () => {
    expect(
      analyzePrologQueryPlanSafety(
        "a(X) :- q(X).  \nb(X) :-\n  \\+ q(X),\n  member(X, L).",
      ),
    ).toStrictEqual([violation("b", 3)]);
  });

  test("later clauses start fresh after an earlier one ends", () => {
    expect(
      analyzePrologQueryPlanSafety(
        "a(X) :- q(X).\nb(X) :-\n  \\+ q(X),\n  member(X, L).\r\nc(X) :-\r\n  \\+ q(X),\r\n  member(X, L).\r\n",
      ),
    ).toStrictEqual([violation("b", 3), violation("c", 6)]);
  });

  test("reads the predicate name only from the start of the head", () => {
    expect(
      analyzePrologQueryPlanSafety("Bad(X) :-\n  \\+ q(X),\n  member(X, L)."),
    ).toStrictEqual([violation("unknown", 2)]);
    expect(
      analyzePrologQueryPlanSafety(
        "  spaced_rule (X) :-\n  \\+ q(X),\n  member(X, L).",
      ),
    ).toStrictEqual([violation("spaced_rule", 2)]);
  });
});
