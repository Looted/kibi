import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as githubInit from "../../src/commands/github-init.js";
import * as hookManagers from "../../src/commands/hook-managers.js";
import * as initHelpers from "../../src/commands/init-helpers.js";
import { MANAGED_HOOK_NAMES } from "../../src/commands/init-helpers.js";
import { initCommand } from "../../src/commands/init.js";
import * as activation from "../../src/operations/bootstrap/activation.js";
import * as languageNote from "../../src/plugins/reference-language-suggestion.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import * as branchResolver from "../../src/utils/branch-resolver.js";
import * as config from "../../src/utils/config.js";
import * as gitContext from "../../src/utils/git-repository-context.js";
import type { GitRepositoryContext } from "../../src/utils/git-repository-context.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];
let logs: string[] = [];
let errors: unknown[][] = [];
let out: string[] = [];
const calls: unknown[][] = [];

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

function record(
  target: object,
  name: string,
  answer: (...args: unknown[]) => unknown = () => undefined,
) {
  track(
    spyOn(target as never, name as never).mockImplementation(((
      ...args: unknown[]
    ) => {
      calls.push([name, ...args]);
      return answer(...args);
    }) as never),
  );
}

const SCHEMA_DIR = path.resolve(import.meta.dir, "..", "..", "schema");

function tempRoot(): string {
  const root = realpathSync(createTempDir("kibi-init-mut-"));
  roots.push(root);
  return root;
}

function context(
  root: string,
  overrides: Partial<GitRepositoryContext> = {},
): GitRepositoryContext {
  return {
    worktreeRoot: root,
    gitDir: path.join(root, ".git"),
    commonGitDir: path.join(root, ".git"),
    effectiveHooksDir: path.join(root, ".git", "hooks"),
    isLinkedWorktree: false,
    primaryWorktreeRoot: root,
    hooksPathConfig: null,
    hooksPathOrigin: null,
    ...overrides,
  };
}

let state = "root_empty";
let plugin: string | null = null;
let legacy = "none";
let failOn = "";
const failure = new Error("disk full");

beforeEach(() => {
  logs = [];
  errors = [];
  out = [];
  calls.length = 0;
  state = "root_empty";
  plugin = null;
  legacy = "none";
  failOn = "";
  track(
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    }),
  );
  track(
    spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args);
    }),
  );
  track(
    spyOn(process.stdout, "write").mockImplementation(((chunk: string) => {
      out.push(chunk);
      return true;
    }) as never),
  );
  for (const name of [
    "createKbDirectoryStructure",
    "createManifestFile",
    "updateGitIgnore",
    "copySchemaFiles",
    "ensureSymbolsManifestFile",
    "installGitHooks",
  ])
    record(initHelpers, name, () => {
      if (failOn === name) throw failure;
    });
  record(githubInit, "scaffoldGitHubIntegration");
  record(nodeFilesystem, "glob", async () => ["a.md"]);
  record(activation, "classifyActivation", async () => ({
    activationState: state,
  }));
  record(languageNote, "workspaceReferenceLanguageNote", () => plugin);
  record(config, "readLegacyKbConfig", () => ({ kind: legacy }));
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function resolveTo(resolution: unknown, branch: unknown = undefined) {
  record(gitContext, "resolveGitRepository", () => resolution);
  record(
    branchResolver,
    "resolveBranchAttachment",
    () =>
      branch ?? {
        gitBranch: "main",
        kbBranch: "main",
        storePath: "/s",
        kind: "exact",
        migrationRequired: false,
      },
  );
}

const named = (name: string) =>
  calls.filter(([call]) => call === name).map(([, ...args]) => args);
const errorLines = () => errors.map((args) => args.map(String).join(" "));

const DONE = [
  "\n✓ Kibi initialized. Kibi infrastructure is ready for this repository.",
  "  No product knowledge was inferred or changed by kibi init.",
];
const BOOTSTRAP =
  "  Next: ask your coding agent “Bootstrap Kibi for this repository.”";
const DOCTOR =
  "  Optional diagnostic: run 'kibi doctor' if setup appears degraded.";

