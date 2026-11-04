import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtractedEntity } from "../../../src/extractors/markdown.js";
import {
  createRequirementStatementDiagnostics,
  readWorkspaceRequirement,
  workspaceFileChanged,
} from "../../../src/public/impact/requirement-statements.js";
import type { ExtractedSymbol } from "../../../src/traceability/symbol-extract.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-req-statements-"));
  roots.push(root);
  return root;
}

function symbol(
  name: string,
  file: string,
  extra: Partial<ExtractedSymbol> = {},
): ExtractedSymbol {
  return {
    id: `SYM-${name}`,
    name,
    kind: "function",
    role: "behavioral",
    location: { file, startLine: 1, endLine: 2 },
    hunkRanges: [{ start: 1, end: 2 }],
    reqLinks: [],
    ...extra,
  };
}

function req(
  id: string,
  extra: Partial<ExtractedEntity> = {},
): ExtractedEntity {
  return {
    id,
    type: "req",
    title: `Title of ${id}`,
    status: "open",
    ...extra,
  } as ExtractedEntity;
}

function run(
  symbols: ExtractedSymbol[],
  requirements: Record<string, ExtractedEntity>,
  changed: readonly string[] = [],
) {
  return createRequirementStatementDiagnostics({
    workspaceRoot: "/ws",
    symbolsByFile: new Map([["all", symbols]]),
    readRequirement: (id) => requirements[id],
    requirementChanged: (requirement) => changed.includes(requirement.id),
  });
}

const FIRM_SUGGESTION = (id: string) =>
  `Confirm the changed code still does what ${id} says. If it no longer does, the request conflicts with a rule a person set: stop and ask whether to change ${id}; change it only with their words in origin.ref, and say in the final answer which rule changed.`;
const SOFT_SUGGESTION = (id: string) =>
  `Confirm the changed code still does what ${id} says. If it no longer does, the request conflicts with a recorded rule: ask whether to change ${id} before keeping the change, then supersede or update it in the same change with the person's words, and say in the final answer which rule changed.`;

describe("createRequirementStatementDiagnostics", () => {
  test("quotes a firm requirement implemented by one changed symbol", () => {
    const diagnostics = run(
      [
        symbol("alpha", "src/b.ts", {
          relationships: [{ type: "implements", to: "REQ-a" }],
        }),
      ],
      { "REQ-a": req("REQ-a", { semantic_text: "  The   tool\n must x.  " }) },
    );
    expect(diagnostics).toStrictEqual([
      {
        id: "requirement_statement_unverified",
        severity: "warning",
        blocking: false,
        category: "requirement",
        entityId: "REQ-a",
        files: ["src/b.ts"],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message:
          'The change edits alpha, which implements REQ-a [firm: ask before changing]: "The tool must x." Kibi compared links and facts, not the code with this statement, so no violation here does not mean the change keeps it.',
        suggestion: FIRM_SUGGESTION("REQ-a"),
        evidence: {
          requirement: "REQ-a",
          firmness: "firm",
          statement: "The tool must x.",
          symbols: ["alpha"],
        },
      },
    ]);
  });

  test("names at most four symbols and uses the title without a statement", () => {
    const link = { reqLinks: ["REQ-b"] };
    const [diagnostic] = run(
      [
        symbol("e", "src/z.ts", link),
        symbol("d", "src/a.ts", link),
        symbol("c", "src/a.ts", link),
        symbol("b", "src/a.ts", link),
        symbol("a", "src/a.ts", link),
        symbol("a", "src/a.ts", link),
      ],
      { "REQ-b": req("REQ-b", { origin: { kind: "agent" } } as never) },
    );
    expect(diagnostic?.message).toBe(
      'The change edits a, b, c, d and 1 more, which implement REQ-b [default]: "Title of REQ-b" Kibi compared links and facts, not the code with this statement, so no violation here does not mean the change keeps it.',
    );
    expect(diagnostic?.files).toStrictEqual(["src/a.ts", "src/z.ts"]);
    expect(diagnostic?.suggestion).toBe(SOFT_SUGGESTION("REQ-b"));
    expect(diagnostic?.evidence).toStrictEqual({
      requirement: "REQ-b",
      firmness: "default",
      statement: "Title of REQ-b",
      symbols: ["a", "b", "c", "d", "e"],
    });
  });

  test("lists exactly four symbols without a remainder", () => {
    const link = { reqLinks: ["REQ-c"] };
    const [diagnostic] = run(
      ["w", "x", "y", "z"].map((name) => symbol(name, "f.ts", link)),
      { "REQ-c": req("REQ-c", { firmness: "exploratory" } as never) },
    );
    expect(diagnostic?.message).toBe(
      'The change edits w, x, y, z, which implement REQ-c [exploratory]: "Title of REQ-c" Kibi compared links and facts, not the code with this statement, so no violation here does not mean the change keeps it.',
    );
  });

  test("truncates long statements to 400 characters", () => {
    const long = "x".repeat(401);
    const exact = "y".repeat(400);
    const diagnostics = run(
      [symbol("s", "f.ts", { reqLinks: ["REQ-long", "REQ-exact"] })],
      {
        "REQ-long": req("REQ-long", { semantic_text: long }),
        "REQ-exact": req("REQ-exact", { semantic_text: exact }),
      },
    );
    expect(diagnostics.map((d) => d.evidence?.statement)).toStrictEqual([
      exact,
      `${"x".repeat(399)}…`,
    ]);
  });

  test("skips symbols and requirements that need no warning", () => {
    const diagnostics = run(
      [
        symbol("structural", "f.ts", {
          role: "structural",
          reqLinks: ["REQ-x"],
        }),
        symbol("untouched", "f.ts", { hunkRanges: [], reqLinks: ["REQ-x"] }),
        symbol("linked", "f.ts", {
          relationships: [
            { type: "covered_by", to: "REQ-covered" },
            { type: "implements", to: "TEST-not-a-req" },
          ],
          reqLinks: [
            "ADR-1",
            "REQ-unknown",
            "REQ-scenario",
            "REQ-changed",
            ...[
              "superseded",
              "Deprecated",
              "rejected",
              "obsolete",
              "retired",
              "archived",
              "removed",
              "closed",
            ].map((status) => `REQ-${status}`),
            "REQ-nostatus",
          ],
        }),
      ],
      {
        "REQ-x": req("REQ-x"),
        "ADR-1": req("ADR-1"),
        "TEST-not-a-req": req("TEST-not-a-req"),
        "REQ-covered": req("REQ-covered"),
        "REQ-scenario": req("REQ-scenario", { type: "scenario" }),
        "REQ-changed": req("REQ-changed"),
        ...Object.fromEntries(
          [
            "superseded",
            "Deprecated",
            "rejected",
            "obsolete",
            "retired",
            "archived",
            "removed",
            "closed",
          ].map((status) => [
            `REQ-${status}`,
            req(`REQ-${status}`, { status }),
          ]),
        ),
        "REQ-nostatus": req("REQ-nostatus", { status: undefined } as never),
      },
      ["REQ-changed"],
    );
    expect(diagnostics.map((d) => d.entityId)).toStrictEqual(["REQ-nostatus"]);
  });

  test("orders diagnostics by requirement id", () => {
    const diagnostics = run(
      [symbol("s", "f.ts", { reqLinks: ["REQ-b", "REQ-a", "REQ-c"] })],
      {
        "REQ-a": req("REQ-a"),
        "REQ-b": req("REQ-b"),
        "REQ-c": req("REQ-c"),
      },
    );
    expect(diagnostics.map((d) => d.entityId)).toStrictEqual([
      "REQ-a",
      "REQ-b",
      "REQ-c",
    ]);
  });
});

