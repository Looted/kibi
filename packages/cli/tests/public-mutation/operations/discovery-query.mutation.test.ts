import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import {
  FACT_KINDS,
  QUERY_BODY_MAX_CHARS,
  executeQuery,
} from "../../../src/public/operations/discovery-executors.js";
import * as prologJson from "../../../src/public/operations/prolog-json.js";
import * as branchStore from "../../../src/utils/branch-store.js";
import { expectGolden } from "../helpers/golden.js";

// biome-ignore lint/suspicious/noExplicitAny: fakes stand in for wide types
type Loose = any;

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

// biome-ignore lint/suspicious/noExplicitAny: see Loose
function spy(module: any, name: string): Loose {
  const created = spyOn(module, name);
  spies.push(created);
  return created;
}

function undefinedKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) =>
      undefinedKeys(item, `${path}[${index}]`),
    );
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    item === undefined
      ? [`${path}.${key}`]
      : undefinedKeys(item, `${path}.${key}`),
  );
}

const SIGNAL = new AbortController().signal;
const PROLOG = { query: async () => ({ success: true, bindings: {} }) };

function context(extra: Record<string, unknown> = {}): Loose {
  return {
    workspaceRoot: "/ws",
    signal: SIGNAL,
    clock: () => new Date(0),
    prolog: PROLOG,
    ...extra,
  };
}

/** Run a fact question against a canned discovery answer. */
async function ask(input: Record<string, unknown>, response: unknown) {
  const run = spy(prologJson, "runOperationJsonQuery").mockResolvedValue(
    response,
  );
  const result = await executeQuery(input as never, context());
  expect(run).toHaveBeenCalledTimes(1);
  const [port, file, goal, label, signal] = run.mock.calls[0];
  expect([port, file, label, signal]).toEqual([
    PROLOG,
    "discovery.pl",
    "Query execution",
    SIGNAL,
  ]);
  run.mockRestore();
  expect(undefinedKeys(result)).toEqual([]);
  expect(result.content.map((entry) => entry.type)).toEqual(["text"]);
  return {
    goal,
    text: result.content[0]?.text,
    data: result.structuredContent,
  };
}