describe("initCommand option checks", () => {
  test("--format needs --print-hook", async () => {
    resolveTo({ status: "not-a-repository" });
    expect(await initCommand({ format: "shell" })).toStrictEqual({
      exitCode: 1,
    });
    expect(errorLines()).toStrictEqual([
      "Error: --format applies only to --print-hook.",
    ]);
    expect(named("resolveGitRepository")).toStrictEqual([]);
  });

  test("--print-hook prints a snippet without touching the repository", async () => {
    resolveTo({ status: "not-a-repository" });
    expect(await initCommand({ printHook: "all" })).toStrictEqual({
      exitCode: 0,
    });
    expect(
      await initCommand({ printHook: "pre-commit", format: "husky" }),
    ).toStrictEqual({ exitCode: 0 });
    expect(out).toStrictEqual([
      hookManagers.hookManagerSnippet("shell", MANAGED_HOOK_NAMES),
      hookManagers.hookManagerSnippet("husky", ["pre-commit"]),
    ]);
    expect(named("resolveGitRepository")).toStrictEqual([]);
    expect(errors).toStrictEqual([]);
  });

  test("--print-hook rejects unknown hooks and formats", async () => {
    resolveTo({ status: "not-a-repository" });
    for (const printHook of ["", "pre-push-x"]) {
      expect(await initCommand({ printHook })).toStrictEqual({ exitCode: 1 });
    }
    expect(
      await initCommand({ printHook: "pre-commit", format: "make" }),
    ).toStrictEqual({ exitCode: 1 });
    const hooks = MANAGED_HOOK_NAMES.join(", ");
    expect(errorLines()).toStrictEqual([
      `Error: unknown hook '' for --print-hook. Expected one of: ${hooks}, all.`,
      `Error: unknown hook 'pre-push-x' for --print-hook. Expected one of: ${hooks}, all.`,
      `Error: unknown --format 'make' for --print-hook. Expected one of: ${hookManagers.HOOK_SNIPPET_FORMATS.join(", ")}.`,
    ]);
    expect(out).toStrictEqual([]);
  });

  test("--badge-only needs --github", async () => {
    resolveTo({ status: "git-refused", reason: "no" });
    for (const options of [
      { badgeOnly: true },
      { badgeOnly: true, github: false },
    ]) {
      expect(await initCommand(options)).toStrictEqual({ exitCode: 1 });
    }
    expect(errorLines()).toStrictEqual([
      "Error: --badge-only requires --github. The recommended integration is `kibi init --github` (badge + full report).",
      "Error: --badge-only requires --github. The recommended integration is `kibi init --github` (badge + full report).",
    ]);
    errors = [];
    expect(await initCommand({ badgeOnly: true, github: true })).toStrictEqual({
      exitCode: 1,
    });
    expect(await initCommand({ github: true })).toStrictEqual({ exitCode: 1 });
    expect(errorLines()[0]).toBe("Error: no");
  });
});

describe("initCommand repository checks", () => {
  test("refuses an unverifiable or unsupported repository", async () => {
    resolveTo({ status: "git-refused", reason: "fatal: bad config" });
    expect(await initCommand({})).toStrictEqual({ exitCode: 1 });
    restores.pop()?.();
    restores.pop()?.();
    resolveTo({ status: "unsupported", reason: "bare repository" });
    expect(await initCommand({})).toStrictEqual({ exitCode: 1 });
    expect(errorLines()).toStrictEqual([
      "Error: fatal: bad config",
      "Kibi cannot verify this directory's Git context; refusing to create workspace state.",
      "Error: bare repository",
      "Kibi requires a working-tree checkout; refusing to create workspace state.",
    ]);
    expect(named("createKbDirectoryStructure")).toStrictEqual([]);
  });

  test("explains a branch it cannot resolve", async () => {
    const root = tempRoot();
    const cases: Array<[string, string]> = [
      [
        "NOT_A_GIT_REPO",
        "boom. Set KIBI_BRANCH explicitly for a standalone workspace.",
      ],
      [
        "GIT_NOT_AVAILABLE",
        "boom. Set KIBI_BRANCH explicitly for a standalone workspace.",
      ],
      ["DETACHED_HEAD", "boom."],
    ];
    for (const [code, detail] of cases) {
      errors = [];
      resolveTo(
        { status: "ok", context: context(root) },
        { error: "boom.", code },
      );
      expect(await initCommand({})).toStrictEqual({ exitCode: 1 });
      expect(errorLines()).toStrictEqual([
        "Error: Failed to resolve the active git branch.",
        detail,
      ]);
      expect(named("resolveBranchAttachment").at(-1)).toStrictEqual([root]);
      restores.pop()?.();
      restores.pop()?.();
    }
  });

  test("asks for a legacy branch migration first", async () => {
    const root = tempRoot();
    resolveTo(
      { status: "ok", context: context(root) },
      {
        gitBranch: "feat",
        kbBranch: "old",
        storePath: "/s",
        kind: "legacy_compat",
        migrationRequired: true,
      },
    );
    expect(await initCommand({})).toStrictEqual({ exitCode: 1 });
    expect(errorLines()).toStrictEqual([
      "Error: KB is attached through legacy branch storage for 'feat'. Run 'kibi branch migrate --from old --to feat --apply' first.",
    ]);
  });
});

