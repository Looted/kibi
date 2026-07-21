import { executeOperation, statusSpec } from "../public/operations/index.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";
import { printDiscoveryResult } from "./discovery-shared.js";

interface StatusOptions {
  readonly format?: "json" | "table";
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  // implements REQ-003, REQ-kibi-operation-interface-parity
  const result = await executeOperation(
    createCliRuntime(),
    statusSpec,
    {},
    { workspaceRoot: process.cwd() },
  );
  printDiscoveryResult(
    options.format,
    result.structuredContent,
    result.content[0]?.text ?? "Status unavailable",
  );
}
