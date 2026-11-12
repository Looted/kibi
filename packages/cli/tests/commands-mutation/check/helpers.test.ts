import { describe, expect, test } from "bun:test";
import {
  checkDeprecatedAdrs,
  checkDomainContradictions,
  checkMustPriorityCoverage,
  checkNoCycles,
  checkNoDanglingRefs,
  checkRequiredFields,
  checkStrictFactShape,
  checkStrictReadiness,
  checkStrictReqFactPairing,
  findMustPriorityReqs,
  getAllEntityIds,
} from "../../../src/commands/check.js";
import type { PrologProcess } from "../../../src/prolog.js";

type Answer = { success: boolean; bindings: Record<string, string> };
const no: Answer = { success: false, bindings: {} };
const yes = (bindings: Record<string, string> = {}): Answer => ({
  success: true,
  bindings,
});

/** A Prolog stand-in answering each goal from `answer`, recording goals. */
function fake(answer: (goal: string) => Answer | undefined) {
  const goals: string[] = [];
  const prolog = {
    query: async (goal: string) => {
      goals.push(goal);
      return answer(goal) ?? no;
    },
  } as unknown as PrologProcess;
  return { prolog, goals };
}

describe("entity id lists", () => {
  test("ids are read from the findall list and unquoted", async () => {
    const { prolog, goals } = fake(() =>
      yes({ Ids: "['REQ-a', 'REQ-b' ,TEST-c]" }),
    );
    expect(await getAllEntityIds(prolog)).toEqual(["REQ-a", "REQ-b", "TEST-c"]);
    expect(await getAllEntityIds(prolog, "req")).toEqual([
      "REQ-a",
      "REQ-b",
      "TEST-c",
    ]);
    expect(goals).toEqual([
      "findall(Id, (kb_entity(Id, Type, _)), Ids)",
      "findall(Id, (kb_entity(Id, Type, _), Type = req), Ids)",
    ]);
  });

  test.each([
    [no],
    [yes()],
    [yes({ Ids: "" })],
    [yes({ Ids: "[]" })],
    [yes({ Ids: "[  ]" })],
    [yes({ Ids: "no list" })],
  ])("answer %p has no ids", async (answer) => {
    const { prolog } = fake(() => answer);
    expect(await getAllEntityIds(prolog)).toEqual([]);
    expect(await findMustPriorityReqs(prolog)).toEqual([]);
  });

  test("must-priority requirements are queried by priority", async () => {
    const { prolog, goals } = fake(() => yes({ Ids: "['REQ-m']" }));
    expect(await findMustPriorityReqs(prolog)).toEqual(["REQ-m"]);
    expect(goals[0]).toBe(
      `findall(Id, (kb_entity(Id, req, Props), memberchk(priority=P, Props), (P = ^^("must", _) ; P = "must" ; P = 'must' ; (atom(P), atom_string(P, PS), sub_string(PS, _, 4, 0, "must")))), Ids)`,
    );
  });

  test("quoted atoms are read whole", async () => {
    const { prolog } = fake(() => yes({ Ids: "[a, 'b, c', 'd']" }));
    expect(await getAllEntityIds(prolog)).toEqual(["a", "b, c", "d"]);
  });
});

describe("bound lists", () => {
  test("a failed answer's ids are ignored", async () => {
    const { prolog } = fake(() => ({
      success: false,
      bindings: { Ids: "['REQ-a']" },
    }));
    expect(await getAllEntityIds(prolog)).toEqual([]);
  });

  test("source paths are read from the Props binding only", async () => {
    const sources = {
      "REQ-s": 'source = ^^("docs/spaced.md", t)',
      "REQ-c": 'source=^("docs/caret.md")',
    } as Record<string, string>;
    const { prolog } = fake((goal) => {
      if (goal.startsWith("findall"))
        return yes({ Ids: "['REQ-s','REQ-c','REQ-f','REQ-n']" });
      const id = /kb_entity\('([^']+)', req, Props\)/.exec(goal)?.[1];
      if (id === "REQ-f")
        return { success: false, bindings: { Props: 'source=^^("f.md")' } };
      if (id === "REQ-n") return yes();
      if (id !== undefined) return yes({ Props: sources[id] as string });
      return undefined;
    });
    const sourceOf = Object.fromEntries(
      (await checkMustPriorityCoverage(prolog)).map((v) => [
        v.entityId,
        v.source,
      ]),
    );
    expect(sourceOf).toEqual({
      "REQ-s": "docs/spaced.md",
      "REQ-c": "docs/caret.md",
      "REQ-f": "",
      "REQ-n": "",
    });
  });
});

