import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  RELATIONSHIP_TYPES,
  classifySupersedesHistory,
  dependentRelationshipsGoal,
  existingRelationships,
  firstGitAdditionCommit,
  formatInvalidRelationshipError,
  formatInvalidRelationshipTuple,
  formatRelationshipSourceMismatch,
  validateLiveRelationshipTargets,
  validateRelationshipSources,
  validateStrictLanePairing,
  validateSupersedesSourceHistory,
  wrongKindRelationshipError,
} from "../../../src/operations/mutation/relationships.js";
import type {
  RelationshipInput,
  StagedUpsertState,
} from "../../../src/operations/mutation/types.js";
import type {
  PrologPort,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";

type Answer = PrologQueryResult | Error | string;

/** A Prolog port that records each goal and answers it from `answer`. */
function fakeProlog(
  answer: (goal: string) => Answer = () => ({ success: false, bindings: {} }),
  extra: Partial<PrologPort> = {},
) {
  const goals: string[] = [];
  const prolog = {
    query: async (goal: string) => {
      goals.push(goal);
      const result = answer(goal);
      if (result instanceof Error || typeof result === "string") throw result;
      return result;
    },
    ...extra,
  } as unknown as PrologPort;
  return { prolog, goals };
}

const ok = (bindings: Record<string, string> = {}): PrologQueryResult =>
  ({ success: true, bindings }) as PrologQueryResult;
const no: PrologQueryResult = { success: false, bindings: {} };

function staged(
  entities: Record<string, Record<string, unknown>>,
): StagedUpsertState {
  return { entities: new Map(Object.entries(entities)), relationships: [] };
}

async function rejection(promise: Promise<unknown> | (() => unknown)) {
  try {
    await (typeof promise === "function" ? promise() : promise);
    return "ok";
  } catch (error) {
    const typed = error as { code?: string; message: string; name: string };
    return { name: typed.name, code: typed.code, message: typed.message };
  }
}

describe("RELATIONSHIP_TYPES", () => {
  test("lists every relationship type in order", () => {
    expect([...RELATIONSHIP_TYPES]).toStrictEqual([
      "depends_on",
      "specified_by",
      "verified_by",
      "validates",
      "implements",
      "covered_by",
      "executable_for",
      "constrained_by",
      "constrains",
      "requires_property",
      "requires_predicate",
      "requires_rule",
      "guards",
      "publishes",
      "consumes",
      "supersedes",
      "restates",
      "assumes",
      "exempts",
      "relates_to",
    ]);
  });
});

describe("wrongKindRelationshipError", () => {
  test("names the expected kind for each lane", () => {
    expect(
      wrongKindRelationshipError("constrains", "F-1", "property_value").message,
    ).toBe(
      "Relationship 'constrains' requires target 'F-1' to be a subject, observation, or meta fact. Property_value facts cannot be direct targets of constrains relationships.",
    );
    expect(
      wrongKindRelationshipError("requires_property", "F-2", "subject").message,
    ).toBe(
      "Relationship 'requires_property' requires target 'F-2' to be a property_value, observation, or meta fact. Subject facts cannot be direct targets of requires_property relationships.",
    );
    expect(wrongKindRelationshipError("guards", "F-3", "").message).toBe(
      "Relationship 'guards' requires target 'F-3' to be a property_value, observation, or meta fact. undefined facts cannot be direct targets of guards relationships.",
    );
  });
});

describe("dependentRelationshipsGoal", () => {
  test("finds every incoming relationship of an escaped id", () => {
    expect(dependentRelationshipsGoal("REQ-'1")).toBe(
      `findall([RelType,From], (member(RelType, [${RELATIONSHIP_TYPES.join(", ")}]), kb_relationship(RelType, From, 'REQ-''1')), Dependents)`,
    );
  });
});

describe("formatInvalidRelationshipTuple", () => {
  const prefix = (rel: string, from: string, to: string) =>
    `Invalid relationship: ${rel} from ${from} to ${to}. `;
  const FACT_TEST =
    "Facts are not directly verified by tests. Create or update a requirement and link REQ -> TEST with verified_by. Link the requirement to the fact with constrains or requires_property.";
  const TEST_FACT =
    "Tests validate requirements or scenarios, not facts directly. Create or update a requirement and link TEST -> REQ with validates. Link the requirement to the fact with constrains or requires_property.";
  const VERIFIED = "verified_by is only valid as req/scenario -> test.";
  const VALIDATES = "validates is only valid as test -> req/scenario.";
  const OTHER =
    "Use a typed relationship from docs/entity-schema.md, or relates_to only as a reviewed escape hatch.";

  test.each([
    ["verified_by", "fact", "test", FACT_TEST],
    ["verified_by", "req", "test", VERIFIED],
    ["verified_by", "fact", "req", VERIFIED],
    ["validates", "test", "fact", TEST_FACT],
    ["validates", "req", "fact", VALIDATES],
    ["validates", "test", "req", VALIDATES],
    ["implements", "fact", "test", OTHER],
    ["implements", "test", "fact", OTHER],
  ])("%s from %s to %s", (relType, fromType, toType, recipe) => {
    expect(formatInvalidRelationshipTuple({ relType, fromType, toType })).toBe(
      prefix(relType, fromType, toType) + recipe,
    );
  });
});

describe("formatInvalidRelationshipError", () => {
  test("reads a formatted engine message", () => {
    expect(
      formatInvalidRelationshipError(
        "error: Invalid relationship:  validates from req to fact. more",
      ),
    ).toBe(
      formatInvalidRelationshipTuple({
        relType: "validates",
        fromType: "req",
        toType: "fact",
      }),
    );
    expect(
      formatInvalidRelationshipError(
        "Invalid relationship: implements from fact to test-suite",
      ),
    ).toBe(
      formatInvalidRelationshipTuple({
        relType: "implements",
        fromType: "fact",
        toType: "test",
      }),
    );
  });

  test("reads an unformatted engine message with its arguments", () => {
    expect(
      formatInvalidRelationshipError(
        "Invalid relationship: ~w from ~w to ~w-[verified_by,fact,test]",
      ),
    ).toBe(
      formatInvalidRelationshipError(
        "Invalid relationship:~w from ~w to ~w-[verified_by,fact,test]",
      ) as string,
    );
    expect(
      formatInvalidRelationshipError(
        "Invalid relationship:~w from ~w to ~w-[verified_by,fact,test]",
      ),
    ).toBe(
      formatInvalidRelationshipTuple({
        relType: "verified_by",
        fromType: "fact",
        toType: "test",
      }),
    );
  });

  test("is null for any other text", () => {
    for (const raw of [
      "",
      "something else",
      "Invalid relationship: a from b to .",
      "Invalid relationship: ~w from ~w to ~w-[a,b]",
      "invalid relationship: a from b to c",
    ]) {
      expect([raw, formatInvalidRelationshipError(raw)]).toStrictEqual([
        raw,
        null,
      ]);
    }
  });
});

describe("validateRelationshipSources and formatRelationshipSourceMismatch", () => {
  test("accepts relationships from the entity", () => {
    expect(
      validateRelationshipSources("REQ-1", [
        { type: "depends_on", from: "REQ-1", to: "REQ-2" },
      ]),
    ).toBeUndefined();
  });

  test("refuses a relationship from another entity", async () => {
    expect(
      await rejection(() =>
        validateRelationshipSources("REQ-1", [
          { type: "depends_on", from: "REQ-1", to: "REQ-2" },
          { type: "depends_on", from: "REQ-3", to: "REQ-4" },
        ]),
      ),
    ).toStrictEqual({
      name: "Error",
      code: "RELATIONSHIP_SOURCE_MISMATCH",
      message:
        "Relationship source must match the upserted entity REQ-1; received from=REQ-3. To add REQ-3 -> REQ-4, upsert REQ-3 instead and include the relationship in that call.",
    });
  });

  test("requires non-empty string endpoints", async () => {
    for (const [relationship, field] of [
      [{ from: "", to: "X" }, "from"],
      [{ from: "A", to: "  " }, "to"],
      [{ from: "A", to: 3 }, "to"],
    ] as const) {
      expect(
        await rejection(() =>
          formatRelationshipSourceMismatch(
            "REQ-1",
            relationship as unknown as RelationshipInput,
          ),
        ),
      ).toStrictEqual({
        name: "Error",
        code: "VALIDATION_FAILED",
        message: `Relationship ${field} must be a non-empty string`,
      });
    }
  });
});

describe("git history", () => {
  let root = "";
  const git = (...args: string[]) => {
    const result = spawnSync(
      "git",
      [
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@example.invalid",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { cwd: root, encoding: "utf8" },
    );
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  };
  const commit = (message: string) => {
    git("add", "-A");
    git("commit", "-q", "--no-verify", "-m", message);
    return git("rev-parse", "HEAD");
  };

  beforeEach(() => {
    root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "kibi-rel-git-")));
    git("init", "-q", "-b", "main");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("finds the oldest commit that added a tracked file", () => {
    writeFileSync(path.join(root, "a.md"), "one\n");
    const first = commit("add a");
    unlinkSync(path.join(root, "a.md"));
    commit("drop a");
    writeFileSync(path.join(root, "a.md"), "two\n");
    commit("re-add a");
    unlinkSync(path.join(root, "a.md"));
    commit("drop a again");
    writeFileSync(path.join(root, "a.md"), "three\n");
    commit("re-add a again");
    expect(firstGitAdditionCommit(root, "a.md")).toBe(first);
    git("mv", "a.md", "b.md");
    commit("rename");
    expect(firstGitAdditionCommit(root, "b.md")).toBe(first);
  });

  test("has no commit for untracked, empty, remote or non-git sources", () => {
    writeFileSync(path.join(root, "a.md"), "one\n");
    commit("add a");
    expect(firstGitAdditionCommit(root, "missing.md")).toBeNull();
    expect(firstGitAdditionCommit(root, "")).toBeNull();
    expect(firstGitAdditionCommit(root, "https://x/a.md")).toBeNull();
    const plain = realpathSync(
      mkdtempSync(path.join(os.tmpdir(), "kibi-rel-")),
    );
    try {
      writeFileSync(path.join(plain, "a.md"), "x");
      expect(firstGitAdditionCommit(plain, "a.md")).toBeNull();
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });

  test("classifies commit order with the real repository", () => {
    writeFileSync(path.join(root, "a.md"), "a\n");
    const older = commit("a");
    writeFileSync(path.join(root, "b.md"), "b\n");
    const newer = commit("b");
    expect(classifySupersedesHistory(root, newer, older)).toBe("valid");
    expect(classifySupersedesHistory(root, older, newer)).toBe("reversed");
    expect(classifySupersedesHistory(root, newer, "f".repeat(40))).toBe(
      "unknown",
    );
    git("checkout", "-q", "-b", "side", older);
    writeFileSync(path.join(root, "c.md"), "c\n");
    const side = commit("c");
    expect(classifySupersedesHistory(root, side, newer)).toBe("unknown");
  });
});

describe("classifySupersedesHistory", () => {
  function deps(answers: Record<string, boolean | null>) {
    const calls: string[] = [];
    return {
      calls,
      deps: {
        isAncestor: (root: string, ancestor: string, descendant: string) => {
          calls.push(`${root}:${ancestor}<${descendant}`);
          return answers[`${ancestor}<${descendant}`] ?? null;
        },
      },
    };
  }

  test("is unknown without both commits and valid for one commit", () => {
    const { deps: d, calls } = deps({});
    expect(classifySupersedesHistory("/r", null, "t", d)).toBe("unknown");
    expect(classifySupersedesHistory("/r", "s", null, d)).toBe("unknown");
    expect(classifySupersedesHistory("/r", "s", "s", d)).toBe("valid");
    expect(calls).toStrictEqual([]);
  });

  test("checks the target first, then the reverse order", () => {
    const valid = deps({ "t<s": true });
    expect(classifySupersedesHistory("/r", "s", "t", valid.deps)).toBe("valid");
    expect(valid.calls).toStrictEqual(["/r:t<s"]);
    const reversed = deps({ "t<s": false, "s<t": true });
    expect(classifySupersedesHistory("/r", "s", "t", reversed.deps)).toBe(
      "reversed",
    );
    expect(reversed.calls).toStrictEqual(["/r:t<s", "/r:s<t"]);
    for (const answer of [false, null]) {
      expect(
        classifySupersedesHistory(
          "/r",
          "s",
          "t",
          deps({ "t<s": null, "s<t": answer }).deps,
        ),
      ).toBe("unknown");
    }
  });
});

describe("validateSupersedesSourceHistory", () => {
  const commits: Record<string, string> = {
    "new.md": "N",
    "old.md": "O",
  };
  function historyDeps() {
    const sources: string[] = [];
    return {
      sources,
      deps: {
        firstAdditionCommit: (root: string, source: string) => {
          sources.push(`${root}:${source}`);
          return commits[source] ?? null;
        },
        // N is older than O: the new requirement predates its target.
        isAncestor: (_root: string, ancestor: string, descendant: string) =>
          ancestor === "N" && descendant === "O",
      },
    };
  }
  const REVERSED = {
    name: "Error",
    code: "RELATIONSHIP_VALIDATION_FAILED",
    message:
      "Invalid supersedes direction: tracked source history proves REQ-new predates REQ-old. The replacement must point to the older requirement (new -> old).",
  };
  const entity = { id: "REQ-new", source: "new.md" };
  const SUPERSEDES = [{ type: "supersedes", from: "REQ-new", to: "REQ-old" }];

  test("reads a planned target's source", async () => {
    const { prolog, goals } = fakeProlog();
    const { deps, sources } = historyDeps();
    expect(
      await rejection(
        validateSupersedesSourceHistory(
          prolog,
          entity,
          [{ type: "depends_on", from: "REQ-new", to: "X" }, ...SUPERSEDES],
          "/ws",
          deps,
          staged({ "REQ-old": { source: "old.md" } }),
        ),
      ),
    ).toStrictEqual(REVERSED);
    expect(goals).toStrictEqual([]);
    expect(sources).toStrictEqual(["/ws:new.md", "/ws:old.md"]);
    const other = historyDeps();
    expect(
      await rejection(
        validateSupersedesSourceHistory(
          prolog,
          entity,
          SUPERSEDES,
          "/ws",
          other.deps,
          staged({ "REQ-old": { source: 7 } }),
        ),
      ),
    ).toBe("ok");
    expect(other.sources).toStrictEqual(["/ws:new.md", "/ws:"]);
  });

  test("reads an indexed target's source", async () => {
    const pages: unknown[] = [];
    for (const [source, expected] of [
      ["old.md", REVERSED],
      [5, "ok"],
    ] as const) {
      const { prolog, goals } = fakeProlog(undefined, {
        queryEntities: async (input: unknown) => {
          pages.push(input);
          return { entities: [{ source }] } as never;
        },
      });
      expect(
        await rejection(
          validateSupersedesSourceHistory(
            prolog,
            entity,
            SUPERSEDES,
            "/ws",
            historyDeps().deps,
          ),
        ),
      ).toStrictEqual(expected);
      expect(goals).toStrictEqual([]);
    }
    expect(pages).toStrictEqual([
      { id: "REQ-old", limit: 1, offset: 0 },
      { id: "REQ-old", limit: 1, offset: 0 },
    ]);
    const { prolog } = fakeProlog(undefined, {
      queryEntities: async () => ({ entities: [] }) as never,
    });
    const { deps, sources } = historyDeps();
    await validateSupersedesSourceHistory(
      prolog,
      entity,
      SUPERSEDES,
      "/ws",
      deps,
    );
    expect(sources).toStrictEqual(["/ws:new.md", "/ws:"]);
  });

  test("queries the target's source and strips its quotes", async () => {
    for (const [answer, expected] of [
      [ok({ TargetSource: "'old.md'" }), REVERSED],
      [ok({ TargetSource: '"old.md"' }), REVERSED],
      [ok({ TargetSource: "old.md" }), REVERSED],
      [ok({ TargetSource: "''old.md''" }), "ok"],
      [ok({}), "ok"],
      [{ success: false, bindings: { TargetSource: "old.md" } }, "ok"],
    ] as const) {
      const { prolog, goals } = fakeProlog(() => answer as PrologQueryResult);
      const seen: string[] = [];
      expect(
        await rejection(
          validateSupersedesSourceHistory(
            prolog,
            entity,
            [{ type: "supersedes", from: "REQ-new", to: "REQ-'old" }],
            "/ws",
            {
              ...historyDeps().deps,
              firstAdditionCommit: (_root, source) => {
                seen.push(source);
                return commits[source] ?? null;
              },
            },
          ),
        ),
      ).toStrictEqual(
        expected === "ok"
          ? "ok"
          : {
              ...REVERSED,
              message: REVERSED.message.replace("REQ-old", "REQ-'old"),
            },
      );
      expect(goals).toStrictEqual([
        "once((kb_entity('REQ-''old', _, _SupTargetProps), memberchk(source=_SupTargetRaw, _SupTargetProps), normalize_term_atom(_SupTargetRaw, TargetSource)))",
      ]);
      expect(seen[1]).toBe(
        expected === "ok"
          ? (answer as PrologQueryResult).success &&
            (answer as PrologQueryResult).bindings.TargetSource !== undefined
            ? "'old.md'"
            : ""
          : "old.md",
      );
    }
  });

  test("reads a missing id or source as empty", async () => {
    const { prolog } = fakeProlog(() => ok({ TargetSource: "old.md" }));
    const { deps, sources } = historyDeps();
    expect(
      await rejection(
        validateSupersedesSourceHistory(
          prolog,
          { id: 1, source: 2 },
          SUPERSEDES,
          "/ws",
          { ...deps, isAncestor: () => false },
        ),
      ),
    ).toBe("ok");
    expect(sources).toStrictEqual(["/ws:", "/ws:old.md"]);
    expect(
      await rejection(
        validateSupersedesSourceHistory(
          prolog,
          { id: 1, source: "new.md" },
          SUPERSEDES,
          "/ws",
          historyDeps().deps,
        ),
      ),
    ).toStrictEqual({
      ...REVERSED,
      message: REVERSED.message.replace("REQ-new", ""),
    });
  });

  test("needs a target id", async () => {
    const { prolog } = fakeProlog();
    expect(
      (
        (await rejection(
          validateSupersedesSourceHistory(
            prolog,
            entity,
            [{ type: "supersedes", from: "REQ-new" }],
            "/ws",
            historyDeps().deps,
          ),
        )) as { code: string }
      ).code,
    ).toBe("VALIDATION_FAILED");
  });
});

describe("validateLiveRelationshipTargets", () => {
  const entity = { id: "REQ-1", type: "req" };
  const typeGoal = (id: string) => `kb_entity('${id}', Type, _)`;

  test("checks each typed tuple with the engine", async () => {
    const { prolog, goals } = fakeProlog((goal) =>
      goal === typeGoal("TEST-1") ? ok({ Type: "'test'" }) : ok(),
    );
    await validateLiveRelationshipTargets(
      prolog,
      entity,
      [
        { type: "verified_by", from: "REQ-1", to: "TEST-1" },
        { type: "depends_on", from: "REQ-1", to: "REQ-2" },
      ],
      staged({ "REQ-2": { type: "Scenario X" } }),
    );
    expect(goals).toStrictEqual([
      typeGoal("TEST-1"),
      "once(kb:validate_relationship(verified_by, req, test))",
      "once(kb:validate_relationship(depends_on, req, 'Scenario X'))",
    ]);
  });

  test("strips only the quotes around a type", async () => {
    const { prolog, goals } = fakeProlog((goal) =>
      goal.startsWith("kb_entity") ? ok({ Type: "'a'b'" }) : ok(),
    );
    await validateLiveRelationshipTargets(prolog, entity, [
      { type: "depends_on", from: "REQ-1", to: "X" },
    ]);
    expect(goals[1]).toBe(
      "once(kb:validate_relationship(depends_on, req, 'a''b'))",
    );
  });

  test("refuses a tuple the engine rejects", async () => {
    const { prolog } = fakeProlog((goal) =>
      goal.startsWith("kb_entity") ? ok({ Type: '"fact"' }) : no,
    );
    expect(
      await rejection(
        validateLiveRelationshipTargets(prolog, entity, [
          { type: "verified_by", from: "REQ-1", to: "F-1" },
        ]),
      ),
    ).toStrictEqual({
      name: "Error",
      code: "INVALID_RELATIONSHIP",
      message: formatInvalidRelationshipTuple({
        relType: "verified_by",
        fromType: "req",
        toType: "fact",
      }),
    });
  });

  test("skips an endpoint whose type is unknown", async () => {
    for (const answer of [
      no,
      { success: false, bindings: { Type: "req" } } as PrologQueryResult,
      ok({}),
      ok({ Type: "" }),
      new Error("engine down"),
    ] as const) {
      const { prolog, goals } = fakeProlog(() => answer);
      await validateLiveRelationshipTargets(prolog, entity, [
        { type: "depends_on", from: "REQ-1", to: "REQ-'2" },
      ]);
      expect(goals).toStrictEqual([typeGoal("REQ-''2")]);
    }
  });

  test("looks up the entity itself when it has no string type", async () => {
    const { prolog, goals } = fakeProlog(() => no);
    await validateLiveRelationshipTargets(
      prolog,
      { id: "REQ-1", type: 3 },
      [{ type: "depends_on", from: "REQ-1", to: "REQ-2" }],
      staged({ "REQ-2": { type: 4 } }),
    );
    expect(goals).toStrictEqual([typeGoal("REQ-1"), typeGoal("REQ-2")]);
  });

  test("rethrows a failure that is not an error", async () => {
    const { prolog } = fakeProlog(() => "boom");
    await expect(
      validateLiveRelationshipTargets(prolog, entity, [
        { type: "depends_on", from: "REQ-1", to: "REQ-2" },
      ]),
    ).rejects.toBe("boom");
  });

  test("needs string endpoints and type", async () => {
    const { prolog } = fakeProlog();
    for (const [relationship, field] of [
      [{ from: "", to: "X", type: "t" }, "from"],
      [{ from: "REQ-1", to: "", type: "t" }, "to"],
      [{ from: "REQ-1", to: "REQ-1", type: "" }, "type"],
    ] as const) {
      expect(
        await rejection(
          validateLiveRelationshipTargets(prolog, entity, [relationship]),
        ),
      ).toStrictEqual({
        name: "Error",
        code: "VALIDATION_FAILED",
        message: `Relationship ${field} must be a non-empty string`,
      });
    }
  });
});

describe("validateStrictLanePairing", () => {
  const ruleGoal = (id: string) =>
    `once((kb_entity('${id}', fact, _RuleProps), memberchk(fact_kind=_RuleKind, _RuleProps), normalize_term_atom(_RuleKind, rule)))`;
  const kindGoal = (id: string, kind: string) =>
    `once((kb_entity('${id}', fact, _SlpProps), memberchk(fact_kind=_SlpFK, _SlpProps), normalize_term_atom(_SlpFK, ${kind})))`;
  const RULE_REFUSAL = (target: string) => ({
    name: "Error",
    code: "RELATIONSHIP_VALIDATION_FAILED",
    message: `Relationship 'requires_rule' requires target '${target}' to be a fact_kind=rule fact.`,
  });

  test("requires_rule needs a rule fact", async () => {
    const accepted = fakeProlog(() => ok());
    await validateStrictLanePairing(accepted.prolog, [
      { type: "requires_rule", from: "REQ-1", to: "F-'1" },
    ]);
    expect(accepted.goals).toStrictEqual([ruleGoal("F-''1")]);
    const refused = fakeProlog(() => no);
    expect(
      await rejection(
        validateStrictLanePairing(refused.prolog, [
          { type: "requires_rule", from: "REQ-1", to: "F-1" },
        ]),
      ),
    ).toStrictEqual(RULE_REFUSAL("F-1"));
  });

  test("requires_rule reads a planned target", async () => {
    const { prolog, goals } = fakeProlog(() => ok());
    await validateStrictLanePairing(
      prolog,
      [{ type: "requires_rule", from: "REQ-1", to: "F-1" }],
      staged({ "F-1": { type: "fact", fact_kind: "rule" } }),
    );
    for (const planned of [
      { type: "fact", fact_kind: "subject" },
      { type: "req", fact_kind: "rule" },
      { type: "fact", fact_kind: 1 },
    ]) {
      expect(
        await rejection(
          validateStrictLanePairing(
            prolog,
            [{ type: "requires_rule", from: "REQ-1", to: "F-1" }],
            staged({ "F-1": planned }),
          ),
        ),
      ).toStrictEqual(RULE_REFUSAL("F-1"));
    }
    expect(goals).toStrictEqual([]);
  });

  test("constrains and requires_property refuse the wrong fact kind", async () => {
    for (const [type, kind] of [
      ["constrains", "property_value"],
      ["requires_property", "subject"],
    ] as const) {
      const refused = fakeProlog(() => ok());
      expect(
        await rejection(
          validateStrictLanePairing(refused.prolog, [
            { type, from: "REQ-1", to: "F-1" },
          ]),
        ),
      ).toStrictEqual({
        name: "Error",
        code: undefined,
        message: wrongKindRelationshipError(type, "F-1", kind).message,
      });
      expect(refused.goals).toStrictEqual([kindGoal("F-1", kind)]);
      const accepted = fakeProlog(() => no);
      await validateStrictLanePairing(accepted.prolog, [
        { type, from: "REQ-1", to: "F-1" },
      ]);
      expect(
        await rejection(
          validateStrictLanePairing(
            accepted.prolog,
            [{ type, from: "REQ-1", to: "F-1" }],
            staged({ "F-1": { type: "fact", fact_kind: kind } }),
          ),
        ),
      ).toStrictEqual({
        name: "Error",
        code: undefined,
        message: wrongKindRelationshipError(type, "F-1", kind).message,
      });
      await validateStrictLanePairing(
        accepted.prolog,
        [{ type, from: "REQ-1", to: "F-1" }],
        staged({ "F-1": { type: "fact", fact_kind: "meta" } }),
      );
      expect(accepted.goals).toStrictEqual([kindGoal("F-1", kind)]);
    }
  });

  test("leaves other relationships alone", async () => {
    const { prolog, goals } = fakeProlog(() => ok());
    await validateStrictLanePairing(prolog, [
      { type: "depends_on", from: "REQ-1", to: "REQ-2" },
    ]);
    expect(goals).toStrictEqual([]);
  });
});

describe("existingRelationships", () => {
  test("collects forward and reverse links of every type", async () => {
    const { prolog, goals } = fakeProlog((goal) => {
      if (
        goal ===
        "findall(To, kb_relationship(depends_on, 'REQ-''1', To), Targets)"
      )
        return ok({ Targets: "['REQ-2',b]" });
      if (
        goal ===
        "findall(From, kb_relationship(relates_to, From, 'REQ-''1'), Sources)"
      )
        return ok({ Sources: "[c]" });
      return ok();
    });
    expect(await existingRelationships(prolog, "REQ-'1")).toStrictEqual([
      { type: "depends_on", from: "REQ-'1", to: "REQ-2" },
      { type: "depends_on", from: "REQ-'1", to: "b" },
      { type: "relates_to", from: "c", to: "REQ-'1" },
    ]);
    expect(goals).toHaveLength(RELATIONSHIP_TYPES.length * 2);
    expect(goals.slice(0, 2)).toStrictEqual([
      "findall(To, kb_relationship(depends_on, 'REQ-''1', To), Targets)",
      "findall(From, kb_relationship(depends_on, From, 'REQ-''1'), Sources)",
    ]);
  });
});
