import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import * as markdown from "../../../src/extractors/markdown.js";
import * as applyPlan from "../../../src/operations/modeling/predicate-applyplan.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "../../../src/operations/modeling/predicate-catalog.js";
import * as inference from "../../../src/operations/modeling/predicate-inference.js";
import * as loader from "../../../src/operations/modeling/predicate-loader.js";
import * as ranker from "../../../src/operations/modeling/predicate-ranker.js";
import * as prose from "../../../src/operations/semantic-advisor/analyze-prose.js";
import * as shared from "../../../src/operations/semantic-advisor/shared.js";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import {
  LEGACY_MIGRATION_PLAN_VERSION,
  buildLegacyMigrationPlan,
  buildLegacyMigrationPlanFromContext,
} from "../../../src/public/operations/legacy-migration-plan.js";
import * as ranking from "../../../src/search-ranking.js";
import { expectGolden } from "../helpers/golden.js";

// biome-ignore lint/suspicious/noExplicitAny: fakes stand in for wide types
type Loose = any;

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

// biome-ignore lint/suspicious/noExplicitAny: see Loose
function spy(module: any, name: string): Loose {
  const created = spyOn(module, name);
  spies.push(created);
  return created;
}

const BUILT_IN = BUILT_IN_PREDICATE_SCHEMAS[0] as Loose;
const SHADOWED = BUILT_IN_PREDICATE_SCHEMAS[1] as Loose;

const schema = (
  id: string,
  name: string,
  extra: Record<string, unknown> = {},
) =>
  ({
    id,
    predicate_name: name,
    argument_names: ["subject"],
    argument_types: ["entity"],
    ...extra,
  }) as Loose;

const PROJECT = [
  schema("P-top", "ztop"),
  schema("P-1", "zalpha"),
  schema("P-0", "zalpha", { argument_names: ["thing"] }),
  schema("P-beta", "zbeta"),
  schema("P-low", "zlow"),
  schema("P-again", "ztop"),
  schema("P-ab", "zpair", { argument_names: ["a", "b"] }),
  schema("P-a-b", "zpair", { argument_names: ["ab"] }),
  schema("P-t1", "ztypes", { argument_types: ["x", "y"] }),
  schema("P-t2", "ztypes", { argument_types: ["xy"] }),
  { ...SHADOWED, id: "P-shadow" },
];

/** Scores by schema id for the claim that ranks candidates. */
const SCORES: Record<string, number> = {
  "P-top": 0.9,
  "P-1": 0.5,
  "P-0": 0.5,
  "P-beta": 0.5,
  [BUILT_IN.id]: 0.5,
  "P-low": 0.2,
};

/** Each claim of the analysis: its key, status and suggestion kind. */
const CLAIMS: [string, string, string | undefined][] = [
  ["n", "nonlogical", undefined],
  ["s", "assertive", "strict_property"],
  ["r", "assertive", "rule"],
  ["p", "assertive", "predicate"],
  ["ranked", "assertive", undefined],
  ["amb", "ambiguous", undefined],
  ["obs", "assertive", "ambiguity_observation"],
  ["gap", "assertive", undefined],
];

function fakeAnalysis(payload: Loose) {
  const short = payload.id !== "REQ-a";
  const claims = short ? [CLAIMS[7]] : CLAIMS;
  const propositions = (claims as [string, string, string | undefined][]).map(
    ([key, status], index) => ({
      claim_key: `${payload.id}:${key}`,
      claim_text: key === "ranked" ? "ranked text" : `${key} text`,
      role: "clause",
      status,
      span: { start: index, end: index + 1 },
      ...(index === 1 ? { reason: "why" } : {}),
    }),
  );
  return {
    receipt: {
      suggestions: (claims as [string, string, string | undefined][])
        .filter(([, , kind]) => kind !== undefined)
        .map(([key, , kind]) => ({ claim_key: `${payload.id}:${key}`, kind })),
      propositions,
      logic_coverage: {
        expected_claim_keys: ["zkeep", "keep", "new-b", "new-a"],
      },
      clauses: [{ text: "clause one" }, { text: "clause two" }],
      inventory_contract: {
        version: "inv-1",
        source_field: "semantic_text",
        source_hash: `inventory:${payload.properties.semantic_text}`,
      },
    },
    warnings: [`warning for ${payload.id}`],
  };
}