function git(root: string, ...args: string[]): void {
  execFileSync(
    "git",
    ["-c", "user.name=t", "-c", "user.email=t@example.test", ...args],
    { cwd: root, stdio: "ignore" },
  );
}

describe("workspaceFileChanged", () => {
  test("reports staged, unstaged and untracked changes against HEAD", () => {
    const root = tempRoot();
    git(root, "init", "-q");
    writeFileSync(join(root, "kept.md"), "a");
    writeFileSync(join(root, "edited.md"), "a");
    git(root, "add", ".");
    git(root, "commit", "-q", "-m", "init");
    writeFileSync(join(root, "edited.md"), "b");
    writeFileSync(join(root, "new.md"), "n");
    expect(workspaceFileChanged(root, "kept.md")).toBe(false);
    expect(workspaceFileChanged(root, "edited.md")).toBe(true);
    expect(workspaceFileChanged(root, "new.md")).toBe(true);
  });

  test("counts nothing as changed outside a repository", () => {
    const root = tempRoot();
    writeFileSync(join(root, "x.md"), "x");
    expect(workspaceFileChanged(join(root, "missing-dir"), "x.md")).toBe(false);
  });
});

describe("readWorkspaceRequirement", () => {
  test("reads the canonical requirement document", () => {
    const root = tempRoot();
    mkdirSync(join(root, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      join(root, ".kb", "requirements", "REQ-a.b_c-1.md"),
      "---\nid: REQ-a.b_c-1\ntitle: T\nstatus: open\n---\nBody\n",
    );
    const entity = readWorkspaceRequirement(root, "REQ-a.b_c-1");
    expect(entity?.id).toBe("REQ-a.b_c-1");
    expect(entity?.title).toBe("T");
  });

  test("rejects malformed ids and missing documents", () => {
    const root = tempRoot();
    mkdirSync(join(root, ".kb", "requirements", "REQ-"), { recursive: true });
    writeFileSync(
      join(root, ".kb", "requirements", "xREQ-a.md"),
      "---\nid: xREQ-a\ntitle: T\nstatus: open\n---\n",
    );
    writeFileSync(
      join(root, ".kb", "requirements", "REQ-a x.md"),
      "---\nid: REQ-a x\ntitle: T\nstatus: open\n---\n",
    );
    expect(readWorkspaceRequirement(root, "xREQ-a")).toBeUndefined();
    expect(readWorkspaceRequirement(root, "REQ-a x")).toBeUndefined();
    expect(readWorkspaceRequirement(root, "REQ-")).toBeUndefined();
    expect(readWorkspaceRequirement(root, "REQ-missing")).toBeUndefined();
  });
});
