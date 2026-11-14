import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRepoIgnorePolicy } from "../../src/public/ignore-policy.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-ignore-mut-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

const DENY = [
  ".git",
  "node_modules",
  "vendor",
  "third_party",
  ".sisyphus",
  ".opencode",
];
const DERIVED = [
  ".kb/branches",
  ".kb/recovery",
  ".kb/proof/runs",
  ".kb/briefs",
  ".kb/migrations",
];
const BASE_GLOBS = [...DENY, ...DERIVED].flatMap((d) => [
  `**/${d}/**`,
  `**/${d}`,
]);

describe("createRepoIgnorePolicy globs", () => {
  test("an empty workspace ignores only the hard denylist", () => {
    expect(
      createRepoIgnorePolicy(workspace()).getFastGlobIgnoreGlobs(),
    ).toStrictEqual(BASE_GLOBS);
  });

  test("turns root, exclude and nested patterns into globs", () => {
    const root = workspace({
      ".gitignore":
        "  dist  \n\n# comment\n!keep.log\n/build\nlogs/*.log\nweird#name\n*.tmp\r\n",
      ".git/info/exclude": "secret\n*.tmp\n",
      "docs/.gitignore": "/out\n*.md\n!keep.md\n",
      "docs/deep/.gitignore": "x\n",
      "node_modules/pkg/.gitignore": "nm\n",
      ".kb/notes/.gitignore": "kb\n",
      ".git/hooks/.gitignore": "git\n",
      "vendor/.gitignore": "v\n",
      "docs/README.txt": "readme\n",
      // Only a file named .gitignore holds patterns.
      "src/notes.txt": "*.ts\n",
    });
    symlinkSync(
      join(root, "docs", ".gitignore"),
      join(root, "src-link.gitignore"),
    );
    mkdirSync(join(root, "linked"));
    symlinkSync(
      join(root, "docs", ".gitignore"),
      join(root, "linked", ".gitignore"),
    );
    const globs = createRepoIgnorePolicy(root).getFastGlobIgnoreGlobs();
    expect(globs.slice(0, BASE_GLOBS.length)).toStrictEqual(BASE_GLOBS);
    expect(globs.slice(BASE_GLOBS.length).sort()).toStrictEqual(
      [
        "**/dist",
        "**/build",
        "**/logs/*.log",
        "**/weird#name",
        "**/*.tmp",
        "**/secret",
        "**/docs/out",
        "**/docs/*.md",
        "**/docs/deep/x",
      ].sort(),
    );
  });
});

describe("createRepoIgnorePolicy explain", () => {
  const root = () =>
    workspace({
      ".gitignore": "dist\n*.log\n!keep.log\n",
      ".git/info/exclude": "secret\n",
      "docs/.gitignore": "*.md\n/out\n",
      "docs/deep/.gitignore": "*.txt\n",
    });

  test("names why a path is ignored", () => {
    const dir = root();
    const policy = createRepoIgnorePolicy(dir);
    const cases: [string, { ignored: boolean; reason?: string }][] = [
      ["dist/a.js", { ignored: true, reason: "gitignored" }],
      ["a.log", { ignored: true, reason: "gitignored" }],
      ["keep.log", { ignored: false }],
      ["secret", { ignored: true, reason: "git_info_exclude" }],
      ["docs/a.md", { ignored: true, reason: "gitignored" }],
      ["docs/deep/a.txt", { ignored: true, reason: "gitignored" }],
      ["docs/deep/a.md", { ignored: true, reason: "gitignored" }],
      ["docs/a.txt", { ignored: false }],
      ["docs/out/x.js", { ignored: true, reason: "gitignored" }],
      ["out/x.js", { ignored: false }],
      ["docs/deep/out/x.js", { ignored: false }],
      ["src/a.md", { ignored: false }],
      ["docsx/a.md", { ignored: false }],
      ["docs", { ignored: false }],
      ["src/docs/a.md", { ignored: false }],
      ["", { ignored: false }],
      [".", { ignored: false }],
      ["../outside.md", { ignored: false }],
      [dir, { ignored: false }],
      [join(dir, "..x"), { ignored: false }],
      [join(dir, "dist", "b.js"), { ignored: true, reason: "gitignored" }],
      [
        join(dir, "..", "other"),
        { ignored: true, reason: "outside_workspace" },
      ],
    ];
    for (const [input, expected] of cases) {
      expect([input, policy.explain(input)]).toStrictEqual([input, expected]);
      expect([input, policy.isIgnored(input)]).toStrictEqual([
        input,
        expected.ignored,
      ]);
    }
  });

  test("hard denies control, vendor and derived trees", () => {
    const policy = createRepoIgnorePolicy(workspace());
    for (const deny of DENY)
      expect(policy.explain(`src/${deny}/x.ts`)).toStrictEqual({
        ignored: true,
        reason: "hard_deny",
      });
    for (const prefix of DERIVED) {
      expect(policy.explain(prefix)).toStrictEqual({
        ignored: true,
        reason: "hard_deny",
      });
      expect(policy.explain(`${prefix}/x`)).toStrictEqual({
        ignored: true,
        reason: "hard_deny",
      });
    }
    for (const kept of [
      ".kb/requirements/REQ-1.md",
      ".kb/branchesx",
      "src/.gitx/a.ts",
    ])
      expect(policy.explain(kept)).toStrictEqual({ ignored: false });
  });

  test("a missing workspace ignores nothing it cannot read", () => {
    const policy = createRepoIgnorePolicy(
      join(tmpdir(), "kibi-ignore-missing-root"),
    );
    expect(policy.explain("src/a.ts")).toStrictEqual({ ignored: false });
    expect(policy.getFastGlobIgnoreGlobs()).toStrictEqual(BASE_GLOBS);
  });
});
