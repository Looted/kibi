import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  carriedDecisions,
  executeAuthorImpactReview,
} from "../../src/public/operations/impact-review-authoring.js";
import { executePrepareImpactReview } from "../../src/public/operations/impact-review-preparation.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  IMPACT_REVIEW_PATH,
  parseImpactReviewRecord,
} from "../../src/traceability/impact-review.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

type Row = Record<string, unknown>;

function repo() {
  const root = mkdtempSync(join(tmpdir(), "kibi-impact-authoring-"));
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
  write(".gitignore", ".kibi/impact-review.json\n");
  write(
    ".kibi/impact-policy.json",
    `${JSON.stringify({
      contractVersion: "kibi.impact-policy.v1",
      id: "fixture-policy",
      version: "1",
      allowUnsupportedReview: true,
      allowedPartial: [],
      notApplicablePaths: [],
    })}\n`,
  );
  write(
    ".kb/requirements/REQ-impact.md",
    "---\nid: REQ-impact\ntitle: Preserve behavior\nstatus: open\n---\nKeep this behavior.\n",
  );
  write(
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYM-service\n    title: run\n    sourceFile: src/service.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-impact\n",
  );
  write("src/service.ts", "export function run() { return 1; }\n");
  write("notes.txt", "one\n");
  git("add", ".");
  git("commit", "-qm", "baseline");
  return { root, git, write };
}

function context(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-11-19T10:00:00.000Z"),
  } as unknown as OperationContext;
}

async function fingerprint(root: string): Promise<string> {
  const result = await executePrepareImpactReview(
    { scope: { kind: "staged" } },
    context(root),
  );
  const data = result.structuredContent as Row;
  return String(((data.recordHeaders as Row).scope as Row).fingerprint);
}

const STILL_CURRENT = {
  kind: "impact",
  requirementIds: ["REQ-impact"],
  knowledge: { state: "still_current", rationale: "run() still returns." },
} as const;
const NO_IMPACT = {
  kind: "no_impact",
  reason: "notes only",
  rationale: "The notes file carries no behavior.",
} as const;
const WHOLE_FILE = [
  {
    kind: "unsupported_review",
    side: "after",
    wholeFile: true,
    rationale: "Read the whole file.",
  },
] as const;
const NOTES = {
  path: "notes.txt",
  decision: NO_IMPACT,
  analysisReviews: WHOLE_FILE,
};

async function author(
  root: string,
  files: readonly Row[],
  scopeFingerprint?: string,
) {
  const result = await executeAuthorImpactReview(
    {
      scope: { kind: "staged" },
      scopeFingerprint: scopeFingerprint ?? (await fingerprint(root)),
      reviewer: { id: "reviewer@example.invalid" },
      files: files as never,
    },
    context(root),
  );
  return {
    text: result.content[0]?.type === "text" ? result.content[0].text : "",
    data: result.structuredContent as Row,
  };
}

function record(root: string): Row {
  return JSON.parse(readFileSync(join(root, IMPACT_REVIEW_PATH), "utf8"));
}

function stageChange(f: ReturnType<typeof repo>, value = 2) {
  f.write("src/service.ts", `export function run() { return ${value}; }\n`);
  f.write("notes.txt", `note ${value}\n`);
  f.git("add", "src/service.ts", "notes.txt");
}