describe("initCommand infrastructure", () => {
  test("creates a fresh workspace at the worktree root", async () => {
    const root = tempRoot();
    resolveTo({ status: "ok", context: context(root) });
    expect(await initCommand({})).toStrictEqual({ exitCode: 0 });
    const kb = path.join(root, ".kb");
    expect(calls.map(([name]) => name)).toStrictEqual([
      "resolveGitRepository",
      "resolveBranchAttachment",
      "readLegacyKbConfig",
      "createKbDirectoryStructure",
      "createManifestFile",
      "updateGitIgnore",
      "copySchemaFiles",
      "ensureSymbolsManifestFile",
      "glob",
      "classifyActivation",
      "workspaceReferenceLanguageNote",
    ]);
    expect(named("readLegacyKbConfig")).toStrictEqual([[root]]);
    expect(named("createKbDirectoryStructure")).toStrictEqual([[kb, "main"]]);
    expect(named("createManifestFile")).toStrictEqual([[kb]]);
    expect(named("updateGitIgnore")).toStrictEqual([[root]]);
    expect(named("copySchemaFiles")).toStrictEqual([[kb, SCHEMA_DIR]]);
    expect(named("ensureSymbolsManifestFile")).toStrictEqual([[root]]);
    expect(named("workspaceReferenceLanguageNote")).toStrictEqual([[root]]);
    expect(named("glob")).toStrictEqual([
      [
        [
          ".kb/requirements/**/*.md",
          ".kb/scenarios/**/*.md",
          ".kb/tests/**/*.md",
          ".kb/adrs/**/*.md",
          ".kb/adr/**/*.md",
          ".kb/flags/**/*.md",
          ".kb/events/**/*.md",
          ".kb/facts/**/*.md",
        ],
        { cwd: root },
      ],
    ]);
    const [ctx, files] = named("classifyActivation")[0] as [
      Record<string, unknown>,
      unknown,
    ];
    expect(files).toStrictEqual(["a.md"]);
    expect(ctx.workspaceRoot).toBe(root);
    expect(ctx.fs).toBe(nodeFilesystem);
    expect(ctx.signal).toBeInstanceOf(AbortSignal);
    expect((ctx.clock as () => unknown)()).toBeInstanceOf(Date);
    expect(logs).toStrictEqual([...DONE, BOOTSTRAP, DOCTOR]);
    expect(errors).toStrictEqual([]);
  });

  test("falls back to the working directory outside a repository", async () => {
    const root = tempRoot();
    track(spyOn(process, "cwd").mockReturnValue(root));
    resolveTo({ status: "not-a-repository" });
    expect(await initCommand({ hooks: true })).toStrictEqual({ exitCode: 0 });
    expect(named("createKbDirectoryStructure")).toStrictEqual([
      [path.join(root, ".kb"), "main"],
    ]);
    expect(named("resolveGitRepository")).toStrictEqual([[root]]);
    expect(errorLines()).toStrictEqual([
      "Warning: No git repository found, skipping hooks",
    ]);
  });

  test("completes an existing workspace and keeps its manifest", async () => {
    const root = tempRoot();
    mkdirSync(path.join(root, ".kb"));
    writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
    resolveTo({ status: "ok", context: context(root) });
    state = "root_active_seeded";
    plugin = "python (kibi-plugin-python)";
    expect(await initCommand({})).toStrictEqual({ exitCode: 0 });
    expect(named("createManifestFile")).toStrictEqual([]);
    expect(logs).toStrictEqual([
      "✓ .kb/ directory already exists; completing missing infrastructure",
      ...DONE,
      "  Existing Kibi source knowledge was preserved.",
      "  Next: your repository already has seeded Kibi knowledge; continue working with your coding agent.",
      "  Suggested plugin: python (kibi-plugin-python)",
      DOCTOR,
    ]);
  });

  test("an existing workspace without a manifest gets one", async () => {
    const root = tempRoot();
    mkdirSync(path.join(root, ".kb"));
    resolveTo({ status: "ok", context: context(root) });
    state = "root_partial";
    await initCommand({});
    expect(named("createManifestFile")).toStrictEqual([
      [path.join(root, ".kb")],
    ]);
    expect(logs).toContain(
      "  Next: run 'kibi doctor' to repair degraded Kibi infrastructure before bootstrapping.",
    );
  });

  test("leaves a legacy configuration to kibi migrate", async () => {
    for (const kind of ["present", "malformed"]) {
      const root = tempRoot();
      calls.length = 0;
      logs = [];
      legacy = kind;
      resolveTo({ status: "ok", context: context(root) });
      expect(await initCommand({})).toStrictEqual({ exitCode: 0 });
      expect(named("createManifestFile")).toStrictEqual([]);
      expect(named("ensureSymbolsManifestFile")).toStrictEqual([]);
      expect(named("classifyActivation")).toStrictEqual([]);
      expect(named("updateGitIgnore")).toStrictEqual([[root]]);
      expect(logs).toStrictEqual([
        "! Legacy .kb/config.json found; left .kb/manifest.json and .kb/symbols.yaml to 'kibi migrate --yes', which moves the existing knowledge and runs every schema step.",
        ...DONE,
        "  Next: run 'kibi migrate --yes' to move the legacy knowledge into .kb/.",
        DOCTOR,
      ]);
      restores.pop()?.();
      restores.pop()?.();
    }
  });

  test("scaffolds the GitHub integration when asked", async () => {
    const root = tempRoot();
    resolveTo({ status: "ok", context: context(root) });
    await initCommand({ github: false });
    await initCommand({ github: true });
    await initCommand({ github: true, badgeOnly: true });
    expect(named("scaffoldGitHubIntegration")).toStrictEqual([
      [{ cwd: root, badgeOnly: false }],
      [{ cwd: root, badgeOnly: true }],
    ]);
  });

  test("reports a failure during setup", async () => {
    const root = tempRoot();
    resolveTo({ status: "ok", context: context(root) });
    failOn = "updateGitIgnore";
    expect(await initCommand({})).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([["Error during initialization:", failure]]);
  });
});

