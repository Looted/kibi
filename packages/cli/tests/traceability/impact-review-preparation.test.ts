import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { executePrepareImpactReview } from "../../src/public/operations/impact-review-preparation.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

type Row = Record<string, unknown>;

function repo() {
  const root = mkdtempSync(join(tmpdir(), "kibi-impact-preparation-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  git("init", "-q");
  git("config", "user.name", "Impact Fixture");
  git("config", "user.email", "impact-fixture@example.invalid");
  write(
    ".kibi/impact-policy.json",
    `${JSON.stringify(
      {
        contractVersion: "kibi.impact-policy.v1",
        id: "fixture-policy",
        version: "1",
        allowUnsupportedReview: true,
        allowedPartial: [],
        notApplicablePaths: [],
      },
      null,
      2,
    )}\n`,
  );
  write(
    ".kb/requirements/REQ-impact.md",
    "---\nid: REQ-impact\ntitle: Preserve behavior\nstatus: open\n---\nKeep this behavior.\n",
  );
  write(
    ".kb/requirements/REQ-base.md",
    "---\nid: REQ-base\ntitle: Base behavior\nstatus: open\ncreated_at: 2026-01-01T00:00:00Z\nupdated_at: 2026-01-02T00:00:00Z\n---\nBase.\n",
  );
  write(
    ".kb/tests/TEST-impact.md",
    "---\nid: TEST-impact\ntitle: Impact test\nstatus: active\n---\nChecks run().\n",
  );
  write(
    ".kb/relationships/rel.yaml",
    [
      "relationships:",
      "  - type: depends_on",
      "    from: REQ-impact",
      "    to: REQ-base",
      "  - type: validates",
      "    from: TEST-impact",
      "    to: REQ-impact",
      "  - type: relates_to",
      "    from: REQ-impact",
      "    to: TEST-impact",
      "",
    ].join("\n"),
  );
  write(
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYM-service\n    title: run\n    sourceFile: src/service.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-impact\n",
  );
  write("src/service.ts", "export function run() { return 1; }\n");
  git("add", ".");
  git("commit", "-qm", "baseline");
  return { root, git, write };
}

function context(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: { now: () => new Date(0) },
  } as unknown as OperationContext;
}

async function prepare(
  root: string,
  scope:
    | { kind: "staged" }
    | { kind: "diff"; baseCommit: string; headCommit: string },
) {
  const result = await executePrepareImpactReview({ scope }, context(root));
  return { text: result.content, data: result.structuredContent as Row };
}

function scopeFor(data: Row, path: string): Row {
  const scope = (data.requirementScopes as Row[]).find(
    (row) => row.path === path,
  );
  if (!scope) throw new Error(`missing requirement scope for ${path}`);
  return scope;
}

describe("executePrepareImpactReview", () => {
  test("staged scope projects file evidence, requirement context and an unauthored template", async () => {
    const { root, git, write } = repo();
    const baseCommit = git("rev-parse", "HEAD");
    write("src/service.ts", "export function run() { return 2; }\n");
    git("add", ".");

    const { text, data } = await prepare(root, { kind: "staged" });

    expect(text[0]?.text).toContain("staged impact-review authoring inputs");
    expect(data.preparationVersion).toBe("kibi.impact-review-preparation.v1");
    expect(data.status).toBe("ready_for_authoring");
    expect(data.snapshot).toEqual({
      kind: "staged",
      baseCommit,
      baseTree: git("rev-parse", "HEAD^{tree}"),
      headCommit: null,
      headTree: git("write-tree"),
      headTreeSource: "index",
    });
    const headers = data.recordHeaders as Row;
    expect(headers.contractVersion).toBe("kibi.impact-review.v1");
    expect((headers.policy as Row).id).toBe("fixture-policy");

    const files = data.files as Row[];
    expect(files.map((file) => file.path)).toEqual(["src/service.ts"]);
    expect(files[0]).not.toHaveProperty("analysisReviews");
    expect(files[0]?.status).toBe("M");
    expect(data.residualReviewObligations).toEqual([]);

    const scope = scopeFor(data, "src/service.ts");
    expect(scope.requirementIds).toEqual(["REQ-impact"]);
    const [after] = scope.after as Row[];
    expect(after?.state).toBe("present");
    expect(after?.artifactPath).toBe(".kb/requirements/REQ-impact.md");
    expect(String(after?.entityFingerprint)).toMatch(/^sha256:[a-f0-9]{64}$/);
    // Only semantic edges are projected; relates_to is navigation, not intent.
    expect(after?.relationships).toEqual([
      { type: "depends_on", from: "REQ-impact", to: "REQ-base" },
      { type: "validates", from: "TEST-impact", to: "REQ-impact" },
    ]);
    const related = after?.relatedEntities as Row[];
    expect(related.map((row) => [row.id, row.type])).toEqual([
      ["REQ-base", "req"],
      ["TEST-impact", "test"],
    ]);
    // Volatile timestamps never reach the reviewer-facing projection.
    const base = related[0]?.entity as Row;
    expect(base).not.toHaveProperty("created_at");
    expect(base).not.toHaveProperty("updated_at");
    expect(Object.keys(base)).toEqual([...Object.keys(base)].sort());
    expect(scope.before).toEqual(scope.after);
  }, 60_000);

  test("authoring template validates against its own schema but not as a record", async () => {
    const { root, git, write } = repo();
    write("src/service.ts", "export function run() { return 3; }\n");
    git("add", ".");

    const { data } = await prepare(root, { kind: "staged" });
    const authorship = data.authorship as Row;
    expect(authorship.isValidImpactReviewRecord).toBe(false);
    expect(authorship.authoredFields).toEqual([
      "files[].decision",
      "files[].analysisReviews",
      "reviewer.id",
      "reviewedAt",
    ]);

    const template = authorship.recordTemplate as Row;
    const record = template.record as Row;
    expect(record.reviewer).toEqual({ id: null, source: "self-claimed-local" });
    expect(record.reviewedAt).toBeNull();
    expect(record.contractVersion).toEqual(
      (data.recordHeaders as Row).contractVersion,
    );
    const [file] = record.files as Row[];
    expect(file?.path).toBe("src/service.ts");
    expect(file?.decision).toBeNull();
    expect(file?.analysisReviews).toBeNull();

    const ajv = new Ajv2020({ strict: false, allErrors: true });
    const validTemplate = ajv.compile(authorship.templateSchema as object);
    expect(validTemplate(template)).toBe(true);
    const strict = new Ajv2020({ strict: false, allErrors: true }).compile(
      authorship.recordSchema as object,
    );
    expect(strict(record)).toBe(false);
    // The template schema is a copy: the shipped record schema keeps its id.
    const templateProperties = (authorship.templateSchema as Row)
      .properties as Row;
    expect((templateProperties.record as Row).$id).toBe(
      "urn:kibi:impact-review-authoring-record-template:v1",
    );
    expect((authorship.recordSchema as Row).$id).toBe(
      "urn:kibi:impact-review:v1",
    );
  }, 60_000);

  test("unsupported files become pending whole-file review obligations", async () => {
    const { root, git, write } = repo();
    write("src/tool.rb", "puts 1\n");
    write("src/service.ts", "export function run() { return 4; }\n");
    git("add", ".");

    const { data } = await prepare(root, { kind: "staged" });
    expect((data.files as Row[]).map((file) => file.path)).toEqual([
      "src/service.ts",
      "src/tool.rb",
    ]);
    expect(data.residualReviewObligations).toEqual([
      {
        path: "src/tool.rb",
        side: "after",
        status: "unsupported",
        diagnosticCodes: expect.any(Array),
        kind: "unsupported_review",
        wholeFile: true,
        pending: true,
      },
    ]);
  }, 60_000);

  test("requirements that only exist on one side are reported as absent", async () => {
    const { root, git, write } = repo();
    write(
      ".kb/requirements/REQ-added.md",
      "---\nid: REQ-added\ntitle: Added behavior\nstatus: open\n---\nNew.\n",
    );
    write(
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-service\n    title: run\n    sourceFile: src/service.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-impact\n      - type: implements\n        target: REQ-added\n",
    );
    write("src/service.ts", "export function run() { return 5; }\n");
    git("add", ".");

    const { data } = await prepare(root, { kind: "staged" });
    const scope = scopeFor(data, "src/service.ts");
    expect(scope.requirementIds).toEqual(["REQ-added", "REQ-impact"]);
    const before = (scope.before as Row[]).find(
      (row) => row.id === "REQ-added",
    );
    const after = (scope.after as Row[]).find((row) => row.id === "REQ-added");
    expect(before).toEqual({
      id: "REQ-added",
      state: "absent",
      entityFingerprint: null,
      artifactPath: null,
      sourcePath: null,
      relationships: [],
      relatedEntities: [],
    });
    expect(after?.state).toBe("present");
  }, 60_000);

  test("diff scope binds explicit commits and reads the head tree from the commit", async () => {
    const { root, git, write } = repo();
    const baseCommit = git("rev-parse", "HEAD");
    write("src/service.ts", "export function run() { return 6; }\n");
    git("add", ".");
    git("commit", "-qm", "change");
    const headCommit = git("rev-parse", "HEAD");

    const { text, data } = await prepare(root, {
      kind: "diff",
      baseCommit,
      headCommit,
    });
    expect(text[0]?.text).toContain("diff impact-review authoring inputs");
    expect(data.snapshot).toEqual({
      kind: "diff",
      baseCommit,
      baseTree: git("rev-parse", `${baseCommit}^{tree}`),
      headCommit,
      headTree: git("rev-parse", `${headCommit}^{tree}`),
      headTreeSource: "commit",
    });
    expect((data.files as Row[]).map((file) => file.path)).toEqual([
      "src/service.ts",
    ]);
  }, 60_000);

  test("diff scope rejects abbreviated, symbolic or uppercase object ids", async () => {
    const { root, git } = repo();
    const head = git("rev-parse", "HEAD");
    for (const [baseCommit, headCommit] of [
      [head.slice(0, 12), head],
      [head, "HEAD"],
      [head.toUpperCase(), head],
    ] as const) {
      await expect(
        prepare(root, { kind: "diff", baseCommit, headCommit }),
      ).rejects.toThrow(
        "Diff scope requires full lowercase hexadecimal baseCommit and headCommit object IDs",
      );
    }
  }, 60_000);

  test("diff scope fails when a well-formed commit id does not exist", async () => {
    const { root, git } = repo();
    const head = git("rev-parse", "HEAD");
    await expect(
      prepare(root, {
        kind: "diff",
        baseCommit: head,
        headCommit: "0".repeat(40),
      }),
    ).rejects.toThrow();
  }, 60_000);
});
