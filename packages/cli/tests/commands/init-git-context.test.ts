import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  constants,
  accessSync,
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { initCommand } from "../../src/commands/init.js";
import {
  branchStorePath,
  legacyBranchStorePath,
} from "../../src/utils/branch-store-locator.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";
import {
  isolatedCliSandboxEnv,
  execSync as nodeExecSync,
} from "../helpers/isolated-env.js";

// executable_for TEST-git-hook-effective-install
function git(cwd: string, args: string): string {
  return nodeExecSync(`git ${args}`, {
    cwd,
    encoding: "utf8",
    env: isolatedCliSandboxEnv(),
  });
}

describe("kibi init repository-context fixes", () => {
  let tmpRoot: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-test-init-ctx-"));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  function makeRepo(name: string): string {
    const repo = path.join(tmpRoot, name);
    nodeExecSync(`git init -q -b main ${JSON.stringify(repo)}`, {
      env: isolatedCliSandboxEnv(),
    });
    git(repo, "config user.email test@test.com");
    git(repo, "config user.name Test User");
    return repo;
  }

  function commitReadme(repo: string): void {
    writeFileSync(path.join(repo, "README.md"), "# t\n");
    git(repo, "add README.md");
    git(repo, "commit -qm init");
  }

  function snapshotDirectory(root: string): string[] {
    const snapshot: string[] = [];
    const visit = (directory: string, prefix = "") => {
      const entries = readdirSync(directory, { withFileTypes: true }).sort(
        (left, right) => left.name.localeCompare(right.name),
      );
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        const relativePath = path.join(prefix, entry.name);
        if (entry.isSymbolicLink()) {
          snapshot.push(`link ${relativePath} -> ${readlinkSync(fullPath)}`);
        } else if (entry.isDirectory()) {
          snapshot.push(`directory ${relativePath}`);
          visit(fullPath, relativePath);
        } else if (entry.isFile()) {
          const mode = lstatSync(fullPath).mode & 0o777;
          const contents = readFileSync(fullPath).toString("base64");
          snapshot.push(`file ${relativePath} ${mode.toString(8)} ${contents}`);
        } else {
          snapshot.push(`other ${relativePath}`);
        }
      }
    };
    visit(root);
    return snapshot;
  }

  function kibi(
    args: string,
    cwd: string,
    env = isolatedCliSandboxEnv(),
  ): string {
    return nodeExecSync(`bun ${JSON.stringify(kibiBin)} ${args} 2>&1`, {
      cwd,
      encoding: "utf8",
      env,
    });
  }

  function refusalRun(
    args: string,
    cwd: string,
    branch: string,
    env = isolatedCliSandboxEnv({ KIBI_BRANCH: branch }),
  ): { output: string; exitCode: number } {
    try {
      return { output: kibi(args, cwd, env), exitCode: 0 };
    } catch (error) {
      // init refuses with a nonzero exit; 2>&1 merges the diagnostics into
      // stdout, which nodeExecSync attaches to the thrown error.
      const err = error as { stdout?: unknown; status?: number };
      return {
        output: String(err.stdout ?? ""),
        exitCode: typeof err.status === "number" ? err.status : 1,
      };
    }
  }

  test("init succeeds inside a linked worktree and installs into the common hooks dir", () => {
    const primary = makeRepo("primary");
    commitReadme(primary);
    // Create the worktree before installing hooks: the shared post-checkout
    // hook needs a resolvable kibi binary, which the runtime/bootstrap PR
    // addresses; this test covers path resolution only.
    const linked = path.join(tmpRoot, "linked");
    git(primary, `worktree add -q -b feature ${JSON.stringify(linked)}`);
    kibi("init", primary);
    kibi("init", linked);

    expect(existsSync(path.join(linked, ".git/hooks/pre-commit"))).toBe(false);
    expect(existsSync(path.join(primary, ".git/hooks/pre-commit"))).toBe(true);
    expect(
      readFileSync(path.join(primary, ".git/hooks/pre-commit"), "utf8"),
    ).toContain("BEGIN kibi-managed");
    // The worktree gets its own workspace state, not the primary's.
    expect(existsSync(path.join(linked, ".kb/manifest.json"))).toBe(true);
  }, 180000);

  test("init from a subdirectory creates .kb at the repository root only", () => {
    const repo = makeRepo("repo");
    const sub = path.join(repo, "sub", "deep");
    mkdirSync(sub, { recursive: true });
    commitReadme(repo);

    const output = kibi("init", sub);
    expect(output).toContain("Kibi initialized");
    expect(existsSync(path.join(repo, ".kb/manifest.json"))).toBe(true);
    expect(existsSync(path.join(sub, ".kb"))).toBe(false);
    expect(existsSync(path.join(repo, ".git/hooks/pre-commit"))).toBe(true);
  }, 180000);

  test("init reports skipped foreign hooks instead of unconditional success", () => {
    const repo = makeRepo("foreign");
    const hooksDir = path.join(repo, ".git/hooks");
    mkdirSync(hooksDir, { recursive: true });
    const foreignPath = path.join(hooksDir, "pre-commit");
    writeFileSync(foreignPath, "#!/bin/sh\necho 'user hook'\n");

    const output = kibi("init", repo);
    expect(output).toContain(
      "pre-commit: existing non-Kibi hook left untouched",
    );
    // The aggregate success line must not claim pre-commit was installed.
    const successLine = output
      .split("\n")
      .find((line) => line.includes("✓ Installed/updated Kibi git hooks"));
    if (successLine) {
      expect(successLine).not.toContain("pre-commit");
    }
    expect(readFileSync(foreignPath, "utf8")).toBe(
      "#!/bin/sh\necho 'user hook'\n",
    );
    expect(output).not.toContain(
      "✓ Installed git hooks (pre-commit, post-checkout, post-merge, post-rewrite)",
    );
  }, 180000);

  test("init reports the configured core.hooksPath and installs into the effective dir", () => {
    const repo = makeRepo("hooked");
    git(repo, "config core.hooksPath .githooks");

    const output = kibi("init", repo);
    expect(output).toContain("core.hooksPath is configured");
    expect(existsSync(path.join(repo, ".githooks/pre-commit"))).toBe(true);
    expect(existsSync(path.join(repo, ".git/hooks/pre-commit"))).toBe(false);
  }, 180000);

  test("init refuses to install into a hooks path outside the repository", () => {
    const repo = makeRepo("external");
    const externalHooks = path.join(tmpRoot, "external-hooks");
    git(repo, `config core.hooksPath ${JSON.stringify(externalHooks)}`);

    const output = kibi("init", repo);
    expect(output).toContain(
      "refusing to install hooks into unrelated directories",
    );
    expect(existsSync(path.join(externalHooks, "pre-commit"))).toBe(false);
  }, 180000);

  test("init refuses a repository-local hooks path symlinked outside", () => {
    const repo = makeRepo("symlink-hooks");
    const externalHooks = path.join(tmpRoot, "external-symlink-hooks");
    mkdirSync(externalHooks, { recursive: true });
    writeFileSync(
      path.join(externalHooks, "pre-commit"),
      "#!/bin/sh\n# BEGIN kibi-managed\nold\n# END kibi-managed\n",
      { mode: 0o755 },
    );
    writeFileSync(path.join(externalHooks, "operator-file"), "keep me\n");
    symlinkSync(externalHooks, path.join(repo, ".githooks"));
    git(repo, "config core.hooksPath .githooks");
    const before = snapshotDirectory(externalHooks);

    const output = kibi("init", repo);

    expect(output).toContain(
      "refusing to install hooks into unrelated directories",
    );
    expect(readlinkSync(path.join(repo, ".githooks"))).toBe(externalHooks);
    expect(snapshotDirectory(externalHooks)).toEqual(before);
    expect(readdirSync(externalHooks).sort()).toEqual([
      "operator-file",
      "pre-commit",
    ]);
    expect(existsSync(path.join(externalHooks, "post-checkout"))).toBe(false);
    expect(existsSync(path.join(externalHooks, "post-merge"))).toBe(false);
    expect(existsSync(path.join(externalHooks, "post-rewrite"))).toBe(false);
  }, 180000);

  test("init names the symlink, not core.hooksPath, when the default hooks directory escapes", () => {
    const repo = makeRepo("default-hooks-symlink");
    const externalHooks = path.join(tmpRoot, "external-default-hooks");
    mkdirSync(externalHooks, { recursive: true });
    rmSync(path.join(repo, ".git/hooks"), { recursive: true, force: true });
    symlinkSync(externalHooks, path.join(repo, ".git/hooks"));

    const output = kibi("init", repo);

    expect(output).toContain(
      "The Git hooks directory resolves outside this repository",
    );
    expect(output).not.toContain("core.hooksPath points outside");
    expect(readdirSync(externalHooks)).toEqual([]);
  }, 180000);

  test("checks the nearest existing ancestor when the hooks directory is missing", () => {
    const repo = makeRepo("missing-symlink-hooks");
    const externalParent = path.join(tmpRoot, "external-missing-hooks");
    mkdirSync(externalParent, { recursive: true });
    writeFileSync(path.join(externalParent, "operator-file"), "keep me\n");
    symlinkSync(externalParent, path.join(repo, ".githooks"));
    git(repo, "config core.hooksPath .githooks/new-hooks");
    const before = snapshotDirectory(externalParent);

    const output = kibi("init", repo);

    expect(output).toContain(
      "refusing to install hooks into unrelated directories",
    );
    expect(existsSync(path.join(externalParent, "new-hooks"))).toBe(false);
    expect(snapshotDirectory(externalParent)).toEqual(before);
  }, 180000);

  test("init refuses an unreadable .git instead of standalone fallback (explicit branch)", () => {
    const repo = makeRepo("unreadable-git");
    commitReadme(repo);
    const before = snapshotDirectory(repo);
    chmodSync(path.join(repo, ".git"), 0o000);
    let run: { output: string; exitCode: number };
    try {
      run = refusalRun("init", repo, "review-probe");
    } finally {
      chmodSync(path.join(repo, ".git"), 0o755);
    }
    expect(run.exitCode).not.toBe(0);
    expect(run.output).toContain("Git reported no repository");
    expect(run.output).toContain("a .git entry exists at");
    expect(run.output).toContain("refusing to create workspace state");
    // No workspace or hook mutations, even though KIBI_BRANCH makes the
    // standalone path available for genuine non-repositories.
    expect(existsSync(path.join(repo, ".kb"))).toBe(false);
    expect(existsSync(path.join(repo, ".git/hooks/pre-commit"))).toBe(false);
    expect(snapshotDirectory(repo)).toEqual(before);
  }, 180000);

  test("init from a subdirectory refuses an unreadable .git identically", () => {
    const repo = makeRepo("unreadable-git-sub");
    commitReadme(repo);
    const sub = path.join(repo, "sub");
    mkdirSync(sub, { recursive: true });
    const before = snapshotDirectory(repo);
    chmodSync(path.join(repo, ".git"), 0o000);
    let run: { output: string; exitCode: number };
    try {
      run = refusalRun("init", sub, "review-probe");
    } finally {
      chmodSync(path.join(repo, ".git"), 0o755);
    }
    expect(run.exitCode).not.toBe(0);
    expect(run.output).toContain("Git reported no repository");
    expect(run.output).toContain("a .git entry exists at");
    expect(run.output).toContain("refusing to create workspace state");
    expect(existsSync(path.join(sub, ".kb"))).toBe(false);
    expect(existsSync(path.join(repo, ".kb"))).toBe(false);
    expect(existsSync(path.join(repo, ".git/hooks/pre-commit"))).toBe(false);
    expect(snapshotDirectory(repo)).toEqual(before);
  }, 180000);

  test("init still treats a genuine non-repository as standalone with an explicit branch", () => {
    const standalone = path.join(tmpRoot, "standalone");
    mkdirSync(standalone, { recursive: true });
    const run = refusalRun("init", standalone, "review-probe");
    expect(run.exitCode).toBe(0);
    expect(run.output).toContain("Kibi initialized");
    expect(existsSync(path.join(standalone, ".kb/manifest.json"))).toBe(true);
  }, 180000);

  for (const [internal, target] of [
    ["objects", ".git/objects"],
    ["refs", ".git/refs"],
  ] as const) {
    for (const from of ["root", "sub"] as const) {
      test(`init refuses inaccessible .git/${internal} (from ${from}, explicit branch)`, () => {
        const repo = makeRepo(`locked-${internal}-${from}`);
        commitReadme(repo);
        const sub = path.join(repo, "sub");
        mkdirSync(sub, { recursive: true });
        const targetPath = path.join(repo, ".git", internal);
        const before = snapshotDirectory(repo);
        chmodSync(targetPath, 0o000);
        try {
          // Precondition: the fixture must actually deny the executing user
          // read access, otherwise the scenario is not exercised.
          expect(() => accessSync(targetPath, constants.R_OK)).toThrow();
          const cwd = from === "root" ? repo : sub;
          const run = refusalRun("init", cwd, "review-probe");
          expect(run.exitCode).not.toBe(0);
          expect(run.output).toContain("Git reported no repository");
          expect(run.output).toContain("a .git entry exists at");
          expect(run.output).toContain("refusing to create workspace state");
        } finally {
          chmodSync(targetPath, 0o755);
        }
        // No workspace, gitignore, symbols-manifest, or hook mutations.
        expect(existsSync(path.join(repo, ".kb"))).toBe(false);
        expect(existsSync(path.join(sub, ".kb"))).toBe(false);
        expect(existsSync(path.join(repo, ".gitignore"))).toBe(false);
        expect(existsSync(path.join(repo, ".kb/symbols.yaml"))).toBe(false);
        expect(existsSync(path.join(repo, ".git/hooks/pre-commit"))).toBe(
          false,
        );
        expect(snapshotDirectory(repo)).toEqual(before);
      }, 180000);
    }
  }

  test("localized parent locale keeps standalone init working (explicit branch)", () => {
    const standalone = path.join(tmpRoot, "standalone-pl");
    mkdirSync(standalone, { recursive: true });
    const run = refusalRun(
      "init",
      standalone,
      "review-probe",
      isolatedCliSandboxEnv({
        KIBI_BRANCH: "review-probe",
        LC_ALL: "pl_PL.UTF-8",
        LANG: "pl_PL.UTF-8",
      }),
    );
    // The resolver pins the child locale, so the parent's Polish locale
    // cannot translate Git's absence diagnostic into a refusal.
    expect(run.exitCode).toBe(0);
    expect(run.output).toContain("Kibi initialized");
    expect(existsSync(path.join(standalone, ".kb/manifest.json"))).toBe(true);
  }, 180000);
});