describe("must-priority coverage", () => {
  const SOURCE = 'source=^^("docs/req.md", xsd:string)';

  function kb(options: {
    scenario?: boolean;
    test?: boolean;
    props?: string;
    entity?: boolean;
  }) {
    return fake((goal) => {
      if (goal.startsWith("findall(Id, (kb_entity(Id, req"))
        return yes({ Ids: "['REQ-m']" });
      if (goal === "kb_entity('REQ-m', req, Props)")
        return options.entity === false
          ? no
          : yes(options.props === undefined ? {} : { Props: options.props });
      if (goal === "kb_relationship(specified_by, 'REQ-m', ScenarioId)")
        return options.scenario ? yes() : no;
      if (goal === "kb_relationship(validates, TestId, 'REQ-m')")
        return options.test ? yes() : no;
      return undefined;
    });
  }

  test("a covered requirement passes", async () => {
    const { prolog } = kb({ scenario: true, test: true, props: SOURCE });
    expect(await checkMustPriorityCoverage(prolog)).toEqual([]);
  });

  test.each([
    [
      { test: true },
      "scenario",
      "Create scenario that covers this requirement",
    ],
    [{ scenario: true }, "test", "Create test that covers this requirement"],
    [
      {},
      "scenario and test",
      "Create scenario that covers this requirement; Create test that covers this requirement",
    ],
  ])("missing %p reports %s", async (options, missing, suggestion) => {
    const { prolog } = kb({ ...options, props: SOURCE });
    expect(await checkMustPriorityCoverage(prolog)).toEqual([
      {
        rule: "must-priority-coverage",
        entityId: "REQ-m",
        description: `Must-priority requirement lacks ${missing} coverage`,
        source: "docs/req.md",
        suggestion,
      },
    ]);
  });

  test.each([
    [{ entity: false }],
    [{}],
    [{ props: "title=x" }],
    [{ props: 'source=("")' }],
  ])("entity %p has an empty source", async (options) => {
    const { prolog } = kb(options);
    const [violation] = await checkMustPriorityCoverage(prolog);
    expect(violation?.source).toBe("");
  });

  test("a plain quoted source is read too", async () => {
    const { prolog } = kb({ props: 'source = ^("a.md")' });
    const [violation] = await checkMustPriorityCoverage(prolog);
    expect(violation?.source).toBe("a.md");
  });
});

describe("dangling references", () => {
  test("rows that are not pairs are skipped", async () => {
    const { prolog } = fake((goal) => {
      if (goal.startsWith("findall(Id")) return yes({ Ids: "[REQ-1]" });
      if (goal.includes("kb_relationship(depends_on"))
        return yes({ Rels: "[[REQ-1,MISSING],not-a-pair,[REQ-1, 'REQ-1']]" });
      return undefined;
    });
    expect((await checkNoDanglingRefs(prolog)).map((v) => v.entityId)).toEqual([
      "MISSING",
    ]);
  });

  const TYPES = [
    "depends_on",
    "verified_by",
    "validates",
    "specified_by",
    "constrains",
    "requires_property",
    "supersedes",
    "restates",
    "assumes",
    "exempts",
    "relates_to",
  ];

  test("every relationship type is scanned", async () => {
    const { prolog, goals } = fake(() => undefined);
    expect(await checkNoDanglingRefs(prolog)).toEqual([]);
    expect(goals.slice(1)).toEqual(
      TYPES.map(
        (type) =>
          `findall([From,To], kb_relationship(${type}, From, To), Rels)`,
      ),
    );
  });

  test("relationships to or from unknown entities are reported", async () => {
    const { prolog } = fake((goal) => {
      if (goal.startsWith("findall(Id,")) return yes({ Ids: "['A','B']" });
      if (goal.includes("kb_relationship(depends_on"))
        return yes({ Rels: "[['A','B'],['A', 'X'],[ 'Y' ,'B']]" });
      if (goal.includes("kb_relationship(relates_to"))
        return yes({ Rels: "[['Z','W']]" });
      if (goal.includes("kb_relationship(validates"))
        return yes({ Rels: "[]" });
      if (goal.includes("kb_relationship(supersedes")) return yes({});
      return undefined;
    });
    const dangling = (id: string) => ({
      rule: "no-dangling-refs",
      entityId: id,
      description: `Relationship references non-existent entity: ${id}`,
      suggestion: "Remove relationship or create missing entity",
    });
    expect(await checkNoDanglingRefs(prolog)).toEqual([
      dangling("X"),
      dangling("Y"),
      dangling("Z"),
      dangling("W"),
    ]);
  });
});

