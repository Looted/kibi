import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  INLINE_IMPLEMENTS_REVIEW_ACTION_ID,
  INLINE_IMPLEMENTS_REVIEW_CODE,
  findInlineImplementsComments,
  inlineImplementsReviewAction,
  parseInlineImplementsComment,
} from "../../../src/operations/migration/inline-implements-comments.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function workspace(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-inline-impl-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return root;
}

function gitWorkspace(files: Record<string, string>): string {
  const root = workspace(files);
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  return root;
}

describe("parseInlineImplementsComment", () => {
  test.each([
    ["// implements REQ-a", ["REQ-a"]],
    ["  // implements: REQ-a, REQ-b,REQ-a", ["REQ-a", "REQ-b"]],
    ["# implements REQ-py-thing", ["REQ-py-thing"]],
    ["% implements REQ-prolog_rule", ["REQ-prolog_rule"]],
    ["/* implements REQ-block */", ["REQ-block"]],
    [" * implements REQ-jsdoc", ["REQ-jsdoc"]],
    ["-- implements REQ-sql", ["REQ-sql"]],
    ["export const x = 1; // implements REQ-trailing", ["REQ-trailing"]],
    ["// IMPLEMENTS ADR-007", ["ADR-007"]],
  ])("%p names %p", (line, ids) => {
    expect(parseInlineImplementsComment(line)).toStrictEqual(ids);
  });

  test.each([
    "// this class implements Runnable",
    "// implements REQ-a and more words",
    '  "// implements REQ-a",',
    "const implements = REQ-a;",
    "// implements",
    "// implements req-lowercase",
    "url = 'http://x' // implementsREQ-a",
  ])("%p names nothing", (line) => {
    expect(parseInlineImplementsComment(line)).toStrictEqual([]);
  });
});

describe("findInlineImplementsComments", () => {
  test("lists comments in tracked source files with the links the manifest already has", () => {
    const root = gitWorkspace({
      "src/a.ts": [
        "// implements REQ-a, REQ-b",
        "export function a() {}",
        "export const b = 1; // implements REQ-c",
      ].join("\n"),
      "src/b.py": "# implements REQ-a\ndef b():\n    pass\n",
      "scripts/run.sh": "# implements REQ-sh\nrun() { :; }\n",
      "README.md": "// implements REQ-doc\n",
      "config.json": '{"a": "// implements REQ-json"}\n',
      ".kb/requirements/REQ-a.md": "// implements REQ-kb\n",
      ".kb/symbols.yaml": [
        "symbols:",
        "  - id: SYM-a",
        "    title: a",
        "    sourceFile: src/a.ts",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-a",
        "      - type: covered_by",
        "        target: REQ-b",
        "  - id: SYM-b",
        "    title: b",
        "    sourceFile: src/b.py",
        "    links:",
        "      - REQ-a",
        "  - title: no source file",
        "  - not a record",
        "  - null",
      ].join("\n"),
    });
    expect(findInlineImplementsComments(root)).toStrictEqual([
      {
        file: "scripts/run.sh",
        line: 1,
        requirements: ["REQ-sh"],
        manifestLinked: [],
      },
      {
        file: "src/a.ts",
        line: 1,
        requirements: ["REQ-a", "REQ-b"],
        manifestLinked: ["REQ-a"],
      },
      {
        file: "src/a.ts",
        line: 3,
        requirements: ["REQ-c"],
        manifestLinked: [],
      },
      {
        file: "src/b.py",
        line: 1,
        requirements: ["REQ-a"],
        manifestLinked: ["REQ-a"],
      },
    ]);
  });

  test("reads no untracked file and nothing outside Git", () => {
    const root = workspace({ "src/a.ts": "// implements REQ-a\n" });
    expect(findInlineImplementsComments(root)).toStrictEqual([]);
    expect(findInlineImplementsComments(root, ["src/a.ts"])).toStrictEqual([
      {
        file: "src/a.ts",
        line: 1,
        requirements: ["REQ-a"],
        manifestLinked: [],
      },
    ]);
  });

  test("skips a listed file that is gone and tolerates a manifest it cannot read", () => {
    const root = workspace({
      "src/a.ts": "export function a() {} // implements REQ-a\r\n",
      ".kb/symbols.yaml": "symbols: [\n",
    });
    expect(
      findInlineImplementsComments(root, ["src/gone.ts", "src/a.ts"]),
    ).toStrictEqual([
      {
        file: "src/a.ts",
        line: 1,
        requirements: ["REQ-a"],
        manifestLinked: [],
      },
    ]);
    fs.writeFileSync(path.join(root, ".kb/symbols.yaml"), "symbols: 3\n");
    expect(findInlineImplementsComments(root, ["src/a.ts"])).toHaveLength(1);
  });
});

describe("inlineImplementsReviewAction", () => {
  test("plans nothing without comments", () => {
    expect(inlineImplementsReviewAction([])).toBeNull();
  });

  test("plans one review action naming every file and requirement", () => {
    const action = inlineImplementsReviewAction([
      {
        file: "src/b.ts",
        line: 4,
        requirements: ["REQ-b"],
        manifestLinked: ["REQ-b"],
      },
      {
        file: "src/a.ts",
        line: 1,
        requirements: ["REQ-a", "REQ-b"],
        manifestLinked: ["REQ-b"],
      },
    ]);
    expect(action).toMatchObject({
      id: INLINE_IMPLEMENTS_REVIEW_ACTION_ID,
      code: INLINE_IMPLEMENTS_REVIEW_CODE,
      category: "symbol",
      safety: "review",
      affectedEntityIds: ["REQ-a", "REQ-b"],
      affectedFiles: ["src/a.ts", "src/b.ts"],
      dispositionRequired: true,
      evidence: { total: 2 },
    });
    const instruction =
      action?.invocation?.kind === "review"
        ? action.invocation.instruction
        : "";
    expect(instruction).toStartWith(
      "2 inline implements comment(s) in 2 source file(s) name requirements, and Kibi no longer reads them",
    );
    expect(instruction).toContain(
      "1 of them name only requirements a manifest symbol of the same file already implements.",
    );
    expect(instruction).toContain("Kibi does not edit source code");
  });

  test("lists every comment however many there are", () => {
    const comments = Array.from({ length: 501 }, (_, index) => ({
      file: "src/a.ts",
      line: index + 1,
      requirements: ["REQ-a"],
      manifestLinked: [],
    }));
    const action = inlineImplementsReviewAction(comments);
    const evidence = action?.evidence as {
      comments: unknown[];
      total: number;
    };
    expect(evidence.comments).toStrictEqual(comments);
    expect(evidence.total).toBe(501);
  });
});
