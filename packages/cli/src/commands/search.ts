import { VALID_ENTITY_TYPES } from "../public/operations/discovery-entities.js";
import { executeOperation } from "../public/operations/runtime-types.js";
import { searchSpec } from "../public/operations/specs/discovery.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";
import { noteCliOperationCall } from "../usage-telemetry.js";
import { printDiscoveryResult } from "./discovery-shared.js";

interface SearchOptions {
  readonly type?: string;
  readonly format?: "json" | "table";
  readonly limit?: string;
  readonly offset?: string;
}

export async function searchCommand(
  query: string | undefined,
  options: SearchOptions,
): Promise<void> {
  if (!query?.trim()) {
    console.error("Error: search query is required");
    process.exitCode = 1;
    return;
  }
  if (
    options.type &&
    !VALID_ENTITY_TYPES.some((candidate) => candidate === options.type)
  ) {
    console.error(
      `Error: invalid type '${options.type}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  const result = await executeOperation(
    createCliRuntime(),
    searchSpec,
    {
      query,
      ...(options.type !== undefined ? { type: options.type } : {}),
      limit: Number.parseInt(options.limit || "20", 10),
      offset: Number.parseInt(options.offset || "0", 10),
    },
    { workspaceRoot: process.cwd() },
  );
  noteCliOperationCall({ operation: "kb_search", result });
  const structured = result.structuredContent ?? { results: [], count: 0 };
  printDiscoveryResult(
    options.format,
    structured,
    result.content[0]?.text ?? `No search results for '${query}'.`,
  );
}
