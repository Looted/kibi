import type { Command } from "commander";
import { InputError } from "./cli-errors.js";
import { loadInput } from "./cli-input.js";
import { loadOperationSpec } from "./cli-operation-loader.js";
import { executeOperation as executeProtocolOperation } from "./cli-protocol.js";
import { prepareOperationInput } from "./cli-validate.js";
import { appendCliDiagnosticUsage } from "./public/diagnostic-usage.js";
import type { OperationName } from "./public/operations/types.js";
import { createCliRuntime } from "./runtime/cli-runtime.js";

// implements REQ-kibi-operation-interface-parity
export type JsonInvocation = {
  readonly operationName: OperationName;
  readonly inputPath: string;
  readonly command: Command;
  readonly positionals?: readonly {
    readonly name: string;
    readonly value: string | undefined;
  }[];
};

function writeInputError(error: InputError): void {
  process.stderr.write(`Error [${error.code}]: ${error.detail}\n`);
  process.exitCode = error.exitCode;
}

function findInputConflicts(invocation: JsonInvocation): string[] {
  const optionConflicts = invocation.command.options.flatMap((option) => {
    const name = option.attributeName();
    if (
      name === "input" ||
      invocation.command.getOptionValueSource(name) !== "cli"
    ) {
      return [];
    }
    return option.long === undefined ? [] : [option.long];
  });
  const positionalConflicts = (invocation.positionals ?? [])
    .filter(({ value }) => value !== undefined)
    .map(({ name }) => name);
  return [...positionalConflicts, ...optionConflicts];
}

function diagnosticModeEnabled(command: Command): boolean {
  return (
    process.env.KIBI_CLI_DIAGNOSTIC_MODE === "1" ||
    process.argv.includes("--diagnostic-mode") ||
    command.optsWithGlobals().diagnosticMode === true
  );
}

function structuredResult(stdout: string | undefined): unknown {
  if (stdout === undefined) return undefined;
  try {
    return JSON.parse(stdout);
  } catch {
    return undefined;
  }
}

// implements REQ-kibi-operation-interface-parity
export async function runJsonInvocation(
  invocation: JsonInvocation,
): Promise<void> {
  const startedAt = new Date();
  const diagnostic = diagnosticModeEnabled(invocation.command);
  const workspaceRoot = process.cwd();
  const spec = await loadOperationSpec(invocation.operationName);
  const conflicts = findInputConflicts(invocation);
  if (conflicts.length > 0) {
    const error = new InputError(
      "CONFLICTING_INPUT",
      `--input cannot be combined with: ${conflicts.join(", ")}`,
    );
    if (diagnostic) {
      appendCliDiagnosticUsage({
        workspaceRoot,
        tool: invocation.operationName,
        businessArgs: {},
        telemetry: null,
        startedAt,
        status: "error",
        error: error.detail,
      });
    }
    writeInputError(error);
    return;
  }

  let input: unknown;
  try {
    input = await loadInput({
      input: invocation.inputPath,
      cwd: process.cwd(),
    });
  } catch (error) {
    if (error instanceof InputError) {
      if (diagnostic) {
        appendCliDiagnosticUsage({
          workspaceRoot,
          tool: invocation.operationName,
          businessArgs: {},
          telemetry: null,
          startedAt,
          status: "error",
          error: error.detail,
        });
      }
      writeInputError(error);
      return;
    }
    throw error;
  }

  const prepared = prepareOperationInput(input, spec.businessInputSchema);
  const businessArgs = prepared.valid ? prepared.businessInput : {};
  const telemetry = prepared.valid ? (prepared.telemetry ?? null) : null;
  const runtime = createCliRuntime({ workspaceRoot });
  let result: Awaited<ReturnType<typeof executeProtocolOperation>>;
  try {
    const context = await runtime.open(spec, { workspaceRoot });
    result = await executeProtocolOperation(
      invocation.operationName,
      input,
      context,
    );
    if (result.exitCode === 0 && spec.effects.includes("kb-write")) {
      await runtime.afterSuccess(spec, context);
    }
    await runtime.close(context, {
      status: "success",
      result,
    });
  } catch (error) {
    if (diagnostic) {
      appendCliDiagnosticUsage({
        workspaceRoot,
        tool: invocation.operationName,
        businessArgs,
        telemetry,
        startedAt,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
  if (diagnostic) {
    appendCliDiagnosticUsage({
      workspaceRoot,
      tool: invocation.operationName,
      businessArgs,
      telemetry,
      startedAt,
      status: result.exitCode === 0 ? "success" : "error",
      result: structuredResult(result.stdout),
      ...(result.exitCode === 0 || result.stderr === undefined
        ? {}
        : { error: result.stderr.trim() }),
    });
  }
  if (result.stdout !== undefined) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr !== undefined) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.exitCode;
}
