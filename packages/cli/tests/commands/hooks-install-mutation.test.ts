import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import * as hookManagers from "../../src/commands/hook-managers.js";
import {
  KIBI_PREPARE_COMMAND,
  hasKibiPrepareScript,
  hooksInstallCommand,
  syncPrepareScript,
} from "../../src/commands/hooks-install.js";
import * as initHelpers from "../../src/commands/init-helpers.js";
import * as gitContext from "../../src/utils/git-repository-context.js";
import type { GitRepositoryContext } from "../../src/utils/git-repository-context.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];
let logs: string[] = [];

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

beforeEach(() => {
  logs = [];
  track(
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    }),
  );
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function tempRoot(): string {
  const root = realpathSync(createTempDir("kibi-hooks-install-"));
  roots.push(root);
  return root;
}

const pkg = (root: string) =>
  JSON.parse(readFileSync(path.join(root, "package.json")).toString());

function withPackage(content: string): string {
  const root = tempRoot();
  writeFileSync(path.join(root, "package.json"), content);
  return root;
}

describe("syncPrepareScript", () => {
  test("never creates a package.json", () => {
    const root = tempRoot();
    expect(syncPrepareScript(root, true)).toBe("no-package-json");
    expect(syncPrepareScript(root, false)).toBe("no-package-json");
    expect(existsSync(path.join(root, "package.json"))).toBe(false);
  });

  test("leaves a package.json it cannot parse", () => {
    for (const content of ["{", "[]", "null", "1"]) {
      const root = withPackage(content);
      expect(syncPrepareScript(root, true)).toBe("unreadable-package-json");
      expect(readFileSync(path.join(root, "package.json")).toString()).toBe(
        content,
      );
    }
  });

  test("adds the step to a missing or blank prepare script", () => {
    for (const scripts of [undefined, null, [], "x", {}, { prepare: " " }]) {
      const root = withPackage(
        `${JSON.stringify({ name: "x", scripts }, null, 2)}\n`,
      );
      expect(syncPrepareScript(root, true)).toBe("added");
      expect(pkg(root)).toStrictEqual({
        name: "x",
        scripts: { prepare: KIBI_PREPARE_COMMAND },
      });
    }
  });

  test("appends after an existing step and keeps the file layout", () => {
    const root = withPackage(
      '{\n\t"scripts": {\n\t\t"prepare": "husky",\n\t\t"test": "t"\n\t}\n}\n',
    );
    expect(syncPrepareScript(root, true)).toBe("appended");
    expect(readFileSync(path.join(root, "package.json")).toString()).toBe(
      `{\n\t"scripts": {\n\t\t"test": "t",\n\t\t"prepare": ${JSON.stringify(`husky && ${KIBI_PREPARE_COMMAND}`)}\n\t}\n}\n`,
    );
    expect(syncPrepareScript(root, true)).toBe("present");
  });

  test("recognizes every form of the step", () => {
    for (const prepare of [
      "kibi hooks install",
      "npx  kibi   hooks install --quiet",
      "kibi hooks  install",
      "node x.js && node -e \"spawn([b,'hooks', 'install'])\"",
    ]) {
      const root = withPackage(JSON.stringify({ scripts: { prepare } }));
      expect(syncPrepareScript(root, true)).toBe("present");
      expect(hasKibiPrepareScript(root)).toBe(true);
    }
    for (const prepare of ["xkibi hooks install", "kibi hooks installer"]) {
      const root = withPackage(JSON.stringify({ scripts: { prepare } }));
      expect(hasKibiPrepareScript(root)).toBe(false);
      expect(syncPrepareScript(root, false)).toBe("absent");
    }
  });

  test("removes only the Kibi step and drops an empty script", () => {
    const root = withPackage(
      JSON.stringify({
        scripts: {
          prepare: ` husky &&  && ${KIBI_PREPARE_COMMAND} && build `,
          test: "t",
        },
      }),
    );
    expect(syncPrepareScript(root, false)).toBe("removed");
    expect(pkg(root).scripts).toStrictEqual({
      test: "t",
      prepare: "husky && build",
    });
    expect(syncPrepareScript(root, false)).toBe("absent");
    const only = withPackage(
      JSON.stringify({ scripts: { prepare: "kibi hooks install", a: "b" } }),
    );
    expect(syncPrepareScript(only, false)).toBe("removed");
    expect(pkg(only)).toStrictEqual({ scripts: { a: "b" } });
  });

  test("a non-string prepare script counts as missing", () => {
    const root = withPackage(JSON.stringify({ scripts: { prepare: 1 } }));
    expect(syncPrepareScript(root, false)).toBe("absent");
    expect(syncPrepareScript(root, true)).toBe("added");
    expect(pkg(root).scripts).toStrictEqual({ prepare: KIBI_PREPARE_COMMAND });
  });
});