describe("kibi init branch-attachment context agreement", () => {
  let roots: string[];
  let restores: Array<() => void>;

  beforeEach(() => {
    roots = [];
    restores = [];
    restores.push(isolateKibiEnv());
  });

  afterEach(() => {
    for (const restore of restores.reverse()) restore();
    for (const root of roots) removeTempDir(root);
  });

  function fixtureWorkspace(
    name: string,
    plant: (cwd: string) => void,
  ): string {
    const cwd = createGitWorkspace();
    roots.push(cwd);
    plant(cwd);
    return cwd;
  }

  async function runFrom(cwd: string, sub: string | null) {
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(sub ? path.join(cwd, sub) : cwd, () =>
      initCommand({}),
    );
    return { result, io };
  }

  const cases: Array<[string, (cwd: string) => void, string]> = [
    [
      "unfinished recovery journal",
      (cwd) => {
        const journalDir = path.join(
          cwd,
          ".kb",
          "recovery",
          "branch-migrations",
        );
        mkdirSync(journalDir, { recursive: true });
        writeFileSync(
          path.join(journalDir, "mig-1.json"),
          JSON.stringify({ state: "pending" }),
        );
      },
      "Incomplete branch migration journal 'mig-1'",
    ],
    [
      "corrupted recovery journal",
      (cwd) => {
        const journalDir = path.join(
          cwd,
          ".kb",
          "recovery",
          "branch-migrations",
        );
        mkdirSync(journalDir, { recursive: true });
        writeFileSync(path.join(journalDir, "mig-bad.json"), "{not json");
      },
      "Unreadable branch migration journal 'mig-bad.json'",
    ],
    [
      "legacy branch store",
      (cwd) => {
        mkdirSync(legacyBranchStorePath(cwd, "main"), { recursive: true });
      },
      "legacy branch storage",
    ],
    [
      "legacy and hashed store conflict",
      (cwd) => {
        mkdirSync(legacyBranchStorePath(cwd, "main"), { recursive: true });
        mkdirSync(branchStorePath(cwd, "main"), { recursive: true });
      },
      "Ambiguous branch storage",
    ],
    [
      "broken hashed store identity manifest",
      (cwd) => {
        const store = branchStorePath(cwd, "main");
        mkdirSync(store, { recursive: true });
        writeFileSync(
          path.join(store, "branch.json"),
          JSON.stringify({ version: 1, branch: "other", key: "deadbeef" }),
        );
      },
      "identity manifest mismatch",
    ],
  ];

  for (const [name, plant, expectedText] of cases) {
    test(`init from root and subdirectory agree: ${name}`, async () => {
      const cwd = fixtureWorkspace(name, plant);
      mkdirSync(path.join(cwd, "sub"), { recursive: true });

      const fromRoot = await runFrom(cwd, null);
      const fromSub = await runFrom(cwd, "sub");

      expect(fromRoot.result.exitCode).toBe(1);
      expect(fromSub.result.exitCode).toBe(1);
      expect(fromSub.io.errorText()).toBe(fromRoot.io.errorText());
      expect(fromSub.io.errorText()).toContain(expectedText);
      // A blocked run must not create workspace state in the subdirectory.
      expect(existsSync(path.join(cwd, "sub", ".kb"))).toBe(false);
    }, 120000);
  }
});