describe("executeAuthorImpactReview", () => {
  test("writes a strictly valid record from the decisions and captured evidence, unstaged", async () => {
    const f = repo();
    stageChange(f);
    const { text, data } = await author(f.root, [
      { path: "src/service.ts", decision: STILL_CURRENT },
      NOTES,
    ]);
    expect(data).toEqual({
      recordPath: IMPACT_REVIEW_PATH,
      written: true,
      scopeFingerprint: await fingerprint(f.root),
      fileCount: 2,
      decided: ["notes.txt", "src/service.ts"],
      carried: [],
      dropped: [],
      staged: false,
    });
    expect(text).toContain("git add -f .kibi/impact-review.json");
    const written = record(f.root);
    expect(() => parseImpactReviewRecord(written)).not.toThrow();
    expect(written.reviewer).toEqual({
      id: "reviewer@example.invalid",
      source: "self-claimed-local",
    });
    expect(written.reviewedAt).toBe("2026-11-19T10:00:00.000Z");
    const files = written.files as Row[];
    expect(files.map((file) => file.path)).toEqual([
      "notes.txt",
      "src/service.ts",
    ]);
    expect(files[1]?.decision).toEqual(STILL_CURRENT);
    // Kibi never stages the record.
    expect(f.git("diff", "--cached", "--name-only").split("\n")).not.toContain(
      IMPACT_REVIEW_PATH,
    );
  }, 60_000);

  test("refuses a scope fingerprint that is not the captured one and writes nothing", async () => {
    const f = repo();
    stageChange(f);
    await expect(
      author(
        f.root,
        [{ path: "src/service.ts", decision: STILL_CURRENT }, NOTES],
        `sha256:${"0".repeat(64)}`,
      ),
    ).rejects.toThrow("The staged scope changed since it was prepared");
    expect(existsSync(join(f.root, IMPACT_REVIEW_PATH))).toBe(false);
  }, 60_000);

  test("refuses an invalid record and leaves the existing file unchanged", async () => {
    const f = repo();
    stageChange(f);
    await author(f.root, [
      { path: "src/service.ts", decision: STILL_CURRENT },
      NOTES,
    ]);
    const before = readFileSync(join(f.root, IMPACT_REVIEW_PATH), "utf8");
    for (const files of [
      [
        {
          path: "src/service.ts",
          decision: { ...STILL_CURRENT, requirementIds: ["REQ-unknown"] },
        },
      ],
      [{ path: "notes.txt", decision: { kind: "no_impact", reason: "x" } }],
      [{ path: "src/other.ts", decision: NO_IMPACT }],
      [NOTES, NOTES],
    ])
      await expect(author(f.root, files)).rejects.toThrow();
    expect(readFileSync(join(f.root, IMPACT_REVIEW_PATH), "utf8")).toBe(before);
  }, 60_000);

  test("an unreadable earlier record carries nothing, and reviewedAt is the caller's", async () => {
    const f = repo();
    stageChange(f);
    for (const content of ["{not json", "[]"]) {
      f.write(IMPACT_REVIEW_PATH, content);
      await expect(author(f.root, [NOTES])).rejects.toThrow(
        "undecided: src/service.ts",
      );
    }
    const result = await executeAuthorImpactReview(
      {
        scope: { kind: "staged" },
        scopeFingerprint: await fingerprint(f.root),
        reviewer: { id: "reviewer@example.invalid" },
        reviewedAt: "2026-11-18T08:00:00.000Z",
        files: [
          { path: "src/service.ts", decision: STILL_CURRENT },
          NOTES,
        ] as never,
      },
      context(f.root),
    );
    expect(result.structuredContent?.carried).toEqual([]);
    expect(record(f.root).reviewedAt).toBe("2026-11-18T08:00:00.000Z");
  }, 60_000);

  test("refuses when a captured file has no decision", async () => {
    const f = repo();
    stageChange(f);
    await expect(author(f.root, [NOTES])).rejects.toThrow(
      "Every captured file needs a decision; undecided: src/service.ts",
    );
  }, 60_000);

  test("keeps an earlier decision while the file is unchanged and reports one it drops", async () => {
    const f = repo();
    stageChange(f);
    await author(f.root, [
      { path: "src/service.ts", decision: STILL_CURRENT },
      NOTES,
    ]);
    // Only notes.txt changes: its decision must be made again, the
    // service decision carries.
    f.write("notes.txt", "note changed\n");
    f.git("add", "notes.txt");
    await expect(author(f.root, [])).rejects.toThrow("undecided: notes.txt");
    const { text, data } = await author(f.root, [NOTES]);
    expect(data.decided).toEqual(["notes.txt"]);
    expect(data.carried).toEqual(["src/service.ts"]);
    expect(data.dropped).toEqual([]);
    expect(text).toContain("1 kept from the earlier record");
    expect((record(f.root).files as Row[])[1]?.decision).toEqual(STILL_CURRENT);
  }, 60_000);

  test("drops an earlier decision once its file or requirement changes", async () => {
    const f = repo();
    stageChange(f);
    await author(f.root, [
      { path: "src/service.ts", decision: STILL_CURRENT },
      NOTES,
    ]);
    f.write(
      ".kb/requirements/REQ-impact.md",
      "---\nid: REQ-impact\ntitle: Preserve behavior\nstatus: open\n---\nKeep this behavior, changed.\n",
    );
    f.git("add", ".kb/requirements/REQ-impact.md");
    const prepared = (
      await executePrepareImpactReview(
        { scope: { kind: "staged" } },
        context(f.root),
      )
    ).structuredContent as Row;
    const binding = (prepared.requirements as Row[]).find(
      (row) => row.id === "REQ-impact",
    ) as Row;
    const updated = {
      kind: "impact",
      requirementIds: ["REQ-impact"],
      knowledge: {
        state: "updated",
        entities: [
          {
            entityId: "REQ-impact",
            artifactPath: ".kb/requirements/REQ-impact.md",
            beforeFingerprint: (binding.before as Row).entityFingerprint,
            afterFingerprint: (binding.after as Row).entityFingerprint,
          },
        ],
      },
    };
    const { text, data } = await author(f.root, [
      { path: ".kb/requirements/REQ-impact.md", decision: updated },
      { path: "src/service.ts", decision: updated },
    ]);
    // notes.txt names no requirement, so it carries across the knowledge
    // change; the service decision was re-sent, so nothing is dropped.
    expect(data.carried).toEqual(["notes.txt"]);
    expect(data.dropped).toEqual([]);
    expect(text).not.toContain("dropped");

    f.write("src/service.ts", "export function run() { return 9; }\n");
    f.git("add", "src/service.ts");
    await expect(
      author(f.root, [
        { path: ".kb/requirements/REQ-impact.md", decision: updated },
      ]),
    ).rejects.toThrow(
      "undecided: src/service.ts. The earlier record's decision was dropped because the file or its requirements changed: src/service.ts",
    );
  }, 60_000);

  test("reports an earlier decision for a file that left the scope", async () => {
    const f = repo();
    stageChange(f);
    await author(f.root, [
      { path: "src/service.ts", decision: STILL_CURRENT },
      NOTES,
    ]);
    f.git("restore", "--staged", "notes.txt");
    const { text, data } = await author(f.root, [
      { path: "src/service.ts", decision: STILL_CURRENT },
    ]);
    expect(data.fileCount).toBe(1);
    expect(data.dropped).toEqual(["notes.txt"]);
    expect(text).toContain("1 earlier decision(s) dropped");
  }, 60_000);
});