describe("dependency cycles", () => {
  function graph(deps: string | undefined, props: Record<string, string> = {}) {
    return fake((goal) => {
      if (goal.startsWith("findall([From,To], kb_relationship(depends_on"))
        return deps === undefined ? no : yes({ Deps: deps });
      const id = /kb_entity\('([^']+)', _, Props\)/.exec(goal)?.[1];
      if (id !== undefined)
        return id in props ? yes({ Props: props[id] as string }) : no;
      return undefined;
    });
  }

  test.each([[undefined], [""], ["[]"], ["none"], ["[['A','B'],['B','C']]"]])(
    "deps %p have no cycle",
    async (deps) => {
      const { prolog } = graph(deps);
      expect(await checkNoCycles(prolog)).toEqual([]);
    },
  );

  test("no Deps binding means no cycle", async () => {
    const { prolog } = fake((goal) =>
      goal.includes("depends_on") ? yes() : undefined,
    );
    expect(await checkNoCycles(prolog)).toEqual([]);
  });

  test("the first cycle is reported with source names", async () => {
    const { prolog, goals } = graph(
      "[['A','B'],['B','C'],['C','A'],['D','E'],['E','D']]",
      {
        A: 'source=^^("docs/a-file.md", t)',
        B: "title=x",
        C: 'source=("")',
      },
    );
    expect(await checkNoCycles(prolog)).toEqual([
      {
        rule: "no-cycles",
        entityId: "A",
        description: "Circular dependency detected: a-file → B → C → a-file",
        suggestion:
          "Break cycle by removing one of the depends_on relationships",
      },
    ]);
    expect(goals.filter((goal) => goal.startsWith("kb_entity"))).toEqual([
      "kb_entity('A', _, Props)",
      "kb_entity('B', _, Props)",
      "kb_entity('C', _, Props)",
      "kb_entity('A', _, Props)",
    ]);
  });

  test("a cycle behind an acyclic branch is found from its start", async () => {
    const { prolog } = graph("[['A','B'],['A','C'],['C','D'],['D','C']]");
    const [violation] = await checkNoCycles(prolog);
    expect(violation?.entityId).toBe("A");
    expect(violation?.description).toBe(
      "Circular dependency detected: A → C → D → C",
    );
  });

  test("a shared, finished dependency is not a cycle", async () => {
    const { prolog } = graph("[['A','B'],['C','B'],['B','D']]");
    expect(await checkNoCycles(prolog)).toEqual([]);
  });

  test("a cycle through the first of several edges is found", async () => {
    const { prolog } = graph("[['A','B'],['B','A'],['A','C']]");
    const [violation] = await checkNoCycles(prolog);
    expect(violation?.description).toBe(
      "Circular dependency detected: A → B → A",
    );
  });

  test("a failed answer's dependencies are ignored", async () => {
    const { prolog } = fake((goal) =>
      goal.includes("depends_on")
        ? { success: false, bindings: { Deps: "[['A','A']]" } }
        : undefined,
    );
    expect(await checkNoCycles(prolog)).toEqual([]);
  });

  test("a self dependency is a cycle", async () => {
    const { prolog } = graph("[[ 'A' , 'A' ]]");
    const [violation] = await checkNoCycles(prolog);
    expect(violation?.description).toBe("Circular dependency detected: A → A");
  });
});

