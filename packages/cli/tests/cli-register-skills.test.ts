// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Command } from "commander";
import * as jsonCommand from "../src/cli-json-command.js";
import { registerSkillsCommands } from "../src/cli-register-skills.js";
import * as skills from "../src/commands/skills.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

function program(): Command {
  const root = new Command().exitOverride();
  registerSkillsCommands(root);
  return root;
}

function describeCommand(command: Command) {
  return {
    name: command.name(),
    description: command.description(),
    arguments: command.registeredArguments.map((argument) => [
      argument.name(),
      argument.description,
      argument.required,
    ]),
    options: command.options.map((option) => [
      option.flags,
      option.description,
      option.defaultValue,
    ]),
  };
}

function spies() {
  const list = spyOn(skills, "skillsListCommand").mockResolvedValue(undefined);
  const load = spyOn(skills, "skillsLoadCommand").mockResolvedValue(undefined);
  const read = spyOn(skills, "skillsReadCommand").mockResolvedValue(undefined);
  const validate = spyOn(skills, "skillsValidateCommand").mockResolvedValue({
    exitCode: 3,
  });
  const json = spyOn(jsonCommand, "runJsonInvocation").mockResolvedValue(
    undefined,
  );
  restores.push(() => {
    for (const spy of [list, load, read, validate, json]) spy.mockRestore();
  });
  return { list, load, read, validate, json };
}

async function parse(...args: string[]): Promise<void> {
  await program().parseAsync(args, { from: "user" });
}

describe("registerSkillsCommands", () => {
  test("registers the skills group with its four subcommands", () => {
    const [group] = program().commands;
    expect(group?.name()).toBe("skills");
    expect(group?.description()).toBe("Manage bundled markdown skills");
    expect(group?.commands.map(describeCommand)).toStrictEqual([
      {
        name: "list",
        description: "List bundled markdown skills",
        arguments: [],
        options: [
          ["--input <path>", "JSON input file (use - for stdin)", undefined],
          ["--format <format>", "Output format: json|table", "table"],
        ],
      },
      {
        name: "load",
        description: "Load a bundled markdown skill",
        arguments: [["id", "Bundled skill ID", false]],
        options: [
          ["--input <path>", "JSON input file (use - for stdin)", undefined],
          ["--format <format>", "Output format: json|markdown", "markdown"],
        ],
      },
      {
        name: "read",
        description: "Read a declared bundled skill resource",
        arguments: [
          ["id", "Bundled skill ID", false],
          ["resource", "Declared resource path", false],
        ],
        options: [
          ["--input <path>", "JSON input file (use - for stdin)", undefined],
          ["--format <format>", "Output format: text|json", "text"],
        ],
      },
      {
        name: "validate",
        description: "Validate a bundled markdown skill path",
        arguments: [["path", "Skill bundle directory or SKILL.md path", true]],
        options: [["--format <format>", "Output format: json|table", "table"]],
      },
    ]);
  });

  test("without --input each command runs its human path", async () => {
    const spy = spies();
    await parse("skills", "list");
    await parse("skills", "load", "kibi-usage");
    await parse("skills", "load");
    await parse("skills", "read", "kibi-usage", "res.md");
    await parse("skills", "read");
    expect(spy.list.mock.calls).toStrictEqual([[{ format: "table" }]]);
    expect(spy.load.mock.calls).toStrictEqual([
      ["kibi-usage", { format: "markdown" }],
      ["", { format: "markdown" }],
    ]);
    expect(spy.read.mock.calls).toStrictEqual([
      ["kibi-usage", "res.md", { format: "text" }],
      ["", "", { format: "text" }],
    ]);
    expect(spy.json).not.toHaveBeenCalled();
  });

  test("with --input each command runs the JSON invocation", async () => {
    const spy = spies();
    await parse("skills", "list", "--input", "in.json");
    await parse("skills", "load", "kibi-usage", "--input", "-");
    await parse("skills", "read", "--input", "-");
    const invocations = spy.json.mock.calls.map(([invocation]) => ({
      ...invocation,
      command: invocation.command.name(),
    }));
    expect(invocations).toStrictEqual([
      {
        operationName: "kb_skills_list",
        inputPath: "in.json",
        command: "list",
      },
      {
        operationName: "kb_skills_load",
        inputPath: "-",
        command: "load",
        positionals: [{ name: "id", value: "kibi-usage" }],
      },
      {
        operationName: "kb_skills_read",
        inputPath: "-",
        command: "read",
        positionals: [
          { name: "id", value: undefined },
          { name: "resource", value: undefined },
        ],
      },
    ]);
    expect(spy.list).not.toHaveBeenCalled();
    expect(spy.load).not.toHaveBeenCalled();
    expect(spy.read).not.toHaveBeenCalled();
  });

  test("validate passes its path and options and sets the exit code", async () => {
    const spy = spies();
    await parse("skills", "validate", "some/dir", "--format", "json");
    expect(spy.validate.mock.calls).toStrictEqual([
      ["some/dir", { format: "json" }],
    ]);
    expect(process.exitCode).toBe(3);
  });
});
