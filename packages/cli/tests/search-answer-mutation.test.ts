import { describe, expect, test } from "bun:test";
import type { IntentSearchMatch } from "../src/intent-search.js";
import type { PrologQueryResult } from "../src/public/operations/runtime-types.js";
import {
  AnswerGraph,
  SEARCH_ANSWER_LIMITS,
  type SearchAnswer,
  type SearchAnswerRequirement,
  type SearchAnswerUngoverned,
  adrExcerpt,
  answerNote,
  brief,
  buildSearchAnswer,
  byteSize,
  clip,
  decodeJsonBinding,
  disagreeingPredicateFacts,
  edgesGoal,
  factDetail,
  factRank,
  factSchemasGoal,
  fetchFactSchemas,
  fetchVerdicts,
  fitSearchAnswer,
  moreFactsOf,
  owningRequirements,
  parseFactSchemas,
  predicateKeyFilter,
  projectVerdict,
  queryCall,
  rationaleOf,
  records,
  scenarioTests,
  strings,
  text,
  unique,
} from "../src/search-answer.js";

const EDGE_RELS =
  "specified_by,verified_by,validates,assumes,implements,constrains,requires_property,requires_predicate,requires_rule,supersedes,relates_to,exempts";
const ROW_KEY_LIST =
  "'id','title','status','fact_kind','approved_by','firmness','origin','source','sourceFile','predicate_namespace','predicate_name','predicate_args','polarity','subject_key','property_key','operator','value_type','value_string','value_int','value_number','value_bool','value_set','unit'";

function edgesQuery(ids: readonly string[]): string {
  return `kb_relationship_edges([${EDGE_RELS}], [${ids.map((id) => `'${id}'`).join(",")}], Edges)`;
}

function rowsQuery(ids: readonly string[]): string {
  return `findall([Id,Type,Row], (member(Id, [${ids.map((id) => `'${id}'`).join(",")}]), kb_entity(Id, Type, Props), findall(Key=Value, (member(Key=Value, Props), memberchk(Key, [${ROW_KEY_LIST}])), Row)), Results)`;
}

function ok(bindings: Record<string, string> = {}): PrologQueryResult {
  return { success: true, bindings };
}

/** A port that answers each query in turn and records the goals it got. */
function scripted(...answers: PrologQueryResult[]) {
  const goals: string[] = [];
  return {
    goals,
    query: async (goal: string): Promise<PrologQueryResult> => {
      goals.push(goal);
      return answers.shift() ?? ok();
    },
  };
}

describe("value helpers", () => {
  test("text renders nullish as empty and everything else as a string", () => {
    expect(text("a")).toBe("a");
    expect(text(5)).toBe("5");
    expect(text(false)).toBe("false");
    expect(text(null)).toBe("");
    expect(text(undefined)).toBe("");
  });

  test("unique drops empty ids and repeats, keeping first order", () => {
    expect(unique(["b", "", "a", "b"])).toEqual(["b", "a"]);
    expect(unique([""])).toEqual([]);
  });

  test("brief keeps status and firmness only when they have a value", () => {
    expect(brief({ id: "F", title: "t", type: "fact" })).toStrictEqual({
      id: "F",
      title: "t",
    });
    expect(
      brief({ id: "R", title: "t", type: "req", status: "open" }),
    ).toStrictEqual({ id: "R", title: "t", status: "open", firmness: "firm" });
    expect(
      brief({
        id: "A",
        type: "adr",
        firmness: "exploratory",
        origin: { kind: "agent" },
      }),
    ).toStrictEqual({ id: "A", title: "", firmness: "exploratory" });
  });

  test("queryCall prints a kb_query with JSON arguments", () => {
    expect(queryCall({ id: "R" })).toBe('kb_query({"id":"R"})');
  });

  test("records keeps only plain objects of an array", () => {
    expect(records([{ a: 1 }, null, 3, "x", [1], { b: 2 }])).toEqual([
      { a: 1 },
      { b: 2 },
    ]);
    expect(records({ a: 1 })).toEqual([]);
    expect(records(undefined)).toEqual([]);
  });

  test("strings normalizes ids and drops empty ones", () => {
    expect(strings(["A", "", null, "file:///x/B"])).toEqual(["A", "B"]);
    expect(strings("A")).toEqual([]);
  });

  test("clip keeps values that fit and ends shortened ones with an ellipsis", () => {
    expect(clip("abc", 3)).toBe("abc");
    expect(clip("abcd", 3)).toBe("ab…");
    expect(clip("😀😀😀", 3)).toBe("😀😀😀");
    expect(clip("😀😀😀😀", 2)).toBe("😀…");
    expect(clip("abc", 0)).toBe("…");
  });

  test("byteSize measures the UTF-8 JSON encoding", () => {
    expect(byteSize("é")).toBe(4);
    expect(byteSize({ a: 1 })).toBe(7);
  });

  test("moreFactsOf names the count and the ask that lists every fact", () => {
    expect(moreFactsOf("REQ-1", 3)).toStrictEqual({
      count: 3,
      ask: 'kb_query({"id":"REQ-1"})',
    });
  });

  test("factRank puts matched facts first, then grounding before constrains", () => {
    const seeds = ["F0", "F1"];
    expect(factRank({ rel: "requires_rule", from: "R", to: "F0" }, seeds)).toBe(
      0,
    );
    expect(factRank({ rel: "constrains", from: "R", to: "F1" }, seeds)).toBe(1);
    expect(factRank({ rel: "requires_rule", from: "R", to: "X" }, seeds)).toBe(
      2,
    );
    expect(factRank({ rel: "constrains", from: "R", to: "X" }, seeds)).toBe(3);
  });

  test("decodeJsonBinding unwraps a quoted JSON string once", () => {
    expect(decodeJsonBinding(JSON.stringify(JSON.stringify({ a: 1 })))).toEqual(
      { a: 1 },
    );
    expect(decodeJsonBinding(JSON.stringify({ a: 1 }))).toEqual({ a: 1 });
    expect(() => decodeJsonBinding(undefined)).toThrow();
  });
});

describe("predicate fact keys", () => {
  const schema = (names: string[], keys: string[] = []) => ({
    argumentNames: names,
    keyArguments: keys,
  });

  test("uses declared key arguments that the schema names", () => {
    expect(
      predicateKeyFilter(
        ["alice", "admin", "x"],
        schema(["user", "role", "subject"], ["role", "missing"]),
      ),
    ).toStrictEqual({ role: "admin" });
  });

  test("falls back to the subject argument, then the first", () => {
    expect(
      predicateKeyFilter(["a", "b"], schema(["role", "subject"], ["missing"])),
    ).toStrictEqual({ subject: "b" });
    expect(
      predicateKeyFilter(["a", "b"], schema(["user", "role"])),
    ).toStrictEqual({ user: "a" });
  });

  test("is undefined when arity differs or no key has a value", () => {
    expect(predicateKeyFilter(["a"], schema(["user", "role"]))).toBeUndefined();
    expect(predicateKeyFilter([], schema([]))).toBeUndefined();
    expect(
      predicateKeyFilter(["", "b"], schema(["user", "role"])),
    ).toBeUndefined();
    expect(
      predicateKeyFilter(["a", ""], schema(["user", "role"], ["user", "role"])),
    ).toStrictEqual({ user: "a" });
  });

  const fact = (args: unknown, extra: Record<string, unknown> = {}) => ({
    fact_kind: "predicate",
    predicate_name: "has_role",
    predicate_args: args,
    ...extra,
  });
  const keyed = schema(["user", "role"], ["user"]);

  test("two facts disagree on the same key with other values or polarity", () => {
    expect(
      disagreeingPredicateFacts(
        fact(["alice", "admin"]),
        fact(["alice", "viewer"]),
        keyed,
      ),
    ).toBe(true);
    expect(
      disagreeingPredicateFacts(
        fact(["alice", "admin"], { polarity: "deny" }),
        fact(["alice", "admin"]),
        keyed,
      ),
    ).toBe(true);
    expect(
      disagreeingPredicateFacts(
        fact(["alice", "admin"]),
        fact(["alice", "admin"], { polarity: "deny" }),
        keyed,
      ),
    ).toBe(true);
    expect(
      disagreeingPredicateFacts(
        fact(["alice", "admin"], { polarity: "deny" }),
        fact(["alice", "admin"], { polarity: "deny" }),
        keyed,
      ),
    ).toBe(false);
    expect(
      disagreeingPredicateFacts(
        fact(["alice", "admin"], { polarity: "allow" }),
        fact(["alice", "admin"]),
        keyed,
      ),
    ).toBe(false);
  });

  test("the same tuple, another key or no declared key is no disagreement", () => {
    expect(
      disagreeingPredicateFacts(
        fact(["alice", "admin"]),
        fact(["alice", "admin"]),
        keyed,
      ),
    ).toBe(false);
    expect(
      disagreeingPredicateFacts(
        fact(["alice", "admin"]),
        fact(["bob", "viewer"]),
        keyed,
      ),
    ).toBe(false);
    expect(
      disagreeingPredicateFacts(
        fact(["alice", "admin"]),
        fact(["alice", "viewer"]),
        undefined,
      ),
    ).toBe(false);
    expect(
      disagreeingPredicateFacts(
        fact(["alice", "admin"]),
        fact(["alice", "viewer"]),
        schema(["user", "role"], ["other"]),
      ),
    ).toBe(false);
  });

  test("kind, name and namespace must match", () => {
    const left = fact(["alice", "admin"]);
    const right = fact(["alice", "viewer"]);
    expect(
      disagreeingPredicateFacts({ ...left, fact_kind: "rule" }, right, keyed),
    ).toBe(false);
    expect(
      disagreeingPredicateFacts(left, { ...right, fact_kind: "rule" }, keyed),
    ).toBe(false);
    expect(
      disagreeingPredicateFacts(
        left,
        { ...right, predicate_name: "other" },
        keyed,
      ),
    ).toBe(false);
    expect(
      disagreeingPredicateFacts(
        left,
        { ...right, predicate_namespace: "default" },
        keyed,
      ),
    ).toBe(true);
    expect(
      disagreeingPredicateFacts(
        { ...left, predicate_namespace: "default" },
        right,
        keyed,
      ),
    ).toBe(true);
    expect(
      disagreeingPredicateFacts(
        { ...left, predicate_namespace: "acl" },
        right,
        keyed,
      ),
    ).toBe(false);
    expect(
      disagreeingPredicateFacts(
        { ...left, predicate_namespace: "acl" },
        { ...right, predicate_namespace: "acl" },
        keyed,
      ),
    ).toBe(true);
  });

  test("a fact without arguments for the key never disagrees", () => {
    expect(
      disagreeingPredicateFacts(fact("x"), fact(["alice", "viewer"]), keyed),
    ).toBe(false);
    expect(
      disagreeingPredicateFacts(fact(["alice", "viewer"]), fact("x"), keyed),
    ).toBe(false);
    const single = schema(["user"], ["user"]);
    expect(
      disagreeingPredicateFacts(
        fact("x", { polarity: "deny" }),
        fact("y"),
        single,
      ),
    ).toBe(false);
  });
});

