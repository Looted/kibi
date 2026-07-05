import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const hookRunnerPath = fileURLToPath(
  new URL("../src/hook-runner.ts", import.meta.url),
);
describe("Codex hook runner CLI", () => {
  test("Given invalid JSON on stdin When invoked as script Then hook errors are reported", async () => {
    const hookRunner = Bun.spawn(["bun", hookRunnerPath], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    hookRunner.stdin.write("not json");
    hookRunner.stdin.end();

    const output = await new Response(hookRunner.stdout).text();
    const exitCode = await hookRunner.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain("Kibi hook runner error");
  });
});
