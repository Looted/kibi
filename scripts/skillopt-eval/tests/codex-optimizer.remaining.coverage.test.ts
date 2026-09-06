// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultCodexLoginRun } from "../runtime/codex-optimizer";

const roots: string[] = [];
const previousExitCode = process.exitCode;

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
  if (typeof previousExitCode === "number") process.exitCode = previousExitCode;
  else if (typeof process.exitCode === "number") process.exitCode = 0;
});

describe("defaultCodexLoginRun leftover auth callback", () => {
  test("runs a bounded echo process in the source worktree", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "skillopt-codex-login-"));
    roots.push(cwd);
    const result = await defaultCodexLoginRun(["echo", "login-ok"], process.env, cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("login-ok");
    expect(result.argv).toEqual(["echo", "login-ok"]);
  });
});