describe("fact detail", () => {
  test("a predicate fact states its call and asks by key or position", () => {
    expect(
      factDetail({
        fact_kind: "predicate",
        predicate_name: "has_role",
        predicate_args: ["alice", ""],
        polarity: "deny",
        predicate_namespace: "acl",
      }),
    ).toStrictEqual({
      factKind: "predicate",
      claim: "has_role(alice, ) [deny]",
      ask: 'kb_query({"predicate":"has_role","namespace":"acl","args":["alice",null]})',
    });
    expect(
      factDetail(
        {
          fact_kind: "predicate",
          predicate_name: "has_role",
          predicate_args: ["alice", "admin"],
          predicate_namespace: "default",
        },
        { argumentNames: ["user", "role"], keyArguments: ["user"] },
      ),
    ).toStrictEqual({
      factKind: "predicate",
      claim: "has_role(alice, admin)",
      ask: 'kb_query({"predicate":"has_role","where":{"user":"alice"}})',
    });
    expect(
      factDetail(
        {
          fact_kind: "predicate",
          predicate_name: "has_role",
          predicate_args: ["alice"],
        },
        { argumentNames: ["user", "role"], keyArguments: ["user"] },
      ),
    ).toStrictEqual({
      factKind: "predicate",
      claim: "has_role(alice)",
      ask: 'kb_query({"predicate":"has_role","args":["alice"]})',
    });
  });

  test("a predicate fact without argument list keeps the raw value", () => {
    expect(
      factDetail({
        fact_kind: "predicate",
        predicate_name: "ready",
        predicate_args: "raw",
      }),
    ).toStrictEqual({
      factKind: "predicate",
      claim: "ready(raw)",
      ask: 'kb_query({"predicate":"ready"})',
    });
    expect(
      factDetail({
        fact_kind: "predicate",
        predicate_name: "ready",
        predicate_args: [],
      }),
    ).toStrictEqual({
      factKind: "predicate",
      claim: "ready()",
      ask: 'kb_query({"predicate":"ready"})',
    });
  });

  test("a predicate kind without a name or a name on another kind is not a call", () => {
    expect(factDetail({ fact_kind: "predicate" })).toStrictEqual({
      factKind: "predicate",
    });
    expect(
      factDetail({ fact_kind: "rule", predicate_name: "ready" }),
    ).toStrictEqual({ factKind: "rule" });
    expect(factDetail({})).toStrictEqual({});
  });

  test("a property value states subject, property, operator and value", () => {
    expect(
      factDetail({
        fact_kind: "property_value",
        subject_key: "cart",
        property_key: "total",
        operator: "gte",
        value_type: "int",
        value_int: 0,
        unit: "EUR",
      }),
    ).toStrictEqual({
      factKind: "property_value",
      claim: "cart total gte 0 EUR",
      ask: 'kb_query({"subjectKey":"cart","propertyKey":"total"})',
    });
    expect(
      factDetail({
        fact_kind: "property_value",
        subject_key: "cart",
        property_key: "label",
        value_string: "x",
      }),
    ).toStrictEqual({
      factKind: "property_value",
      claim: "cart label eq x",
      ask: 'kb_query({"subjectKey":"cart","propertyKey":"label"})',
    });
  });

  test("a property value needs both keys and the property kind", () => {
    expect(
      factDetail({ fact_kind: "property_value", subject_key: "cart" }),
    ).toStrictEqual({ factKind: "property_value" });
    expect(
      factDetail({ fact_kind: "property_value", property_key: "total" }),
    ).toStrictEqual({ factKind: "property_value" });
    expect(
      factDetail({ fact_kind: "rule", subject_key: "c", property_key: "p" }),
    ).toStrictEqual({ factKind: "rule" });
  });

  test("a subject fact states its key", () => {
    expect(
      factDetail({ fact_kind: "subject", subject_key: "cart" }),
    ).toStrictEqual({
      factKind: "subject",
      claim: "cart",
      ask: 'kb_query({"subjectKey":"cart"})',
    });
    expect(factDetail({ fact_kind: "subject" })).toStrictEqual({
      factKind: "subject",
    });
    expect(factDetail({ subject_key: "cart" })).toStrictEqual({});
  });
});

describe("goals and schema rows", () => {
  test("edgesGoal lists the answer relationships and quoted ids", () => {
    expect(edgesGoal(["A", "it's"])).toBe(
      `kb_relationship_edges([${EDGE_RELS}], ['A','it''s'], Edges)`,
    );
  });

  test("factSchemasGoal looks up project and built-in schemas", () => {
    expect(factSchemasGoal(["F1", "F2"])).toBe(
      "findall([FactId,Names,Keys], (member(FactId, ['F1','F2']), kb:predicate_fact(FactId, Ns, Name, _, _), ((kb:predicate_schema(SchemaId, Ns, Name, _, Names, _) -> ((kb_entity(SchemaId, fact, Props), memberchk(key_arguments=KeysRaw, Props), kb:normalize_term_atom_list(KeysRaw, Keys)) -> true ; Keys = [])) ; (kb:builtin_decision_predicate(Ns, Name, _, KeyPositions, _), kb:builtin_predicate_signature(Name, _, Names), findall(Key, (member(P, KeyPositions), nth1(P, Names, Key)), Keys)))), Schemas)",
    );
  });

  test("parseFactSchemas reads id, names and keys", () => {
    expect([
      ...parseFactSchemas("[['file:///x/F1',[user,role],[user]]]"),
    ]).toEqual([
      ["F1", { argumentNames: ["user", "role"], keyArguments: ["user"] }],
    ]);
    expect(parseFactSchemas(undefined).size).toBe(0);
  });
});

describe("graph walks", () => {
  const edges = [
    { rel: "verified_by", from: "S", to: "T1" },
    { rel: "validates", from: "T2", to: "S" },
    { rel: "verified_by", from: "X", to: "T3" },
    { rel: "validates", from: "T4", to: "X" },
    { rel: "verified_by", from: "T5", to: "S" },
    { rel: "validates", from: "S", to: "T6" },
    { rel: "implements", from: "S", to: "T7" },
  ];

  test("scenarioTests follows verified_by out and validates in", () => {
    expect(scenarioTests("S", edges)).toEqual(["T1", "T2"]);
  });

  const owned = [
    { rel: "specified_by", from: "R1", to: "S" },
    { rel: "specified_by", from: "S", to: "R9" },
    { rel: "verified_by", from: "R2", to: "T" },
    { rel: "verified_by", from: "T", to: "R9" },
    { rel: "validates", from: "T", to: "R3" },
    { rel: "validates", from: "R9", to: "T" },
    { rel: "implements", from: "Y", to: "R4" },
    { rel: "implements", from: "R9", to: "Y" },
    { rel: "constrains", from: "R5", to: "F" },
    { rel: "requires_rule", from: "R6", to: "F" },
    { rel: "requires_property", from: "R7", to: "F" },
    { rel: "requires_predicate", from: "R8", to: "F" },
    { rel: "relates_to", from: "R9", to: "F" },
    { rel: "constrains", from: "F", to: "R9" },
    { rel: "specified_by", from: "R9", to: "F" },
    { rel: "implements", from: "F", to: "R9" },
    { rel: "verified_by", from: "R9", to: "Y" },
    { rel: "validates", from: "Y", to: "R9" },
    { rel: "verified_by", from: "R9", to: "S" },
    { rel: "validates", from: "S", to: "R9" },
    { rel: "implements", from: "S", to: "R9" },
    { rel: "constrains", from: "R9", to: "S" },
    { rel: "implements", from: "T", to: "R9" },
    { rel: "specified_by", from: "R9", to: "T" },
    { rel: "constrains", from: "R9", to: "T" },
    { rel: "specified_by", from: "R9", to: "Y" },
    { rel: "constrains", from: "R9", to: "Y" },
  ];

  test("owningRequirements reads each type's link back to a requirement", () => {
    expect(owningRequirements("S", "scenario", owned)).toEqual(["R1"]);
    expect(owningRequirements("T", "test", owned)).toEqual(["R2", "R3"]);
    expect(owningRequirements("Y", "symbol", owned)).toEqual(["R4"]);
    expect(owningRequirements("F", "fact", owned)).toEqual([
      "R5",
      "R6",
      "R7",
      "R8",
    ]);
    expect(owningRequirements("F", "adr", owned)).toEqual([]);
  });
});

describe("ADR excerpts", () => {
  test("takes the decision section first, then rationale, then the preamble", () => {
    expect(
      adrExcerpt("Intro text.\n# Rationale\nBecause.\n## Decision\nDo it."),
    ).toBe("Do it.");
    expect(adrExcerpt("Intro text.\n# Rationale\nBecause.")).toBe("Because.");
    expect(adrExcerpt("Intro text.\n# Context\nWhy.")).toBe("Intro text.");
    expect(adrExcerpt("# Context\n\n# Other\nWhy.")).toBe("Why.");
    expect(adrExcerpt("# Context\n   \n# Other\nWhy.")).toBe("Why.");
    expect(adrExcerpt("")).toBeUndefined();
    expect(adrExcerpt("# Only\n")).toBeUndefined();
  });

  test("a section counts only with text and only under its own name", () => {
    expect(adrExcerpt("# Decision\n   \n# Rationale\nBecause.")).toBe(
      "Because.",
    );
    expect(adrExcerpt("# Prior decision\nOld.\n# Rationale\nBecause.")).toBe(
      "Because.",
    );
    expect(adrExcerpt("# Old rationale\nOld.\n# Other\nNew.")).toBe("Old.");
    expect(adrExcerpt("   \n# Context\nWhy.")).toBe("Why.");
    expect(adrExcerpt("# Decisions\nMany.\n# Decision\nOne.")).toBe("One.");
    expect(adrExcerpt("# Decision\nFirst.\n# Decision\nSecond.")).toBe(
      "First.",
    );
  });

  test("blank lines alone leave a section empty", () => {
    expect(adrExcerpt("# Decision\n\n\n# Rationale\nBecause.")).toBe(
      "Because.",
    );
    expect(adrExcerpt("\n\n# Context\nWhy.")).toBe("Why.");
    expect(adrExcerpt("# Context\n\n\n# Other\nWhy.")).toBe("Why.");
    expect(adrExcerpt("Intro.\n# Old rationale\nOld.")).toBe("Intro.");
    expect(adrExcerpt("Intro.\n#  Decision\nYes.")).toBe("Yes.");
    expect(adrExcerpt("# Decision\n\n|only|table|\n")).toBeUndefined();
    expect(adrExcerpt("# Decision\n  |a|b|\nText.")).toBe("Text.");
    expect(adrExcerpt("# Decision\nx > y")).toBe("x > y");
  });

  test("headings need a marker at the start and a space after it", () => {
    expect(adrExcerpt("   # Decision\nYes.")).toBe("Yes.");
    expect(adrExcerpt("#  Decision\nYes.")).toBe("Yes.");
    expect(adrExcerpt("x # Decision\nYes.")).toBe("x # Decision Yes.");
    expect(adrExcerpt("    # Decision\nYes.")).toBe("# Decision Yes.");
    expect(adrExcerpt("a# Decision\nYes.")).toBe("a# Decision Yes.");
    expect(adrExcerpt("## Decision ##\nYes.")).toBe("Yes.");
  });

  test("fenced code is skipped wherever the fence is indented", () => {
    expect(adrExcerpt("# Decision\n  ```\ncode\n  ```\nAfter.")).toBe("After.");
    expect(adrExcerpt("# Decision\n~~~\ncode\n~~~\nAfter.")).toBe("After.");
    expect(adrExcerpt("# Decision\nUse ```x``` here.")).toBe("Use x here.");
    expect(adrExcerpt("# Decision\nx```\nkept.")).toBe("x kept.");
  });

  test("markup is reduced to plain prose", () => {
    expect(
      adrExcerpt(
        "# Decision\n- one\n  * two\n10. three\n1) four\n1.five\n-six\n> quoted\n  > deep\n>tight\n|a|b|\nend | pipe\n![alt](img.png) and [link](u) **bold** __under__ `code`",
      ),
    ).toBe(
      "one two three four 1.five -six quoted deep tight end | pipe alt and link bold under code",
    );
    expect(adrExcerpt("# Decision\n-  > spaced")).toBe("spaced");
    expect(adrExcerpt("# Decision\na  b\n\nc")).toBe("a b c");
    expect(adrExcerpt("# Decision\n|only|table|")).toBeUndefined();
  });

  test("keeps whole sentences up to the limit, then clips", () => {
    expect(adrExcerpt("# Decision\nOne. Two! Three? Four", 14)).toBe(
      "One. Two!",
    );
    expect(adrExcerpt("# Decision\nOne. Two! Three", 9)).toBe("One. Two!");
    expect(adrExcerpt("# Decision\nOne. Two! Three", 8)).toBe("One.");
    expect(adrExcerpt("# Decision\nabcdefghij. Two.", 5)).toBe("abcd…");
    expect(adrExcerpt("# Decision\nA.B. C", 280)).toBe("A.B. C");
    expect(adrExcerpt(`# Decision\n${"a".repeat(300)}`)).toBe(
      `${"a".repeat(279)}…`,
    );
  });
});