describe("required fields", () => {
  test("missing fields are reported per entity", async () => {
    const { prolog, goals } = fake((goal) => {
      if (goal === "kb_entity('A', Type, Props)")
        return yes({
          Props:
            'id=a, title = "t", status=open, created_at=x, updated_at=y, source=z',
        });
      if (goal === "kb_entity('B', Type, Props)")
        return yes({ Props: "id=b, title=t" });
      if (goal === "kb_entity('C', Type, Props)") return yes({});
      return undefined;
    });
    const missing = (field: string) => ({
      rule: "required-fields",
      entityId: "B",
      description: `Missing required field: ${field}`,
      suggestion: `Add ${field} to entity definition`,
    });
    expect(await checkRequiredFields(prolog, ["A", "B", "C", "D"])).toEqual([
      missing("status"),
      missing("created_at"),
      missing("updated_at"),
      missing("source"),
    ]);
    expect(goals).toHaveLength(4);
  });
});

describe("deprecated ADRs", () => {
  test.each([[undefined], [""], ["[]"], ["none"]])(
    "ids %p report nothing",
    async (ids) => {
      const { prolog } = fake((goal) =>
        goal.startsWith("setof")
          ? ids === undefined
            ? yes()
            : yes({ Ids: ids })
          : undefined,
      );
      expect(await checkDeprecatedAdrs(prolog)).toEqual([]);
    },
  );

  test("a failed query reports nothing", async () => {
    const { prolog, goals } = fake(() => undefined);
    expect(await checkDeprecatedAdrs(prolog)).toEqual([]);
    expect(goals).toEqual(["setof(Id, deprecated_no_successor(Id), Ids)"]);
  });

  test("each ADR without a successor is reported with its source", async () => {
    const { prolog } = fake((goal) => {
      if (goal.startsWith("setof"))
        return yes({ Ids: "['ADR-1', ADR-2,ADR-3]" });
      if (goal === "kb_entity('ADR-1', adr, Props)")
        return yes({ Props: 'source=^^("docs/adr1.md", t)' });
      if (goal === "kb_entity('ADR-2', adr, Props)")
        return yes({ Props: "title=x" });
      return undefined;
    });
    const adr = (id: string, source: string) => ({
      rule: "deprecated-adr-no-successor",
      entityId: id,
      description:
        "Superseded/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
      suggestion: `Create a new ADR and add: links: [{type: supersedes, target: ${id}}]`,
      source,
    });
    expect(await checkDeprecatedAdrs(prolog)).toEqual([
      adr("ADR-1", "docs/adr1.md"),
      adr("ADR-2", ""),
      adr("ADR-3", ""),
    ]);
  });
});

describe("domain contradictions", () => {
  test("a failed or empty query reports nothing", async () => {
    for (const answer of [no, yes()]) {
      const { prolog, goals } = fake(() => answer);
      expect(await checkDomainContradictions(prolog)).toEqual([]);
      expect(goals).toEqual([
        "setof([A,B,Reason], contradicting_reqs(A, B, Reason), Rows)",
      ]);
    }
  });

  test("each contradicting pair is reported", async () => {
    const { prolog } = fake(() =>
      yes({ Rows: "[['REQ-a','REQ-b',\"same key\"]]" }),
    );
    const violations = await checkDomainContradictions(prolog);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: "domain-contradictions",
      suggestion:
        "Supersede one requirement or align both to the same required property",
    });
    expect(violations[0]?.entityId).toBe("REQ-a/REQ-b");
    expect(violations[0]?.description).toEndWith(
      " [strict-readiness: contradiction-ready]",
    );
  });
});

describe("strict violation rows", () => {
  const ROW = 'violation(rule_x, \'REQ-a\', "Desc", "Sugg", "src.md")';
  test.each([
    [checkStrictFactShape, "strict_fact_shape_violation"],
    [checkStrictReqFactPairing, "strict_req_fact_pairing_violation"],
    [checkStrictReadiness, "strict_readiness_violation"],
  ] as const)("%p reads its rows", async (check, predicate) => {
    for (const answer of [no, yes(), yes({ Violations: "[]" })]) {
      const { prolog } = fake(() => answer);
      expect(await check(prolog)).toEqual([]);
    }
    const failed = fake(() => ({
      success: false,
      bindings: { Violations: `[${ROW}]` },
    }));
    expect(await check(failed.prolog)).toEqual([]);
    const { prolog, goals } = fake(() => yes({ Violations: `[${ROW}]` }));
    const rows = await check(prolog);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.entityId).toBe("REQ-a");
    expect(goals[0]).toBe(`findall(violation(Rule, EntityId, Desc, Sugg, Src),
      checks:${predicate}(violation(Rule, EntityId, Desc, Sugg, Src)),
      Violations)`);
  });
});