describe("initCommand hooks", () => {
  function noManager() {
    record(hookManagers, "detectHookManager", () => null);
  }

  test("installs nothing unless hooks are requested", async () => {
    const root = tempRoot();
    resolveTo({ status: "ok", context: context(root) });
    noManager();
    await initCommand({});
    await initCommand({ hooks: false });
    expect(named("detectHookManager")).toStrictEqual([]);
    expect(named("installGitHooks")).toStrictEqual([]);
  });

  test("installs into the repository's hooks directory", async () => {
    const root = tempRoot();
    const ctx = context(root, { hooksPathOrigin: "file:.git/config" });
    resolveTo({ status: "ok", context: ctx });
    noManager();
    expect(await initCommand({ hooks: true })).toStrictEqual({ exitCode: 0 });
    expect(named("detectHookManager")).toStrictEqual([
      [root, ctx.effectiveHooksDir, null],
    ]);
    expect(named("installGitHooks")).toStrictEqual([
      [ctx.effectiveHooksDir, { hooksPathOrigin: "file:.git/config" }],
    ]);
    expect(logs).toStrictEqual([...DONE, BOOTSTRAP, DOCTOR]);
  });

  test("names the shared hooks directory of a linked worktree", async () => {
    const root = tempRoot();
    const common = path.join(root, "main", ".git");
    mkdirSync(common, { recursive: true });
    const worktree = path.join(root, "wt");
    mkdirSync(worktree);
    const hooks = path.join(common, "hooks");
    for (const [hooksPathConfig, shared] of [
      [null, true],
      ["hooks", false],
    ] as const) {
      logs = [];
      resolveTo({
        status: "ok",
        context: context(worktree, {
          commonGitDir: common,
          effectiveHooksDir: hooks,
          isLinkedWorktree: true,
          hooksPathConfig,
        }),
      });
      noManager();
      await initCommand({ hooks: true });
      const line = `✓ Repository-common hooks directory shared with all worktrees (${hooks})`;
      expect(logs.includes(line)).toBe(shared);
      restores.pop()?.();
      restores.pop()?.();
      restores.pop()?.();
    }
  });

  test("defers to a hook manager and prints what it misses", async () => {
    const root = tempRoot();
    resolveTo({ status: "ok", context: context(root) });
    record(hookManagers, "detectHookManager", () => ({
      name: "husky",
      configPath: ".husky",
    }));
    const coverage = [
      [
        { hook: "pre-commit", missing: [] },
        { hook: "post-merge", missing: [] },
      ],
      [
        { hook: "pre-commit", missing: ["kibi check"] },
        { hook: "post-merge", missing: [] },
      ],
      [
        { hook: "pre-commit", missing: ["kibi check"] },
        { hook: "post-merge", missing: ["kibi sync"] },
      ],
    ];
    record(hookManagers, "hookManagerCoverage", () => coverage.shift());
    record(
      hookManagers,
      "hookManagerSnippet",
      (_name, hooks) => `SNIPPET ${(hooks as string[]).join("+")}`,
    );
    const owner = "Git hooks are managed by husky (.husky)";
    for (let i = 0; i < 3; i++) {
      logs = [];
      await initCommand({ hooks: true });
      expect(logs.slice(0, -4)).toStrictEqual(
        [
          [
            `✓ ${owner}, which already runs Kibi's hook commands; Kibi installed no hooks of its own.`,
          ],
          [
            `! ${owner}; Kibi installed no hooks of its own. .husky does not visibly run Kibi's commands for: pre-commit. Add this (running the same commands through a task runner or script works too), or Kibi enforcement stays OFF for those hooks:\n`,
            "SNIPPET pre-commit",
            "  Print it again with: kibi init --print-hook pre-commit --format husky",
          ],
          [
            `! ${owner}; Kibi installed no hooks of its own. .husky does not visibly run Kibi's commands for: pre-commit, post-merge. Add this (running the same commands through a task runner or script works too), or Kibi enforcement stays OFF for those hooks:\n`,
            "SNIPPET pre-commit+post-merge",
            "  Print it again with: kibi init --print-hook all --format husky",
          ],
        ][i],
      );
    }
    expect(named("hookManagerCoverage")).toStrictEqual([
      ["husky", root],
      ["husky", root],
      ["husky", root],
    ]);
    expect(named("hookManagerSnippet")).toStrictEqual([
      ["husky", ["pre-commit"]],
      ["husky", ["pre-commit", "post-merge"]],
    ]);
    expect(named("installGitHooks")).toStrictEqual([]);
  });
});

