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
