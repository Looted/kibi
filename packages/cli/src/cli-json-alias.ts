import type { Command } from "commander";

/**
 * `--json` is shorthand for `--format json`: fold it into `format` and drop
 * the flag before the options reach a command.
 */
export function resolveJsonFormat<
  T extends { format?: string; json?: boolean },
>(options: T): Omit<T, "json"> {
  const { json, ...rest } = options;
  return json === true
    ? ({ ...rest, format: "json" } as Omit<T, "json">)
    : rest;
}

/**
 * Refuse `--json` together with an explicit `--format` that is not json, so
 * neither flag silently wins.
 */
export function registerJsonAliasGuard(program: Command): void {
  program.hook("preAction", (_root, actionCommand) => {
    const options = actionCommand.opts<{ json?: boolean; format?: unknown }>();
    if (options.json !== true) return;
    if (actionCommand.getOptionValueSource("format") !== "cli") return;
    if (options.format === "json") return;
    actionCommand.error(
      `error: --json conflicts with --format ${String(options.format)}; pass only one of them`,
      { exitCode: 2, code: "kibi.jsonFormatConflict" },
    );
  });
}
