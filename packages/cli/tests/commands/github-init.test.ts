import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { buildProgram } from "../../src/cli.js";
import { initCommand } from "../../src/commands/init.js";
import {
  GITHUB_BADGE_WORKFLOW_RELPATH,
  GITHUB_REPORT_WORKFLOW_RELPATH,
  KIBI_METRIC_DOCS_URL,
  detectReadmePath,
  formatKibiBadgeMarkdown,
  githubPagesUrls,
  githubTemplateDir,
  githubWorkflowTemplateFileName,
  hasKibiBadge,
  insertKibiBadge,
  loadGitHubWorkflowTemplate,
  parseGitHubRemote,
  placeholderBadgeMarkdown,
  resolveGitHubRepo,
  scaffoldGitHubIntegration,
  writeGitHubWorkflow,
} from "../../src/commands/github-init.js";

const repoRoot = path.resolve(__dirname, "../../../..");

describe("GitHub remote parsing", () => {
  test("parses common GitHub remote forms", () => {
    expect(parseGitHubRemote("https://github.com/owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
    expect(parseGitHubRemote("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
    expect(parseGitHubRemote("https://www.github.com/Owner/Repo.git")).toEqual({
      owner: "Owner",
      repo: "Repo",
    });
    expect(parseGitHubRemote("git@github.com:owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
    expect(parseGitHubRemote("git@github.com:owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
    expect(
      parseGitHubRemote("ssh://git@github.com/owner/repo.git"),
    ).toEqual({ owner: "owner", repo: "repo" });
    expect(parseGitHubRemote("git://github.com/owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  test("rejects malformed and non-GitHub remotes", () => {
    expect(parseGitHubRemote("")).toBeUndefined();
    expect(parseGitHubRemote("https://github.com/only-owner")).toBeUndefined();
    expect(
      parseGitHubRemote("https://gitlab.com/owner/repo.git"),
    ).toBeUndefined();
    expect(
      parseGitHubRemote("git@gitlab.com:owner/repo.git"),
    ).toBeUndefined();
    expect(
      parseGitHubRemote("https://github.example.com/owner/repo.git"),
    ).toBeUndefined();
    expect(parseGitHubRemote("not a remote")).toBeUndefined();
  });

  test("prefers origin when it is GitHub, otherwise the first github.com remote", () => {
    expect(
      resolveGitHubRepo([
        { name: "upstream", url: "https://github.com/other/fork.git" },
        { name: "origin", url: "git@github.com:Acme/Widgets.git" },
      ]),
    ).toEqual({ owner: "Acme", repo: "Widgets" });
    expect(
      resolveGitHubRepo([
        { name: "origin", url: "https://gitlab.com/acme/widgets.git" },
        { name: "github", url: "https://github.com/acme/widgets.git" },
      ]),
    ).toEqual({ owner: "acme", repo: "widgets" });
    expect(
      resolveGitHubRepo([
        { name: "origin", url: "https://gitlab.com/acme/widgets.git" },
      ]),
    ).toBeUndefined();
  });
});

describe("GitHub Pages URLs", () => {
  test("builds project-site URLs in lowercase", () => {
    expect(githubPagesUrls({ owner: "Looted", repo: "kibi" })).toEqual({
      siteUrl: "https://looted.github.io/kibi/",
      badgeUrl: "https://looted.github.io/kibi/badge.svg",
    });
  });

  test("builds owner-site URLs without a repository segment", () => {
    expect(
      githubPagesUrls({ owner: "Acme", repo: "Acme.github.io" }),
    ).toEqual({
      siteUrl: "https://acme.github.io/",
      badgeUrl: "https://acme.github.io/badge.svg",
    });
  });
});

describe("GitHub workflow templates", () => {
  test("documented examples match the packaged templates", () => {
    for (const kind of ["report", "badge"] as const) {
      const fileName = githubWorkflowTemplateFileName(kind);
      const packaged = readFileSync(
        path.join(githubTemplateDir(), fileName),
        "utf8",
      );
      const documented = readFileSync(
        path.join(repoRoot, "docs/examples/github", fileName),
        "utf8",
      );
      expect(documented).toBe(packaged);
      expect(loadGitHubWorkflowTemplate(kind)).toBe(packaged);
    }
  });

  test("report template deploys the full report directory on the default branch", () => {
    const workflow = loadGitHubWorkflowTemplate("report");
    expect(workflow).toContain("kibi report --output kibi-report");
    expect(workflow).toContain("path: kibi-report");
    expect(workflow).toContain("github.event.repository.default_branch");
    expect(workflow).toContain("workflow_dispatch");
    expect(workflow).not.toContain("branches: [main]");
    expect(workflow).toContain("cancel-in-progress: false");
  });

  test("badge-only template still generates the report then publishes badge.svg", () => {
    const workflow = loadGitHubWorkflowTemplate("badge");
    expect(workflow).toContain("kibi report --output kibi-report");
    expect(workflow).toContain("cp kibi-report/badge.svg kibi-badge/badge.svg");
    expect(workflow).toContain("path: kibi-badge");
  });
});

describe("README badge insertion", () => {
  test("detects an existing Kibi badge and preserves other content", () => {
    const existing = `# App

[![Kibi requirement health](https://acme.github.io/app/badge.svg)](https://acme.github.io/app/)

Hello
`;
    expect(hasKibiBadge(existing)).toBe(true);
    expect(
      insertKibiBadge(
        "# App\n\nHello\n",
        formatKibiBadgeMarkdown(
          "https://acme.github.io/app/badge.svg",
          "https://acme.github.io/app/",
        ),
      ),
    ).toContain("# App");
    expect(
      insertKibiBadge(
        "# App\n\nHello\n",
        formatKibiBadgeMarkdown(
          "https://acme.github.io/app/badge.svg",
          "https://acme.github.io/app/",
        ),
      ),
    ).toContain("Hello");
  });

  test("inserts after the first heading and existing badge row", () => {
    const badge = formatKibiBadgeMarkdown(
      "https://acme.github.io/app/badge.svg",
      "https://acme.github.io/app/",
    );
    const updated = insertKibiBadge(
      "# App\n\n[![CI](https://example.com/ci.svg)](https://example.com)\n\nIntro\n",
      badge,
    );
    expect(updated.startsWith("# App\n")).toBe(true);
    expect(updated).toContain("[![CI](https://example.com/ci.svg)]");
    expect(updated).toContain(badge);
    expect(updated).toContain("Intro");
    expect(updated.indexOf("[![CI]")).toBeLessThan(updated.indexOf(badge));
  });
});

describe("kibi init GitHub option registration", () => {
  test("registers --github and --badge-only on init", () => {
    const program = buildProgram();
    const init = program.commands.find((command) => command.name() === "init");
    expect(init).toBeDefined();
    const help = init?.helpInformation() ?? "";
    expect(help).toContain("--github");
    expect(help).toContain("--badge-only");
    expect(help).toContain("badge + requirement-health report");
  });

  test("rejects --badge-only without --github", async () => {
    const errors: string[] = [];
    const originalError = console.error;
    console.error = (message?: unknown) => {
      errors.push(String(message));
    };
    try {
      const result = await initCommand({ badgeOnly: true });
      expect(result.exitCode).toBe(1);
      expect(errors.join("\n")).toContain("--badge-only requires --github");
    } finally {
      console.error = originalError;
    }
  });
});

describe("GitHub workflow and README scaffolding", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-github-init-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("creates the canonical report workflow matching the packaged template", () => {
    writeFileSync(path.join(tmpDir, "README.md"), "# Widgets\n");
    const logs: string[] = [];
    const result = scaffoldGitHubIntegration(
      { cwd: tmpDir, badgeOnly: false },
      {
        listRemotes: () => [
          { name: "origin", url: "https://github.com/Acme/Widgets.git" },
        ],
        log: (message) => logs.push(message),
        error: (message) => logs.push(message),
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.workflow).toBe("created");
    expect(result.readme).toBe("updated");
    expect(
      readFileSync(path.join(tmpDir, ".gitignore"), "utf8"),
    ).toContain("kibi-report/");
    const written = readFileSync(
      path.join(tmpDir, GITHUB_REPORT_WORKFLOW_RELPATH),
      "utf8",
    );
    expect(written).toBe(loadGitHubWorkflowTemplate("report"));
    const readme = readFileSync(path.join(tmpDir, "README.md"), "utf8");
    expect(readme).toContain(
      "[![Kibi requirement health](https://acme.github.io/widgets/badge.svg)](https://acme.github.io/widgets/)",
    );
    expect(readme).toContain("# Widgets");
    expect(logs.join("\n")).toContain(
      "GitHub → Settings → Pages → Source → GitHub Actions",
    );
  });

  test("is idempotent and does not duplicate the badge", () => {
    writeFileSync(path.join(tmpDir, "README.md"), "# Widgets\n");
    const deps = {
      listRemotes: () => [
        { name: "origin", url: "git@github.com:Acme/Widgets.git" },
      ],
      log: () => {},
      error: () => {},
    };
    const first = scaffoldGitHubIntegration(
      { cwd: tmpDir, badgeOnly: false },
      deps,
    );
    const second = scaffoldGitHubIntegration(
      { cwd: tmpDir, badgeOnly: false },
      deps,
    );
    expect(first.workflow).toBe("created");
    expect(second.workflow).toBe("unchanged");
    expect(second.readme).toBe("unchanged");
    const readme = readFileSync(path.join(tmpDir, "README.md"), "utf8");
    expect(readme.split("Kibi requirement health").length - 1).toBe(1);
  });

  test("does not overwrite a customized workflow", () => {
    mkdirSync(path.join(tmpDir, ".github/workflows"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, GITHUB_REPORT_WORKFLOW_RELPATH),
      "name: custom\n",
    );
    writeFileSync(path.join(tmpDir, "README.md"), "# Widgets\n");
    const errors: string[] = [];
    const result = scaffoldGitHubIntegration(
      { cwd: tmpDir, badgeOnly: false },
      {
        listRemotes: () => [
          { name: "origin", url: "https://github.com/Acme/Widgets.git" },
        ],
        log: () => {},
        error: (message) => errors.push(message),
      },
    );
    expect(result.workflow).toBe("conflict");
    expect(
      readFileSync(path.join(tmpDir, GITHUB_REPORT_WORKFLOW_RELPATH), "utf8"),
    ).toBe("name: custom\n");
    expect(errors.join("\n")).toContain("already exists and differs");
  });

  test("prints badge Markdown when README is absent", () => {
    const logs: string[] = [];
    const result = scaffoldGitHubIntegration(
      { cwd: tmpDir, badgeOnly: false },
      {
        listRemotes: () => [
          { name: "origin", url: "https://github.com/Acme/Widgets.git" },
        ],
        log: (message) => logs.push(message),
        error: () => {},
      },
    );
    expect(result.readme).toBe("printed");
    expect(detectReadmePath(tmpDir)).toBeUndefined();
    expect(existsSync(path.join(tmpDir, GITHUB_REPORT_WORKFLOW_RELPATH))).toBe(
      true,
    );
    expect(logs.join("\n")).toContain(
      "https://acme.github.io/widgets/badge.svg",
    );
  });

  test("does not invent a badge URL when the remote is not GitHub", () => {
    writeFileSync(path.join(tmpDir, "README.md"), "# Widgets\n");
    const errors: string[] = [];
    const logs: string[] = [];
    const result = scaffoldGitHubIntegration(
      { cwd: tmpDir, badgeOnly: false },
      {
        listRemotes: () => [
          { name: "origin", url: "https://gitlab.com/acme/widgets.git" },
        ],
        log: (message) => logs.push(message),
        error: (message) => errors.push(message),
      },
    );
    expect(result.repo).toBeUndefined();
    expect(result.readme).toBe("skipped-unknown-repo");
    expect(readFileSync(path.join(tmpDir, "README.md"), "utf8")).toBe(
      "# Widgets\n",
    );
    expect(existsSync(path.join(tmpDir, GITHUB_REPORT_WORKFLOW_RELPATH))).toBe(
      true,
    );
    expect(errors.join("\n")).toContain("Could not determine");
    expect(logs.join("\n")).toContain(placeholderBadgeMarkdown(false));
  });

  test("badge-only publishes the badge workflow and links the metric docs", () => {
    writeFileSync(path.join(tmpDir, "README.md"), "# Widgets\n");
    const result = scaffoldGitHubIntegration(
      { cwd: tmpDir, badgeOnly: true },
      {
        listRemotes: () => [
          { name: "origin", url: "https://github.com/Acme/Widgets.git" },
        ],
        log: () => {},
        error: () => {},
      },
    );
    expect(result.workflow).toBe("created");
    expect(
      readFileSync(path.join(tmpDir, GITHUB_BADGE_WORKFLOW_RELPATH), "utf8"),
    ).toBe(loadGitHubWorkflowTemplate("badge"));
    const readme = readFileSync(path.join(tmpDir, "README.md"), "utf8");
    expect(readme).toContain("https://acme.github.io/widgets/badge.svg");
    expect(readme).toContain(KIBI_METRIC_DOCS_URL);
    expect(readme).not.toContain("](https://acme.github.io/widgets/)");
  });

  test("writeGitHubWorkflow reports unchanged for identical content", () => {
    const template = loadGitHubWorkflowTemplate("report");
    expect(writeGitHubWorkflow(tmpDir, "report", template)).toBe("created");
    expect(writeGitHubWorkflow(tmpDir, "report", template)).toBe("unchanged");
  });
});
