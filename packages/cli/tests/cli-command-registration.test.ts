import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { loadOperationSpec } from "../src/cli-operation-loader.js";
import { CLI_OPERATION_METADATA } from "../src/cli-operation-metadata.js";
import { buildProgram } from "../src/cli.js";
import type { OperationName } from "../src/public/operations/types.js";

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
  "plan-bootstrap",
] as const;

describe("buildProgram", () => {
  test("registers all 21 catalog JSON routes with --input", () => {
    const program = buildProgram();

    const registered = JSON_COMMANDS.filter((name) => {
      const command = program.commands.find(
        (candidate) => candidate.name() === name,
      );
      return (
        command?.options.some((option) => option.long === "--input") ?? false
      );
    });

    expect(registered).toEqual(Array.from(JSON_COMMANDS));
  });

  test("keeps gaps as the Commander alias of find-gaps", () => {
    const program = buildProgram();
    const findGaps = program.commands.find(
      (command) => command.name() === "find-gaps",
    );

    expect(findGaps?.aliases()).toContain("gaps");
    expect(findGaps?.options.some((option) => option.long === "--input")).toBe(
      true,
    );
  });

  test("uses catalog descriptions in JSON command help", () => {
    const program = buildProgram();
    const status = program.commands.find(
      (command) => command.name() === "status",
    );

    expect(status?.description()).toContain("freshness metadata");
    expect(status?.helpInformation()).toContain("--input <path>");
  });

  test("registers diagnostic mode and read-only remediation reporting", () => {
    const program = buildProgram();

    expect(
      program.options.some((option) => option.long === "--diagnostic-mode"),
    ).toBe(true);
    expect(
      program.commands.some(
        (command) => command.name() === "usage-remediation",
      ),
    ).toBe(true);
  });

  test("registers CLI-only prove orchestration with selectors", () => {
    const program = buildProgram();
    const prove = program.commands.find(
      (command) => command.name() === "prove",
    );

    expect(prove).toBeDefined();
    expect(prove?.options.some((option) => option.long === "--test")).toBe(
      true,
    );
    expect(
      prove?.options.some((option) => option.long === "--requirement"),
    ).toBe(true);
    expect(
      prove?.options.some((option) => option.long === "--integration"),
    ).toBe(true);
    expect(prove?.options.some((option) => option.long === "--all")).toBe(true);

    const proof = program.commands.find(
      (command) => command.name() === "proof",
    );
    expect(proof).toBeDefined();
  });

  afterEach(() => {
    process.exitCode = 0;
  });

  test("registers --schema on every catalog route including all 7 integrated commands", () => {
    const program = buildProgram();

    const missingSchema = CLI_OPERATION_METADATA.map((metadata) =>
      metadata.cliName.replaceAll(" ", "-"),
    ).filter((name) => {
      const command = program.commands.find(
        (candidate) => candidate.name() === name,
      );
      return !(
        command?.options.some((option) => option.long === "--schema") ?? false
      );
    });

    expect(missingSchema).toEqual([]);
  });

  test("all 7 integrated operations accept --schema without positional args and print their businessInputSchema", async () => {
    const integrated: readonly [string, OperationName][] = [
      ["query", "kb_query"],
      ["search", "kb_search"],
      ["status", "kb_status"],
      ["find-gaps", "kb_find_gaps"],
      ["coverage", "kb_coverage"],
      ["graph", "kb_graph"],
      ["check", "kb_check"],
    ];

    for (const [commandName, operationName] of integrated) {
      const spec = await loadOperationSpec(operationName);
      const writes: string[] = [];
      const stdout = spyOn(process.stdout, "write").mockImplementation(
        (chunk: unknown) => {
          writes.push(String(chunk));
          return true;
        },
      );
      const stderr = spyOn(process.stderr, "write").mockImplementation(
        () => true,
      );
      try {
        await buildProgram()
          .exitOverride()
          .parseAsync([commandName, "--schema"], { from: "user" });
      } finally {
        stdout.mockRestore();
        stderr.mockRestore();
      }
      expect(JSON.parse(writes.join(""))).toEqual(spec.businessInputSchema);
      expect(process.exitCode).toBe(0);
    }
  });

  test("registers --json on every command whose --format accepts json and omits it on init", () => {
    const program = buildProgram();

    const allCommands = (parent: ReturnType<typeof buildProgram>) => {
      const result: Array<{ path: string; command: typeof parent }> = [];
      const walk = (cmd: typeof parent, prefix: string[]) => {
        for (const sub of cmd.commands) {
          const next = [...prefix, sub.name()];
          result.push({ path: next.join(" "), command: sub });
          walk(sub, next);
        }
      };
      walk(parent, []);
      return result;
    };

    const withFormat = allCommands(program).filter(({ command }) =>
      command.options.some((option) => option.long === "--format"),
    );

    for (const { path, command } of withFormat) {
      const formatOption = command.options.find(
        (option) => option.long === "--format",
      );
      const hasJson = command.options.some(
        (option) => option.long === "--json",
      );
      if (path === "init") {
        expect(hasJson).toBe(false);
      } else {
        expect(formatOption?.description.toLowerCase()).toContain("json");
        expect(hasJson).toBe(true);
      }
    }
  });
});
