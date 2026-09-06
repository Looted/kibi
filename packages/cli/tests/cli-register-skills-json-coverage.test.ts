// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Command } from "commander";
import { registerJsonOnlyCommands } from "../src/cli-register-json.js";
import { registerSkillsCommands } from "../src/cli-register-skills.js";
import * as jsonCommand from "../src/cli-json-command.js";
import * as skills from "../src/commands/skills.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

describe("skills and JSON-only command registration", () => {
  test("skills commands take the human path and the --input JSON path", async () => {
    const list = spyOn(skills, "skillsListCommand").mockResolvedValue({
      exitCode: 0,
    } as never);
    const load = spyOn(skills, "skillsLoadCommand").mockResolvedValue({
      exitCode: 0,
    } as never);
    const read = spyOn(skills, "skillsReadCommand").mockResolvedValue({
      exitCode: 0,
    } as never);
    const validate = spyOn(skills, "skillsValidateCommand").mockResolvedValue({
      exitCode: 0,
    });
    const json = spyOn(jsonCommand, "runJsonInvocation").mockResolvedValue(
      undefined,
    );
    restores.push(() => {
      list.mockRestore();
      load.mockRestore();
      read.mockRestore();
      validate.mockRestore();
      json.mockRestore();
    });

    const parse = async (...args: string[]) => {
      const program = new Command();
      program.exitOverride();
      registerSkillsCommands(program);
      return program.parseAsync(args, { from: "user" });
    };

    await parse("skills", "list");
    await parse("skills", "list", "--input", "-");
    await parse("skills", "load", "kibi-usage");
    await parse("skills", "load", "kibi-usage", "--input", "-");
    await parse("skills", "read", "kibi-usage", "resources/workflows.md");
    await parse(
      "skills",
      "read",
      "kibi-usage",
      "resources/workflows.md",
      "--input",
      "-",
    );
    await parse("skills", "validate", "packages/runtime/src/skills/kibi-usage");
    expect(list).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
    expect(read).toHaveBeenCalled();
    expect(validate).toHaveBeenCalled();
    expect(json).toHaveBeenCalled();
  });

  test("JSON-only commands require --input and otherwise invoke the JSON runner", async () => {
    const json = spyOn(jsonCommand, "runJsonInvocation").mockResolvedValue(
      undefined,
    );
    restores.push(() => json.mockRestore());
    const previous = process.exitCode;
    const chunks: string[] = [];
    const write = spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    restores.push(() => write.mockRestore());
    try {
      const missing = new Command();
      missing.exitOverride();
      registerJsonOnlyCommands(missing);
      await missing.parseAsync(["upsert"], { from: "user" });
      expect(process.exitCode).toBe(2);
      expect(chunks.join("")).toContain("MISSING_INPUT");

      const program = new Command();
      program.exitOverride();
      registerJsonOnlyCommands(program);
      await program.parseAsync(["upsert", "--input", "-"], { from: "user" });
      expect(json).toHaveBeenCalled();
    } finally {
      process.exitCode = previous;
    }
  });
});
