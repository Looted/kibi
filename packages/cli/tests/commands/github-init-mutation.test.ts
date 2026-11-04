import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  KIBI_METRIC_DOCS_URL,
  ensureKibiReportGitIgnore,
  githubTemplateDir,
  insertKibiBadge,
  listGitRemotes,
  loadGitHubWorkflowTemplate,
  parseGitHubRemote,
  scaffoldGitHubIntegration,
  skipBlankLines,
  writeGitHubWorkflow,
} from "../../src/commands/github-init.js";
import {
  createGitWorkspace,
  createTempDir,
  git,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function tempRoot(): string {
  const root = createTempDir("kibi-github-mut-");
  roots.push(root);
  return root;
}

describe("parseGitHubRemote", () => {
  test("reads owner and repository from every remote form", () => {
    const cases: Array<[string, string, string]> = [
      ["https://github.com/o/r.git", "o", "r"],
      ["  http://user@www.github.com/o/r/  ", "o", "r"],
      ["git@github.com:o/r.git", "o", "r"],
      ["ssh://git@github.com:22/o/r", "o", "r"],
      ["ssh://github.com:2222/o/r.git/", "o", "r"],
      ["ssh://github.com/o/r", "o", "r"],
      ["git://github.com/o/r.git", "o", "r"],
      ["git://github.com/o/r", "o", "r"],
      ["https://github.com/o/r.git.git", "o", "r"],
      ["https://github.com/o/my.gitx", "o", "my.gitx"],
      ["HTTPS://GitHub.com/O/R.GIT", "O", "R"],
    ];
    for (const [url, owner, repo] of cases) {
      expect(parseGitHubRemote(url)).toStrictEqual({ owner, repo });
    }
  });

  test("rejects anything else", () => {
    for (const url of [
      "",
      "   ",
      "xhttps://github.com/o/r",
      "https://github.com/o/r extra",
      "ftp://github.com/o/r",
      "xgit@github.com:o/r",
      "git@github.com:o/r/x",
      "xssh://github.com/o/r",
      "ssh://github.com:/o/r",
      "ssh://github.com:x/o/r",
      "ssh://user@github.com/o/r",
      "xgit://github.com/o/r",
      "git@github.com:a:b/r",
      "https://github.com/o/r r",
      "https://github.com/o/.git",
      "https://gitlab.com/o/r",
    ]) {
      expect(parseGitHubRemote(url)).toBeUndefined();
    }
  });
});

describe("listGitRemotes", () => {
  test("lists fetch remotes of a repository", () => {
    const root = createGitWorkspace("main");
    roots.push(root);
    git(root, "remote add origin /srv/one.git");
    git(root, "remote add up /srv/two");
    expect(listGitRemotes(root)).toStrictEqual([
      { name: "origin", url: "/srv/one.git" },
      { name: "up", url: "/srv/two" },
    ]);
    expect(listGitRemotes(path.join(root, "missing"))).toStrictEqual([]);
  });

  test("asks Git once and parses only fetch lines", () => {
    const calls: unknown[][] = [];
    track(
      spyOn(childProcess, "execFileSync").mockImplementation(((
        ...args: unknown[]
      ) => {
        calls.push(args);
        return [
          "origin\turl1 (fetch)",
          "origin\turl1 (push)",
          "  lead url2 (fetch)",
          "a  b  (fetch)",
          "t url3 (fetch) extra",
          "x\t(fetch)",
          "",
        ].join("\n");
      }) as never),
    );
    expect(listGitRemotes("/w")).toStrictEqual([
      { name: "origin", url: "url1" },
      { name: "a", url: "b" },
    ]);
    expect(calls).toStrictEqual([
      [
        "git",
        ["-C", "/w", "remote", "-v"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ],
    ]);
  });
});

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

describe("insertKibiBadge", () => {
  const B = "[![K](k)](l)";

  test("adds the badge after the title and its badge cluster", () => {
    const cases: Array<[string, string]> = [
      ["# Title\nText", `# Title\n\n${B}\n\nText`],
      ["# Title", `# Title\n\n${B}`],
      ["# T\n  \nText", `# T\n\n${B}\n  \nText`],
      ["# Title\n", `# Title\n\n${B}\n`],
      ["intro\n#  Title\n\nText", `intro\n#  Title\n\n${B}\n\nText`],
      [
        "# T\n[![a](b)](c)\n![i](j)\nText",
        `# T\n[![a](b)](c)\n![i](j)\n\n${B}\n\nText`,
      ],
      [
        "# T\n\n  [![a](b)](c)  \n\n\n![i](j)\n\nText",
        `# T\n\n  [![a](b)](c)  \n\n\n![i](j)\n\n${B}\n\nText`,
      ],
      ["# T\n![i](j)\n\n", `# T\n![i](j)\n\n${B}\n\n`],
      ["# T\n![i](j)", `# T\n![i](j)\n\n${B}`],
      ["# T\r\n![i](j)\r\nText", `# T\r\n![i](j)\r\n\r\n${B}\r\n\r\nText`],
      ["#Title\nText", `${B}\n\n#Title\nText`],
      ["x # T\nText", `${B}\n\nx # T\nText`],
      ["#  \nText", `${B}\n\n#  \nText`],
    ];
    for (const [content, expected] of cases) {
      expect(insertKibiBadge(content, B)).toBe(expected);
    }
  });

  test("tells badges from other lines", () => {
    for (const line of [
      "x[![a](b)](c)",
      "[![a](b)](c) x",
      "![i](j) x",
      "x ![i](j)",
      "![i]()",
      "![i](j",
      "[![a](b)]()",
      "[![a]()](c)",
      "text",
    ]) {
      expect(insertKibiBadge(`# T\n${line}`, B)).toBe(`# T\n\n${B}\n\n${line}`);
    }
    for (const line of [
      "![](j)",
      "![i](jj)",
      "![ii](j)",
      "\t![i](j)\t",
      "[![](b)](c)",
      "[![a](bb)](cc)",
    ]) {
      expect(insertKibiBadge(`# T\n${line}\nx`, B)).toBe(
        `# T\n${line}\n\n${B}\n\nx`,
      );
    }
  });

  test("starts a README without a title", () => {
    expect(insertKibiBadge("", B)).toBe(`${B}\n`);
    expect(insertKibiBadge("Text", B)).toBe(`${B}\n\nText`);
    expect(insertKibiBadge("\nText", B)).toBe(`${B}\n\n\nText`);
    expect(insertKibiBadge("Text\r\nMore", B)).toBe(`${B}\r\n\r\nText\r\nMore`);
    expect(insertKibiBadge("![i](j)\nText", B)).toBe(`![i](j)\n\n${B}\n\nText`);
    expect(insertKibiBadge("\n\n![i](j)\n\n![k](l)\nText", B)).toBe(
      `\n\n![i](j)\n\n![k](l)\n\n${B}\n\nText`,
    );
  });

  test("skipBlankLines stops at the first written line", () => {
    expect(skipBlankLines(["", "  ", "x", ""], 0)).toBe(2);
    expect(skipBlankLines(["", " "], 0)).toBe(2);
    expect(skipBlankLines(["x"], 0)).toBe(0);
    expect(skipBlankLines(["", "x"], 1)).toBe(1);
    expect(skipBlankLines([], 0)).toBe(0);
  });
});

describe("workflow and .gitignore files", () => {
  test("loads each template and reports a missing one", () => {
    expect(loadGitHubWorkflowTemplate("report")).toBe(
      readFileSync(
        path.join(githubTemplateDir(), "kibi-report.yml"),
      ).toString(),
    );
    expect(loadGitHubWorkflowTemplate("badge")).toBe(
      readFileSync(path.join(githubTemplateDir(), "kibi-badge.yml")).toString(),
    );
    const missing = path.join(githubTemplateDir(), "kibi-badge.yml");
    track(
      spyOn(fs, "existsSync").mockImplementation(
        (p) => p !== missing && existsSync(p),
      ),
    );
    expect(() => loadGitHubWorkflowTemplate("badge")).toThrow(
      new Error(`Kibi GitHub workflow template missing: ${missing}`),
    );
  });

  test("writes a workflow once and compares ignoring line endings", () => {
    const root = tempRoot();
    expect(writeGitHubWorkflow(root, "report", "a\r\nb")).toBe("created");
    const file = path.join(root, ".github", "workflows", "kibi-report.yml");
    expect(readFileSync(file).toString()).toBe("a\nb\n");
    expect(writeGitHubWorkflow(root, "report", "a\nb\n")).toBe("unchanged");
    expect(writeGitHubWorkflow(root, "report", "a\nc")).toBe("conflict");
    expect(writeGitHubWorkflow(root, "badge", "x\n")).toBe("created");
    expect(
      readFileSync(
        path.join(root, ".github", "workflows", "kibi-badge.yml"),
      ).toString(),
    ).toBe("x\n");
    writeFileSync(file, "a\r\nb");
    expect(writeGitHubWorkflow(root, "report", "a\nb")).toBe("unchanged");
  });

  test("adds kibi-report/ to .gitignore once", () => {
    const cases: Array<[string | undefined, string, string]> = [
      [undefined, "kibi-report/\n", "updated"],
      ["", "kibi-report/\n", "updated"],
      ["a\n\n  \n", "a\nkibi-report/\n", "updated"],
      ["a\t", "a\nkibi-report/\n", "updated"],
      ["kibi-report/", "kibi-report/", "unchanged"],
      ["a\nkibi-report/\nb", "a\nkibi-report/\nb", "unchanged"],
      ["kibi-report/x\n", "kibi-report/x\nkibi-report/\n", "updated"],
      ["xkibi-report/\n", "xkibi-report/\nkibi-report/\n", "updated"],
    ];
    for (const [current, next, status] of cases) {
      const root = tempRoot();
      const file = path.join(root, ".gitignore");
      if (current !== undefined) writeFileSync(file, current);
      expect(ensureKibiReportGitIgnore(root)).toBe(status as never);
      expect(readFileSync(file).toString()).toBe(next);
    }
  });
});

describe("scaffoldGitHubIntegration", () => {
  function run(
    root: string,
    badgeOnly: boolean,
    remotes: Array<{ name: string; url: string }>,
  ) {
    const logs: string[] = [];
    const errors: string[] = [];
    const result = scaffoldGitHubIntegration(
      { cwd: root, badgeOnly },
      {
        listRemotes: (cwd) => {
          expect(cwd).toBe(root);
          return remotes;
        },
        log: (m) => logs.push(m),
        error: (m) => errors.push(m),
      },
    );
    return { result, logs, errors };
  }

  const MANUAL = [
    "",
    "Manual step required:",
    "GitHub → Settings → Pages → Source → GitHub Actions",
  ];
  const origin = [{ name: "origin", url: "git@github.com:Acme/Site.git" }];

  test("adds the report workflow, ignore entry and README badge", () => {
    const root = tempRoot();
    writeFileSync(path.join(root, "README.md"), "# Site\n");
    const { result, logs, errors } = run(root, false, origin);
    expect(result).toStrictEqual({
      exitCode: 0,
      workflow: "created",
      readme: "updated",
      gitignore: "updated",
      repo: { owner: "Acme", repo: "Site" },
    });
    expect(logs).toStrictEqual([
      "✓ Added .github/workflows/kibi-report.yml",
      "✓ Added kibi-report/ to .gitignore",
      "✓ Added Kibi requirement-health badge to README.md",
      ...MANUAL,
    ]);
    expect(errors).toStrictEqual([]);
    expect(readFileSync(path.join(root, "README.md")).toString()).toBe(
      "# Site\n\n[![Kibi requirement health](https://acme.github.io/Site/kibi-report/badge.svg)](https://acme.github.io/Site/kibi-report/)\n",
    );
    expect(
      existsSync(path.join(root, ".github", "workflows", "kibi-badge.yml")),
    ).toBe(false);
  });

  test("a second run changes nothing", () => {
    const root = tempRoot();
    writeFileSync(path.join(root, "README.md"), "# Site\n");
    run(root, false, origin);
    const { result, logs } = run(root, false, origin);
    expect(result.workflow).toBe("unchanged");
    expect(result.readme).toBe("unchanged");
    expect(result.gitignore).toBe("unchanged");
    expect(logs).toStrictEqual([
      "✓ .github/workflows/kibi-report.yml already configured",
      "✓ README already contains the Kibi requirement-health badge",
      ...MANUAL,
    ]);
  });

  test("badge-only links the metric docs and warns about a sibling", () => {
    const root = tempRoot();
    writeFileSync(path.join(root, "README.md"), "Text\n");
    mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
    writeFileSync(
      path.join(root, ".github", "workflows", "kibi-report.yml"),
      "old",
    );
    const { result, logs, errors } = run(root, true, origin);
    expect(result.workflow).toBe("created");
    expect(logs[0]).toBe("✓ Added .github/workflows/kibi-badge.yml");
    expect(errors).toStrictEqual([
      "Warning: .github/workflows/kibi-report.yml already exists. GitHub Pages can host one site; keep a single Kibi workflow.",
    ]);
    expect(readFileSync(path.join(root, "README.md")).toString()).toBe(
      `[![Kibi requirement health](https://acme.github.io/Site/kibi-report/badge.svg)](${KIBI_METRIC_DOCS_URL})\n\nText\n`,
    );
    expect(KIBI_METRIC_DOCS_URL).toBe(
      "https://looted.github.io/kibi/guide/github-integration.html#what-the-badge-means",
    );
  });

  test("keeps a differing workflow and warns", () => {
    for (const [badgeOnly, file] of [
      [false, "kibi-report.yml"],
      [true, "kibi-badge.yml"],
    ] as const) {
      const root = tempRoot();
      mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
      writeFileSync(path.join(root, ".github", "workflows", file), "custom\n");
      writeFileSync(path.join(root, ".gitignore"), "kibi-report/\n");
      const { result, logs, errors } = run(root, badgeOnly, origin);
      expect(result.workflow).toBe("conflict");
      expect(errors).toStrictEqual([
        `Warning: .github/workflows/${file} already exists and differs from the Kibi template.`,
        `Left the existing file in place. Compare it with https://github.com/Looted/kibi/blob/develop/docs/examples/github/${file}.`,
      ]);
      expect(logs).toStrictEqual([
        "No README found. Add this badge Markdown manually:",
        expect.stringContaining("https://acme.github.io/Site/kibi-report/"),
        ...MANUAL,
      ]);
    }
  });

  test("prints a placeholder badge without a GitHub remote", () => {
    for (const withReadme of [false, true]) {
      const root = tempRoot();
      if (withReadme) writeFileSync(path.join(root, "README.md"), "# X\n");
      writeFileSync(path.join(root, ".gitignore"), "kibi-report/\n");
      const { result, logs, errors } = run(root, false, [
        { name: "origin", url: "https://gitlab.com/a/b" },
      ]);
      expect(result.repo).toBeUndefined();
      expect(result.readme).toBe(
        withReadme ? "skipped-unknown-repo" : "printed",
      );
      expect(errors).toStrictEqual([
        "Warning: Could not determine a github.com owner/repository from git remotes.",
        "Did not invent a badge URL. Add this Markdown after replacing OWNER/REPOSITORY:",
      ]);
      expect(logs.slice(1)).toStrictEqual([
        "[![Kibi requirement health](https://OWNER.github.io/REPOSITORY/kibi-report/badge.svg)](https://OWNER.github.io/REPOSITORY/kibi-report/)",
        ...MANUAL,
      ]);
      if (withReadme)
        expect(readFileSync(path.join(root, "README.md")).toString()).toBe(
          "# X\n",
        );
    }
  });

  test("prints to the console by default", () => {
    const root = tempRoot();
    const logs: unknown[] = [];
    const errors: unknown[] = [];
    track(spyOn(console, "log").mockImplementation((m) => logs.push(m)));
    track(spyOn(console, "error").mockImplementation((m) => errors.push(m)));
    track(
      spyOn(childProcess, "execFileSync").mockImplementation(
        (() => "") as never,
      ),
    );
    scaffoldGitHubIntegration({ cwd: root, badgeOnly: false });
    expect(logs[0]).toBe("✓ Added .github/workflows/kibi-report.yml");
    expect(errors[0]).toBe(
      "Warning: Could not determine a github.com owner/repository from git remotes.",
    );
  });
});
