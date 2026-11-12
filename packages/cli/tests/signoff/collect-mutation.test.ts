/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectSignoffQuestions,
  collectSignoffSummary,
  loadAffectedForScope,
  parseSignoffQuestionsInput,
  requirementStatement,
} from "../../src/signoff/collect.js";
import type { SignoffProof } from "../../src/signoff/model.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

const NOW = new Date("2026-10-22T09:00:00.000Z");
const now = () => NOW;

function workspace(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-signoff-collect-"));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function repo(): { root: string; git: (...args: string[]) => string } {
  const root = workspace();
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  return { root, git };
}

function write(root: string, file: string, content: string): void {
  const absolute = path.join(root, file);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

function requirement(
  id: string,
  statement: string,
  extra: Record<string, unknown> = {},
): string {
  const fields: Record<string, unknown> = {
    id,
    title: `${id} title`,
    status: "open",
    semantic_text: statement,
    ...extra,
  };
  const frontmatter = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n${statement}\n`;
}

const writeReq = (
  root: string,
  id: string,
  statement: string,
  extra: Record<string, unknown> = {},
) =>
  write(root, `.kb/requirements/${id}.md`, requirement(id, statement, extra));

function relationships(
  root: string,
  edges: ReadonlyArray<readonly [string, string, string]>,
): void {
  write(
    root,
    ".kb/relationships/00.yaml",
    [
      "relationships:",
      ...edges.flatMap(([type, from, to], index) => [
        `  - id: rel-${index}`,
        `    type: ${type}`,
        `    from: ${from}`,
        `    to: ${to}`,
        "    created_at: 2026-10-22T09:00:00.000Z",
        "    created_by: test",
        "    source: test",
      ]),
      "",
    ].join("\n"),
  );
}

const PROOF: SignoffProof = {
  status: "tested",
  gate: "tested",
  testCount: 1,
  contradictions: [],
};

describe("requirementStatement", () => {
  test("flattens the semantic text, else the title", () => {
    const entity = {
      id: "REQ-x",
      type: "req",
      title: " Title\n of x ",
      status: "open",
      created_at: "c",
      updated_at: "u",
      source: "s",
    };
    expect(requirementStatement(entity)).toBe("Title of x");
    expect(
      requirementStatement({ ...entity, semantic_text: "  a \n\t b  " }),
    ).toBe("a b");
  });
});

describe("collectSignoffSummary in a repository", () => {
  function baseRepo() {
    const { root, git } = repo();
    writeReq(root, "REQ-a", "Refunds need approval.", { firmness: "firm" });
    writeReq(root, "REQ-b", "Refunds are batched.");
    writeReq(root, "REQ-c", "Refunds are logged.");
    writeReq(root, "REQ-d", "Refunds are mailed.");
    writeReq(root, "REQ-e", "Refunds are faxed.");
    writeReq(root, "REQ-old", "Refunds were manual.", { status: "deprecated" });
    writeReq(root, "REQ-dep", "Refunds were weekly.", { status: "obsolete" });
    writeReq(root, "REQ-flag", "A flag in the wrong place.", { type: "flag" });
    writeReq(root, "REQ-a/REQ-b", "Nested.");
    write(root, ".kb/requirements/REQ-t.txt", requirement("REQ-t", "Text."));
    write(root, ".kb/scenarios/SCEN-bad.md", "---\ntitle: [\n---\n");
    write(
      root,
      ".kb/scenarios/SCEN-a/SCEN-b.md",
      "---\nid: SCEN-b\ntitle: Nested\n---\n",
    );
    write(
      root,
      ".kb/requirements/ADR-x.md",
      "---\nid: ADR-x\ntitle: Decision\ntype: adr\n---\n",
    );
    write(
      root,
      ".kb/scenarios/SCEN-approve.md",
      "---\nid: SCEN-approve\ntitle: Finance\n  approves\nstatus: active\n---\nbody\n",
    );
    git("add", ".");
    git("commit", "-q", "-m", "base");
    return { root, git };
  }

  test("lists new, changed, retired and affected requirements", async () => {
    const { root } = baseRepo();
    writeReq(root, "REQ-a", "Refunds  need\nfinance approval.", {
      firmness: "firm",
    });
    writeReq(root, "REQ-c", "Refunds are logged.", { title: "Renamed  c" });
    unlinkSync(path.join(root, ".kb/requirements/REQ-d.md"));
    writeReq(root, "REQ-e", "Refunds are faxed.", { status: "superseded" });
    writeReq(root, "REQ-old", "Refunds were manual.", { status: "rejected" });
    writeReq(root, "REQ-new", "Refunds use the order currency.", {
      firmness: "exploratory",
      origin: { kind: "agent", ref: " Dana:\n  use it ", approved_by: "dana" },
    });
    write(root, ".kb/requirements/notes.txt", "x");
    write(root, ".kb/requirements/REQ-t.txt", requirement("REQ-t", "Text 2."));
    write(root, ".kb/requirements/REQ-u.txt", requirement("REQ-u", "Text."));
    unlinkSync(path.join(root, ".kb/requirements/ADR-x.md"));
    write(
      root,
      ".kb/requirements/ADR-x.md",
      "---\nid: ADR-x\ntitle: D2\ntype: adr\n---\n",
    );
    relationships(root, [
      ["specified_by", "REQ-a", "SCEN-approve"],
      ["specified_by", "REQ-a", "SCEN-missing"],
      ["specified_by", "REQ-a", "SCEN-bad"],
      ["specified_by", "REQ-a", "TEST-1"],
      ["specified_by", "REQ-a", "SCEN-a/SCEN-b"],
      ["specified_by", "REQ-b", "SCEN-approve"],
      ["relates_to", "REQ-a", "SCEN-2"],
      ["supersedes", "REQ-new", "REQ-e"],
      ["supersedes", "REQ-new", "REQ-gone"],
      ["supersedes", "REQ-new", "bad id"],
      ["supersedes", "REQ-new", "REQ-a/REQ-b"],
      ["supersedes", "REQ-new", "REQ-flag"],
      ["supersedes", "REQ-b", "REQ-e"],
    ]);
    const summary = await collectSignoffSummary(root, "working", {
      now,
      loadAffected: async () =>
        new Map([
          ["REQ-c", ["writeLog", "auditLog"]],
          ["REQ-b", ["zeta", "alpha"]],
          ["REQ-gone", ["x"]],
          ["REQ-old", ["y"]],
          ["REQ-dep", ["w"]],
          ["REQ-flag", []],
        ]),
      loadProof: async () => new Map([["REQ-a", PROOF]]),
    });
    expect(summary).toStrictEqual({
      version: "kibi.signoff.v1",
      kind: "summary",
      scope: "working",
      generatedAt: "2026-10-22T09:00:00.000Z",
      branch: "main",
      requirements: [
        {
          id: "REQ-new",
          title: "REQ-new title",
          change: "new",
          status: "open",
          statement: "Refunds use the order currency.",
          firmness: "exploratory",
          originKind: "agent",
          originRef: "Dana: use it",
          approvedBy: "dana",
          supersedes: [
            {
              id: "REQ-e",
              title: "REQ-e title",
              statement: "Refunds are faxed.",
              firmness: "firm",
            },
            {
              id: "REQ-flag",
              title: "REQ-flag title",
              statement: "REQ-flag title",
            },
          ],
          scenarios: [],
          symbols: [],
          source: ".kb/requirements/REQ-new.md",
        },
        {
          id: "REQ-a",
          title: "REQ-a title",
          change: "changed",
          status: "open",
          statement: "Refunds need finance approval.",
          previousStatement: "Refunds need approval.",
          firmness: "firm",
          supersedes: [],
          scenarios: [
            { id: "SCEN-approve", title: "Finance approves" },
            { id: "SCEN-missing", title: "SCEN-missing" },
            { id: "SCEN-bad", title: "SCEN-bad" },
            { id: "SCEN-a/SCEN-b", title: "SCEN-a/SCEN-b" },
          ],
          symbols: [],
          source: ".kb/requirements/REQ-a.md",
          proof: PROOF,
        },
        {
          id: "REQ-c",
          title: "Renamed c",
          change: "changed",
          status: "open",
          statement: "Refunds are logged.",
          firmness: "firm",
          supersedes: [],
          scenarios: [],
          symbols: ["auditLog", "writeLog"],
          source: ".kb/requirements/REQ-c.md",
        },
        {
          id: "REQ-old",
          title: "REQ-old title",
          change: "changed",
          status: "rejected",
          statement: "Refunds were manual.",
          firmness: "firm",
          supersedes: [],
          scenarios: [],
          symbols: ["y"],
          source: ".kb/requirements/REQ-old.md",
        },
        {
          id: "REQ-b",
          title: "REQ-b title",
          change: "affected",
          status: "open",
          statement: "Refunds are batched.",
          firmness: "firm",
          supersedes: [
            {
              id: "REQ-e",
              title: "REQ-e title",
              statement: "Refunds are faxed.",
              firmness: "firm",
            },
          ],
          scenarios: [{ id: "SCEN-approve", title: "Finance approves" }],
          symbols: ["alpha", "zeta"],
          source: ".kb/requirements/REQ-b.md",
        },
        {
          id: "REQ-flag",
          title: "REQ-flag title",
          change: "affected",
          status: "open",
          statement: "REQ-flag title",
          supersedes: [],
          scenarios: [],
          symbols: [],
          source: ".kb/requirements/REQ-flag.md",
        },
        {
          id: "REQ-d",
          title: "REQ-d title",
          change: "retired",
          status: "open",
          statement: "Refunds are mailed.",
          firmness: "firm",
          supersedes: [],
          scenarios: [],
          symbols: [],
          source: ".kb/requirements/REQ-d.md",
        },
        {
          id: "REQ-e",
          title: "REQ-e title",
          change: "retired",
          status: "superseded",
          statement: "Refunds are faxed.",
          firmness: "firm",
          supersedes: [],
          scenarios: [],
          symbols: [],
          source: ".kb/requirements/REQ-e.md",
        },
      ],
      notes: [
        "REQ-c, REQ-new, REQ-old, REQ-b, REQ-flag are not in the synced knowledge base yet; run kibi sync to see their proof state.",
      ],
    });
  });

  test("reads the index for the staged scope", async () => {
    const { root, git } = baseRepo();
    writeReq(root, "REQ-a", "Staged statement.");
    git("add", ".kb/requirements/REQ-a.md");
    writeReq(root, "REQ-a", "Working statement.");
    writeReq(root, "REQ-c", "Unstaged statement.");
    writeReq(root, "REQ-new", "Untracked.");
    git("rm", "-q", ".kb/requirements/REQ-d.md");
    const summary = await collectSignoffSummary(root, "staged", {
      now,
      loadAffected: async () => new Map(),
    });
    expect(
      summary.requirements.map((row) => [row.id, row.change, row.statement]),
    ).toStrictEqual([
      ["REQ-a", "changed", "Staged statement."],
      ["REQ-d", "retired", "Refunds are mailed."],
    ]);
    expect(summary.scope).toBe("staged");
    expect(summary.notes).toStrictEqual([]);
  });

  test("omits a detached branch and survives a malformed relationship shard", async () => {
    const { root, git } = baseRepo();
    git("checkout", "-q", "--detach");
    write(root, ".kb/relationships/00.yaml", "relationships: [\n");
    writeReq(root, "REQ-a", "Changed.");
    const summary = await collectSignoffSummary(root, "working", {
      now,
      loadAffected: async () => new Map(),
      loadProof: async () => new Map(),
    });
    expect(summary.branch).toBe(undefined);
    expect("branch" in summary).toBe(false);
    expect(summary.requirements.map((row) => row.id)).toStrictEqual(["REQ-a"]);
    expect(summary.requirements[0]?.scenarios).toStrictEqual([]);
    expect(summary.notes).toStrictEqual([]);
  });

  test("compares against the empty tree before the first commit", async () => {
    const { root, git } = repo();
    writeReq(root, "REQ-x", "First.");
    writeReq(root, "REQ-y", "Second.");
    git("add", ".kb/requirements/REQ-y.md");
    const working = await collectSignoffSummary(root, "working", {
      now,
      loadAffected: async () => new Map(),
    });
    expect(
      working.requirements.map((row) => [row.id, row.change]),
    ).toStrictEqual([
      ["REQ-x", "new"],
      ["REQ-y", "new"],
    ]);
    expect("branch" in working).toBe(false);
    const staged = await collectSignoffSummary(root, "staged", {
      now,
      loadAffected: async () => new Map(),
    });
    expect(staged.requirements.map((row) => row.id)).toStrictEqual(["REQ-y"]);
  });
});

describe("collectSignoffSummary with a scripted git", () => {
  function scripted(
    responses: Record<string, string | Error>,
    calls: string[] = [],
  ) {
    return (args: readonly string[]): string => {
      const key = args.join(" ");
      calls.push(key);
      const response = responses[key];
      if (response === undefined || response instanceof Error)
        throw response ?? new Error(`unexpected git ${key}`);
      return response;
    };
  }
  const DIFF = "diff --name-status --no-renames HEAD -- .kb/requirements";
  const UNTRACKED = "ls-files --others --exclude-standard -- .kb/requirements";
  const HEAD = "rev-parse --verify --quiet HEAD";
  const BRANCH = "rev-parse --abbrev-ref HEAD";

  test("keeps only added, modified and deleted Markdown files", async () => {
    const root = workspace();
    writeReq(root, "REQ-m", "Now retired.", { status: "closed" });
    writeReq(root, "REQ-r", "Renamed.");
    const calls: string[] = [];
    const git = scripted(
      {
        [HEAD]: "abc\n",
        [DIFF]: [
          "M\t.kb/requirements/REQ-m.md",
          "R100\t.kb/requirements/REQ-r.md",
          "C\t.kb/requirements/REQ-r.md",
          "A\t.kb/requirements/notes.txt",
          "M",
          "",
        ].join("\n"),
        [UNTRACKED]: "\n",
        [BRANCH]: "feature\n",
      },
      calls,
    );
    const summary = await collectSignoffSummary(root, "working", {
      git,
      now,
      loadAffected: async () => new Map(),
    });
    expect(
      summary.requirements.map((row) => [row.id, row.change]),
    ).toStrictEqual([["REQ-m", "retired"]]);
    expect(summary.branch).toBe("feature");
    expect(calls).toStrictEqual([
      HEAD,
      DIFF,
      UNTRACKED,
      "show HEAD:.kb/requirements/REQ-m.md",
      BRANCH,
    ]);
  });

  test("reads each change once from the right revision", async () => {
    const root = workspace();
    writeReq(root, "REQ-add", "Added.");
    writeReq(root, "REQ-u", "Untracked.");
    const calls: string[] = [];
    const git = scripted(
      {
        [HEAD]: "abc\n",
        [DIFF]: [
          "A\t.kb/requirements/REQ-add.md",
          "M\t.kb/requirements/REQ-missing.md",
          "D\t.kb/requirements/REQ-unknown.md",
        ].join("\n"),
        [UNTRACKED]: ".kb/requirements/REQ-u.md\n.kb/requirements/x.txt",
        [BRANCH]: "HEAD\n",
      },
      calls,
    );
    const summary = await collectSignoffSummary(root, "working", {
      git,
      now,
      loadAffected: async () => new Map(),
      loadProof: async () =>
        new Map([
          ["REQ-add", PROOF],
          ["REQ-u", PROOF],
        ]),
    });
    expect(
      summary.requirements.map((row) => [row.id, row.change]),
    ).toStrictEqual([
      ["REQ-add", "new"],
      ["REQ-u", "new"],
    ]);
    expect(summary.notes).toStrictEqual([]);
    expect("branch" in summary).toBe(false);
    expect(calls).toStrictEqual([
      HEAD,
      DIFF,
      UNTRACKED,
      "show HEAD:.kb/requirements/REQ-missing.md",
      "show HEAD:.kb/requirements/REQ-unknown.md",
      BRANCH,
    ]);

    const stagedCalls: string[] = [];
    const STAGED_DIFF =
      "diff --cached --name-status --no-renames HEAD -- .kb/requirements";
    const staged = await collectSignoffSummary(root, "staged", {
      git: scripted(
        {
          [HEAD]: "abc\n",
          [STAGED_DIFF]: "M\t.kb/requirements/REQ-s.md\n",
          "show HEAD:.kb/requirements/REQ-s.md": requirement("REQ-s", "Old."),
          "show :.kb/requirements/REQ-s.md": requirement("REQ-s", "New."),
          [UNTRACKED]: ".kb/requirements/REQ-u.md\n",
          [BRANCH]: "main\n",
        },
        stagedCalls,
      ),
      now,
      loadAffected: async () => new Map(),
    });
    expect(
      staged.requirements.map((row) => [
        row.id,
        row.change,
        row.statement,
        row.previousStatement,
      ]),
    ).toStrictEqual([["REQ-s", "changed", "New.", "Old."]]);
    expect(stagedCalls).toStrictEqual([
      HEAD,
      STAGED_DIFF,
      "show HEAD:.kb/requirements/REQ-s.md",
      "show :.kb/requirements/REQ-s.md",
      BRANCH,
    ]);
  });

  test("names what it could not compute", async () => {
    const root = workspace();
    writeReq(root, "REQ-a", "A.");
    let proofCalls = 0;
    const summary = await collectSignoffSummary(root, "working", {
      git: scripted({ [DIFF]: new Error("diff failed") }),
      now,
      loadAffected: async () => {
        throw "analysis offline";
      },
      loadProof: async () => {
        proofCalls += 1;
        return new Map();
      },
    });
    expect(summary).toStrictEqual({
      version: "kibi.signoff.v1",
      kind: "summary",
      scope: "working",
      generatedAt: "2026-10-22T09:00:00.000Z",
      requirements: [],
      notes: [
        "Changed requirement documents could not be listed: unexpected git diff --name-status --no-renames 4b825dc642cb6eb9a060e54bf8d69288fbee4904 -- .kb/requirements",
        "Requirements affected by code changes could not be computed: analysis offline",
      ],
    });
    expect(proofCalls).toBe(0);

    const failing = await collectSignoffSummary(root, "staged", {
      git: (args) => {
        if (args[0] === "diff") throw 7;
        throw new Error("no git");
      },
      now,
      loadAffected: async () => new Map([["REQ-a", ["s"]]]),
      loadProof: async () => {
        throw new Error("coverage offline");
      },
    });
    expect(failing.notes).toStrictEqual([
      "Changed requirement documents could not be listed: 7",
      "Proof state is unavailable: coverage offline",
    ]);
    expect(failing.requirements.map((row) => row.id)).toStrictEqual(["REQ-a"]);

    const thrown = await collectSignoffSummary(root, "staged", {
      git: () => "",
      now,
      loadAffected: async () => {
        throw new Error("analysis failed");
      },
      loadProof: async () => {
        throw "x";
      },
    });
    expect(thrown.notes).toStrictEqual([
      "Requirements affected by code changes could not be computed: analysis failed",
    ]);
  });

  test("words the unsynced note for one requirement", async () => {
    const root = workspace();
    writeReq(root, "REQ-a", "A.");
    writeReq(root, "REQ-b", "B.");
    const summary = await collectSignoffSummary(root, "working", {
      git: () => "",
      now,
      loadAffected: async () =>
        new Map([
          ["REQ-a", []],
          ["REQ-b", []],
        ]),
      loadProof: async () => new Map([["REQ-b", PROOF]]),
    });
    expect(summary.notes).toStrictEqual([
      "REQ-a is not in the synced knowledge base yet; run kibi sync to see its proof state.",
    ]);
    expect(summary.requirements.map((row) => row.proof)).toStrictEqual([
      undefined,
      PROOF,
    ]);
    expect("proof" in (summary.requirements[0] as object)).toBe(false);
    const rejected = await collectSignoffSummary(root, "working", {
      git: () => "",
      now,
      loadAffected: async () => new Map([["REQ-a", []]]),
      loadProof: async () => new Map(),
    });
    expect(rejected.notes).toStrictEqual([]);
  });

  test("uses the real clock and the default affected loader", async () => {
    const root = workspace();
    const before = Date.now();
    const summary = await collectSignoffSummary(root, "working", {
      git: () => "",
    });
    expect(Date.parse(summary.generatedAt)).toBeGreaterThanOrEqual(before);
    expect(summary.requirements).toStrictEqual([]);
    expect(summary.notes).toStrictEqual([]);
  });
});

describe("loadAffectedForScope", () => {
  test("reads the requirements changed code implements in each scope", async () => {
    const { root, git } = repo();
    writeReq(root, "REQ-a", "Refunds are logged.");
    write(
      root,
      ".kb/symbols.yaml",
      [
        "symbols:",
        ...["logRefund", "audit"].flatMap((title) => [
          `  - id: SYM-${title}`,
          `    title: ${title}`,
          "    sourceFile: src/a.ts",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-a",
        ]),
        "",
      ].join("\n"),
    );
    const code = (n: number) =>
      `export function logRefund(x: number): number {\n  return x + ${n};\n}\n\nexport function audit(y: number): number {\n  return y * ${n};\n}\n`;
    write(root, "src/a.ts", code(1));
    git("add", ".");
    git("commit", "-q", "-m", "base");
    write(root, "src/a.ts", code(2));
    write(
      root,
      "src/loose.ts",
      "export function loose(): number {\n  return 1;\n}\n",
    );
    const expected = new Map([["REQ-a", ["audit", "logRefund"]]]);
    expect(await loadAffectedForScope(root, "working")).toStrictEqual(expected);
    expect(await loadAffectedForScope(root, "staged")).toStrictEqual(new Map());
    git("add", "src/a.ts");
    write(root, "src/a.ts", code(1));
    expect(await loadAffectedForScope(root, "staged")).toStrictEqual(expected);
  });
});

describe("collectSignoffQuestions", () => {
  test("numbers questions and quotes recorded requirements", () => {
    const root = workspace();
    writeReq(root, "REQ-a", "Refunds need approval.", { firmness: "firm" });
    writeReq(root, "REQ-b", "Refunds are batched.");
    const view = collectSignoffQuestions(
      root,
      [
        { statement: "S1", id: "REQ-a", conflictsWith: ["REQ-b", "REQ-zz"] },
        { statement: "S2", id: "REQ-new" },
        { statement: "S3", conflictsWith: ["bad id"] },
      ],
      now,
    );
    const ref = (id: string, statement: string) => ({
      id,
      title: `${id} title`,
      statement,
      firmness: "firm",
    });
    expect(view as unknown).toStrictEqual({
      version: "kibi.signoff.v1",
      kind: "questions",
      generatedAt: "2026-10-22T09:00:00.000Z",
      questions: [
        {
          statement: "S1",
          id: "REQ-a",
          conflictsWith: ["REQ-b", "REQ-zz"],
          number: 1,
          current: ref("REQ-a", "Refunds need approval."),
          conflicts: [ref("REQ-b", "Refunds are batched.")],
        },
        { statement: "S2", id: "REQ-new", number: 2, conflicts: [] },
        {
          statement: "S3",
          conflictsWith: ["bad id"],
          number: 3,
          conflicts: [],
        },
      ],
      notes: [
        "Question 1: REQ-zz is not a recorded requirement.",
        "Question 3: bad id is not a recorded requirement.",
      ],
    });
    const before = Date.now();
    const live = collectSignoffQuestions(root, [{ statement: "S" }]);
    expect(Date.parse(live.generatedAt)).toBeGreaterThanOrEqual(before);
  });

  test("reads a requirement document once and skips unparsable ones", () => {
    const root = workspace();
    write(root, ".kb/requirements/REQ-bad.md", "---\ntitle: [\n---\n");
    const view = collectSignoffQuestions(
      root,
      [
        { statement: "S", id: "REQ-bad", conflictsWith: ["REQ-bad"] },
        { statement: "T", id: "REQ-bad" },
      ],
      now,
    );
    expect(view.questions.map((q) => "current" in q)).toStrictEqual([
      false,
      false,
    ]);
    expect(view.notes).toStrictEqual([
      "Question 1: REQ-bad is not a recorded requirement.",
    ]);
  });
});

describe("parseSignoffQuestionsInput", () => {
  const fails = (raw: string) => {
    try {
      parseSignoffQuestionsInput(raw);
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error("expected a failure");
  };

  test("reads every field, trimmed, from either shape", () => {
    const full = {
      statement: "  Refunds\n need  approval ",
      id: " REQ-a ",
      title: " T ",
      quote: " Q ",
      firmness: " firm ",
      governs: [" src/a.ts ", " "],
      conflictsWith: [" REQ-b "],
      question: " Why? ",
      answer: " Because ",
    };
    const expected = {
      statement: "Refunds need approval",
      id: "REQ-a",
      title: "T",
      quote: "Q",
      firmness: "firm",
      governs: ["src/a.ts"],
      conflictsWith: ["REQ-b"],
      question: "Why?",
      answer: "Because",
    };
    expect(
      parseSignoffQuestionsInput(
        JSON.stringify({ questions: [full] }),
      ) as unknown,
    ).toStrictEqual([expected]);
    expect(
      parseSignoffQuestionsInput(JSON.stringify([full])) as unknown,
    ).toStrictEqual([expected]);
    for (const firmness of ["default", "exploratory"]) {
      expect(
        parseSignoffQuestionsInput(
          JSON.stringify([{ statement: "S", firmness }]),
        ) as unknown,
      ).toStrictEqual([{ statement: "S", firmness }]);
    }
    expect(
      parseSignoffQuestionsInput(
        JSON.stringify([
          {
            statement: "S",
            id: " ",
            title: null,
            governs: [" "],
            conflictsWith: null,
            answer: "",
          },
        ]),
      ),
    ).toStrictEqual([{ statement: "S" }]);
  });

  test("rejects malformed input with the field named", () => {
    expect(fails("{")).toBe(
      `Questions input is not valid JSON: ${(() => {
        try {
          JSON.parse("{");
        } catch (error) {
          return (error as Error).message;
        }
        return "";
      })()}`,
    );
    const shape =
      'Questions input must be {"questions":[...]} or an array with at least one question';
    for (const raw of ["[]", "{}", "null", "5", '{"questions":{}}', '"x"']) {
      expect([raw, fails(raw)]).toStrictEqual([raw, shape]);
    }
    expect(fails("[null]")).toBe("questions[0] must be an object");
    expect(fails('[{"statement":"S"},[]]')).toBe(
      "questions[1] must be an object",
    );
    expect(fails("[5]")).toBe("questions[0] must be an object");
    expect(fails("[{}]")).toBe("questions[0].statement is required");
    expect(fails('[{"statement":" "}]')).toBe(
      "questions[0].statement is required",
    );
    expect(fails('[{"statement":5}]')).toBe(
      "questions[0].statement must be a string",
    );
    expect(fails('[{"statement":"S","firmness":"hard"}]')).toBe(
      "questions[0].firmness must be firm, default or exploratory",
    );
    expect(fails('[{"statement":"S","governs":"a"}]')).toBe(
      "questions[0].governs must be an array of strings",
    );
    expect(fails('[{"statement":"S","conflictsWith":["a",1]}]')).toBe(
      "questions[0].conflictsWith must be an array of strings",
    );
  });
});