describe("kibi init hook-path coverage messaging", () => {
  let tmpRoot: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-test-init-cov-"));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  function makeRepo(name: string): string {
    const repo = path.join(tmpRoot, name);
    nodeExecSync(`git init -q -b main ${JSON.stringify(repo)}`, {
      env: isolatedCliSandboxEnv(),
    });
    git(repo, "config user.email test@test.com");
    git(repo, "config user.name Test User");
    return repo;
  }

  function kibi(args: string, cwd: string): string {
    return nodeExecSync(`bun ${JSON.stringify(kibiBin)} ${args} 2>&1`, {
      cwd,
      encoding: "utf8",
      env: isolatedCliSandboxEnv(),
    });
  }

  function commitReadme(repo: string): void {
    writeFileSync(path.join(repo, "README.md"), "# t\n");
    git(repo, "add README.md");
    git(repo, "commit -qm init");
  }

  test("linked worktree with default hooks reports the shared common dir", () => {
    const primary = makeRepo("primary");
    commitReadme(primary);
    const linked = path.join(tmpRoot, "linked");
    git(primary, `worktree add -q -b feature ${JSON.stringify(linked)}`);
    kibi("init", linked);

    const output = kibi("init", linked);
    expect(output).toContain("shared with all worktrees");
  }, 180000);

  test("linked worktree with relative core.hooksPath reports unverified coverage", () => {
    const primary = makeRepo("hooked");
    commitReadme(primary);
    git(primary, "config core.hooksPath .githooks");
    const linked = path.join(tmpRoot, "linked-hooked");
    git(primary, `worktree add -q -b feature ${JSON.stringify(linked)}`);
    // The worktree checkout has no .githooks (never committed): init must
    // install for THIS checkout and state the coverage limitation.
    const output = kibi("init", linked);
    expect(output).toContain("core.hooksPath is configured");
    expect(output).toContain("INCOMPLETE/UNVERIFIED");
    expect(output).not.toContain("shared with all worktrees");
    expect(existsSync(path.join(linked, ".githooks/pre-commit"))).toBe(true);
    expect(existsSync(path.join(primary, ".githooks"))).toBe(false);
  }, 180000);

  test("all-skipped hooks with a configured path do not claim installation", () => {
    const repo = makeRepo("all-skipped");
    git(repo, "config core.hooksPath .githooks");
    const configured = path.join(repo, ".githooks");
    mkdirSync(configured, { recursive: true });
    for (const hook of [
      "pre-commit",
      "post-checkout",
      "post-merge",
      "post-rewrite",
    ]) {
      writeFileSync(
        path.join(configured, hook),
        "#!/bin/sh\necho 'user hook'\n",
        {
          mode: 0o755,
        },
      );
    }

    const output = kibi("init", repo);
    // The configured-path note must stay neutral: the all-skipped verdict
    // comes from the per-hook and aggregate lines only.
    expect(output).toContain("core.hooksPath is configured");
    expect(output).toContain("the effective hooks directory for THIS checkout");
    expect(output).toContain("! No Kibi git hooks installed");
    expect(output).not.toContain("hooks were installed");
    expect(output).not.toContain("✓ Installed/updated");
    for (const hook of [
      "pre-commit",
      "post-checkout",
      "post-merge",
      "post-rewrite",
    ]) {
      expect(readFileSync(path.join(configured, hook), "utf8")).toBe(
        "#!/bin/sh\necho 'user hook'\n",
      );
    }
  }, 180000);

  test("mixed outcomes with a configured path keep the skipped pre-commit unclaimed", () => {
    const repo = makeRepo("mixed-skipped");
    git(repo, "config core.hooksPath .githooks");
    const configured = path.join(repo, ".githooks");
    mkdirSync(configured, { recursive: true });
    writeFileSync(
      path.join(configured, "pre-commit"),
      "#!/bin/sh\necho 'user hook'\n",
      {
        mode: 0o755,
      },
    );

    const output = kibi("init", repo);
    const installedLine = output
      .split("\n")
      .find((line) => line.includes("✓ Installed/updated Kibi git hooks"));
    expect(installedLine).toBeDefined();
    expect(installedLine).toContain("post-checkout");
    expect(installedLine).toContain("post-merge");
    expect(installedLine).toContain("post-rewrite");
    expect(installedLine).not.toContain("pre-commit");
    expect(output).toContain("core.hooksPath is configured");
    expect(output).not.toContain("No Kibi git hooks installed");
    expect(readFileSync(path.join(configured, "pre-commit"), "utf8")).toBe(
      "#!/bin/sh\necho 'user hook'\n",
    );
    expect(existsSync(path.join(configured, "post-checkout"))).toBe(true);
  }, 180000);

  test("foreign pre-commit recipe includes both staged checks", () => {
    const repo = makeRepo("recipe");
    const hooksDir = path.join(repo, ".git/hooks");
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(
      path.join(hooksDir, "pre-commit"),
      "#!/bin/sh\necho 'user hook'\n",
    );
    writeFileSync(path.join(hooksDir, "post-merge"), "#!/bin/sh\necho fm\n");

    const output = kibi("init", repo);
    expect(output).toContain(
      "kibi check-generated --staged --changed-only && kibi check --staged",
    );
    const postLine = output
      .split("\n")
      .find((line) => line.startsWith("! post-merge:"));
    expect(postLine).toContain("kibi sync");
  }, 180000);

  test("init refuses to write workspace state into a bare repository", () => {
    const bare = path.join(tmpRoot, "bare.git");
    nodeExecSync(`git init -q --bare -b main ${JSON.stringify(bare)}`, {
      env: isolatedCliSandboxEnv(),
    });

    let output = "";
    try {
      output = kibi("init", bare);
    } catch (error) {
      // init refuses bare repositories with exit code 1.
      output = String((error as { stdout?: unknown }).stdout ?? "");
    }
    expect(output).toContain("Bare repository");
    expect(output).toContain("refusing to create workspace state");
    expect(existsSync(path.join(bare, ".kb"))).toBe(false);
  }, 180000);
});
