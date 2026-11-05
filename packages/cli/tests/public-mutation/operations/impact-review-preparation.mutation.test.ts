import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as maintenance from "../../../src/plugins/maintenance-source-analysis.js";
import * as changes from "../../../src/plugins/source-change-analysis.js";
import { executePrepareImpactReview } from "../../../src/public/operations/impact-review-preparation.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import * as gate from "../../../src/traceability/analysis-gate.js";
import * as snapshots from "../../../src/traceability/git-change-snapshot.js";
import * as evaluator from "../../../src/traceability/impact-evaluator.js";
import * as knowledge from "../../../src/traceability/snapshot-knowledge.js";
import { expectGolden } from "../helpers/golden.js";

// biome-ignore lint/suspicious/noExplicitAny: the fakes stand in for wide types
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

const RECORD_SCHEMA = JSON.parse(
  readFileSync(
    join(
      import.meta.dir,
      "../../../src/traceability/impact-review.schema.json",
    ),
    "utf8",
  ),
);

/** A repository with a base commit, a head commit and an annotated tag. */
function repository() {
  const root = mkdtempSync(join(tmpdir(), "kibi-impact-prep-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
  git("init", "-q");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "tag.gpgSign", "false");
  git("config", "commit.gpgSign", "false");
  writeFileSync(join(root, "a.txt"), "one\n");
  git("add", ".");
  git("commit", "-qm", "base");
  const base = git("rev-parse", "HEAD");
  writeFileSync(join(root, "a.txt"), "two\n");
  git("commit", "-qam", "head");
  const head = git("rev-parse", "HEAD");
  git("tag", "-a", "-m", "tagged", "v1", base);
  git("tag", "-a", "-m", "tagged", "v2", head);
  return {
    root,
    base,
    head,
    tag: git("rev-parse", "v1"),
    headTag: git("rev-parse", "v2"),
    baseTree: git("rev-parse", `${base}^{tree}`),
    headTree: git("rev-parse", `${head}^{tree}`),
  };
}

function context(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date(0),
  };
}

const rel = (type: string, from: string, to: string) => ({ type, from, to });

const ROWS: Record<string, Loose[]> = {
  "tree-base": [
    {
      entity: {
        id: "REQ-a",
        type: "req",
        zeta: 1,
        title: "A",
        created_at: "c",
        updated_at: "u",
        proof_receipts: [],
      },
      relationships: [
        { ...rel("depends_on", "REQ-a", "REQ-c"), note: "dropped" },
        rel("relates_to", "REQ-a", "REQ-d"),
        rel("validates", "REQ-a", "REQ-gone"),
        rel("constrains", "REQ-a", "REQ-b"),
        rel("requires_predicate", "REQ-a", "REQ-c"),
        rel("requires_property", "REQ-a", "REQ-c"),
        rel("requires_rule", "REQ-a", "REQ-c"),
        rel("specified_by", "REQ-a", "REQ-c"),
        rel("supersedes", "REQ-a", "REQ-c"),
      ],
      sourceFile: "",
    },
    {
      entity: { id: "REQ-b", type: "req", title: "B" },
      relationships: [],
      sourceFile: ".kb/b.md",
    },
    {
      entity: { id: "REQ-c", title: "C" },
      relationships: [
        rel("verified_by", "REQ-c", "REQ-a"),
        rel("constrains", "REQ-x", "REQ-y"),
        rel("validates", "REQ-ab", "REQ-a"),
      ],
      sourceFile: ".kb/c.md",
    },
    { entity: { id: "REQ-ab", type: "test" }, relationships: [] },
  ],
  "tree-head": [
    {
      entity: { id: "REQ-a", type: "req", title: "A2" },
      relationships: [rel("depends_on", "REQ-b", "REQ-a")],
      sourceFile: ".kb/a.md",
    },
    {
      entity: { id: "REQ-b", type: "req", title: "B" },
      relationships: [],
    },
  ],
};

