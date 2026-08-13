import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { executeIngestVerification } from "../operations/verification/ingest-verification.js";
import { loadEntities } from "../public/operations/discovery-entities.js";
import type { OperationContext } from "../public/operations/runtime-types.js";
import { ingestVerificationSpec } from "../public/operations/specs/verification.js";
import { readWorkspaceSnapshot } from "../public/operations/workspace-snapshot.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";

// implements REQ-kibi-verification-evidence-contract
export type VerifyCommandOptions = Readonly<{
  testId: string;
  workspaceRoot?: string;
  outputPath?: string;
}>;

function safeText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`verify: ${label} must be non-empty`);
  }
  return value.trim();
}

function contractCommand(test: Record<string, unknown>): string[] {
  const contract = test.verification_contract;
  if (
    contract === null ||
    typeof contract !== "object" ||
    Array.isArray(contract) ||
    !Array.isArray((contract as Record<string, unknown>).command_argv)
  ) {
    throw new Error("verify: test has no verification contract command_argv");
  }
  return ((contract as Record<string, unknown>).command_argv as unknown[]).map(
    String,
  );
}

function environmentHash(commandArgv: readonly string[]): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        lockfile: process.env.KIBI_LOCKFILE_DIGEST ?? "unknown",
        projects: commandArgv
          .flatMap((value, index) =>
            value === "--project" ? [commandArgv[index + 1] ?? ""] : [],
          )
          .sort(),
      }),
    )
    .digest("hex");
}

async function runChild(
  commandArgv: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<number> {
  const [command, ...args] = commandArgv;
  if (!command) throw new Error("verify: command argv must be non-empty");
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

async function contextTest(
  context: OperationContext,
  testId: string,
): Promise<Record<string, unknown>> {
  if (!context.prolog) throw new Error("verify: Prolog runtime is required");
  const entities = await loadEntities(context.prolog, {
    id: testId,
    type: "test",
  });
  const test = entities[0];
  if (!test) throw new Error(`verify: test ${testId} was not found`);
  return test;
}

/** Execute an explicit command and feed its raw reporter artifact to ingest. */
// implements REQ-kibi-verification-evidence-contract
export async function verifyCommand(
  options: VerifyCommandOptions,
  commandArgv: readonly string[],
): Promise<{ exitCode: number }> {
  const testId = safeText(options.testId, "--test-id");
  if (commandArgv.length === 0) {
    throw new Error("verify: an explicit command is required after --");
  }
  const runtime = createCliRuntime(
    options.workspaceRoot === undefined
      ? {}
      : { workspaceRoot: options.workspaceRoot },
  );
  const context = await runtime.open(ingestVerificationSpec, {
    ...(options.workspaceRoot === undefined
      ? {}
      : { workspaceRoot: options.workspaceRoot }),
  });
  let runnerExitCode = 1;
  let completed = false;
  try {
    const test = await contextTest(context, testId);
    const expectedCommand = contractCommand(test);
    if (
      expectedCommand.length !== commandArgv.length ||
      expectedCommand.some((value, index) => value !== commandArgv[index])
    ) {
      throw new Error(
        `verify: command does not match the verification contract for ${testId}`,
      );
    }
    const before = await readWorkspaceSnapshot(context);
    if (!before.available) throw new Error(`verify: ${before.error}`);
    const outputPath = path.resolve(
      options.outputPath ??
        path.join(
          context.workspaceRoot,
          ".kb",
          "verification",
          `${testId}.json`,
        ),
    );
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      KIBI_VERIFICATION_OUTPUT: outputPath,
      KIBI_VERIFICATION_SNAPSHOT: before.snapshot.hash,
      KIBI_VERIFICATION_COMMAND_ARGV: JSON.stringify(commandArgv),
      KIBI_VERIFICATION_PROJECTS: commandArgv
        .flatMap((value, index) =>
          value === "--project" ? [commandArgv[index + 1] ?? ""] : [],
        )
        .join(","),
      KIBI_LOCKFILE_DIGEST: environmentHash(commandArgv),
    };
    runnerExitCode = await runChild(commandArgv, context.workspaceRoot, env);
    let artifact: Record<string, unknown>;
    try {
      artifact = JSON.parse(await readFile(outputPath, "utf8")) as Record<
        string,
        unknown
      >;
    } catch {
      throw new Error(
        `verify: reporter artifact is missing or invalid at ${outputPath}`,
      );
    }
    artifact.process_exit_code = runnerExitCode;
    await writeFile(
      outputPath,
      `${JSON.stringify(artifact, null, 2)}\n`,
      "utf8",
    );
    const ingested = await executeIngestVerification(
      { testId, snapshot: before.snapshot.hash, artifact },
      context,
    );
    await runtime.afterSuccess(ingestVerificationSpec, context);
    process.stdout.write(`${JSON.stringify(ingested.structuredContent)}\n`);
    completed = true;
    return { exitCode: runnerExitCode };
  } finally {
    await runtime.close(
      context,
      completed
        ? { status: "success", result: runnerExitCode }
        : { status: "error", error: runnerExitCode },
    );
  }
}