describe("carriedDecisions", () => {
  const prepared = {
    knowledgeFingerprint: "k1",
    files: [
      { path: "a.ts", status: "M" },
      { path: "b.ts", status: "M" },
    ],
    scopedRequirementIdsByPath: new Map([["a.ts", ["REQ-a"]]]),
  } as never;

  test("an absent or malformed record carries nothing", () => {
    expect(carriedDecisions(null, prepared)).toEqual({
      carried: new Map(),
      dropped: [],
    });
    expect(carriedDecisions({ files: "x" }, prepared).carried.size).toBe(0);
    // A record without a scope binds no knowledge: only files that name no
    // requirement can carry.
    expect([
      ...carriedDecisions(
        { files: [{ path: "a.ts", status: "M", decision: NO_IMPACT }] },
        prepared,
      ).carried.keys(),
    ]).toEqual([]);
  });

  test("carries matching evidence, drops changed evidence or knowledge", () => {
    const previous = {
      scope: { knowledgeFingerprint: "k0" },
      files: [
        "junk",
        { path: 3 },
        { path: "a.ts", status: "M" },
        {
          path: "a.ts",
          status: "M",
          decision: NO_IMPACT,
          analysisReviews: [],
        },
        { path: "b.ts", status: "M", decision: NO_IMPACT },
        { path: "c.ts", status: "M", decision: NO_IMPACT },
      ],
    };
    const { carried, dropped } = carriedDecisions(previous, prepared);
    // a.ts names a requirement and the knowledge changed; c.ts is gone.
    expect([...carried.keys()]).toEqual(["b.ts"]);
    expect(carried.get("b.ts")).toEqual({ decision: NO_IMPACT });
    expect(dropped).toEqual(["a.ts", "c.ts"]);
    const same = carriedDecisions(
      { ...previous, scope: { knowledgeFingerprint: "k1" } },
      prepared,
    );
    expect(same.carried.get("a.ts")).toEqual({
      decision: NO_IMPACT,
      analysisReviews: [],
    });
  });
});
