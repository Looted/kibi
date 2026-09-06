import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProgram,
  isCliEntrypoint,
  packageVersion,
  runCliIfEntrypoint,
} from "../src/cli.js";

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

  test("runCliIfEntrypoint skips or starts based on the injected flag", async () => {
    let started = 0;
    await runCliIfEntrypoint(false, async () => {
      started += 1;
      return undefined as never;
    });
    expect(started).toBe(0);
    await runCliIfEntrypoint(true, async () => {
      started += 1;
      return undefined as never;
    });
    expect(started).toBe(1);
    await runCliIfEntrypoint(false);
  });

  test("packageVersion falls back and isCliEntrypoint requires a matching argv path", () => {
    expect(packageVersion(null)).toBe("0.1.0");
    expect(packageVersion({ version: 12 })).toBe("0.1.0");
    expect(packageVersion({ version: "9.9.9" })).toBe("9.9.9");
    expect(isCliEntrypoint(undefined, import.meta.url)).toBe(false);
    const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    expect(isCliEntrypoint(cliPath, pathToFileURL(resolve(cliPath)).href)).toBe(
      true,
    );
    expect(buildProgram().name()).toBe("kibi");
  });
});