describe("ADR rationale", () => {
  test("an ADR without a source is its brief", async () => {
    let loads = 0;
    const load = async () => {
      loads += 1;
      return "# Decision\nX.";
    };
    expect(
      await rationaleOf({ id: "A", type: "adr" }, "/ws", new Map(), load),
    ).toStrictEqual({ id: "A", title: "", firmness: "firm" });
    expect(loads).toBe(0);
  });

  test("reads each source body once and keeps the source without anchor", async () => {
    const calls: string[][] = [];
    const load = async (source: string, root: string) => {
      calls.push([source, root]);
      return "# Decision\nUse it.";
    };
    const bodies = new Map<string, Promise<string | null>>();
    const row = { id: "A", type: "adr", source: "adr/a.md#part" };
    const first = await rationaleOf(row, "/ws", bodies, load);
    const second = await rationaleOf(row, "/ws", bodies, load);
    expect(first).toStrictEqual({
      id: "A",
      title: "",
      firmness: "firm",
      source: "adr/a.md",
      excerpt: "Use it.",
    });
    expect(second).toStrictEqual(first);
    expect(calls).toEqual([["adr/a.md#part", "/ws"]]);
    expect([...bodies.keys()]).toEqual(["adr/a.md#part"]);
  });

  test("prefers sourceFile, and has no excerpt without a root or a body", async () => {
    const load = async () => null;
    expect(
      await rationaleOf(
        { id: "A", type: "fact", sourceFile: "a.md", source: "b.md" },
        "/ws",
        new Map(),
        load,
      ),
    ).toStrictEqual({ id: "A", title: "", source: "a.md" });
    expect(
      await rationaleOf(
        { id: "A", type: "fact", source: "b.md" },
        undefined,
        new Map(),
        async () => "# Decision\nX.",
      ),
    ).toStrictEqual({ id: "A", title: "", source: "b.md" });
    expect(
      await rationaleOf(
        { id: "A", type: "fact", source: "b.md" },
        "/ws",
        new Map(),
        async () => "|table|",
      ),
    ).toStrictEqual({ id: "A", title: "", source: "b.md" });
  });
});

describe("verdict projection", () => {
  test("a missing or failed verdict is one unavailable unknown", () => {
    expect(projectVerdict(undefined)).toStrictEqual({
      verdict: { status: "unknown", witnesses: [] },
      unknowns: [
        {
          kind: "verdict_unavailable",
          detail: "The checks could not be evaluated for this requirement.",
          entities: [],
        },
      ],
      truncated: false,
    });
    expect(projectVerdict({ error: "boom" }).unknowns).toStrictEqual([
      {
        kind: "verdict_unavailable",
        detail: "The checks could not be evaluated for this requirement: boom",
        entities: [],
      },
    ]);
    expect(
      projectVerdict({ error: "x".repeat(400) }).unknowns[0]?.detail,
    ).toHaveLength(240);
  });

  test("an empty verdict is none", () => {
    expect(projectVerdict({})).toStrictEqual({
      verdict: { status: "none", witnesses: [] },
      unknowns: [],
      truncated: false,
    });
  });

  test("contradictions are witnesses, other overlaps are unknowns", () => {
    expect(
      projectVerdict({
        contradictions: [
          {
            status: "contradiction",
            with: "file:///x/REQ-B",
            facts: ["F1", ""],
            reason: "clash",
          },
          { status: "contradiction", facts: "F", reason: "alone" },
          { status: "overlap", with: "REQ-C", facts: ["F2"], reason: "maybe" },
          { status: "overlap", facts: ["F3"], reason: "open" },
        ],
      }),
    ).toStrictEqual({
      verdict: {
        status: "contradiction",
        witnesses: [
          {
            check: "domain-contradictions",
            status: "contradiction",
            with: "REQ-B",
            facts: ["F1"],
            detail: "clash",
          },
          {
            check: "domain-contradictions",
            status: "contradiction",
            facts: [],
            detail: "alone",
          },
        ],
      },
      unknowns: [
        {
          kind: "contradiction_unresolved",
          detail: "maybe",
          entities: ["REQ-C", "F2"],
        },
        { kind: "contradiction_unresolved", detail: "open", entities: ["F3"] },
      ],
      truncated: false,
    });
  });

  test("scenario outcomes become infeasible witnesses or unknowns", () => {
    expect(
      projectVerdict({
        scenarios: [
          {
            scenario: "S1",
            outcome: "infeasible",
            requirement: "REQ-F",
            assumed: ["A1"],
            fact: ["F1"],
            reason: "forbidden",
          },
          { scenario: "S2", outcome: "infeasible", reason: "r" },
          { scenario: "S3", outcome: "feasible", reason: "fine" },
          { scenario: "S4", outcome: "unknown", reason: "odd", facts: ["F4"] },
        ],
        forbids: [
          { scenario: "S5", assumed: ["A5"], fact: ["F5"], reason: "no" },
        ],
      }),
    ).toStrictEqual({
      verdict: {
        status: "infeasible",
        witnesses: [
          {
            check: "scenario-feasibility",
            status: "infeasible",
            with: "REQ-F",
            scenario: "S1",
            facts: ["A1", "F1"],
            detail: "forbidden",
          },
          {
            check: "scenario-feasibility",
            status: "infeasible",
            scenario: "S2",
            facts: [],
            detail: "r",
          },
          {
            check: "scenario-feasibility",
            status: "infeasible",
            scenario: "S5",
            facts: ["A5", "F5"],
            detail: "no",
          },
        ],
      },
      unknowns: [
        {
          kind: "feasibility_unknown",
          detail: "S4 has unknown feasibility (odd)",
          entities: ["S4", "F4"],
        },
      ],
      truncated: false,
    });
  });

  test("each known feasibility reason has its own sentence", () => {
    const sentences: Record<string, string> = {
      no_assumptions:
        "expects success but assumes nothing, so its feasibility against current requirements is unknown",
      unmatched_assumption:
        "expects success but an assumption is not constrained by any current requirement, so its feasibility is unknown",
      incomparable_assumption:
        "expects success but an assumption cannot be compared with the requirement constraint (type or unit differs), so its feasibility is unknown",
      contradictory_assumptions:
        "expects success but its assumptions contradict each other, so the scenario can never happen",
      conflicting_requirements:
        "expects success but the requirements constraining it conflict with each other, so its feasibility is unknown",
      undecided_rule:
        "expects success but a rule governing it can be neither satisfied nor refuted from its assumptions, so its feasibility is unknown",
      undetermined_validity:
        "expects success but would conflict only with constraints whose validity window may not cover the scenario's time, so its feasibility is unknown",
    };
    for (const [reason, sentence] of Object.entries(sentences)) {
      expect(
        projectVerdict({
          scenarios: [{ scenario: "S", outcome: "unknown", reason }],
        }).unknowns,
      ).toStrictEqual([
        {
          kind: "feasibility_unknown",
          detail: `S ${sentence}`,
          entities: ["S"],
        },
      ]);
    }
  });

  test("the clause ledger reports unresolved claims and a missing inventory", () => {
    expect(
      projectVerdict({
        inventory: {
          status: "missing",
          unresolved: [{ status: "ambiguous", claim: "x" }, "skip"],
        },
      }).unknowns,
    ).toStrictEqual([
      { kind: "unresolved_proposition", detail: "ambiguous: x", entities: [] },
      {
        kind: "analysis_incomplete",
        detail:
          "The requirement's clause ledger (semantic inventory) is missing or incomplete, so contradiction analysis cannot cover all of its clauses.",
        entities: [],
      },
    ]);
    expect(
      projectVerdict({ inventory: { status: "passed" } }).unknowns,
    ).toEqual([]);
    expect(
      projectVerdict({ inventory: [{ status: "missing" }] }).unknowns,
    ).toEqual([]);
  });

  test("contradictions sort first, keeping order within a status", () => {
    const witness = (scenario: string) => ({
      scenario,
      outcome: "infeasible",
      reason: scenario,
    });
    const clash = (reason: string) => ({ status: "contradiction", reason });
    const projected = projectVerdict(
      {
        scenarios: [witness("S1"), witness("S2"), witness("S3")],
        contradictions: [clash("C1"), clash("C2"), clash("C3")],
      },
      10,
    );
    expect(projected.verdict.witnesses.map((w) => w.detail)).toEqual([
      "C1",
      "C2",
      "C3",
      "S1",
      "S2",
      "S3",
    ]);
    const mixed = projectVerdict(
      {
        contradictions: [clash("C1")],
        scenarios: [witness("S1")],
        forbids: [{ scenario: "S2", reason: "S2" }],
      },
      10,
    );
    expect(mixed.verdict.witnesses.map((w) => w.detail)).toEqual([
      "C1",
      "S1",
      "S2",
    ]);
  });

  test("lists are cut to the per-requirement limit", () => {
    const clash = { status: "contradiction", reason: "c" };
    const open = { status: "overlap", reason: "o" };
    const at = projectVerdict(
      { contradictions: [clash, clash, open, open] },
      2,
    );
    expect(at.truncated).toBe(false);
    expect(at.verdict.witnesses).toHaveLength(2);
    expect(at.unknowns).toHaveLength(2);
    const witnesses = projectVerdict(
      { contradictions: [clash, clash, clash] },
      2,
    );
    expect(witnesses.truncated).toBe(true);
    expect(witnesses.verdict.witnesses).toHaveLength(2);
    expect(witnesses.verdict.status).toBe("contradiction");
    const unknowns = projectVerdict({ contradictions: [open, open, open] }, 2);
    expect(unknowns.truncated).toBe(true);
    expect(unknowns.unknowns).toHaveLength(2);
    expect(
      projectVerdict({ contradictions: Array(5).fill(open) }).unknowns,
    ).toHaveLength(SEARCH_ANSWER_LIMITS.perRequirement);
  });
});

describe("answer note", () => {
  const entry = (
    over: Partial<SearchAnswerUngoverned>,
  ): SearchAnswerUngoverned => ({
    id: "X",
    title: "",
    type: "scenario",
    rank: 2,
    ...over,
  });
  const GOVERNING =
    "Governing requirements are current requirements matched by the query or linked to a matched entity. Links are discovery, not proof. A verdict lists the contradiction and scenario-feasibility witnesses that name the requirement; none means no check named it, not that it is proven. Use kb_check and kb_coverage for consistency and proof status.";
  const NONE =
    "No current requirement matched or owns a matched entity. Absence here is not evidence that nothing governs the change; refine the query or pass sourceLocations.";
  const FACT =
    "A fact in ungoverned is linked to no requirement, so it decides nothing: where it disagrees with a governing requirement's fact, the governing fact holds. ";

  test("plain notes with and without governing requirements", () => {
    expect(answerNote(1, [])).toBe(GOVERNING);
    expect(answerNote(0, [entry({})])).toBe(NONE);
  });

  test("an unowned top match leads the note", () => {
    expect(answerNote(0, [entry({ id: "S", rank: 1 })])).toBe(
      `The top-ranked match S (scenario) is linked to no requirement. ${NONE}`,
    );
    expect(answerNote(2, [entry({ id: "S", rank: 1 })])).toBe(
      `The top-ranked match S (scenario) is linked to no requirement; the governing requirements below were reached through lower-ranked matches. ${GOVERNING}`,
    );
  });

  test("an ungoverned fact and its overriding fact are named", () => {
    expect(
      answerNote(1, [
        entry({ type: "scenario" }),
        entry({
          id: "F1",
          type: "fact",
          claim: "p(a)",
          overriddenBy: { fact: "F2", requirement: "R", claim: "p(b)" },
        }),
        entry({
          id: "F3",
          type: "fact",
          overriddenBy: { fact: "F4", requirement: "R" },
        }),
      ]),
    ).toBe(
      `${FACT}F2 of R (p(b)) holds over F1 (p(a)). F4 of R holds over F3. ${GOVERNING}`,
    );
  });
});