describe("hasKibiPrepareScript", () => {
  test("is false without a readable string prepare script", () => {
    expect(hasKibiPrepareScript(tempRoot())).toBe(false);
    for (const content of [
      "{",
      "null",
      "{}",
      '{"scripts":{"prepare":1}}',
      '{"scripts":{"prepare":["kibi hooks install"]}}',
    ]) {
      expect(hasKibiPrepareScript(withPackage(content))).toBe(false);
    }
  });
});

describe("hooksInstallCommand", () => {
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

  let cwd: string;
  let resolution: unknown;
  let manager: unknown;
  let managed: boolean;
  let installed: Array<{ hook: string; result: string }>;
  let installs: unknown[][];
  let detects: unknown[][];

  beforeEach(() => {
    cwd = tempRoot();
    resolution = { status: "not-a-repository" };
    manager = null;
    managed = true;
    installed = [];
    installs = [];
    detects = [];
    track(spyOn(process, "cwd").mockReturnValue(cwd));
    track(
      spyOn(gitContext, "resolveGitRepository").mockImplementation(((
        from: string,
      ) => {
        expect(from).toBe(cwd);
        return resolution;
      }) as never),
    );
    track(
      spyOn(hookManagers, "detectHookManager").mockImplementation(((
        ...args: unknown[]
      ) => {
        detects.push(args);
        return manager;
      }) as never),
    );
    track(
      spyOn(initHelpers, "isRepositoryManagedHooksDir").mockImplementation(
        () => managed,
      ),
    );
    track(
      spyOn(initHelpers, "installGitHooks").mockImplementation(((
        ...args: unknown[]
      ) => {
        installs.push(args);
        (args[1] as { log?: (m: string) => void }).log?.("note");
        return installed;
      }) as never),
    );
  });

  function initialized(overrides: Partial<GitRepositoryContext> = {}) {
    const ctx = context(cwd, overrides);
    mkdirSync(path.join(cwd, ".kb"));
    writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");
    resolution = { status: "ok", context: ctx };
    return ctx;
  }

  test("does nothing in CI when quiet, whatever the CI value", async () => {
    for (const CI of ["true", "1", "yes"]) {
      expect(await hooksInstallCommand({ quiet: true }, { CI })).toStrictEqual({
        exitCode: 0,
        outcome: "ci",
      });
    }
    for (const CI of [undefined, "", "0", "false"]) {
      expect((await hooksInstallCommand({ quiet: true }, { CI })).outcome).toBe(
        "not-a-repository",
      );
    }
    expect((await hooksInstallCommand({}, { CI: "true" })).outcome).toBe(
      "not-a-repository",
    );
    expect(logs).toStrictEqual(["No Git work tree here; no hooks to install."]);
  });

  test("reads the process environment by default", async () => {
    const previous = process.env.CI;
    try {
      process.env.CI = "true";
      expect((await hooksInstallCommand({ quiet: true })).outcome).toBe("ci");
    } finally {
      if (previous === undefined) Reflect.deleteProperty(process.env, "CI");
      else process.env.CI = previous;
    }
    expect(await hooksInstallCommand()).toStrictEqual({
      exitCode: 1,
      outcome: "not-a-repository",
    });
  });

  test("outside a work tree it fails unless quiet", async () => {
    expect(await hooksInstallCommand({}, {})).toStrictEqual({
      exitCode: 1,
      outcome: "not-a-repository",
    });
    expect(await hooksInstallCommand({ quiet: true }, {})).toStrictEqual({
      exitCode: 0,
      outcome: "not-a-repository",
    });
    expect(logs).toStrictEqual(["No Git work tree here; no hooks to install."]);
  });

  test("before kibi init it fails unless quiet", async () => {
    resolution = { status: "ok", context: context(cwd) };
    mkdirSync(path.join(cwd, ".kb"));
    expect(await hooksInstallCommand({}, {})).toStrictEqual({
      exitCode: 1,
      outcome: "not-initialized",
    });
    expect(await hooksInstallCommand({ quiet: true }, {})).toStrictEqual({
      exitCode: 0,
      outcome: "not-initialized",
    });
    expect(logs).toStrictEqual([
      "Kibi is not initialized in this repository; run 'kibi init' first.",
    ]);
    expect(detects).toStrictEqual([]);
  });

  test("leaves the hooks to a hook manager", async () => {
    const ctx = initialized({ hooksPathConfig: ".husky" });
    manager = { name: "husky", configPath: ".husky" };
    expect(await hooksInstallCommand({}, {})).toStrictEqual({
      exitCode: 0,
      outcome: "hook-manager",
    });
    expect(detects).toStrictEqual([[cwd, ctx.effectiveHooksDir, ".husky"]]);
    expect(logs).toStrictEqual([
      "Git hooks are managed by husky (.husky); Kibi installs none of its own. 'kibi doctor' checks that husky runs Kibi's commands.",
    ]);
    expect(installs).toStrictEqual([]);
  });

  test("refuses a hooks directory outside the repository", async () => {
    const ctx = initialized();
    managed = false;
    expect(await hooksInstallCommand({}, {})).toStrictEqual({
      exitCode: 1,
      outcome: "external-hooks-dir",
    });
    expect(await hooksInstallCommand({ quiet: true }, {})).toStrictEqual({
      exitCode: 0,
      outcome: "external-hooks-dir",
    });
    expect(logs).toStrictEqual([
      `The Git hooks directory resolves outside this repository (${ctx.effectiveHooksDir}); Kibi installs no hooks there.`,
    ]);
    expect(installs).toStrictEqual([]);
  });

  test("installs with the normal notes when not quiet", async () => {
    const ctx = initialized({ hooksPathOrigin: "local" });
    installed = [{ hook: "pre-commit", result: "installed" }];
    expect(await hooksInstallCommand({}, {})).toStrictEqual({
      exitCode: 0,
      outcome: "installed",
    });
    expect(installs).toStrictEqual([
      [ctx.effectiveHooksDir, { hooksPathOrigin: "local" }],
    ]);
    expect(logs).toStrictEqual([]);
  });

  test("quiet installs print one line naming only new hooks", async () => {
    initialized();
    installed = [
      { hook: "post-merge", result: "installed" },
      { hook: "pre-commit", result: "updated" },
      { hook: "post-checkout", result: "installed" },
    ];
    expect(await hooksInstallCommand({ quiet: true }, {})).toStrictEqual({
      exitCode: 0,
      outcome: "installed",
    });
    expect(logs).toStrictEqual([
      "kibi: installed git hooks (post-merge, post-checkout)",
    ]);
    const [, options] = installs[0] as [string, { log: () => unknown }];
    expect(options.log()).toBeUndefined();
    logs = [];
    installed = [{ hook: "pre-commit", result: "unchanged" }];
    await hooksInstallCommand({ quiet: true }, {});
    expect(logs).toStrictEqual([]);
  });
});