function fakes() {
  return {
    analyze: spy(prose, "analyzeSemanticAdvisorInput").mockImplementation(
      (input: Loose) => fakeAnalysis(input.payload),
    ),
    score: spy(ranker, "scoreSchema").mockImplementation(
      (candidate: Loose, text: string) =>
        text === "ranked text" || text === "n text"
          ? (SCORES[candidate.id] ?? 0)
          : 0,
    ),
    suggest: spy(applyPlan, "buildSuggestion").mockImplementation(
      (candidate: Loose, text: string, subject: unknown, score: number) => ({
        binding_status: score > 0.6 ? "complete" : "incomplete",
        unbound_arguments: [`${subject}`],
        polarity: "assert",
        canonical_key: `${candidate.id}:${text}`,
      }),
    ),
    subject: spy(inference, "inferSubject").mockReturnValue("SUBJECT"),
    sourceHash: spy(shared, "semanticSourceHash").mockImplementation(
      (text: string) => `hash:${text}`,
    ),
  };
}

const batch = (requirementId: string, extra: Record<string, unknown> = {}) => ({
  id: `repair-${requirementId}`,
  requirementId,
  phase: "semantic_inventory",
  state: "ready",
  dependsOn: [`dep-${requirementId}`],
  ...extra,
});

const repairPlan = (batches: Loose[], complete = true) =>
  ({ planId: "repair-plan-1", scope: { complete }, batches }) as Loose;

const BATCHES = [
  batch("REQ-h"),
  batch("REQ-c"),
  batch("REQ-a"),
  batch("REQ-a", { id: "repair-REQ-a-again" }),
  batch("REQ-b", { phase: "logic_grounding" }),
  batch("REQ-d", { state: "blocked" }),
  batch("REQ-e"),
  batch("REQ-f"),
  batch("REQ-g"),
];

const REQUIREMENTS = [
  {
    id: "REQ-a",
    title: "A",
    status: "open",
    source: "docs/a.md",
    text_ref: "  ",
    logic_claims: [
      "zold",
      "kb:entity/old",
      5,
      "zkeep",
      "keep",
      "a kb:entity/b",
    ],
  },
  {
    id: "REQ-c",
    source: 5,
    semantic_text: " same ",
    logic_claims: "kb:entity/keep",
  },
  { id: "REQ-f", source: "docs/f.md" },
  { id: "REQ-g", source: "docs/g.md", semantic_text: "different" },
  {
    id: "REQ-h",
    source: "docs/h.md",
    text_ref: " ref ",
    semantic_text: "   ",
    logic_claims: 3,
  },
  { id: 7, source: "docs/seven.md" },
];

const SOURCES: Record<string, string | null> = {
  "REQ-a": "alpha body",
  "REQ-c": "same",
  "REQ-f": null,
  "REQ-g": "gee",
  "REQ-h": "hé",
};

const readSource = async (requirement: Loose) =>
  SOURCES[requirement.id] ?? null;

const dependencies = (extra: Record<string, unknown> = {}) => ({
  requirements: REQUIREMENTS,
  projectPredicateSchemas: PROJECT,
  readSource,
  ...extra,
});

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, sorted((value as Record<string, unknown>)[key])]),
  );
}

const sha = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(sorted(value)))
    .digest("hex");