const FACT_CASES: [string, Record<string, unknown>, unknown][] = [
  [
    "predicate rows suggest a distinct count",
    {
      type: "fact",
      predicate: " color ",
      namespace: " paint ",
      where: { hue: "red" },
      polarity: "deny",
      scope: "current_requirements",
      limit: 2.7,
      offset: 1.2,
    },
    {
      mode: "predicate",
      rows: [
        {
          id: "F1",
          name: "color",
          args: ["car", "red"],
          effect: "blocked",
          polarity: "deny",
        },
        { id: "F2", name: "color", args: ["x", 1] },
      ],
      count: 5,
      warnings: ["w1"],
      predicate: { name: "color" },
      schema: { argumentNames: ["thing", "spare", "hue", 3] },
      distinct: null,
      suggestions: null,
    },
  ],
  [
    "positional predicate without matches suggests a value",
    { predicate: "color", args: [null, "*", " red "] },
    {
      mode: "predicate",
      rows: "none",
      warnings: "none",
      schema: { argumentNames: ["thing"] },
      suggestions: { thing: "not a list", hue: ["blue", "red"], size: ["s"] },
    },
  ],
  [
    "positional predicate rows suggest a distinct count",
    { predicate: "color", args: [null, "red"] },
    {
      mode: "predicate",
      rows: [
        { id: "F1", name: 5, args: ["car"] },
        { id: "F2", subjectKey: 1, propertyKey: "p" },
        { id: "F3", name: 5, arity: 1 },
      ],
      count: 3,
      schema: { argumentNames: ["thing", "hue"] },
      distinct: "flat",
      suggestions: "flat",
    },
  ],
  [
    "positional predicate suggests a named correction",
    { predicate: "color", args: ["car", "*", "red", "extra"] },
    {
      mode: "predicate",
      rows: [],
      count: 0,
      schema: { argumentNames: ["thing", "size", "hue"] },
      suggestions: { thing: ["car"], hue: ["blue"], size: ["s"] },
    },
  ],
  [
    "named predicate suggests only an argument whose value is missing",
    { predicate: "color", where: { hue: "red", thing: "car", extra: "x" } },
    {
      mode: "predicate",
      rows: [],
      count: 0,
      suggestions: {
        hue: ["red", "blue"],
        thing: [5, "boat"],
        extra: ["e1", "e2"],
      },
    },
  ],
  [
    "predicate warnings keep the schema listing as the next call",
    { predicate: "color", distinct: "hue" },
    {
      mode: "predicate",
      rows: [],
      count: 0,
      warnings: ["unknown predicate"],
      suggestions: { hue: ["x"] },
      distinct: { argument: "hue", values: ["a", "b"] },
      schema: null,
    },
  ],
  [
    "predicate distinct without values",
    { predicate: "color", distinct: "hue" },
    {
      mode: "predicate",
      rows: [{ id: "F1", name: "color", args: [] }],
      count: 1,
      distinct: { argument: "hue" },
      schema: { argumentNames: ["hue"] },
    },
  ],
  [
    "predicate with every argument bound",
    { predicate: "color", where: { hue: "red" } },
    {
      mode: "predicate",
      rows: [{ id: 7, name: "color", args: ["red"] }],
      count: 1,
      schema: { argumentNames: ["hue"] },
      suggestions: { hue: ["blue"] },
    },
  ],
  [
    "predicate schema that is not a list of names",
    { predicate: "color" },
    {
      mode: "predicate",
      rows: [{ name: "color", args: ["x"] }],
      count: 1,
      schema: { argumentNames: "hue" },
    },
  ],
  [
    "property with a property key",
    {
      subjectKey: " car ",
      propertyKey: " speed ",
      scope: "all",
      limit: 3,
    },
    {
      mode: "property",
      rows: [
        {
          id: "P1",
          subjectKey: "car",
          propertyKey: "speed",
          operator: ">",
          value: 3,
          unit: "kmh",
        },
        { id: "P2", subjectKey: "car", propertyKey: "color", unit: "" },
        { id: "P3", subjectKey: "car", propertyKey: "mass", unit: 5 },
      ],
      count: 3,
      property: { subjectKey: "car" },
      subjectFacts: ["F9"],
    },
  ],
  [
    "property of an unknown subject",
    { subjectKey: "ghost" },
    { mode: "property", rows: [], count: 0 },
  ],
  [
    "property rows of a known subject",
    { subjectKey: "car" },
    {
      mode: "property",
      rows: [{ subjectKey: "car", propertyKey: 1 }],
      count: 1,
    },
  ],
  [
    "schemas of a namespace",
    { factKind: "predicate_schema", namespace: "paint", predicate: "color" },
    {
      mode: "schemas",
      rows: [
        {
          name: "color",
          arity: 2,
          argumentNames: ["a", "b"],
          builtin: true,
          id: "S1",
        },
        { name: "x", arity: 0, builtin: true },
        { name: "y", arity: 1, argumentNames: "no" },
        { name: "z", arity: "1" },
      ],
      count: 4,
    },
  ],
  [
    "schemas without rows",
    { factKind: "predicate_schema" },
    { mode: "schemas", rows: [], count: 0 },
  ],
  [
    "predicate facts by kind",
    { factKind: "predicate" },
    {
      mode: "fact_kind",
      factKind: "predicate",
      rows: [{ id: "F1", title: "T" }],
      count: 1,
    },
  ],
  [
    "property values by kind",
    { factKind: "property_value" },
    {
      mode: "fact_kind",
      rows: [{ id: "V1", subject_key: "car" }, { id: "V2" }],
      count: 2,
    },
  ],
  [
    "property values without a subject key",
    { factKind: "property_value" },
    { mode: "fact_kind", rows: [{ id: "V1", subject_key: 3 }], count: 1 },
  ],
  [
    "property values without rows",
    { factKind: "property_value" },
    { mode: "fact_kind", rows: [], count: 0 },
  ],
  [
    "rules by kind",
    { factKind: "rule" },
    { mode: "fact_kind", rows: [{ id: "R1", title: "Rule" }, {}], count: 2 },
  ],
  [
    "observations by kind without rows",
    { factKind: "observation" },
    { mode: "fact_kind", rows: [], count: 0 },
  ],
];