const analysis = (fields: Record<string, unknown>) => ({
  providerId: "prov",
  providerFingerprint: "pf",
  diagnosticCodes: [],
  ...fields,
});

const POLICY = {
  id: "policy-1",
  version: "3",
  allowedPartial: [
    {
      providerId: "other",
      providerFingerprint: "pf",
      diagnosticCode: "C1",
      limitationClass: "elsewhere",
    },
    {
      providerId: "prov",
      providerFingerprint: "other-fp",
      diagnosticCode: "C1",
      limitationClass: "elsewhere",
    },
    {
      providerId: "prov",
      providerFingerprint: "pf",
      diagnosticCode: "C9",
      limitationClass: "elsewhere",
    },
    {
      providerId: "prov",
      providerFingerprint: "pf",
      diagnosticCode: "C1",
      limitationClass: "local",
    },
    { providerId: "prov", providerFingerprint: "pf", diagnosticCode: "C8" },
  ],
};

function preparedReview(files: Loose[] = defaultFiles()) {
  return {
    policy: POLICY,
    policyFingerprint: "policy-fp",
    evaluatorFingerprint: "evaluator-fp",
    providerSetFingerprint: "provider-fp",
    knowledgeFingerprint: "knowledge-fp",
    scopeFingerprint: "scope-fp",
    files,
    scopedRequirementIdsByPath: new Map([
      ["z.ts", ["REQ-b", "REQ-a"]],
      ["a.ts", ["REQ-missing"]],
    ]),
    baseEntities: new Map<string, Loose>([
      ["REQ-a", { fingerprint: "fa", artifactPath: ".kb/a.md" }],
      [
        "REQ-b",
        { fingerprint: "fb", artifactPath: ".kb/b.md", sourcePath: "src/b" },
      ],
      ["REQ-missing", { fingerprint: "fm", artifactPath: ".kb/m.md" }],
    ]),
    headEntities: new Map<string, Loose>([
      ["REQ-a", { fingerprint: "fa2", artifactPath: ".kb/a.md" }],
    ]),
    scopePayload: {},
  };
}

function defaultFiles(): Loose[] {
  return [
    {
      path: "z.ts",
      newHunkRanges: [{ start: 1, end: 2 }],
      analysisReviews: ["kept out"],
      before: {
        analysis: analysis({
          status: "unsupported",
          diagnosticCodes: ["b", "a"],
          obligation: { kind: "unsupported_review" },
        }),
      },
      after: {
        analysis: analysis({
          status: "partial",
          diagnosticCodes: ["C1", "C0"],
          obligation: {
            kind: "partial_review",
            ranges: [{ startLine: 3, endLine: 4 }],
          },
        }),
      },
    },
    {
      path: "m.ts",
      newHunkRanges: [],
      analysisReviews: null,
      before: { analysis: analysis({ obligation: { kind: "none" } }) },
      after: {
        analysis: analysis({
          status: "failed",
          obligation: { kind: "blocked" },
        }),
      },
    },
    {
      path: "a.ts",
      newHunkRanges: [],
      analysisReviews: [],
      before: null,
      after: {
        analysis: analysis({
          status: "unsupported",
          obligation: { kind: "unsupported_review" },
        }),
      },
    },
    { path: "n.ts", newHunkRanges: [], analysisReviews: [], after: {} },
  ];
}

type Fixture = ReturnType<typeof repository>;

function fakeSnapshot(repo: Fixture, overrides: Record<string, unknown> = {}) {
  const snapshot: Loose = {
    headCommit: repo.base,
    baseTree: repo.baseTree,
    headTree: repo.headTree,
    readGit: () => Buffer.from(""),
    readBlobs: () => new Map(),
    inventory: "INVENTORY",
    checks: 0,
    assertUnchanged() {
      snapshot.checks += 1;
    },
    ...overrides,
  };
  return snapshot;
}