function catalogHash(project: Loose[]) {
  const seen = new Set<string>();
  const rows: Loose[] = [];
  for (const [origin, list] of [
    ["project_local", project],
    ["built_in", BUILT_IN_PREDICATE_SCHEMAS],
  ] as const)
    for (const item of list as Loose[]) {
      const identity = `${item.predicate_name}(${item.argument_names.join(",")}):${item.argument_types.join(",")}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      rows.push({ origin, schema: item });
    }
  return sha(rows);
}

/** The plan without the identities that hash the built-in catalog. */
function stable(plan: Loose) {
  const { planId, predicateCatalogHash, ...rest } = plan;
  expect(predicateCatalogHash).toBe(catalogHash(PROJECT));
  const {
    planId: _id,
    readOnly: _readOnly,
    status: _status,
    applicationPolicy: _policy,
    summary: _summary,
    diagnostics: _diagnostics,
    ...core
  } = plan;
  expect(planId).toBe(`legacy-migration-plan-${sha(core).slice(0, 24)}`);
  return rest;
}

describe("buildLegacyMigrationPlan", () => {
  test("previews every ready semantic-inventory batch", async () => {
    const calls = fakes();
    const plan = await buildLegacyMigrationPlan(
      repairPlan(BATCHES),
      { migrationLimit: 10 },
      "code-1",
      dependencies({ diagnostics: ["schema note"] }),
    );
    expectGolden("legacy-migration-plan", stable(plan));
    expect(plan.version).toBe(LEGACY_MIGRATION_PLAN_VERSION);
    expect(LEGACY_MIGRATION_PLAN_VERSION).toBe("kibi.legacy-migration-plan.v1");
    expect(calls.analyze).toHaveBeenCalledWith({
      payload: {
        type: "req",
        id: "REQ-a",
        properties: {
          title: "A",
          status: "open",
          source: "docs/a.md",
          semantic_text: "alpha body",
          logic_claims: ["zold", "old", "zkeep", "keep", "a kb:entity/b"],
        },
        relationships: [],
      },
    });
    const sourceless = calls.analyze.mock.calls.find(
      ([input]: Loose[]) => input.payload.id === "REQ-c",
    )[0];
    expect(Object.hasOwn(sourceless.payload.properties, "source")).toBe(true);
    expect(sourceless.payload.properties.source).toBeUndefined();
    expect(calls.subject).toHaveBeenCalledWith("ranked text", undefined);
    const patch = plan.batches[0]?.requirementPropertyPatchPreview as Loose;
    expect(
      patch.semantic_inventory.map((row: Loose) =>
        Object.hasOwn(row, "reason"),
      ),
    ).toEqual([false, true, false, false, false, false, false, false]);
  });

  test("ranks predicate candidates by score, origin, name and id", async () => {
    fakes();
    const ranked = async (input: Record<string, unknown>) => {
      const plan = await buildLegacyMigrationPlan(
        repairPlan([batch("REQ-a")]),
        input,
        "code",
        dependencies(),
      );
      return (
        plan.batches[0]?.propositions.find(
          (row) => row.claimKey === "REQ-a:ranked",
        ) as Loose
      ).predicateCandidates.map((row: Loose) => row.schemaId);
    };
    expect(await ranked({})).toEqual([
      "P-top",
      "P-0",
      "P-1",
      "P-beta",
      BUILT_IN.id,
    ]);
    expect(await ranked({ migrationPredicateLimit: 2 })).toEqual([
      "P-top",
      "P-0",
    ]);
    expect(await ranked({ migrationPredicateLimit: 0 })).toEqual(["P-top"]);
    expect(await ranked({ migrationPredicateLimit: 2.5 })).toHaveLength(5);
    const all = await ranked({
      migrationPredicateLimit: 99,
      migrationPredicateMinScore: 0,
    });
    expect(all).toHaveLength(20);
    expect(all.slice(0, 7)).toEqual([
      "P-top",
      "P-0",
      "P-1",
      "P-beta",
      BUILT_IN.id,
      "P-low",
      "P-shadow",
    ]);
    for (const kept of ["P-ab", "P-a-b", "P-t1", "P-t2"])
      expect(all).toContain(kept);
    const builtInNames = all
      .slice(5)
      .filter((id: string) => !id.startsWith("P-"))
      .map(
        (id: string) =>
          (BUILT_IN_PREDICATE_SCHEMAS as Loose[]).find((item) => item.id === id)
            .predicate_name,
      );
    expect(builtInNames.length).toBeGreaterThan(5);
    expect(builtInNames).toEqual(
      [...builtInNames].sort((left, right) => left.localeCompare(right)),
    );
    expect(all).not.toContain("P-again");
    expect(all).not.toContain(SHADOWED.id);
    expect(
      await ranked({
        migrationPredicateLimit: 20,
        migrationPredicateMinScore: 0.2,
      }),
    ).toEqual(["P-top", "P-0", "P-1", "P-beta", BUILT_IN.id, "P-low"]);
    expect(await ranked({ migrationPredicateMinScore: 0.9 })).toEqual([
      "P-top",
    ]);
    expect(await ranked({ migrationPredicateMinScore: 2 })).toEqual([]);
    expect(
      await ranked({
        migrationPredicateMinScore: -1,
        migrationPredicateLimit: 20,
      }),
    ).toHaveLength(20);
    for (const score of [Number.NaN, Number.POSITIVE_INFINITY, "0.9"])
      expect(await ranked({ migrationPredicateMinScore: score })).toHaveLength(
        5,
      );
  });

  test("selects one page of batches", async () => {
    fakes();
    const page = async (input: Record<string, unknown>, complete = true) =>
      buildLegacyMigrationPlan(
        repairPlan(BATCHES, complete),
        input,
        "code",
        dependencies(),
      );
    const first = await page({});
    expect(first.scope).toStrictEqual({
      repairPlanComplete: true,
      candidateRequirements: 6,
      selectedRequirements: 1,
      offset: 0,
      limit: 1,
      selectionComplete: false,
      nextOffset: 1,
    });
    expect(first.batches.map((row) => row.requirementId)).toEqual(["REQ-a"]);
    expect(first.status).toBe("ready");
    const middle = await page({ migrationOffset: 2, migrationLimit: 3 });
    expect(middle.batches.map((row) => row.requirementId)).toEqual([
      "REQ-e",
      "REQ-f",
      "REQ-g",
    ]);
    expect(middle.scope.nextOffset).toBe(5);
    expect(middle.status).toBe("blocked");
    expect(middle.summary).toStrictEqual({
      batchCount: 3,
      readyBatchCount: 0,
      blockedBatchCount: 3,
      propositionCount: 1,
      assertivePropositionCount: 1,
      unresolvedPropositionCount: 1,
      predicateCandidateCount: 0,
    });
    const last = await page({ migrationOffset: 5, migrationLimit: 99 });
    expect(last.scope).toMatchObject({
      offset: 5,
      limit: 10,
      selectedRequirements: 1,
      nextOffset: null,
      selectionComplete: false,
    });
    const whole = await page({ migrationOffset: -3, migrationLimit: 10 });
    expect(whole.scope).toMatchObject({
      offset: 0,
      selectionComplete: true,
      nextOffset: null,
    });
    expect(whole.diagnostics).toEqual([]);
    expect((await page({ migrationLimit: 0 })).scope.limit).toBe(1);
    expect((await page({ migrationOffset: 1.5 })).scope.offset).toBe(0);
    const beyond = await page({ migrationOffset: 6 });
    expect(beyond.batches).toEqual([]);
    expect(beyond.diagnostics).toEqual([
      "Migration offset 6 is beyond 6 ready semantic-inventory requirement batch(es).",
    ]);
    expect(beyond.status).toBe("blocked");
    const partial = await page({}, false);
    expect(partial.status).toBe("partial");
    expect(partial.scope.repairPlanComplete).toBe(false);
    expect(partial.diagnostics).toEqual([
      "Legacy migration scope is partial because requirement coverage omitted actionable requirements; rerun complete coverage before treating this as a project inventory.",
    ]);
    const none = await buildLegacyMigrationPlan(
      repairPlan([batch("REQ-b", { phase: "logic_grounding" })]),
      { migrationOffset: 4 },
      "code",
      dependencies(),
    );
    expect(none.status).toBe("no_candidates");
    expect(none.diagnostics).toEqual([]);
    expect(none.scope.selectionComplete).toBe(false);
    const empty = await buildLegacyMigrationPlan(
      repairPlan([]),
      {},
      "code",
      dependencies(),
    );
    expect(empty.scope.selectionComplete).toBe(true);
    expect(empty.planId).not.toBe(none.planId);
  });

  test("hashes the catalog whatever the key order", async () => {
    fakes();
    const reordered = PROJECT.map((item: Loose) =>
      Object.fromEntries(Object.entries(item).reverse()),
    );
    const nested = (examples: unknown) =>
      buildLegacyMigrationPlan(repairPlan([]), {}, "code", {
        ...dependencies(),
        projectPredicateSchemas: [
          schema("P-n", "nested", { examples, note: null }),
        ],
      });
    const plan = await buildLegacyMigrationPlan(repairPlan([]), {}, "code", {
      ...dependencies(),
      projectPredicateSchemas: reordered as Loose[],
    });
    expect(plan.predicateCatalogHash).toBe(catalogHash(PROJECT));
    expect((await nested([{ b: 1, a: 2 }])).predicateCatalogHash).toBe(
      (await nested([{ a: 2, b: 1 }])).predicateCatalogHash,
    );
    expect((await nested([{ a: 2 }])).predicateCatalogHash).not.toBe(
      (await nested([{ a: 3 }])).predicateCatalogHash,
    );
  });
});

describe("buildLegacyMigrationPlanFromContext", () => {
  test("reads requirements, schemas and authored bodies", async () => {
    fakes();
    const prolog = { query: async () => ({ success: true, bindings: {} }) };
    const load = spy(entities, "loadEntities").mockResolvedValue([
      { id: "REQ-1", source: "docs/1.md" },
      { id: "REQ-2", source: 4 },
      { id: "REQ-3", source: "docs/3.md" },
      { id: "REQ-4", source: "docs/4.md" },
    ]);
    const schemas = spy(
      loader,
      "loadExistingPredicateSchemas",
    ).mockImplementation(
      async (_prolog: unknown, _strict: unknown, diagnostics: string[]) => {
        diagnostics.push("schema skipped");
        return [];
      },
    );
    const bodies: Record<string, string | null> = {
      "docs/1.md": "body one",
      "": "unsourced",
      "docs/3.md": null,
      "docs/4.md": "blank",
    };
    const body = spy(ranking, "loadMarkdownBody").mockImplementation(
      async (source: string) => bodies[source] ?? null,
    );
    const semantic = spy(
      markdown,
      "requirementSemanticText",
    ).mockImplementation((text: string) =>
      text === "blank" ? "" : `semantic ${text}`,
    );
    const context = {
      workspaceRoot: "/ws",
      signal: new AbortController().signal,
      clock: () => new Date(0),
      prolog,
    } as Loose;
    const plan = await buildLegacyMigrationPlanFromContext(
      repairPlan([
        batch("REQ-1"),
        batch("REQ-2"),
        batch("REQ-3"),
        batch("REQ-4"),
      ]),
      { migrationLimit: 10 },
      "code",
      context,
    );
    expect(load).toHaveBeenCalledWith(prolog, { type: "req" });
    expect(schemas.mock.calls[0].slice(0, 2)).toEqual([prolog, true]);
    expect(body.mock.calls).toEqual([
      ["docs/1.md", "/ws"],
      ["", "/ws"],
      ["docs/3.md", "/ws"],
      ["docs/4.md", "/ws"],
    ]);
    expect(semantic.mock.calls).toEqual([
      ["body one"],
      ["unsourced"],
      ["blank"],
    ]);
    expect(plan.batches.map((row) => row.sourceText)).toEqual([
      "semantic body one",
      "semantic unsourced",
      null,
      null,
    ]);
    expect(plan.diagnostics).toEqual(["schema skipped"]);
  });

  test("needs a Prolog context", async () => {
    await expect(
      buildLegacyMigrationPlanFromContext(repairPlan([]), {}, "code", {
        workspaceRoot: "/ws",
      } as Loose),
    ).rejects.toThrow("Legacy migration planning requires a Prolog context");
  });
});