describe("executeQuery typed fact questions", () => {
  test("answers each kind of question", async () => {
    const answers: unknown[] = [];
    for (const [name, input, response] of FACT_CASES)
      answers.push({ name, ...(await ask(input, response)) });
    expectGolden("discovery-fact-queries", answers);
  });

  test("asks every fact kind by name", async () => {
    const goals: string[] = [];
    for (const kind of FACT_KINDS)
      goals.push(
        (await ask({ factKind: kind }, { mode: "fact_kind", rows: [] })).goal,
      );
    expect(goals).toEqual([
      "discovery:ask_fact_kind_json('subject', 100, 0, JsonString)",
      "discovery:ask_fact_kind_json('property_value', 100, 0, JsonString)",
      "discovery:ask_fact_kind_json('predicate', 100, 0, JsonString)",
      "discovery:ask_schemas_json(none, none, 100, 0, JsonString)",
      "discovery:ask_fact_kind_json('observation', 100, 0, JsonString)",
      "discovery:ask_fact_kind_json('meta', 100, 0, JsonString)",
      "discovery:ask_fact_kind_json('rule', 100, 0, JsonString)",
      "discovery:ask_fact_kind_json('rule_schema', 100, 0, JsonString)",
    ]);
  });

  test("accepts each filter its mode reads", async () => {
    const goal = async (input: Record<string, unknown>, mode: string) =>
      (await ask(input, { mode, rows: [] })).goal;
    expect(
      await goal(
        { factKind: "predicate_schema", namespace: "n", predicate: "p" },
        "schemas",
      ),
    ).toBe("discovery:ask_schemas_json('n', 'p', 100, 0, JsonString)");
    expect(
      await goal(
        {
          predicate: "p",
          namespace: "n",
          args: ["a"],
          polarity: "assert",
          scope: "all",
          distinct: "d",
        },
        "predicate",
      ),
    ).toBe(
      "discovery:ask_predicate_json('n', 'p', ['a'], 'assert', all, 'd', 100, 0, JsonString)",
    );
    expect(
      await goal(
        { subjectKey: "s", propertyKey: "k", scope: "current_requirements" },
        "property",
      ),
    ).toBe(
      "discovery:ask_property_json('s', 'k', current_requirements, 100, 0, JsonString)",
    );
    expect(await goal({ predicate: "p" }, "predicate")).toBe(
      "discovery:ask_predicate_json(none, 'p', [], none, all, none, 100, 0, JsonString)",
    );
    expect(
      await goal({ predicate: "p", limit: 0, offset: 0 }, "predicate"),
    ).toBe(
      "discovery:ask_predicate_json(none, 'p', [], none, all, none, 0, 0, JsonString)",
    );
  });

  test("refuses questions it cannot answer", async () => {
    const run = spy(prologJson, "runOperationJsonQuery").mockResolvedValue({
      mode: "predicate",
      rows: [],
    });
    const refused: [Record<string, unknown>, string][] = [
      [
        { type: "req", predicate: "p" },
        "Typed fact filters (factKind, predicate, subjectKey, ...) apply to type 'fact' only.",
      ],
      [
        { id: "F", factKind: "rule" },
        "id cannot be combined with typed fact filters; run a separate kb_query.",
      ],
      [
        { tags: ["t"], factKind: "rule" },
        "tags cannot be combined with typed fact filters; run a separate kb_query.",
      ],
      [
        { sourceFile: "s", factKind: "rule" },
        "sourceFile cannot be combined with typed fact filters; run a separate kb_query.",
      ],
      ...[
        { limit: Number.NaN },
        { limit: Number.POSITIVE_INFINITY },
        { limit: -1 },
        { offset: Number.NaN },
        { offset: Number.POSITIVE_INFINITY },
        { offset: -1 },
      ].map(
        (page) =>
          [
            { factKind: "rule", ...page },
            "limit and offset must be non-negative numbers.",
          ] as [Record<string, unknown>, string],
      ),
      [
        { predicate: "p", namespace: "  " },
        "namespace must be a non-empty string.",
      ],
      [
        { predicate: "p", namespace: 5 },
        "namespace must be a non-empty string.",
      ],
      [
        { where: { a: "b" } },
        "Typed fact filters need a predicate, a subjectKey or a factKind; where/args/polarity/distinct/propertyKey refine one of those.",
      ],
      [
        { predicate: "p", factKind: "rule" },
        "factKind does not apply to a predicate question; allowed with it: predicate, namespace, where, args, polarity, scope, distinct.",
      ],
      [
        { factKind: "predicate_schema", where: {}, scope: "all" },
        "where, scope do not apply to a schemas question; allowed with it: factKind, predicate, namespace.",
      ],
      [
        { subjectKey: "s", namespace: "n" },
        "namespace does not apply to a property question; allowed with it: subjectKey, propertyKey, scope.",
      ],
      [
        { factKind: "rule", propertyKey: "k" },
        "propertyKey does not apply to a fact_kind question; allowed with it: factKind.",
      ],
      [
        { predicate: "p", scope: "some" },
        "scope must be one of: all, current_requirements.",
      ],
      [
        { factKind: "facts" },
        "factKind must be one of: subject, property_value, predicate, predicate_schema, observation, meta, rule, rule_schema.",
      ],
      [{ factKind: 3 }, "factKind must be one of:"],
      [
        { predicate: "p", polarity: "maybe" },
        "polarity must be one of: assert, deny.",
      ],
      [{ predicate: " " }, "predicate must be a non-empty string."],
      [
        { factKind: "predicate_schema", predicate: " " },
        "predicate must be a non-empty string.",
      ],
      [
        { predicate: "p", distinct: "" },
        "distinct must be a non-empty string.",
      ],
      [
        { subjectKey: "s", propertyKey: " " },
        "propertyKey must be a non-empty string.",
      ],
      [{ subjectKey: " " }, "subjectKey must be a non-empty string."],
      [
        { predicate: "p", where: {}, args: [] },
        "Use either where (named arguments) or args (positional), not both.",
      ],
      [
        { predicate: "p", where: ["a"] },
        "where must be an object of argument name to value.",
      ],
      [
        { predicate: "p", where: null },
        "where must be an object of argument name to value.",
      ],
      [
        { predicate: "p", where: "a=b" },
        "where must be an object of argument name to value.",
      ],
      [
        { predicate: "p", where: { hue: 3 } },
        "where.hue must be a non-empty string.",
      ],
      [
        { predicate: "p", where: { " ": "x" } },
        "where argument name must be a non-empty string.",
      ],
      [
        { predicate: "p", args: "a" },
        "args must be an array of constants (null = any).",
      ],
      [
        { predicate: "p", args: ["a", " "] },
        "args[1] must be a non-empty string.",
      ],
      [
        { includeBody: true },
        "includeBody needs id: it returns the authored body of one entity. Pass the entity's id.",
      ],
      [{ includeBody: true, id: "" }, "includeBody needs id"],
      [{ type: "nope" }, "Invalid type 'nope'"],
    ];
    for (const [input, message] of refused)
      await expect(executeQuery(input as never, context())).rejects.toThrow(
        `Query execution failed: ${message}`,
      );
    await expect(
      executeQuery({ factKind: "rule", limit: -1 } as never, {
        ...context(),
        prolog: undefined,
      }),
    ).rejects.toThrow(
      "Query execution failed: Discovery operation requires a Prolog context",
    );
    expect(run).not.toHaveBeenCalled();
    run.mockRejectedValue("plain");
    await expect(
      executeQuery({ factKind: "rule" } as never, context()),
    ).rejects.toThrow(/^Query execution failed: plain$/);
  });

  test("names where pairs and wildcard args as atoms", async () => {
    expect(
      (
        await ask(
          { predicate: "p", where: { " a ": " b ", "c'": "d" } },
          { mode: "predicate", rows: [] },
        )
      ).goal,
    ).toBe(
      "discovery:ask_predicate_json(none, 'p', where(['a'='b','c'''='d']), none, all, none, 100, 0, JsonString)",
    );
  });
});