function harness(
  repo: Fixture,
  options: {
    snapshot?: Loose;
    files?: Loose[];
    providerPrints?: string[];
    evaluatorPrints?: string[];
  } = {},
) {
  const snapshot = options.snapshot ?? fakeSnapshot(repo);
  const providerPrints = [...(options.providerPrints ?? ["provider-fp"])];
  const evaluatorPrints = [...(options.evaluatorPrints ?? ["evaluator-fp"])];
  const next = (values: string[]) =>
    values.length > 1 ? (values.shift() as string) : values[0];
  return {
    snapshot,
    staged: spy(snapshots, "captureStagedSnapshot").mockReturnValue(snapshot),
    diff: spy(snapshots, "captureDiffSnapshot").mockReturnValue(snapshot),
    config: spy(maintenance, "readSnapshotSourceConfig").mockReturnValue(
      "CONFIG",
    ),
    providerPrint: spy(
      maintenance,
      "fingerprintMaintenanceSourceSet",
    ).mockImplementation(() => next(providerPrints)),
    service: spy(
      maintenance,
      "createMaintenanceSourceAnalysisService",
    ).mockReturnValue("SERVICE"),
    analyze: spy(changes, "analyzeSourceChanges").mockResolvedValue(
      new Map([["z.ts", "ANALYSIS"]]),
    ),
    evaluatorPrint: spy(
      evaluator,
      "fingerprintImpactEvaluator",
    ).mockImplementation(() => next(evaluatorPrints)),
    prepare: spy(evaluator, "prepareImpactReview").mockReturnValue(
      preparedReview(options.files),
    ),
    knowledge: spy(knowledge, "readSnapshotKnowledge").mockImplementation(
      (_readGit: unknown, tree: string) =>
        ROWS[tree === repo.baseTree ? "tree-base" : "tree-head"],
    ),
    obligation: spy(gate, "analysisObligation").mockImplementation(
      (_side: unknown, value: Loose) => value.obligation,
    ),
  };
}

const diffScope = (base: string, head: string) => ({
  scope: { kind: "diff" as const, baseCommit: base, headCommit: head },
});

async function prepare(repo: Fixture, input: Loose): Promise<Loose> {
  return executePrepareImpactReview(input, context(repo.root));
}