describe("answer graph", () => {
  test("seeded rows are copies, and a seed without id is ignored", () => {
    const graph = new AnswerGraph(scripted(), 5);
    const entity = { id: "A", title: "t" };
    graph.seed(entity);
    entity.title = "changed";
    graph.seed({ title: "no id" });
    expect(graph.row("A")).toStrictEqual({ id: "A", title: "t" });
    expect(graph.row("")).toBeNull();
    expect(graph.row("B")).toBeNull();
  });

  test("fetches edges and rows in one query and reads them back", async () => {
    const port = scripted(
      ok({
        Edges:
          "[[verified_by,'A','B'],[relates_to,'file:///x/C','A'],[implements,'A','A'],[assumes,'Z','Y']]",
        Results: "[['A',req,[title=\"Alpha\"]],['file:///x/B',test,[]]]",
      }),
    );
    const graph = new AnswerGraph(port, 10);
    const bindings = await graph.fetch({
      edges: ["A", "B", "", "A"],
      rows: ["A", "B", "Q"],
    });
    expect(port.goals).toEqual([
      `${edgesQuery(["A", "B"])}, ${rowsQuery(["A", "B", "Q"])}`,
    ]);
    expect(bindings.Results).toBe(
      "[['A',req,[title=\"Alpha\"]],['file:///x/B',test,[]]]",
    );
    expect(graph.edgesOf(["A", "B", "C"])).toEqual([
      { rel: "verified_by", from: "A", to: "B" },
      { rel: "relates_to", from: "C", to: "A" },
      { rel: "implements", from: "A", to: "A" },
    ]);
    expect(graph.edgesOf(["B"])).toEqual([
      { rel: "verified_by", from: "A", to: "B" },
    ]);
    expect(graph.edgesOf(["Z", "Y"])).toEqual([]);
    expect(graph.row("A")).toStrictEqual({
      title: "Alpha",
      id: "A",
      type: "req",
    });
    expect(graph.row("B")).toStrictEqual({ id: "B", type: "test" });
    expect(graph.row("Q")).toBeNull();
    expect(graph.truncated).toBe(false);

    // Known edges and rows, missing ones included, are not fetched again.
    expect(await graph.fetch({ edges: ["A", "B"], rows: ["A", "Q"] })).toEqual(
      {},
    );
    expect(port.goals).toHaveLength(1);
    expect(await graph.fetch({})).toEqual({});
    expect(port.goals).toHaveLength(1);
  });

  test("edges that arrive with a later row lookup are not filed", async () => {
    const port = scripted(
      ok({ Edges: "[]" }),
      ok({ Edges: "[[verified_by,'A','B']]", Results: "[]" }),
    );
    const graph = new AnswerGraph(port, 10);
    await graph.fetch({ edges: ["A"] });
    await graph.fetch({ rows: ["R"] });
    expect(port.goals).toEqual([edgesQuery(["A"]), rowsQuery(["R"])]);
    expect(graph.edgesOf(["A"])).toEqual([]);
  });

  test("rows that arrive with a later edge lookup are not filed", async () => {
    const port = scripted(ok({ Edges: "[]", Results: "[['R',req,[]]]" }));
    const graph = new AnswerGraph(port, 10);
    await graph.fetch({ edges: ["A"] });
    expect(graph.row("R")).toBeNull();
  });

  test("a missing binding reads as nothing found", async () => {
    const port = scripted(ok());
    const graph = new AnswerGraph(port, 10);
    await graph.fetch({ edges: ["A"], rows: ["A"] });
    expect(graph.edgesOf(["A"])).toEqual([]);
    expect(graph.row("A")).toBeNull();
  });

  test("the row budget caps loads across fetches and marks truncation", async () => {
    const port = scripted(ok({ Results: "[]" }), ok({ Results: "[]" }));
    const graph = new AnswerGraph(port, 3);
    await graph.fetch({ rows: ["A", "B"] });
    expect(graph.truncated).toBe(false);
    await graph.fetch({ rows: ["C", "D"] });
    expect(graph.truncated).toBe(true);
    expect(port.goals).toEqual([rowsQuery(["A", "B"]), rowsQuery(["C"])]);
    expect(await graph.fetch({ rows: ["E"] })).toEqual({});
    expect(port.goals).toHaveLength(2);
  });

  test("a row count equal to the room is not truncation", async () => {
    const graph = new AnswerGraph(scripted(ok({ Results: "[]" })), 2);
    await graph.fetch({ rows: ["A", "B"] });
    expect(graph.truncated).toBe(false);
  });

  test("a further goal shares the query and returns its bindings", async () => {
    const port = scripted(ok({ Extra: "1" }));
    const graph = new AnswerGraph(port, 3);
    expect(await graph.fetch({ alsoGoal: "extra(Extra)" })).toEqual({
      Extra: "1",
    });
    expect(port.goals).toEqual(["extra(Extra)"]);
  });

  test("a failed edge-only lookup reads as no links", async () => {
    const port = scripted({ success: false, bindings: {}, error: "x" });
    const graph = new AnswerGraph(port, 3);
    expect(await graph.fetch({ edges: ["A"] })).toEqual({});
    expect(graph.edgesOf(["A"])).toEqual([]);
    await graph.fetch({ edges: ["A"] });
    expect(port.goals).toHaveLength(1);
  });

  test("a failed row or further lookup throws the engine error", async () => {
    const failed = { success: false, bindings: {}, error: "engine down" };
    const rows = new AnswerGraph(scripted(failed), 3);
    await expect(rows.fetch({ rows: ["A"] })).rejects.toThrow(/^engine down$/);
    expect(rows.row("A")).toBeNull();
    const also = new AnswerGraph(scripted(failed), 3);
    await expect(also.fetch({ alsoGoal: "g" })).rejects.toThrow(
      /^engine down$/,
    );
    const silent = new AnswerGraph(
      scripted({ success: false, bindings: {} }),
      3,
    );
    await expect(silent.fetch({ edges: ["A"], rows: ["A"] })).rejects.toThrow(
      /^Search answer graph query failed$/,
    );
  });
});

const VERDICT_GOAL = (ids: string[]) =>
  `discovery:search_answer_verdicts_json([${ids.map((id) => `'${id}'`).join(",")}], JsonString)`;
const MODULE_GOAL = (ids: string[]) =>
  new RegExp(
    `^\\(use_module\\('[^']*/discovery\\.pl'\\), ${VERDICT_GOAL(ids).replace(/[[\]()]/g, "\\$&")}\\)$`,
  );
const PAYLOAD = { requirements: [{ id: "R1" }], scope: { snapshotId: "s" } };

/** A port whose queries throw or answer in turn, flagged one-shot. */
function oneShot(...answers: (PrologQueryResult | string)[]) {
  const goals: string[] = [];
  return {
    goals,
    oneShotMode: true,
    query: async (goal: string): Promise<PrologQueryResult> => {
      goals.push(goal);
      const next = answers.shift() ?? ok();
      if (typeof next === "string") throw next;
      return next;
    },
  };
}

describe("verdict lookup", () => {
  test("shares the row lookup and decodes the verdict payload", async () => {
    const port = oneShot(
      ok({
        Results: "[]",
        JsonString: JSON.stringify(JSON.stringify(PAYLOAD)),
      }),
    );
    const graph = new AnswerGraph(port, 10);
    expect(await fetchVerdicts(port, graph, ["T1"], ["R1", "it's"])).toEqual(
      PAYLOAD,
    );
    expect(port.goals).toEqual([
      `${rowsQuery(["T1"])}, discovery:search_answer_verdicts_json(['R1','it''s'], JsonString)`,
    ]);
  });

  for (const error of [
    "existence_error(procedure, x)",
    "Unknown procedure: discovery:x/2",
    "unknown procedure x",
    "module does not exist",
  ]) {
    test(`loads the discovery module after "${error}"`, async () => {
      const port = oneShot(
        { success: false, bindings: {}, error },
        ok({ Results: "[['T1',test,[]]]" }),
        ok({ JsonString: JSON.stringify(PAYLOAD) }),
      );
      const graph = new AnswerGraph(port, 10);
      expect(await fetchVerdicts(port, graph, ["T1"], ["R1"])).toEqual(PAYLOAD);
      expect(port.goals.slice(0, 2)).toEqual([
        `${rowsQuery(["T1"])}, ${VERDICT_GOAL(["R1"])}`,
        rowsQuery(["T1"]),
      ]);
      expect(port.goals[2]).toMatch(MODULE_GOAL(["R1"]));
      expect(port.goals).toHaveLength(3);
      expect(graph.row("T1")).toStrictEqual({ id: "T1", type: "test" });
    });
  }

  test("a thrown non-error message is matched too", async () => {
    const port = oneShot(
      "existence_error",
      ok({ JsonString: JSON.stringify(PAYLOAD) }),
    );
    const graph = new AnswerGraph(port, 10);
    expect(await fetchVerdicts(port, graph, [], ["R1"])).toEqual(PAYLOAD);
    expect(port.goals[0]).toBe(VERDICT_GOAL(["R1"]));
    expect(port.goals[1]).toMatch(MODULE_GOAL(["R1"]));
  });

  test("another engine error leaves the answer without verdicts", async () => {
    const port = oneShot(
      { success: false, bindings: {}, error: "timeout" },
      ok({ Results: "[['T1',test,[]]]" }),
    );
    const graph = new AnswerGraph(port, 10);
    expect(await fetchVerdicts(port, graph, ["T1"], ["R1"])).toBeUndefined();
    expect(port.goals).toEqual([
      `${rowsQuery(["T1"])}, ${VERDICT_GOAL(["R1"])}`,
      rowsQuery(["T1"]),
    ]);
    expect(graph.row("T1")).toStrictEqual({ id: "T1", type: "test" });
  });

  test("a missing payload or a failed module load is no verdict", async () => {
    const empty = oneShot(ok());
    expect(
      await fetchVerdicts(empty, new AnswerGraph(empty, 10), [], ["R1"]),
    ).toBeUndefined();
    expect(empty.goals).toHaveLength(1);
    const failed = oneShot("existence_error", {
      success: false,
      bindings: {},
      error: "x",
    });
    expect(
      await fetchVerdicts(failed, new AnswerGraph(failed, 10), [], ["R1"]),
    ).toBeUndefined();
    expect(failed.goals).toHaveLength(2);
  });
});

describe("fact schema lookup", () => {
  const request = { edges: ["S1"], rows: ["F1"] };

  test("without facts only the request is fetched", async () => {
    const port = scripted(ok({ Edges: "[]", Results: "[]" }));
    const graph = new AnswerGraph(port, 10);
    expect((await fetchFactSchemas(graph, [], request)).size).toBe(0);
    expect(port.goals).toEqual([`${edgesQuery(["S1"])}, ${rowsQuery(["F1"])}`]);
    expect(graph.row("F1")).toBeNull();
  });

  test("schemas share the request's round trip", async () => {
    const port = scripted(
      ok({ Edges: "[]", Results: "[]", Schemas: "[['F1',[a,b],[b]]]" }),
    );
    const graph = new AnswerGraph(port, 10);
    expect([...(await fetchFactSchemas(graph, ["F1"], request))]).toEqual([
      ["F1", { argumentNames: ["a", "b"], keyArguments: ["b"] }],
    ]);
    expect(port.goals).toEqual([
      `${edgesQuery(["S1"])}, ${rowsQuery(["F1"])}, ${factSchemasGoal(["F1"])}`,
    ]);
  });

  test("a schema lookup the engine cannot run still loads the request", async () => {
    const port = scripted(
      { success: false, bindings: {}, error: "no schema" },
      ok({ Edges: "[]", Results: "[['F1',fact,[]]]" }),
    );
    const graph = new AnswerGraph(port, 10);
    expect((await fetchFactSchemas(graph, ["F1"], request)).size).toBe(0);
    expect(port.goals[1]).toBe(`${edgesQuery(["S1"])}, ${rowsQuery(["F1"])}`);
    expect(graph.row("F1")).toStrictEqual({ id: "F1", type: "fact" });
  });
});

type Entity = Record<string, unknown>;
type EdgeRow = readonly [string, string, string];

function idsIn(goal: string, pattern: RegExp): string[] | undefined {
  const list = pattern.exec(goal)?.[1];
  if (list === undefined) return undefined;
  return [...list.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1] as string);
}

function prologValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(prologValue).join(",")}]`;
  if (typeof value === "object" && value !== null)
    return `[${Object.entries(value)
      .map(([key, inner]) => `${key}=${prologValue(inner)}`)
      .join(",")}]`;
  return JSON.stringify(value);
}

/**
 * An engine over a fixture graph answering the batched goals the answer
 * layer sends: edges, projected rows, fact schemas and verdicts.
 */
function fakeKb(
  entities: Record<string, Entity>,
  edges: readonly EdgeRow[],
  options: Readonly<{
    verdicts?: (ids: string[]) => unknown;
    schemas?: Record<string, { names: string[]; keys: string[] }>;
  }> = {},
) {
  const goals: string[] = [];
  return {
    goals,
    query: async (goal: string): Promise<PrologQueryResult> => {
      goals.push(goal);
      const bindings: Record<string, string> = {};
      const edgeIds = idsIn(
        goal,
        /kb_relationship_edges\(\[[^\]]*\], \[([^\]]*)\]/,
      );
      if (edgeIds !== undefined)
        bindings.Edges = `[${edges
          .filter(
            ([, from, to]) => edgeIds.includes(from) || edgeIds.includes(to),
          )
          .map(([rel, from, to]) => `[${rel},'${from}','${to}']`)
          .join(",")}]`;
      const rowIds = idsIn(goal, /member\(Id, \[([^\]]*)\]\)/);
      if (rowIds !== undefined)
        bindings.Results = `[${rowIds
          .flatMap((id) => {
            const entity = entities[id];
            if (!entity) return [];
            const props = Object.entries(entity)
              .filter(([key]) => key !== "type" && key !== "id")
              .map(([key, value]) => `${key}=${prologValue(value)}`);
            return [`['${id}',${String(entity.type)},[${props.join(",")}]]`];
          })
          .join(",")}]`;
      const schemaIds = idsIn(goal, /member\(FactId, \[([^\]]*)\]\)/);
      if (schemaIds !== undefined)
        bindings.Schemas = `[${schemaIds
          .flatMap((id) => {
            const schema = options.schemas?.[id];
            return schema
              ? [
                  `['${id}',[${schema.names.join(",")}],[${schema.keys.join(",")}]]`,
                ]
              : [];
          })
          .join(",")}]`;
      const verdictIds = idsIn(
        goal,
        /search_answer_verdicts_json\(\[([^\]]*)\]/,
      );
      if (verdictIds !== undefined) {
        const payload = options.verdicts?.(verdictIds) ?? {
          requirements: verdictIds.map((id) => ({ id })),
          scope: { snapshotId: "snap-1", syncedAt: "2026-10-01T00:00:00Z" },
        };
        bindings.JsonString = JSON.stringify(JSON.stringify(payload));
      }
      return { success: true, bindings };
    },
  };
}

function hit(entity: Entity, score = 1): IntentSearchMatch {
  return {
    entity: entity as IntentSearchMatch["entity"],
    score,
    reasons: [],
    evidence: {
      normalizedScore: score,
      matchedFacets: [],
      sourceMatches: [],
      graphPaths: [],
      abstentionEligible: false,
    },
  };
}

const req = (id: string, extra: Entity = {}): Entity => ({
  id,
  type: "req",
  title: `${id} title`,
  status: "open",
  ...extra,
});
const of = (type: string, id: string, extra: Entity = {}): Entity => ({
  id,
  type,
  title: `${id} title`,
  ...extra,
});
const kb = (...entities: Entity[]) =>
  Object.fromEntries(entities.map((entity) => [String(entity.id), entity]));

const NO_VERDICT = { status: "none", witnesses: [] } as const;
const SCOPE = {
  branch: null,
  snapshotId: "snap-1",
  syncedAt: "2026-10-01T00:00:00Z",
} as const;
const GOVERNING_NOTE = answerNote(1, []);
const EMPTY_NOTE = answerNote(0, []);

/** A governing requirement with nothing linked, as the answer lists it. */
function governed(
  id: string,
  score: number,
  via: string,
  extra: Partial<SearchAnswerRequirement> = {},
): SearchAnswerRequirement {
  return {
    id,
    title: `${id} title`,
    status: "open",
    firmness: "firm",
    score,
    via,
    facts: [],
    scenarios: [],
    tests: [],
    adrs: [],
    verdict: NO_VERDICT,
    exceptions: [],
    unknowns: [],
    ...extra,
  };
}

function answerOf(over: Partial<SearchAnswer>): SearchAnswer {
  return {
    version: "kibi.search-answer.v1",
    governing: [],
    rationale: [],
    notGoverning: [],
    observations: [],
    ungoverned: [],
    scope: SCOPE,
    truncated: false,
    note: GOVERNING_NOTE,
    ...over,
  };
}

describe("building an answer", () => {
  test("a matched requirement alone, with every round trip", async () => {
    const port = fakeKb(kb(req("R1")), []);
    const answer = await buildSearchAnswer(port, [hit(req("R1"), 0.7)], {
      branch: "main",
    });
    expect(answer).toStrictEqual(
      answerOf({
        governing: [governed("R1", 0.7, "matched")],
        scope: { ...SCOPE, branch: "main" },
      }),
    );
    expect(port.goals).toEqual([
      `${edgesQuery(["R1"])}, ${rowsQuery(["R1"])}`,
      `discovery:search_answer_verdicts_json(['R1'], JsonString)`,
    ]);
  });

  test("an empty search is an empty answer", async () => {
    const port = fakeKb({}, []);
    expect(await buildSearchAnswer(port, [])).toStrictEqual(
      answerOf({ note: EMPTY_NOTE }),
    );
  });

  test("only the first ten matches are read", async () => {
    const flags = Array.from({ length: 11 }, (_, i) => of("flag", `G${i}`));
    const ten = fakeKb(kb(...flags), []);
    expect(
      (
        await buildSearchAnswer(
          ten,
          flags.slice(0, 10).map((f) => hit(f)),
        )
      ).truncated,
    ).toBe(false);
    const eleven = fakeKb(kb(...flags), []);
    const answer = await buildSearchAnswer(
      eleven,
      flags.map((f) => hit(f)),
    );
    expect(answer.truncated).toBe(true);
    expect(eleven.goals[0]).toBe(
      `${edgesQuery(flags.slice(0, 10).map((f) => String(f.id)))}, ${rowsQuery(flags.slice(0, 10).map((f) => String(f.id)))}`,
    );
  });

  test("owners are proposed at a discount, the first of equal scores kept", async () => {
    const entities = kb(
      req("R1"),
      of("symbol", "Y1"),
      of("symbol", "Y2"),
      of("symbol", "Y3"),
      req("R2"),
    );
    const edges: EdgeRow[] = [
      ["implements", "Y1", "R1"],
      ["implements", "Y2", "R1"],
      ["implements", "Y1", "R2"],
      ["implements", "Y3", "R2"],
    ];
    const answer = await buildSearchAnswer(fakeKb(entities, edges), [
      hit(entities.Y1 as Entity, 0.5),
      hit(entities.Y2 as Entity, 0.5),
      hit(entities.Y3 as Entity, 1),
    ]);
    expect(answer.governing).toStrictEqual([
      governed("R2", 0.9, "symbol Y3"),
      governed("R1", 0.45, "symbol Y1"),
    ]);
  });

  test("the store row decides the type and fields of a match", async () => {
    const entities = kb(req("R1", { title: "stored" }));
    const answer = await buildSearchAnswer(fakeKb(entities, []), [
      hit(of("symbol", "R1", { title: "searched" })),
    ]);
    expect(answer.governing).toStrictEqual([
      governed("R1", 1, "matched", { title: "stored" }),
    ]);
  });

  test("a requirement proposed before it is matched keeps the earlier proposal", async () => {
    const entities = kb(req("R1"), of("symbol", "Y1"));
    const answer = await buildSearchAnswer(
      fakeKb(entities, [["implements", "Y1", "R1"]]),
      [hit(entities.Y1 as Entity, 1), hit(entities.R1 as Entity, 0.5)],
    );
    expect(answer.governing).toStrictEqual([governed("R1", 0.9, "symbol Y1")]);
    const twice = await buildSearchAnswer(fakeKb(entities, []), [
      hit(entities.R1 as Entity, 0.5),
      hit(entities.R1 as Entity, 0.9),
    ]);
    expect(twice.governing).toStrictEqual([governed("R1", 0.5, "matched")]);
  });

  test("matched ADRs are rationale unless superseded, deprecated or rejected", async () => {
    const adrs = ["accepted", "superseded", "deprecated", "rejected"].map(
      (status) => of("adr", `A-${status}`, { status }),
    );
    const answer = await buildSearchAnswer(
      fakeKb(kb(...adrs), []),
      adrs.map((adr) => hit(adr)),
    );
    expect(answer).toStrictEqual(
      answerOf({
        rationale: [
          {
            id: "A-accepted",
            title: "A-accepted title",
            status: "accepted",
            firmness: "firm",
          },
        ],
        note: EMPTY_NOTE,
      }),
    );
  });

  test("at most three rationale entries are kept", async () => {
    const adrs = [1, 2, 3, 4].map((i) => of("adr", `A${i}`));
    const three = await buildSearchAnswer(
      fakeKb(kb(...adrs), []),
      adrs.slice(0, 3).map((adr) => hit(adr)),
    );
    expect(three.truncated).toBe(false);
    expect(three.rationale.map((adr) => adr.id)).toEqual(["A1", "A2", "A3"]);
    const four = await buildSearchAnswer(
      fakeKb(kb(...adrs), []),
      adrs.map((adr) => hit(adr)),
    );
    expect(four.truncated).toBe(true);
    expect(four.rationale.map((adr) => adr.id)).toEqual(["A1", "A2", "A3"]);
  });

  test("notes are observations, stubs are skipped, and three notes are kept", async () => {
    const notes = [
      of("fact", "N1", { fact_kind: "observation" }),
      of("fact", "N2", { fact_kind: "meta" }),
      of("fact", "N3", { fact_kind: "observation" }),
    ];
    const stub = of("fact", "STUB", { tags: ["bootstrap:provenance-stub"] });
    const odd = of("scenario", "S1", { fact_kind: "observation" });
    const entities = kb(
      ...notes,
      stub,
      odd,
      of("fact", "N4", { fact_kind: "meta" }),
    );
    const answer = await buildSearchAnswer(fakeKb(entities, []), [
      ...notes.map((note) => hit(note)),
      hit(stub),
      hit(odd),
    ]);
    expect(answer).toStrictEqual(
      answerOf({
        observations: notes.map((note) => ({
          id: String(note.id),
          title: `${String(note.id)} title`,
        })),
        ungoverned: [
          { id: "S1", title: "S1 title", type: "scenario", rank: 5 },
        ],
        note: answerNote(0, [
          { id: "S1", title: "", type: "scenario", rank: 5 },
        ]),
      }),
    );
    const four = await buildSearchAnswer(fakeKb(entities, []), [
      ...notes.map((note) => hit(note)),
      hit(entities.N4 as Entity),
    ]);
    expect(four.truncated).toBe(true);
    expect(four.observations.map((note) => note.id)).toEqual([
      "N1",
      "N2",
      "N3",
    ]);
  });
});

describe("reaching requirements through matches", () => {
  test("a fact a scenario assumes reaches the scenario's requirement", async () => {
    const entities = kb(
      req("R1"),
      of("scenario", "S1"),
      of("scenario", "S2"),
      of("fact", "F1"),
      of("fact", "F2"),
      of("fact", "F3"),
    );
    const edges: EdgeRow[] = [
      ["specified_by", "R1", "S1"],
      ["assumes", "S1", "F1"],
      ["assumes", "S1", "F1"],
      ["assumes", "S2", "F2"],
      ["relates_to", "S2", "F3"],
      ["assumes", "F3", "S2"],
    ];
    const answer = await buildSearchAnswer(fakeKb(entities, edges), [
      hit(entities.F1 as Entity),
      hit(entities.F2 as Entity, 0.5),
      hit(entities.F3 as Entity, 0.4),
    ]);
    expect(answer.governing).toStrictEqual([
      governed("R1", 0.85, "fact F1 via S1", {
        scenarios: [{ id: "S1", title: "S1 title" }],
      }),
    ]);
    expect(answer.ungoverned).toStrictEqual([
      { id: "F2", title: "F2 title", type: "fact", rank: 2 },
      { id: "F3", title: "F3 title", type: "fact", rank: 3 },
    ]);
  });

  test("an owned fact reaches its owner even when a scenario assumes it", async () => {
    const entities = kb(
      req("R1"),
      req("R2"),
      of("scenario", "S1"),
      of("fact", "F1"),
    );
    const answer = await buildSearchAnswer(
      fakeKb(entities, [
        ["requires_rule", "R1", "F1"],
        ["assumes", "S1", "F1"],
        ["specified_by", "R2", "S1"],
      ]),
      [hit(entities.F1 as Entity)],
    );
    expect(answer.governing.map(({ id, via }) => `${id} ${via}`)).toEqual([
      "R1 fact F1",
    ]);
  });

  test("only assumes links make a scenario's fact", async () => {
    const entities = kb(req("R1"), of("scenario", "S1"), of("fact", "F1"));
    const answer = await buildSearchAnswer(
      fakeKb(entities, [
        ["relates_to", "S1", "F1"],
        ["specified_by", "R1", "S1"],
      ]),
      [hit(entities.F1 as Entity)],
    );
    expect(answer.governing).toEqual([]);
    expect(answer.ungoverned).toStrictEqual([
      { id: "F1", title: "F1 title", type: "fact", rank: 1 },
    ]);
  });

  test("an unowned symbol is listed", async () => {
    const entities = kb(of("symbol", "Y1"));
    const answer = await buildSearchAnswer(fakeKb(entities, []), [
      hit(entities.Y1 as Entity),
    ]);
    expect(answer.ungoverned).toStrictEqual([
      { id: "Y1", title: "Y1 title", type: "symbol", rank: 1 },
    ]);
  });

  test("an unowned scenario something assumes is not read as a fact", async () => {
    const entities = kb(of("scenario", "S1"), of("scenario", "S2"));
    const answer = await buildSearchAnswer(
      fakeKb(entities, [["assumes", "S2", "S1"]]),
      [hit(entities.S1 as Entity)],
    );
    expect(answer.ungoverned).toStrictEqual([
      { id: "S1", title: "S1 title", type: "scenario", rank: 1 },
    ]);
  });

  test("a matched test reaches a requirement directly or through a scenario", async () => {
    const entities = kb(
      req("R1"),
      req("R2"),
      req("R3"),
      of("scenario", "S1"),
      of("scenario", "S9"),
      of("test", "T1"),
      of("test", "T2"),
      of("test", "T3"),
    );
    const edges: EdgeRow[] = [
      ["verified_by", "R1", "T1"],
      ["relates_to", "S9", "R1"],
      ["verified_by", "S1", "T2"],
      ["specified_by", "R2", "S1"],
      ["specified_by", "R2", "S9"],
      ["validates", "T3", "R3"],
    ];
    const answer = await buildSearchAnswer(fakeKb(entities, edges), [
      hit(entities.T1 as Entity),
      hit(entities.T2 as Entity),
      hit(entities.T3 as Entity, 0.5),
    ]);
    expect(answer.governing).toStrictEqual([
      governed("R1", 0.9, "test T1", {
        tests: [{ id: "T1", title: "T1 title", via: "direct" }],
      }),
      governed("R2", 0.85, "test T2 via S1", {
        scenarios: [
          { id: "S1", title: "S1 title" },
          { id: "S9", title: "S9 title" },
        ],
        tests: [{ id: "T2", title: "T2 title", via: "S1" }],
      }),
      governed("R3", 0.45, "test T3", {
        tests: [{ id: "T3", title: "T3 title", via: "direct" }],
      }),
    ]);
  });

  const five = [1, 2, 3, 4, 5].map((i) => of("scenario", `S${i}`));
  const loose = kb(
    ...five,
    of("test", "T1"),
    of("fact", "F1"),
    of("fact", "F2"),
    of("scenario", "SA"),
  );
  const looseEdges: EdgeRow[] = [["assumes", "SA", "F2"]];
  const listed = (answer: SearchAnswer) =>
    answer.ungoverned.map(({ id, rank }) => `${id}@${rank}`);

  test("unowned matches are listed by rank", async () => {
    const answer = await buildSearchAnswer(fakeKb(loose, looseEdges), [
      hit(loose.T1 as Entity),
      hit(loose.F2 as Entity),
      hit(loose.S1 as Entity),
      hit(loose.F1 as Entity),
      hit(loose.S2 as Entity),
    ]);
    expect(listed(answer)).toEqual(["T1@1", "F2@2", "S1@3", "F1@4", "S2@5"]);
    expect(answer.truncated).toBe(false);
  });

  test("a sixth unowned fact, scenario or test truncates the list", async () => {
    const first = await buildSearchAnswer(fakeKb(loose, looseEdges), [
      hit(loose.F1 as Entity),
      ...five.map((s) => hit(s)),
    ]);
    expect(listed(first)).toEqual(["F1@1", "S1@2", "S2@3", "S3@4", "S4@5"]);
    expect(first.truncated).toBe(true);
    const test = await buildSearchAnswer(fakeKb(loose, looseEdges), [
      ...five.map((s) => hit(s)),
      hit(loose.T1 as Entity),
    ]);
    expect(listed(test)).toEqual(["S1@1", "S2@2", "S3@3", "S4@4", "S5@5"]);
    expect(test.truncated).toBe(true);
    const assumed = await buildSearchAnswer(fakeKb(loose, looseEdges), [
      ...five.map((s) => hit(s)),
      hit(loose.F2 as Entity),
    ]);
    expect(listed(assumed)).toEqual(["S1@1", "S2@2", "S3@3", "S4@4", "S5@5"]);
    expect(assumed.truncated).toBe(true);
    const scenario = await buildSearchAnswer(fakeKb(loose, looseEdges), [
      ...five.map((s) => hit(s)),
      hit(loose.SA as Entity),
    ]);
    expect(scenario.truncated).toBe(true);
  });

  test("the fifth unowned test or assumed fact still fits", async () => {
    const four = five.slice(0, 4).map((s) => hit(s));
    const test = await buildSearchAnswer(fakeKb(loose, looseEdges), [
      ...four,
      hit(loose.T1 as Entity),
    ]);
    expect(listed(test)).toEqual(["S1@1", "S2@2", "S3@3", "S4@4", "T1@5"]);
    expect(test.truncated).toBe(false);
    const fact = await buildSearchAnswer(fakeKb(loose, looseEdges), [
      ...four,
      hit(loose.F2 as Entity),
    ]);
    expect(fact.ungoverned[4]).toStrictEqual({
      id: "F2",
      title: "F2 title",
      type: "fact",
      rank: 5,
    });
    expect(fact.truncated).toBe(false);
  });

  test("matches without an id are never listed as unowned tests or facts", async () => {
    const entities = kb(of("scenario", "SX"));
    const answer = await buildSearchAnswer(
      fakeKb(entities, [["assumes", "SX", ""]]),
      [
        hit({ id: "", type: "test", title: "nameless" }),
        hit(entities.SX as Entity),
        hit({ id: "", type: "fact", title: "nameless" }),
      ],
    );
    expect(answer.ungoverned).toStrictEqual([
      { id: "SX", title: "SX title", type: "scenario", rank: 2 },
    ]);
    expect(answer.truncated).toBe(false);
    const fact = await buildSearchAnswer(fakeKb({}, []), [
      hit({ id: "", type: "fact", title: "nameless" }),
    ]);
    expect(fact.ungoverned).toStrictEqual([
      { id: "", title: "nameless", type: "fact", rank: 1 },
    ]);
  });
});

describe("choosing governing requirements", () => {
  const chain = kb(req("R1"), req("R2"), req("R3"), req("R4"), req("R5"));
  const chainEdges: EdgeRow[] = [
    ["supersedes", "R2", "R1"],
    ["supersedes", "R3", "R2"],
    ["supersedes", "R4", "R3"],
    ["supersedes", "R5", "R4"],
    ["relates_to", "R4", "R1"],
  ];
  const notCurrent = (id: string, supersededBy?: string) => ({
    id,
    title: `${id} title`,
    status: "open",
    firmness: "firm" as const,
    ...(supersededBy ? { supersededBy } : {}),
  });

  test("a supersession chain is followed three hops and the last is checked", async () => {
    const port = fakeKb(chain, chainEdges);
    const answer = await buildSearchAnswer(port, [hit(chain.R1 as Entity)]);
    expect(answer).toStrictEqual(
      answerOf({
        notGoverning: [
          notCurrent("R1", "R2"),
          notCurrent("R2", "R3"),
          notCurrent("R3", "R4"),
          notCurrent("R4", "R5"),
        ],
        note: EMPTY_NOTE,
      }),
    );
    expect(port.goals).toEqual([
      `${edgesQuery(["R1"])}, ${rowsQuery(["R1"])}`,
      `${edgesQuery(["R2"])}, ${rowsQuery(["R2"])}`,
      `${edgesQuery(["R3"])}, ${rowsQuery(["R3"])}`,
      `${edgesQuery(["R4"])}, ${rowsQuery(["R4"])}`,
      "discovery:search_answer_verdicts_json([], JsonString)",
    ]);
  });

  test("a replacement two hops away governs with the compounded score", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(chain, chainEdges.slice(0, 2)),
      [hit(chain.R1 as Entity)],
    );
    expect(answer.governing).toStrictEqual([
      governed("R3", 0.95 * 0.95, "supersedes R2"),
    ]);
    expect(answer.notGoverning).toStrictEqual([
      notCurrent("R1", "R2"),
      notCurrent("R2", "R3"),
    ]);
  });

  test("a replacement that is already a candidate keeps its own score", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(chain, chainEdges.slice(0, 1)),
      [hit(chain.R1 as Entity), hit(chain.R2 as Entity, 0.5)],
    );
    expect(answer.governing).toStrictEqual([governed("R2", 0.5, "matched")]);
  });

  test("ties are ordered by id and a lower score sorts after", async () => {
    const entities = kb(req("RB"), req("RA"), req("RC"));
    const port = fakeKb(entities, []);
    const answer = await buildSearchAnswer(port, [
      hit(entities.RB as Entity, 0.5),
      hit(entities.RC as Entity, 0.2),
      hit(entities.RA as Entity, 0.5),
    ]);
    expect(answer.governing.map((r) => r.id)).toEqual(["RA", "RB", "RC"]);
    const order = await buildSearchAnswer(fakeKb(entities, []), [
      hit(entities.RC as Entity, 0.2),
      hit(entities.RB as Entity, 0.3),
      hit(entities.RA as Entity, 0.9),
    ]);
    expect(order.governing.map((r) => r.id)).toEqual(["RA", "RB", "RC"]);
  });

  test("candidates are fetched by score", async () => {
    const entities = kb(
      req("RA"),
      req("RB"),
      of("symbol", "Y1"),
      of("symbol", "Y2"),
      of("test", "T1"),
    );
    const port = fakeKb(entities, [
      ["implements", "Y1", "RA"],
      ["implements", "Y2", "RB"],
      ["verified_by", "RA", "T1"],
    ]);
    await buildSearchAnswer(port, [
      hit(entities.Y1 as Entity, 0.2),
      hit(entities.Y2 as Entity, 0.9),
      hit(entities.T1 as Entity, 0.1),
    ]);
    expect(port.goals[1]).toBe(
      `${edgesQuery(["RA", "RB"])}, ${rowsQuery(["RB", "RA"])}`,
    );
  });

  test("owners that are not stored requirements are skipped", async () => {
    const entities = kb(
      of("symbol", "Y1"),
      of("adr", "A1"),
      req("R1", { type: "fact" }),
    );
    const answer = await buildSearchAnswer(
      fakeKb(entities, [
        ["implements", "Y1", "A1"],
        ["implements", "Y1", "GONE"],
        ["implements", "Y1", "R1"],
      ]),
      [hit(entities.Y1 as Entity)],
    );
    expect(answer.governing).toEqual([]);
    expect(answer.notGoverning).toEqual([]);
  });

  test("a matched owner without a type counts as a requirement", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(kb(of("symbol", "Y1")), [["implements", "Y1", "X1"]]),
      [
        hit(of("symbol", "Y1")),
        hit({ id: "X1", title: "untyped", status: "open" }),
      ],
    );
    expect(answer.governing).toStrictEqual(
      [
        {
          ...governed("X1", 0.9, "symbol Y1"),
          title: "untyped",
          firmness: undefined,
        },
      ].map(({ firmness: _f, ...rest }) => rest),
    );
  });

  test("every current status governs, five at most", async () => {
    const statuses = ["open", "in_progress", "closed", "active", "approved"];
    const current = statuses.map((status, i) => req(`R${i}`, { status }));
    const five = await buildSearchAnswer(
      fakeKb(kb(...current), []),
      current.map((r) => hit(r)),
    );
    expect(five.governing.map((r) => r.status)).toEqual(statuses);
    expect(five.truncated).toBe(false);
    const extra = req("R9");
    const six = await buildSearchAnswer(
      fakeKb(kb(...current, extra), []),
      [...current, extra].map((r) => hit(r)),
    );
    expect(six.governing.map((r) => r.id)).toEqual([
      "R0",
      "R1",
      "R2",
      "R3",
      "R4",
    ]);
    expect(six.truncated).toBe(true);
  });

  test("other statuses are listed as not governing, five at most", async () => {
    const drafts = [1, 2, 3, 4, 5, 6].map((i) =>
      req(`D${i}`, { status: i === 1 ? "" : "draft" }),
    );
    const five = await buildSearchAnswer(
      fakeKb(kb(...drafts), []),
      drafts.slice(0, 5).map((r) => hit(r)),
    );
    expect(five.notGoverning).toStrictEqual([
      { id: "D1", title: "D1 title", firmness: "firm" as const },
      ...[2, 3, 4, 5].map((i) => ({
        id: `D${i}`,
        title: `D${i} title`,
        status: "draft",
        firmness: "firm" as const,
      })),
    ]);
    expect(five.truncated).toBe(false);
    const six = await buildSearchAnswer(
      fakeKb(kb(...drafts), []),
      drafts.map((r) => hit(r)),
    );
    expect(six.notGoverning).toHaveLength(5);
    expect(six.truncated).toBe(true);
  });
});

describe("what a governing requirement links to", () => {
  const entities = kb(
    req("R"),
    req("R2"),
    req("RX"),
    of("scenario", "S1"),
    of("scenario", "S2"),
    of("test", "T1"),
    of("test", "T2"),
    of("test", "T3"),
    of("test", "T4"),
    of("test", "TX"),
    of("fact", "F1"),
    of("fact", "F2"),
    of("fact", "F3", { fact_kind: "subject", subject_key: "cart" }),
    of("fact", "F4"),
    of("fact", "FX"),
    of("adr", "A1", { status: "accepted", source: "adr/a1.md" }),
    of("adr", "A2", { status: "superseded" }),
    req("E1", { approved_by: "  lead  " }),
    req("E2", { approved_by: "   " }),
  );
  const edges: EdgeRow[] = [
    ["specified_by", "R", "S1"],
    ["specified_by", "R", "S2"],
    ["specified_by", "R", "S-GONE"],
    ["specified_by", "RX", "R"],
    ["verified_by", "R", "T1"],
    ["validates", "T2", "R"],
    ["verified_by", "S1", "T3"],
    ["verified_by", "S1", "T1"],
    ["validates", "T4", "S2"],
    ["validates", "R", "TX"],
    ["verified_by", "RX", "R"],
    ["requires_rule", "R", "F1"],
    ["constrains", "R", "F2"],
    ["requires_property", "R", "F3"],
    ["requires_predicate", "R", "F4"],
    ["constrains", "FX", "R"],
    ["relates_to", "R", "A1"],
    ["relates_to", "A2", "R"],
    ["relates_to", "R", "R2"],
    ["exempts", "E1", "R"],
    ["exempts", "E2", "R"],
    ["exempts", "R", "RX"],
  ];
  const verdicts = (ids: string[]) => ({
    requirements: ids.map((id) =>
      id === "R"
        ? {
            id: "file:///x/R",
            contradictions: [
              {
                status: "contradiction",
                with: "R2",
                facts: ["F1"],
                reason: "clash",
              },
            ],
          }
        : { id },
    ),
    scope: { snapshotId: "snap-2", syncedAt: 7 },
  });

  test("lists facts, scenarios, tests, ADRs, exceptions and the verdict", async () => {
    const port = fakeKb(entities, edges, { verdicts });
    const answer = await buildSearchAnswer(port, [
      hit(entities.R as Entity),
      hit(entities.F3 as Entity),
    ]);
    expect(answer).toStrictEqual(
      answerOf({
        governing: [
          governed("R", 1, "matched", {
            facts: [
              {
                id: "F3",
                title: "F3 title",
                factKind: "subject",
                claim: "cart",
                ask: 'kb_query({"subjectKey":"cart"})',
              },
              { id: "F1", title: "F1 title" },
              { id: "F4", title: "F4 title" },
              { id: "F2", title: "F2 title" },
            ],
            scenarios: [
              { id: "S1", title: "S1 title" },
              { id: "S2", title: "S2 title" },
            ],
            tests: [
              { id: "T1", title: "T1 title", via: "direct" },
              { id: "T2", title: "T2 title", via: "direct" },
              { id: "T3", title: "T3 title", via: "S1" },
              { id: "T4", title: "T4 title", via: "S2" },
            ],
            adrs: [
              {
                id: "A1",
                title: "A1 title",
                status: "accepted",
                firmness: "firm",
              },
            ],
            verdict: {
              status: "contradiction",
              witnesses: [
                {
                  check: "domain-contradictions",
                  status: "contradiction",
                  with: "R2",
                  facts: ["F1"],
                  detail: "clash",
                },
              ],
            },
            exceptions: [
              { ...brief(entities.E1 as Entity), approvedBy: "lead" },
              brief(entities.E2 as Entity),
            ],
          }),
        ],
        rationale: [
          {
            id: "A1",
            title: "A1 title",
            status: "accepted",
            firmness: "firm",
            source: "adr/a1.md",
          },
        ],
        scope: { branch: null, snapshotId: "snap-2", syncedAt: null },
      }),
    );
    expect(port.goals).toEqual([
      `${edgesQuery(["R", "F3"])}, ${rowsQuery(["R", "F3"])}`,
      `${edgesQuery(["S1", "S2", "S-GONE"])}, ${rowsQuery(["F1", "F4", "F2", "S1", "S2", "S-GONE", "A1", "R2", "A2", "E1", "E2", "T1", "T2"])}, ${factSchemasGoal(["F3", "F1", "F4", "F2"])}`,
      `${rowsQuery(["T3", "T4"])}, discovery:search_answer_verdicts_json(['R'], JsonString)`,
    ]);
  });

  const linked = (rel: string, count: number, into = false) => {
    const ids = Array.from({ length: count }, (_, i) => `L${i}`);
    const type =
      rel === "specified_by"
        ? "scenario"
        : rel === "relates_to" || rel === "exempts"
          ? "req"
          : rel === "verified_by"
            ? "test"
            : "fact";
    return {
      entities: kb(req("R"), ...ids.map((id) => of(type, id))),
      edges: ids.map((id): EdgeRow => (into ? [rel, id, "R"] : [rel, "R", id])),
    };
  };

  for (const [rel, into, limit] of [
    ["specified_by", false, 4],
    ["verified_by", false, 4],
    ["relates_to", false, 4],
    ["relates_to", true, 4],
    ["exempts", true, 4],
    ["requires_rule", false, 8],
  ] as const) {
    test(`${rel}${into ? " into" : ""} keeps ${limit} links before truncating`, async () => {
      const fits = linked(rel, limit, into);
      const at = await buildSearchAnswer(fakeKb(fits.entities, fits.edges), [
        hit(fits.entities.R as Entity),
      ]);
      expect(at.truncated).toBe(false);
      const over = linked(rel, limit + 1, into);
      const cut = await buildSearchAnswer(fakeKb(over.entities, over.edges), [
        hit(over.entities.R as Entity),
      ]);
      expect(cut.truncated).toBe(true);
      const [first] = cut.governing;
      const lists = first
        ? [first.scenarios, first.tests, first.exceptions, first.facts]
        : [];
      const kept = Math.max(
        ...lists.map((list) => list.length),
        cut.rationale.length,
      );
      expect(kept).toBe(rel === "relates_to" ? 0 : limit);
    });
  }

  test("left-out facts are counted with the ask that lists them", async () => {
    const over = linked("requires_rule", 10);
    const answer = await buildSearchAnswer(fakeKb(over.entities, over.edges), [
      hit(over.entities.R as Entity),
    ]);
    expect(answer.governing[0]?.moreFacts).toStrictEqual({
      count: 2,
      ask: 'kb_query({"id":"R"})',
    });
    const fits = linked("requires_rule", 8);
    const full = await buildSearchAnswer(fakeKb(fits.entities, fits.edges), [
      hit(fits.entities.R as Entity),
    ]);
    expect(full.governing[0]).not.toHaveProperty("moreFacts");
  });

  test("only the first four direct tests are loaded with the plan", async () => {
    const over = linked("verified_by", 5);
    const port = fakeKb(over.entities, over.edges);
    await buildSearchAnswer(port, [hit(over.entities.R as Entity)]);
    expect(port.goals[1]).toBe(rowsQuery(["L0", "L1", "L2", "L3"]));
  });

  test("a verdict cut to the limit truncates the answer", async () => {
    const clash = { status: "contradiction", reason: "c" };
    const answer = await buildSearchAnswer(
      fakeKb(kb(req("R")), [], {
        verdicts: () => ({
          requirements: [{ id: "R", contradictions: Array(5).fill(clash) }],
        }),
      }),
      [hit(req("R"))],
    );
    expect(answer.truncated).toBe(true);
    expect(answer.scope).toStrictEqual({
      branch: null,
      snapshotId: "unknown",
      syncedAt: null,
    });
  });

  test("a requirement without a verdict row is unknown, without verdicts unavailable", async () => {
    const missing = await buildSearchAnswer(
      fakeKb(kb(req("R")), [], { verdicts: () => ({ requirements: [] }) }),
      [hit(req("R"))],
    );
    expect(missing.governing[0]?.verdict.status).toBe("unknown");
    expect(missing.truncated).toBe(false);
    const none = await buildSearchAnswer(
      fakeKb(kb(req("R")), [], { verdicts: () => "not json" }),
      [hit(req("R"))],
    );
    expect(none.governing[0]?.unknowns).toStrictEqual([
      {
        kind: "verdict_unavailable",
        detail: "The checks could not be evaluated for this requirement.",
        entities: [],
      },
    ]);
    expect(none.scope).toStrictEqual({
      branch: null,
      snapshotId: "unknown",
      syncedAt: null,
    });
  });
});

describe("unowned facts next to governing facts", () => {
  const predicate = (id: string, args: string[], name = "has_role") =>
    of("fact", id, {
      fact_kind: "predicate",
      predicate_name: name,
      predicate_args: args,
    });
  const entities = kb(
    req("R"),
    predicate("FG", ["alice", "admin"]),
    predicate("FU", ["alice", "viewer"]),
    predicate("FS", ["bob", "viewer"]),
    predicate("FN", ["carol"], ""),
    predicate("FM", ["carol", "x"], ""),
    of("scenario", "SU", { fact_kind: "subject", subject_key: "k" }),
  );
  const edges: EdgeRow[] = [
    ["requires_predicate", "R", "FG"],
    ["requires_predicate", "R", "FN"],
  ];
  const keyed = { names: ["user", "role"], keys: ["user"] };
  const schemas = {
    FG: keyed,
    FU: keyed,
    FS: keyed,
    FM: { names: ["who", "what"], keys: ["who"] },
    FN: { names: ["who"], keys: ["who"] },
  };

  test("a disagreeing unowned fact names the governing fact that holds", async () => {
    const port = fakeKb(entities, edges, { schemas });
    const answer = await buildSearchAnswer(port, [
      hit(entities.SU as Entity),
      hit(entities.FU as Entity),
      hit(entities.R as Entity),
      hit(entities.FS as Entity),
    ]);
    expect(answer.ungoverned).toStrictEqual([
      { id: "SU", title: "SU title", type: "scenario", rank: 1 },
      {
        id: "FU",
        title: "FU title",
        factKind: "predicate",
        claim: "has_role(alice, viewer)",
        ask: 'kb_query({"predicate":"has_role","where":{"user":"alice"}})',
        type: "fact",
        rank: 2,
        overriddenBy: {
          fact: "FG",
          requirement: "R",
          claim: "has_role(alice, admin)",
        },
      },
      {
        id: "FS",
        title: "FS title",
        factKind: "predicate",
        claim: "has_role(bob, viewer)",
        ask: 'kb_query({"predicate":"has_role","where":{"user":"bob"}})',
        type: "fact",
        rank: 4,
      },
    ]);
    expect(answer.note).toStartWith(
      "The top-ranked match SU (scenario) is linked to no requirement; ",
    );
    expect(port.goals[1]).toEndWith(factSchemasGoal(["FU", "FS", "FG", "FN"]));
  });

  test("a governing fact without a claim is named without one", async () => {
    const answer = await buildSearchAnswer(
      fakeKb(
        kb(
          req("R"),
          predicate("FN", ["carol", "y"], ""),
          predicate("FM", ["carol", "x"], ""),
        ),
        [["requires_predicate", "R", "FN"]],
        { schemas },
      ),
      [hit(req("R")), hit(predicate("FM", ["carol", "x"], ""))],
    );
    expect(answer.ungoverned).toStrictEqual([
      {
        id: "FM",
        title: "FM title",
        factKind: "predicate",
        type: "fact",
        rank: 2,
        overriddenBy: { fact: "FN", requirement: "R" },
      },
    ]);
  });
});

describe("fitting an answer into its byte budget", () => {
  const long = (char: string, n: number) => char.repeat(n);
  const clipped = (char: string) => `${long(char, 159)}…`;
  /** The answer fitSearchAnswer returns when the budget is its own size. */
  const fitsAs = (answer: SearchAnswer, expected: SearchAnswer) =>
    expect(fitSearchAnswer(answer, byteSize(expected))).toStrictEqual(expected);

  test("an answer within budget is returned as it is", () => {
    const answer = answerOf({ governing: [governed("R", 1, "matched")] });
    expect(fitSearchAnswer(answer, byteSize(answer))).toBe(answer);
    expect(fitSearchAnswer(answerOf({}))).toStrictEqual(answerOf({}));
  });

  test("long titles, details and excerpts are clipped first", () => {
    const entity = (id: string) => ({ id, title: long("t", 200) });
    const answer = answerOf({
      governing: [
        {
          ...governed("R", 1, "matched"),
          title: long("r", 200),
          facts: [entity("F")],
          scenarios: [entity("S")],
          tests: [{ ...entity("T"), via: "direct" }],
          adrs: [entity("A")],
          exceptions: [entity("E")],
          verdict: {
            status: "contradiction",
            witnesses: [
              {
                check: "domain-contradictions",
                status: "contradiction",
                facts: [],
                detail: long("w", 300),
              },
            ],
          },
          unknowns: [
            {
              kind: "verdict_unavailable",
              detail: long("u", 300),
              entities: [],
            },
          ],
        },
      ],
      rationale: [
        { id: "A", title: long("a", 200), excerpt: long("e", 300) },
        { id: "B", title: "b" },
      ],
      notGoverning: [entity("N")],
      observations: [entity("O")],
      ungoverned: [{ ...entity("U"), type: "fact", rank: 1 }],
    });
    const expected = answerOf({
      truncated: true,
      governing: [
        {
          ...governed("R", 1, "matched"),
          title: clipped("r"),
          facts: [{ id: "F", title: clipped("t") }],
          scenarios: [{ id: "S", title: clipped("t") }],
          tests: [{ id: "T", title: clipped("t"), via: "direct" }],
          adrs: [{ id: "A", title: clipped("t") }],
          exceptions: [{ id: "E", title: clipped("t") }],
          verdict: {
            status: "contradiction",
            witnesses: [
              {
                check: "domain-contradictions",
                status: "contradiction",
                facts: [],
                detail: `${long("w", 239)}…`,
              },
            ],
          },
          unknowns: [
            {
              kind: "verdict_unavailable",
              detail: `${long("u", 239)}…`,
              entities: [],
            },
          ],
        },
      ],
      rationale: [
        { id: "A", title: clipped("a"), excerpt: `${long("e", 279)}…` },
        { id: "B", title: "b" },
      ],
      notGoverning: [{ id: "N", title: clipped("t") }],
      observations: [{ id: "O", title: clipped("t") }],
      ungoverned: [{ id: "U", title: clipped("t"), type: "fact", rank: 1 }],
    });
    fitsAs(answer, expected);
  });

  test("excerpts are dropped last entry first", () => {
    const answer = answerOf({
      rationale: [
        { id: "A", title: "a", excerpt: "first" },
        { id: "B", title: "b", excerpt: "second" },
      ],
    });
    fitsAs(
      answer,
      answerOf({
        truncated: true,
        rationale: [
          { id: "A", title: "a", excerpt: "first" },
          { id: "B", title: "b" },
        ],
      }),
    );
    fitsAs(
      answer,
      answerOf({
        truncated: true,
        rationale: [
          { id: "A", title: "a" },
          { id: "B", title: "b" },
        ],
      }),
    );
  });

  const test2 = (id: string) => ({ id, title: id, via: "direct" });
  const two = (id: string, extra: Partial<SearchAnswerRequirement> = {}) => ({
    ...governed(id, 1, "matched"),
    scenarios: [
      { id: `${id}S1`, title: "s" },
      { id: `${id}S2`, title: "s" },
    ],
    tests: [test2(`${id}T1`), test2(`${id}T2`)],
    ...extra,
  });
  const one = (req: SearchAnswerRequirement) => ({
    ...req,
    scenarios: req.scenarios.slice(0, 1),
    tests: req.tests.slice(0, 1),
  });

  test("second scenarios and tests go, last requirement first", () => {
    const answer = answerOf({ governing: [two("R1"), two("R2")] });
    fitsAs(
      answer,
      answerOf({ truncated: true, governing: [two("R1"), one(two("R2"))] }),
    );
    fitsAs(
      answer,
      answerOf({
        truncated: true,
        governing: [one(two("R1")), one(two("R2"))],
      }),
    );
    const scenariosOnly = answerOf({
      governing: [two("R1", { tests: [test2("T")] })],
    });
    fitsAs(
      scenariosOnly,
      answerOf({
        truncated: true,
        governing: [one(two("R1", { tests: [test2("T")] }))],
      }),
    );
    const testsOnly = answerOf({
      governing: [two("R1", { scenarios: [] })],
    });
    fitsAs(
      testsOnly,
      answerOf({
        truncated: true,
        governing: [one(two("R1", { scenarios: [] }))],
      }),
    );
  });

  test("then the least relevant requirements go, keeping the first", () => {
    const answer = answerOf({
      governing: [
        governed("R1", 1, "m"),
        governed("R2", 1, "m"),
        governed("R3", 1, "m"),
      ],
    });
    fitsAs(
      answer,
      answerOf({
        truncated: true,
        governing: [governed("R1", 1, "m"), governed("R2", 1, "m")],
      }),
    );
    fitsAs(
      answer,
      answerOf({ truncated: true, governing: [governed("R1", 1, "m")] }),
    );
  });

  const entity = (id: string) => ({ id, title: id });
  const bigFact = (id: string) => ({ id, title: long("f", 80) });
  const witness = (detail: string) => ({
    check: "domain-contradictions" as const,
    status: "contradiction" as const,
    facts: [],
    detail,
  });

  test("then side lists go, notes first, before the requirement's own lists", () => {
    const req: SearchAnswerRequirement = {
      ...governed("R", 1, "m"),
      facts: [bigFact("F1"), bigFact("F2")],
      scenarios: [entity("S")],
      tests: [{ ...entity("T"), via: "direct" }],
      adrs: [entity("A")],
      exceptions: [entity("E")],
      unknowns: [{ kind: "verdict_unavailable", detail: "u", entities: [] }],
      verdict: {
        status: "contradiction",
        witnesses: [witness("w1"), witness("w2")],
      },
    };
    const sides = {
      observations: [entity("O1"), entity("O2")],
      notGoverning: [entity("N")],
      ungoverned: [{ ...entity("U"), type: "fact", rank: 1 }],
      rationale: [entity("A")],
    };
    const answer = answerOf({ governing: [req], ...sides });
    const steps: Partial<SearchAnswer>[] = [];
    const at = (over: Partial<SearchAnswer>) => {
      steps.push(over);
      fitsAs(
        answer,
        answerOf({ truncated: true, governing: [req], ...sides, ...over }),
      );
    };
    at({ observations: [entity("O1")] });
    at({ observations: [] });
    at({ observations: [], notGoverning: [] });
    at({ observations: [], notGoverning: [], ungoverned: [] });
    const bare = {
      observations: [],
      notGoverning: [],
      ungoverned: [],
      rationale: [],
    };
    at(bare);
    const own = (over: Partial<SearchAnswerRequirement>) =>
      fitsAs(
        answer,
        answerOf({
          truncated: true,
          ...bare,
          governing: [{ ...req, ...over }],
        }),
      );
    const stripped = {
      unknowns: [],
      exceptions: [],
      adrs: [],
      tests: [],
      scenarios: [],
    };
    own({ unknowns: [] });
    own({ unknowns: [], exceptions: [] });
    own({ unknowns: [], exceptions: [], adrs: [] });
    own({ unknowns: [], exceptions: [], adrs: [], tests: [] });
    own(stripped);
    own({
      ...stripped,
      facts: [bigFact("F1")],
      moreFacts: { count: 1, ask: 'kb_query({"id":"R"})' },
    });
    own({
      ...stripped,
      facts: [],
      moreFacts: { count: 2, ask: 'kb_query({"id":"R"})' },
    });
    own({
      ...stripped,
      facts: [],
      moreFacts: { count: 2, ask: 'kb_query({"id":"R"})' },
      verdict: { status: "contradiction", witnesses: [witness("w1")] },
    });
    own({
      ...stripped,
      facts: [],
      moreFacts: { count: 2, ask: 'kb_query({"id":"R"})' },
      verdict: { status: "contradiction", witnesses: [] },
    });
  });

  test("a dropped fact adds to the count already left out", () => {
    const req = {
      ...governed("R", 1, "m"),
      facts: [entity("F1")],
      moreFacts: { count: 3, ask: "x" },
    };
    fitsAs(
      answerOf({ governing: [req] }),
      answerOf({
        truncated: true,
        governing: [
          {
            ...req,
            facts: [],
            moreFacts: { count: 4, ask: 'kb_query({"id":"R"})' },
          },
        ],
      }),
    );
  });

  test("then the requirement's title and via are clipped", () => {
    const req = { ...governed("R", 1, long("v", 10)), title: long("x", 50) };
    const answer = answerOf({ governing: [req] });
    fitsAs(
      answer,
      answerOf({
        truncated: true,
        governing: [{ ...req, title: `${long("x", 37)}…` }],
      }),
    );
    const short = { ...governed("R", 1, long("v", 40)), title: long("x", 5) };
    const tight = answerOf({ governing: [short] });
    fitsAs(
      tight,
      answerOf({
        truncated: true,
        governing: [{ ...short, title: "…", via: `${long("v", 19)}…` }],
      }),
    );
  });

  test("a requirement that cannot fit is dropped", () => {
    const req = governed("R", 1, "v");
    const answer = answerOf({ governing: [req] });
    expect(fitSearchAnswer(answer, 10)).toStrictEqual(
      answerOf({
        truncated: true,
        governing: [],
      }),
    );
    const titled = { ...req, title: "x" };
    expect(
      fitSearchAnswer(
        answerOf({ governing: [titled] }),
        byteSize(answerOf({ truncated: true, governing: [titled] })) - 1,
      ),
    ).toStrictEqual(answerOf({ truncated: true, governing: [] }));
  });

  test("an answer with nothing left to cut stays as clipped", () => {
    expect(
      fitSearchAnswer(answerOf({ note: long("n", 100) }), 10),
    ).toStrictEqual(answerOf({ note: long("n", 100), truncated: true }));
  });
});