describe("executeQuery entity pages", () => {
  test("reads one bounded page through the engine method", async () => {
    const seen: unknown[] = [];
    const prolog = {
      query: PROLOG.query,
      async queryEntities(input: unknown, signal: unknown) {
        seen.push([input, signal]);
        return {
          entities: [
            {
              id: "file:///a/b/REQ-1",
              type: "req",
              title: "One",
              status: "open",
            },
            { id: "REQ-2", type: "req", firmness: "firm" },
            {
              id: "REQ-3",
              type: "req",
              origin: { kind: "agent" },
              firmness: "nope",
            },
            { id: "SYM-1", type: "symbol" },
            { id: "see file:///a/X" },
            {},
          ],
          count: 9,
        };
      },
    };
    const result = await executeQuery(
      {
        type: "req",
        id: "REQ-1",
        tags: ["t"],
        sourceFile: "s.md",
        limit: 5,
        offset: 1,
      },
      context({ prolog }),
    );
    expect(seen).toStrictEqual([
      [
        {
          type: "req",
          id: "REQ-1",
          tags: ["t"],
          sourceFile: "s.md",
          limit: 5,
          offset: 1,
        },
        SIGNAL,
      ],
    ]);
    const rows = (result.structuredContent as Loose).entities;
    expect(rows.map((row: Loose) => row.firmness)).toEqual([
      "firm",
      "firm",
      "default",
      undefined,
      undefined,
      undefined,
    ]);
    expect(Object.hasOwn(rows[3], "firmness")).toBe(false);
    expect(result.structuredContent).toStrictEqual({
      entities: rows,
      count: 9,
    });
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Found 9 entities of type 'req'. Showing 6 (offset 1, limit 5): REQ-1 (One, status=open), REQ-2 (, status=), REQ-3 (, status=), SYM-1 (, status=), see file:///a/X (, status=),  (, status=)",
      },
    ]);
    const firm = { id: "REQ-9", type: "req", firmness: "firm" };
    const same = {
      query: PROLOG.query,
      queryEntities: async () => ({ entities: [firm], count: 1 }),
    };
    const kept = await executeQuery({}, context({ prolog: same }));
    expect((kept.structuredContent as Loose).entities[0]).toBe(firm);
    expect(kept.content[0]?.text).toBe(
      "Found 1 entities. Showing 1 (offset 0, limit 100): REQ-9 (, status=)",
    );
  });

  test("pages through the query port without the engine method", async () => {
    const via = spy(entities, "queryEntitiesViaQuery").mockResolvedValue({
      entities: [],
      count: 0,
    });
    const result = await executeQuery({ type: "adr" }, context());
    expect(via).toHaveBeenCalledWith(
      PROLOG,
      { type: "adr", limit: 100, offset: 0 },
      SIGNAL,
    );
    expect(Object.keys(via.mock.calls[0][1])).toEqual([
      "type",
      "limit",
      "offset",
    ]);
    expect(result.content[0]?.text).toBe("No entities found of type 'adr'.");
    await executeQuery({}, context());
    expect(Object.keys(via.mock.calls[1][1])).toEqual(["limit", "offset"]);
    expect(result.structuredContent).toStrictEqual({ entities: [], count: 0 });
    expect((await executeQuery({}, context())).content[0]?.text).toBe(
      "No entities found.",
    );
  });

  test("names an uncompiled store behind an empty page", async () => {
    spy(entities, "queryEntitiesViaQuery").mockResolvedValue({
      entities: [],
      count: 0,
    });
    const inspect = spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "missing",
      path: "/ws/.kb/branches/main",
    });
    const reason = spy(
      branchStore,
      "uncompiledBranchStoreReason",
    ).mockReturnValue({ detail: 42, remediation: { command_argv: ["x"] } });
    const attached = context({
      branchAttachment: { gitBranch: "main", kbBranch: "kb-main" },
    });
    const result = await executeQuery({}, attached);
    expect(inspect).toHaveBeenCalledWith("/ws", "kb-main");
    expect(reason).toHaveBeenCalledWith(
      "/ws",
      { state: "missing", path: "/ws/.kb/branches/main" },
      "kb-main",
    );
    expect(result.content[0]?.text).toBe(
      "No entities found. Note: 42 Run kibi sync before relying on query results.",
    );
    expect(result.structuredContent).toStrictEqual({
      entities: [],
      count: 0,
      branchStore: {
        state: "not_compiled",
        code: branchStore.BRANCH_STORE_NOT_COMPILED,
        path: "/ws/.kb/branches/main",
        detail: "42",
        remediation: { command_argv: ["x"] },
      },
    });
    reason.mockReturnValue(null);
    expect((await executeQuery({}, attached)).structuredContent).toStrictEqual({
      entities: [],
      count: 0,
    });
    const full = spy(entities, "queryEntitiesViaQuery").mockResolvedValue({
      entities: [{ id: "A" }],
      count: 1,
    });
    reason.mockClear();
    await executeQuery({}, attached);
    expect(reason).not.toHaveBeenCalled();
    full.mockRestore();
  });
});

