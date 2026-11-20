import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  IMPACT_REVIEW_SCHEMA_RESOURCE,
  executePrepareImpactReview,
} from "../../src/public/operations/impact-review-preparation.js";
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
  extra: { paths?: string[]; offset?: number } = {},
) {
  const result = await executePrepareImpactReview(
    { scope, ...extra },
    context(root),
  );
  return { text: result.content, data: result.structuredContent as Row };
}

function evidenceFor(data: Row, path: string): Row {
  const evidence = (data.evidence as Row[] | undefined)?.find(
    (row) => row.path === path,
  );
  if (!evidence) throw new Error(`missing evidence for ${path}`);
  return evidence;
}

describe("executePrepareImpactReview", () => {
  test("staged scope lists a row per file and each requirement once", async () => {
    const { root, git, write } = repo();
    const baseCommit = git("rev-parse", "HEAD");
    write("src/service.ts", "export function run() { return 2; }\n");
    git("add", ".");

    const { text, data } = await prepare(root, { kind: "staged" });

    expect(text[0]?.text).toContain(
      "Prepared the complete staged impact-review scope: 1 file(s)",
    );
    expect(data.preparationVersion).toBe("kibi.impact-review-preparation.v2");
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
    expect(data.fileCount).toBe(1);
    expect(data.files).toEqual([
      {
        path: "src/service.ts",
        status: "M",
        disposition: "checked",
        analysisDepth: "symbol",
        analysis: { before: "ok", after: "ok" },
        requirementIds: ["REQ-impact"],
        pendingObligations: 0,
      },
    ]);
    expect(data.residualReviewObligations).toEqual([]);
    const [requirement] = data.requirements as Row[];
    expect(requirement?.id).toBe("REQ-impact");
    const after = requirement?.after as Row;
    expect(after.state).toBe("present");
    expect(after.artifactPath).toBe(".kb/requirements/REQ-impact.md");
    expect(String(after.entityFingerprint)).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(requirement?.before).toEqual(after);
    // Full evidence only for named paths.
    expect(data).not.toHaveProperty("evidence");
  }, 60_000);

  test("named paths return complete evidence and requirement context", async () => {
    const { root, git, write } = repo();
    write("src/service.ts", "export function run() { return 2; }\n");
    git("add", ".");

    const { data } = await prepare(
      root,
      { kind: "staged" },
      { paths: ["src/service.ts"] },
    );
    expect((data.files as Row[]).map((file) => file.path)).toEqual([
      "src/service.ts",
    ]);
    const evidence = evidenceFor(data, "src/service.ts");
    expect(evidence).not.toHaveProperty("analysisReviews");
    expect(evidence.status).toBe("M");
    expect(Array.isArray(evidence.newHunkRanges)).toBe(true);
    const requirements = evidence.requirements as Row;
    const [after] = requirements.after as Row[];
    expect(after?.state).toBe("present");
    expect(after?.entityFingerprint).toBe(
      ((data.requirements as Row[])[0]?.after as Row).entityFingerprint,
    );
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
    expect(requirements.before).toEqual(requirements.after);
  }, 60_000);

  test("a named path outside the captured inventory is refused", async () => {
    const { root, git, write } = repo();
    write("src/service.ts", "export function run() { return 2; }\n");
    git("add", ".");
    await expect(
      prepare(root, { kind: "staged" }, { paths: ["src/other.ts"] }),
    ).rejects.toThrow("Not in the captured review inventory: src/other.ts");
  }, 60_000);

  test("offset pages the rows but never the scope", async () => {
    const { root, git, write } = repo();
    write("src/tool.rb", "puts 1\n");
    write("src/service.ts", "export function run() { return 4; }\n");
    git("add", ".");

    const whole = await prepare(root, { kind: "staged" });
    const { text, data } = await prepare(
      root,
      { kind: "staged" },
      { offset: 1 },
    );
    expect(text[0]?.text).toContain("2 file(s), 1 listed from offset 1");
    expect(data.fileCount).toBe(2);
    expect(data.recordHeaders).toEqual(whole.data.recordHeaders);
    expect((data.files as Row[]).map((file) => file.path)).toEqual([
      "src/tool.rb",
    ]);
    // Requirements and obligations follow the rows on the page.
    expect(data.requirements).toEqual([]);
    expect(
      (data.residualReviewObligations as Row[]).map((row) => row.path),
    ).toEqual(["src/tool.rb"]);
  }, 60_000);

  test("authoring points to the write operation and the published schema", async () => {
    const { root, git, write } = repo();
    write("src/service.ts", "export function run() { return 3; }\n");
    git("add", ".");

    const { data } = await prepare(root, { kind: "staged" });
    const authoring = data.authoring as Row;
    expect(authoring.operation).toBe("kb_author_impact_review");
    expect(authoring.recordPath).toBe(".kibi/impact-review.json");
    expect(authoring.authoredFields).toEqual([
      "files[].decision",
      "files[].analysisReviews",
      "reviewer.id",
      "reviewedAt",
    ]);
    expect(authoring.schema).toEqual({
      id: "urn:kibi:impact-review:v1",
      skill: "kibi-commit-review",
      resource: IMPACT_REVIEW_SCHEMA_RESOURCE,
    });
    // No schema copy or record template rides along.
    expect(JSON.stringify(data)).not.toContain("$schema");
  }, 60_000);

  test("the skill resource is the shipped record schema", () => {
    const shipped = readFileSync(
      join(import.meta.dir, "../../src/traceability/impact-review.schema.json"),
      "utf8",
    );
    for (const skills of [
      "../../../runtime/src/skills",
      "../../src/public/skills",
    ])
      expect(
        readFileSync(
          join(
            import.meta.dir,
            skills,
            "kibi-commit-review",
            IMPACT_REVIEW_SCHEMA_RESOURCE,
          ),
          "utf8",
        ),
      ).toBe(shipped);
  });

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

    const { data } = await prepare(
      root,
      { kind: "staged" },
      { paths: ["src/service.ts"] },
    );
    const added = (data.requirements as Row[]).find(
      (row) => row.id === "REQ-added",
    );
    expect(added?.before).toEqual({
      state: "absent",
      entityFingerprint: null,
      artifactPath: null,
    });
    expect((added?.after as Row).state).toBe("present");
    const evidence = evidenceFor(data, "src/service.ts");
    expect(evidence.requirements).toBeDefined();
    const requirements = evidence.requirements as Row;
    const before = (requirements.before as Row[]).find(
      (row) => row.id === "REQ-added",
    );
    const after = (requirements.after as Row[]).find(
      (row) => row.id === "REQ-added",
    );
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
    expect(text[0]?.text).toContain(
      "Prepared the complete diff impact-review scope: 1 file(s)",
    );
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
