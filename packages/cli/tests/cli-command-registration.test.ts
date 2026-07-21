import { describe, expect, test } from "bun:test";
import { buildProgram } from "../src/cli.js";

const JSON_COMMANDS = [
  "query",
  "search",
  "status",
  "skills-list",
  "skills-load",
  "skills-read",
  "find-gaps",
  "coverage",
  "graph",
  "sparql-remote",
  "semantic-advisor",
  "upsert",
  "validate-upsert",
  "delete",
  "check",
  "model-requirement",
  "suggest-predicates",
  "autopilot-generate",
] as const;

describe("buildProgram", () => {
  test("registers all 18 catalog JSON routes with --input", () => {
    const program = buildProgram();

    const registered = JSON_COMMANDS.filter((name) => {
      const command = program.commands.find((candidate) => candidate.name() === name);
      return command?.options.some((option) => option.long === "--input") ?? false;
    });

    expect(registered).toEqual(Array.from(JSON_COMMANDS));
  });

  test("keeps gaps as a compatibility command", () => {
    const program = buildProgram();

    expect(program.commands.some((command) => command.name() === "gaps")).toBe(
      true,
    );
  });

  test("uses catalog descriptions in JSON command help", () => {
    const program = buildProgram();
    const status = program.commands.find((command) => command.name() === "status");

    expect(status?.description()).toContain("freshness metadata");
    expect(status?.helpInformation()).toContain("--input <path>");
  });
});
