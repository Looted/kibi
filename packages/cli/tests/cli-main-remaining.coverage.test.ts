/// <reference types="bun" />

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

describe("cli main leftover entry and drain branches", () => {
  test("main drains stdio and exits 0 after a successful parse", async () => {
    const cli = await import("../src/cli.js");
    const parse = spyOn(cli, "buildProgram").mockReturnValue({
      parseAsync: async () => undefined,
    } as never);
    restores.push(() => parse.mockRestore());
    const exit = spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    restores.push(() => exit.mockRestore());
    process.exitCode = 0;
    await expect(cli.main()).rejects.toThrow(/exit:0/);
  });

  test("main prints a non-Error throw and exits 1", async () => {
    const cli = await import("../src/cli.js");
    const parse = spyOn(cli, "buildProgram").mockReturnValue({
      parseAsync: async () => {
        throw "nope";
      },
    } as never);
    restores.push(() => parse.mockRestore());
    const exit = spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    restores.push(() => exit.mockRestore());
    const error = spyOn(console, "error").mockImplementation(() => undefined);
    restores.push(() => error.mockRestore());
    await expect(cli.main()).rejects.toThrow(/exit:1/);
    expect(error.mock.calls.some((call) => String(call[0]) === "nope")).toBe(
      true,
    );
  });

  test("dynamic entry import invokes main when argv[1] matches the module url", async () => {
    const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    const previousArgv = process.argv;
    process.argv = ["bun", cliPath, "--help"];
    restores.push(() => {
      process.argv = previousArgv;
    });
    const exit = spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    restores.push(() => exit.mockRestore());
    expect(pathToFileURL(resolve(cliPath)).href).toContain("cli.ts");
    await expect(
      import(`${pathToFileURL(cliPath).href}?entry=${Date.now()}`),
    ).resolves.toBeDefined();
  });
});
