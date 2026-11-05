import { spyOn } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";

/** Everything a user sees of a command: names, help text, arguments, options. */
export type CommandSurface = {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly description: string;
  readonly arguments: readonly unknown[];
  readonly options: readonly unknown[];
  readonly commands: readonly CommandSurface[];
};

export function commandSurface(command: Command): CommandSurface {
  return {
    name: command.name(),
    aliases: command.aliases(),
    description: command.description(),
    arguments: command.registeredArguments.map((argument) => ({
      name: argument.name(),
      description: argument.description,
      required: argument.required,
      variadic: argument.variadic,
      default: argument.defaultValue ?? null,
    })),
    options: command.options.map((option) => ({
      flags: option.flags,
      description: option.description,
      default: option.defaultValue ?? null,
      mandatory: option.mandatory,
    })),
    commands: command.commands.map(commandSurface),
  };
}

const GOLDEN_DIRECTORY = path.join(
  import.meta.dir,
  "..",
  "fixtures",
  "cli-surface",
);

/**
 * The committed surface of the commands `register` adds. Set
 * KIBI_UPDATE_CLI_SURFACE=1 to rewrite the golden file after an intended
 * change to the CLI.
 */
export function goldenSurface(
  name: string,
  register: (program: Command) => void,
): { actual: CommandSurface[]; expected: CommandSurface[] } {
  const program = new Command();
  register(program);
  const actual = program.commands.map(commandSurface);
  const file = path.join(GOLDEN_DIRECTORY, `${name}.json`);
  if (process.env.KIBI_UPDATE_CLI_SURFACE === "1")
    writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
  return { actual, expected: JSON.parse(readFileSync(file, "utf8")) };
}

/** A program with `register` applied that throws instead of exiting. */
export function programWith(register: (program: Command) => void): Command {
  const program = new Command().exitOverride();
  register(program);
  return program;
}

type Spy = { mock: { calls: unknown[][] }; mockRestore(): void };

/**
 * Replace each named export of `module` with a stub resolving to `result`.
 * The returned map holds the spies; `restore` puts the real exports back.
 */
export function stubExports(
  module: Record<string, unknown>,
  names: readonly string[],
  result: unknown = undefined,
): { spies: Record<string, Spy>; restore(): void } {
  const spies: Record<string, Spy> = {};
  for (const name of names) {
    spies[name] = spyOn(
      module as Record<string, (...args: unknown[]) => unknown>,
      name,
    ).mockImplementation(async () => result) as unknown as Spy;
  }
  return {
    spies,
    restore: () => {
      for (const spy of Object.values(spies)) spy.mockRestore();
    },
  };
}

/** Plain-data view of call arguments: commands become their names. */
export function plainCalls(spy: Spy): unknown[][] {
  return spy.mock.calls.map((args) =>
    args.map((arg) => {
      if (arg instanceof Command) return `<command ${arg.name()}>`;
      if (arg !== null && typeof arg === "object" && "command" in arg) {
        const { command, ...rest } = arg as { command: unknown };
        return {
          ...rest,
          command:
            command instanceof Command
              ? `<command ${command.name()}>`
              : command,
        };
      }
      return arg;
    }),
  );
}
