import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";

describe("CLI import purity", () => {
  test("imports the package root without parsing argv or exiting", () => {
    const cliUrl = new URL("../src/cli.ts", import.meta.url).href;
    const result = spawnSync(
      "bun",
      ["--eval", `await import(${JSON.stringify(cliUrl)}); console.log("imported");`],
      {
        cwd: path.resolve(import.meta.dir, "../../.."),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("imported\n");
    expect(result.stderr).toBe("");
  });
});