describe("executePrepareImpactReview", () => {
  test("prepares the authoring inputs of a staged change", async () => {
    const repo = repository();
    const calls = harness(repo);
    const result = await prepare(repo, { scope: { kind: "staged" } });
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Prepared complete staged impact-review authoring inputs; every review decision remains unauthored.",
      },
    ]);
    const data = result.structuredContent;
    expect(data.snapshot).toStrictEqual({
      kind: "staged",
      baseCommit: repo.base,
      baseTree: repo.baseTree,
      headCommit: null,
      headTree: repo.headTree,
      headTreeSource: "index",
    });
    expect(calls.staged).toHaveBeenCalledWith(repo.root);
    expect(calls.diff).not.toHaveBeenCalled();
    expect(calls.config).toHaveBeenCalledWith(calls.snapshot, repo.baseTree);
    expect(calls.providerPrint).toHaveBeenCalledWith(repo.root, "CONFIG");
    expect(calls.providerPrint).toHaveBeenCalledTimes(2);
    expect(calls.evaluatorPrint).toHaveBeenCalledTimes(2);
    expect(calls.service).toHaveBeenCalledWith(repo.root, "CONFIG");
    expect(calls.analyze).toHaveBeenCalledWith("INVENTORY", "SERVICE");
    expect(calls.prepare).toHaveBeenCalledWith(calls.snapshot, {
      providerSetFingerprint: "provider-fp",
      evaluatorFingerprint: "evaluator-fp",
      analyses: new Map([["z.ts", "ANALYSIS"]]),
    });
    expect(calls.knowledge.mock.calls).toEqual([
      [calls.snapshot.readGit, repo.baseTree, calls.snapshot.readBlobs],
      [calls.snapshot.readGit, repo.headTree, calls.snapshot.readBlobs],
    ]);
    expect(calls.snapshot.checks).toBe(2);
    const { authorship, ...rest } = data;
    const { snapshot: _snapshot, ...stable } = rest;
    expectGolden("impact-review-preparation", stable);
    expect(
      data.requirementScopes[1].before.map((row: Loose) =>
        Object.keys(row.entity),
      ),
    ).toEqual([
      ["id", "title", "type", "zeta"],
      ["id", "title", "type"],
    ]);
    expect(
      Object.keys(
        data.requirementScopes[1].before[0].relatedEntities[2].entity,
      ),
    ).toStrictEqual(["id", "title"]);
    expect(data.files.map((file: Loose) => file.path)).toEqual([
      "a.ts",
      "m.ts",
      "n.ts",
      "z.ts",
    ]);
    expect(
      data.files.some((file: Loose) => Object.hasOwn(file, "analysisReviews")),
    ).toBe(false);

    const { recordSchema, templateSchema, recordTemplate, ...contract } =
      authorship;
    expectGolden("impact-review-authorship", contract);
    expect(recordSchema).toStrictEqual(RECORD_SCHEMA);
    expect(recordTemplate).toStrictEqual({
      templateVersion: "kibi.impact-review-authoring-template.v1",
      isValidImpactReviewRecord: false,
      record: {
        ...data.recordHeaders,
        reviewer: { id: null, source: "self-claimed-local" },
        reviewedAt: null,
        files: data.files.map((file: Loose) => ({
          ...file,
          analysisReviews: null,
          decision: null,
        })),
      },
    });
    const { record, ...templateProperties } = templateSchema.properties;
    expect({ ...templateSchema, properties: templateProperties }).toStrictEqual(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        $id: "urn:kibi:impact-review-authoring-template:v1",
        type: "object",
        additionalProperties: false,
        required: ["templateVersion", "isValidImpactReviewRecord", "record"],
        properties: {
          templateVersion: {
            const: "kibi.impact-review-authoring-template.v1",
          },
          isValidImpactReviewRecord: { const: false },
        },
      },
    );
    const expected = structuredClone(RECORD_SCHEMA);
    expected.$id = "urn:kibi:impact-review-authoring-record-template:v1";
    expected.properties.reviewedAt = { type: "null" };
    expected.$defs.reviewer.properties.id = { type: "null" };
    expected.$defs.file.properties.analysisReviews = {
      anyOf: [
        RECORD_SCHEMA.$defs.file.properties.analysisReviews,
        { type: "null" },
      ],
    };
    expected.$defs.file.properties.decision = {
      anyOf: [RECORD_SCHEMA.$defs.file.properties.decision, { type: "null" }],
    };
    expect(record).toStrictEqual(expected);
  });

  test("keeps equal relationships and orders the rest", async () => {
    const repo = repository();
    harness(repo);
    const twice = rel("verified_by", "REQ-c", "REQ-a");
    const saved = ROWS["tree-base"][2].relationships;
    ROWS["tree-base"][2].relationships = [twice, twice];
    try {
      const data = (await prepare(repo, { scope: { kind: "staged" } }))
        .structuredContent;
      const edges = data.requirementScopes[1].before[0].relationships;
      expect(
        edges.filter((edge: Loose) => edge.type === "verified_by"),
      ).toHaveLength(2);
    } finally {
      ROWS["tree-base"][2].relationships = saved;
    }
  });

  test("prepares an explicit diff of full commit ids", async () => {
    const repo = repository();
    const calls = harness(repo);
    const result = await prepare(repo, diffScope(repo.base, repo.head));
    expect(result.content[0].text).toBe(
      "Prepared complete diff impact-review authoring inputs; every review decision remains unauthored.",
    );
    expect(result.structuredContent.snapshot).toStrictEqual({
      kind: "diff",
      baseCommit: repo.base,
      baseTree: repo.baseTree,
      headCommit: repo.head,
      headTree: repo.headTree,
      headTreeSource: "commit",
    });
    expect(calls.diff).toHaveBeenCalledWith(repo.root, repo.base, repo.head);
    expect(calls.staged).not.toHaveBeenCalled();
  });

  test("refuses diff ids that are not full lowercase object ids", async () => {
    const repo = repository();
    const calls = harness(repo);
    const message =
      "Diff scope requires full lowercase hexadecimal baseCommit and headCommit object IDs";
    for (const [base, head] of [
      [repo.base.slice(0, 39), repo.head],
      [repo.base, repo.head.toUpperCase()],
      [` ${repo.base}`, repo.head],
      [repo.base, `${repo.head}0`],
      [`${repo.base}a`, repo.head],
    ])
      await expect(
        prepare(repo, diffScope(base as string, head as string)),
      ).rejects.toThrow(message);
    expect(calls.diff).not.toHaveBeenCalled();
    const long = "a".repeat(64);
    await expect(prepare(repo, diffScope(long, long))).rejects.toThrow(
      /^Command failed: git rev-parse --verify --end-of-options a{64}\^\{commit\}/,
    );
  });

  test("refuses a diff whose identity moved", async () => {
    const repo = repository();
    const moved =
      "Selected diff commit or tree identity changed during impact review preparation";
    harness(repo);
    await expect(prepare(repo, diffScope(repo.tag, repo.head))).rejects.toThrow(
      moved,
    );
    await expect(
      prepare(repo, diffScope(repo.base, repo.headTag)),
    ).rejects.toThrow(moved);
    for (const overrides of [
      { headCommit: repo.head },
      { baseTree: repo.headTree },
      { headTree: repo.baseTree },
    ]) {
      const calls = harness(repo, { snapshot: fakeSnapshot(repo, overrides) });
      await expect(
        prepare(repo, diffScope(repo.base, repo.head)),
      ).rejects.toThrow(moved);
      expect(calls.analyze).not.toHaveBeenCalled();
    }
    for (const changeOn of [1, 2]) {
      const snapshot = fakeSnapshot(repo);
      snapshot.assertUnchanged = () => {
        snapshot.checks += 1;
        snapshot.headTree =
          snapshot.checks === changeOn ? repo.baseTree : repo.headTree;
      };
      harness(repo, { snapshot });
      await expect(
        prepare(repo, diffScope(repo.base, repo.head)),
      ).rejects.toThrow(moved);
    }
  });

  test("refuses a closure that changed while preparing", async () => {
    const repo = repository();
    const changed =
      "Trusted source-provider or impact-evaluator closure changed during impact review preparation";
    harness(repo, { providerPrints: ["provider-fp", "provider-2"] });
    await expect(prepare(repo, { scope: { kind: "staged" } })).rejects.toThrow(
      changed,
    );
    harness(repo, { evaluatorPrints: ["evaluator-fp", "evaluator-2"] });
    await expect(prepare(repo, { scope: { kind: "staged" } })).rejects.toThrow(
      changed,
    );
  });

  test("refuses a partial review the policy does not cover once", async () => {
    const repo = repository();
    const partial = (codes: string[]) => [
      {
        path: "p.ts",
        newHunkRanges: [],
        analysisReviews: [],
        after: {
          analysis: analysis({
            status: "partial",
            diagnosticCodes: codes,
            obligation: { kind: "partial_review", ranges: [] },
          }),
        },
      },
    ];
    for (const codes of [["C0"], ["C1", "C9"], ["C8"]]) {
      harness(repo, { files: partial(codes) });
      await expect(
        prepare(repo, { scope: { kind: "staged" } }),
      ).rejects.toThrow(
        "Partial review obligation is not covered by the trusted policy: p.ts (after)",
      );
    }
  });
});