describe("executeQuery bodies", () => {
  function workspace(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), "kibi-query-body-"));
    roots.push(root);
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), content);
    }
    return root;
  }

  async function body(
    root: string,
    entity: Record<string, unknown> | undefined,
    extra: Record<string, unknown> = {},
  ) {
    spy(entities, "queryEntitiesViaQuery").mockResolvedValue({
      entities: entity
        ? [{ id: "OTHER", source: "other.md" }, entity]
        : [{ id: "OTHER" }],
      count: 1,
    });
    const result = await executeQuery(
      { id: "REQ-1", includeBody: true },
      context({ workspaceRoot: root, ...extra }),
    );
    spies.pop()?.mockRestore();
    return {
      body: (result.structuredContent as Loose).body,
      text: (result.content[0]?.text as string).split("\n").slice(1).join("\n"),
    };
  }

  test("returns the authored body of the named entity", async () => {
    const long = "x".repeat(QUERY_BODY_MAX_CHARS + 1);
    const root = workspace({
      ".kb/requirements/r1.md": "---\nid: REQ-1\ntitle: One\n---\nThe body.\n",
      ".kb/requirements/long.md": `---\nid: REQ-1\n---\n${long}`,
      ".kb/requirements/bare.md": "no front matter",
      ".kb/requirements/exact.md": `---\nid: REQ-1\n---\n${"y".repeat(QUERY_BODY_MAX_CHARS)}`,
      "other.md": "---\nid: OTHER\n---\nOther body\n",
      ".kb/requirements/x.txt": "---\nid: REQ-1\n---\nText\n",
      "../outside.md": "---\nid: REQ-1\n---\nOut\n",
    });
    expect(QUERY_BODY_MAX_CHARS).toBe(32_000);
    const found = await body(root, {
      id: "REQ-1",
      source: " .kb/requirements/r1.md#L3 ",
    });
    expect(found).toStrictEqual({
      body: {
        id: "REQ-1",
        path: ".kb/requirements/r1.md",
        text: "The body.\n",
      },
      text: "Body of REQ-1 (.kb/requirements/r1.md; replace it with kb_upsert document.body):\nThe body.\n",
    });
    const truncated = await body(root, {
      id: "REQ-1",
      source: ".kb/requirements/long.md",
    });
    expect(truncated.body).toStrictEqual({
      id: "REQ-1",
      path: ".kb/requirements/long.md",
      text: long.slice(0, QUERY_BODY_MAX_CHARS),
      truncated: true,
    });
    expect(truncated.text).toStartWith(
      "Body of REQ-1 (.kb/requirements/long.md, first 32000 characters; replace it with kb_upsert document.body):\nxxx",
    );
    expect(
      (await body(root, { id: "REQ-1", source: ".kb/requirements/exact.md" }))
        .body,
    ).toStrictEqual({
      id: "REQ-1",
      path: ".kb/requirements/exact.md",
      text: "y".repeat(QUERY_BODY_MAX_CHARS),
    });
    const missingDocument = (text: string) =>
      expect(text).toBe(
        "No authored document for REQ-1, so there is no body to return.",
      );
    for (const source of [
      ".kb/requirements/x.txt",
      "../outside.md",
      undefined,
      7,
      "",
      `../${basename(root)}-x/a.md`,
    ]) {
      const none = await body(root, { id: "REQ-1", source });
      expect(none.body).toStrictEqual({ id: "REQ-1", path: null, text: null });
      missingDocument(none.text);
    }
    missingDocument((await body(root, undefined)).text);
    const unreadable = await body(root, {
      id: "REQ-1",
      source: ".kb/requirements/gone.md",
    });
    expect(unreadable).toStrictEqual({
      body: { id: "REQ-1", path: ".kb/requirements/gone.md", text: null },
      text: "The authored document .kb/requirements/gone.md of REQ-1 could not be read.",
    });
    expect(
      (await body(root, { id: "REQ-1", source: ".kb/requirements/bare.md" }))
        .body,
    ).toStrictEqual({
      id: "REQ-1",
      path: ".kb/requirements/bare.md",
      text: null,
    });
  });

  test("reads through the workspace filesystem port", async () => {
    const root = workspace({});
    const reads: string[] = [];
    const fs = {
      readFile: async (file: string) => {
        reads.push(file);
        if (file.endsWith("empty.md")) return "---\nid: REQ-1\n---\n";
        return "---\nid: REQ-1\n---\nFrom port\n";
      },
    };
    expect(
      (await body(root, { id: "REQ-1", source: "a/b.md" }, { fs })).body,
    ).toStrictEqual({ id: "REQ-1", path: "a/b.md", text: "From port\n" });
    expect(reads).toEqual([join(root, "a/b.md")]);
    expect(
      (await body(root, { id: "REQ-1", source: "a/empty.md" }, { fs })).body,
    ).toStrictEqual({ id: "REQ-1", path: "a/empty.md", text: "" });
  });
});
