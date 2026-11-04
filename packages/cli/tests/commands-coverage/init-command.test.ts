import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { initCommand } from "../../src/commands/init.js";
import * as activation from "../../src/operations/bootstrap/activation.js";
import * as gitContext from "../../src/utils/git-repository-context.js";
import {
  createGitWorkspace,
  git,
  isolateKibiEnv,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  mock.restore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function workspace(): string {
  restores.push(isolateKibiEnv());
  const root = createGitWorkspace("main");
  roots.push(root);
  return root;
}

function captureConsole(): { logs: string[]; errors: string[] } {
  const logs: string[] = [];
  const errors: string[] = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.join(" "));
  });
  return { logs, errors };
}

describe("initCommand --print-hook", () => {
  test("rejects an unknown hook", async () => {
    const io = captureConsole();
    const root = workspace();
    expect(
      await withCwd(root, () => initCommand({ printHook: "pre-push" })),
    ).toStrictEqual({ exitCode: 1 });
    expect(io.errors).toStrictEqual([
      "Error: unknown hook 'pre-push' for --print-hook. Expected one of: post-checkout, post-merge, post-rewrite, pre-commit, all.",
    ]);
  });

  test("prints one hook's shell snippet", async () => {
    const out: string[] = [];
    spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      out.push(String(chunk));
      return true;
    });
    const root = workspace();
    const result = await withCwd(root, () =>
      initCommand({ printHook: "post-merge" }),
    );
    mock.restore();
    expect(result).toStrictEqual({ exitCode: 0 });
    expect(out.join("")).toContain("sync");
  });
});

describe("initCommand repository refusals", () => {
  test("refuses when Git refuses to describe the directory", async () => {
    spyOn(gitContext, "resolveGitRepository").mockReturnValue({
      status: "git-refused",
      reason: "dubious ownership",
    } as never);
    const io = captureConsole();
    expect(await initCommand({})).toStrictEqual({ exitCode: 1 });
    expect(io.errors).toStrictEqual([
      "Error: dubious ownership",
      "Kibi cannot verify this directory's Git context; refusing to create workspace state.",
    ]);
  });

  test("refuses a checkout without a working tree", async () => {
    spyOn(gitContext, "resolveGitRepository").mockReturnValue({
      status: "unsupported",
      reason: "bare repository",
    } as never);
    const io = captureConsole();
    expect(await initCommand({})).toStrictEqual({ exitCode: 1 });
    expect(io.errors).toStrictEqual([
      "Error: bare repository",
      "Kibi requires a working-tree checkout; refusing to create workspace state.",
    ]);
  });
});

describe("initCommand setup paths", () => {
  test("leaves a legacy config to migrate", async () => {
    const root = workspace();
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "config.json"), "{}\n");
    const io = captureConsole();
    expect(await withCwd(root, () => initCommand({}))).toStrictEqual({
      exitCode: 0,
    });
    expect(io.logs).toContain(
      "! Legacy .kb/config.json found; left .kb/manifest.json and .kb/symbols.yaml to 'kibi migrate --yes', which moves the existing knowledge and runs every schema step.",
    );
  });

  test("suggests doctor for partially activated infrastructure", async () => {
    const root = workspace();
    spyOn(activation, "classifyActivation").mockResolvedValue({
      activationState: "root_partial",
    } as never);
    const io = captureConsole();
    await withCwd(root, () => initCommand({}));
    expect(io.logs).toContain(
      "  Next: run 'kibi doctor' to repair degraded Kibi infrastructure before bootstrapping.",
    );
  });

  test("refuses hooks when core.hooksPath points outside the repository", async () => {
    const root = workspace();
    const outside = mkdtempSync(path.join(os.tmpdir(), "kibi-outside-hooks-"));
    roots.push(outside);
    git(root, `config core.hooksPath ${outside}`);
    const io = captureConsole();
    await withCwd(root, () => initCommand({ hooks: true }));
    expect(io.errors).toContain(
      `Warning: core.hooksPath points outside this repository (${outside}); refusing to install hooks into unrelated directories. Kibi enforcement stays OFF for this repository until the hooks path is repository-managed.`,
    );
  });

  test("refuses hooks when the default hooks directory escapes through a symlink", async () => {
    const root = workspace();
    const outside = mkdtempSync(path.join(os.tmpdir(), "kibi-outside-hooks-"));
    roots.push(outside);
    removeTempDir(path.join(root, ".git", "hooks"));
    symlinkSync(outside, path.join(root, ".git", "hooks"));
    const io = captureConsole();
    await withCwd(root, () => initCommand({ hooks: true }));
    expect(
      io.errors.some((line) =>
        line.startsWith(
          "Warning: The Git hooks directory resolves outside this repository (for example through a symlink)",
        ),
      ),
    ).toBe(true);
  });

  test("notes the shared hooks directory in a linked worktree", async () => {
    const root = workspace();
    const linked = `${root}-linked`;
    roots.push(linked);
    git(root, `worktree add -q -b feature ${linked}`);
    const io = captureConsole();
    await withCwd(linked, () => initCommand({ hooks: true }));
    expect(
      io.logs.some((line) =>
        line.startsWith(
          "✓ Repository-common hooks directory shared with all worktrees (",
        ),
      ),
    ).toBe(true);
  });
});