describe("initCommand hooks directory containment", () => {
  async function install(ctx: GitRepositoryContext): Promise<string> {
    calls.length = 0;
    errors = [];
    resolveTo({ status: "ok", context: ctx });
    record(hookManagers, "detectHookManager", () => null);
    await initCommand({ hooks: true });
    restores.pop()?.();
    restores.pop()?.();
    restores.pop()?.();
    if (named("installGitHooks").length === 1) return "installed";
    return errorLines()[0]?.startsWith("Warning: ") ? "refused" : "failed";
  }

  const refusal = (ctx: GitRepositoryContext, cause: string) => [
    `Warning: ${cause} (${ctx.effectiveHooksDir}); refusing to install hooks into unrelated directories. Kibi enforcement stays OFF for this repository until the hooks path is repository-managed.`,
  ];

  test("accepts hooks under the common Git directory or the worktree", async () => {
    const root = tempRoot();
    const other = tempRoot();
    mkdirSync(path.join(root, ".git"));
    const base = context(root, { worktreeRoot: other });
    expect(await install(base)).toBe("installed");
    expect(
      await install({ ...base, effectiveHooksDir: path.join(root, ".git") }),
    ).toBe("installed");
    expect(
      await install({
        ...base,
        effectiveHooksDir: path.join(other, "missing", "deeper", "hooks"),
      }),
    ).toBe("installed");
    expect(
      await install({
        ...base,
        effectiveHooksDir: path.join(root, ".git", "..x"),
      }),
    ).toBe("installed");
  });

  test("refuses hooks outside both roots", async () => {
    const root = tempRoot();
    const other = tempRoot();
    mkdirSync(path.join(root, ".git"));
    const parent = context(root, {
      worktreeRoot: other,
      effectiveHooksDir: root,
    });
    expect(await install(parent)).toBe("refused");
    expect(errorLines()).toStrictEqual(
      refusal(
        parent,
        "The Git hooks directory resolves outside this repository (for example through a symlink)",
      ),
    );
    const configured = { ...parent, hooksPathConfig: "/elsewhere" };
    expect(await install(configured)).toBe("refused");
    expect(errorLines()).toStrictEqual(
      refusal(configured, "core.hooksPath points outside this repository"),
    );
  });

  test("resolves a missing common directory by its real parent", async () => {
    const root = tempRoot();
    const other = tempRoot();
    mkdirSync(path.join(root, "hooks"));
    expect(
      await install(
        context(other, {
          commonGitDir: path.join(root, "missing-git"),
          effectiveHooksDir: path.join(root, "hooks"),
        }),
      ),
    ).toBe("refused");
  });

  test("treats a path through a file as missing", async () => {
    const root = tempRoot();
    writeFileSync(path.join(root, "file"), "x");
    expect(
      await install(
        context(root, { effectiveHooksDir: path.join(root, "file", "hooks") }),
      ),
    ).toBe("installed");
  });

  test("refuses a dangling symlink and any unresolvable root", async () => {
    const root = tempRoot();
    mkdirSync(path.join(root, ".git"));
    symlinkSync(path.join(root, "nowhere"), path.join(root, ".git", "link"));
    const dangling = context(root, {
      effectiveHooksDir: path.join(root, ".git", "link", "hooks"),
    });
    expect(await install(dangling)).toBe("refused");
    const good = path.join(root, ".git", "hooks");
    const bad = path.join(root, ".git", "link", "x");
    expect(
      await install(
        context(root, { commonGitDir: bad, effectiveHooksDir: good }),
      ),
    ).toBe("refused");
    expect(
      await install(
        context(root, { worktreeRoot: bad, effectiveHooksDir: good }),
      ),
    ).toBe("refused");
    expect(errorLines()).toHaveLength(1);
  });

  test("refuses when a path cannot be read", async () => {
    const root = tempRoot();
    mkdirSync(path.join(root, ".git", "hooks"), { recursive: true });
    const hooks = path.join(root, ".git", "hooks");
    const realNative = realpathSync.native;
    const realLstat = fs.lstatSync;
    let denyRealpath = "";
    let denyLstat = "";
    const deny = (code: string) => Object.assign(new Error(code), { code });
    track(
      spyOn(realpathSync, "native").mockImplementation(((p: string) => {
        if (p === denyRealpath) throw deny("EACCES");
        if (denyRealpath === "*") throw deny("ENOENT");
        return realNative(p);
      }) as never),
    );
    track(
      spyOn(fs, "lstatSync").mockImplementation(((p: string) => {
        if (p === denyLstat) throw deny("EACCES");
        if (denyLstat === "*") throw deny("ENOENT");
        if (denyLstat === "ENOTDIR") throw deny("ENOTDIR");
        return realLstat(p);
      }) as never),
    );
    denyRealpath = hooks;
    expect(await install(context(root))).toBe("refused");
    const missing = path.join(hooks, "missing");
    denyRealpath = "";
    denyLstat = missing;
    expect(await install(context(root, { effectiveHooksDir: missing }))).toBe(
      "refused",
    );
    denyLstat = "ENOTDIR";
    expect(await install(context(root, { effectiveHooksDir: missing }))).toBe(
      "installed",
    );
    denyRealpath = "*";
    denyLstat = "*";
    expect(await install(context(root))).toBe("refused");
  });
});
