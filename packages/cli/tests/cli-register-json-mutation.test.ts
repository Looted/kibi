import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { CLI_OPERATION_METADATA } from "../src/cli-operation-metadata";
import {
  UNLISTED_OPERATIONS,
  registerJsonOnlyCommands,
} from "../src/cli-register-json";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
  process.exitCode = 0;
});

function jsonOnlyProgram(): Command {
  const program = new Command().name("kibi").exitOverride();
  registerJsonOnlyCommands(program);
  return program;
}

describe("JSON-only commands", () => {
  test("kibi --help lists each command by its first sentence and leaves out the narrower routes", () => {
    const program = jsonOnlyProgram().configureHelp({ helpWidth: 1000 });
    const help = program.helpInformation();
    const upsert = program.commands.find(
      (command) => command.name() === "upsert",
    );
    const description = CLI_OPERATION_METADATA.find(
      (metadata) => metadata.name === "kb_upsert",
    )?.description as string;
    expect(upsert?.summary()).toBe(
      "Create or update one entity and its relationships.",
    );
    // The command's own help keeps the whole description.
    expect(upsert?.description()).toBe(description);
    expect(help).toMatch(
      /^ {2}upsert \[options\] +Create or update one entity and its relationships\.$/m,
    );
    expect(help).not.toContain(description);
    expect([...UNLISTED_OPERATIONS].sort()).toEqual([
      "kb_model_requirement",
      "kb_semantic_advisor",
      "kb_skills_list",
      "kb_skills_load",
      "kb_skills_read",
      "kb_suggest_predicates",
      "kb_validate_upsert",
    ]);
    for (const name of [
      "skills-list",
      "skills-load",
      "skills-read",
      "semantic-advisor",
      "model-requirement",
      "suggest-predicates",
      "validate-upsert",
    ]) {
      // Still registered and runnable, only not listed.
      expect(program.commands.some((command) => command.name() === name)).toBe(
        true,
      );
      expect(help).not.toMatch(new RegExp(`^  ${name} `, "m"));
    }
    for (const name of ["upsert", "delete", "model", "skill", "apply-plan"])
      expect(help).toMatch(new RegExp(`^  ${name} `, "m"));
  });

  test("commands with their own flags are not registered again as JSON-only", () => {
    const names = jsonOnlyProgram().commands.map((command) => command.name());
    const cliName = (operation: string) =>
      CLI_OPERATION_METADATA.find((metadata) => metadata.name === operation)
        ?.cliName;
    for (const operation of [
      "kb_query",
      "kb_search",
      "kb_status",
      "kb_find_gaps",
      "kb_coverage",
      "kb_graph",
      "kb_check",
    ]) {
      const name = cliName(operation);
      expect(name).toBeDefined();
      expect(names).not.toContain(name);
    }
    expect(names).toContain("plan-bootstrap");
  });

  test("a CLI name with a space becomes one dashed command with an --input and a --schema option", () => {
    const program = jsonOnlyProgram();
    const command = program.commands.find(
      (candidate) => candidate.name() === "skills-list",
    );
    expect(command).toBeDefined();
    expect(
      command?.options.map((option) => [option.long, option.description]),
    ).toEqual([
      ["--input", "JSON input file (use - for stdin)"],
      ["--schema", "Print the JSON input schema and exit"],
    ]);
  });

  test("--input hands the file to the JSON invocation instead of refusing", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-json-only-"));
    roots.push(root);
    const input = path.join(root, "input.json");
    fs.writeFileSync(input, "{ not json");
    const stderr = spyOn(process.stderr, "write").mockImplementation(
      () => true,
    );
    const stdout = spyOn(process.stdout, "write").mockImplementation(
      () => true,
    );
    let written = "";
    try {
      await jsonOnlyProgram().parseAsync(["plan-bootstrap", "--input", input], {
        from: "user",
      });
      written = [...stderr.mock.calls, ...stdout.mock.calls]
        .map((call) => String(call[0]))
        .join("");
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
    expect(written).not.toContain("MISSING_INPUT");
    expect(written).toContain("INVALID_JSON");
    expect(process.exitCode).toBe(2);
  });
});
