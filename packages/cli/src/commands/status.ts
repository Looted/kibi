import { executeOperation } from "../public/operations/runtime-types.js";
import { statusSpec } from "../public/operations/specs/discovery.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";
import { printSchemaMigrationHint } from "../utils/migrate-hint.js";
import { printDiscoveryResult } from "./discovery-shared.js";

interface StatusOptions {
  readonly format?: "json" | "table";
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  const result = await executeOperation(
    createCliRuntime(),
    statusSpec,
    {},
    { workspaceRoot: process.cwd() },
  );
  // JSON carries schemaStatus and migrationPlan; text says it in one line.
  if (options.format !== "json") printSchemaMigrationHint(process.cwd());
  printDiscoveryResult(
    options.format,
    result.structuredContent,
    result.content[0]?.text ?? "Status unavailable",
  );
}
