import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  detectHookManager,
  hookManagerCommands,
} from "../../src/commands/hook-managers.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

function root(): string {
  const dir = createTempDir("kibi-hook-managers-");
  roots.push(dir);
  return dir;
}

describe("hook manager detection and commands", () => {
  test("detects an uninstalled pre-commit framework configuration", () => {
    const dir = root();
    const hooks = path.join(dir, "hooks");
    mkdirSync(hooks);
    writeFileSync(path.join(dir, ".pre-commit-config.yaml"), "repos: []\n");
    expect(detectHookManager(dir, hooks)).toStrictEqual({
      name: "pre-commit",
      configPath: ".pre-commit-config.yaml",
    });
  });

  test("treats unparseable and non-mapping lefthook configs as not defining the hook", () => {
    const dir = root();
    writeFileSync(path.join(dir, "lefthook.yml"), "pre-commit: [unclosed\n");
    expect(hookManagerCommands("lefthook", dir, "pre-commit")).toBeNull();
    writeFileSync(path.join(dir, "lefthook.yml"), "- just\n- a list\n");
    expect(hookManagerCommands("lefthook", dir, "pre-commit")).toBeNull();
  });

  test("reads lefthook script commands that exist and skips missing ones", () => {
    const dir = root();
    writeFileSync(
      path.join(dir, "lefthook.yml"),
      [
        "pre-commit:",
        "  commands:",
        "    present:",
        "      script: run.sh",
        "    absent:",
        "      script: missing.sh",
        "",
      ].join("\n"),
    );
    const scriptDir = path.join(dir, ".lefthook", "pre-commit");
    mkdirSync(scriptDir, { recursive: true });
    writeFileSync(path.join(scriptDir, "run.sh"), "npx kibi check --staged\n");
    expect(hookManagerCommands("lefthook", dir, "pre-commit")).toStrictEqual([
      "npx kibi check --staged\n",
    ]);
  });
});
