import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import {
  registerJsonAliasGuard,
  resolveJsonFormat,
} from "../src/cli-json-alias.js";

describe("resolveJsonFormat", () => {
  test("turns --json into format json and drops the flag", () => {
    expect(
      resolveJsonFormat({ json: true, format: "table", limit: "5" }),
    ).toEqual({ format: "json", limit: "5" });
  });

  test("leaves the options alone without --json", () => {
    expect(resolveJsonFormat({ format: "table" })).toEqual({ format: "table" });
    expect(resolveJsonFormat({ json: false, format: "text" })).toEqual({
      format: "text",
    });
  });
});

describe("registerJsonAliasGuard", () => {
  function run(args: string[]): {
    ran: boolean;
    error?: string;
    code?: number;
  } {
    let ran = false;
    const program = new Command()
      .exitOverride()
      .configureOutput({ writeErr: () => undefined });
    program
      .command("show")
      .option("--format <format>", "Output format", "table")
      .option("--json", "Alias for --format json")
      .action(() => {
        ran = true;
      });
    program.command("plain").action(() => {
      ran = true;
    });
    registerJsonAliasGuard(program);
    try {
      program.parse(["node", "kibi", ...args]);
      return { ran };
    } catch (error) {
      const failure = error as { message: string; exitCode: number };
      return { ran, error: failure.message, code: failure.exitCode };
    }
  }

  test("refuses --json with an explicit non-json --format", () => {
    expect(run(["show", "--json", "--format", "table"])).toEqual({
      ran: false,
      error:
        "error: --json conflicts with --format table; pass only one of them",
      code: 2,
    });
  });

  test("allows --json alone, with --format json, and a default format", () => {
    expect(run(["show", "--json"])).toEqual({ ran: true });
    expect(run(["show", "--json", "--format", "json"])).toEqual({ ran: true });
    expect(run(["show", "--format", "table"])).toEqual({ ran: true });
    expect(run(["plain"])).toEqual({ ran: true });
  });
});
