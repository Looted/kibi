import {
  executeOperation,
  searchSpec,
  VALID_ENTITY_TYPES,
} from "../public/operations/index.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";
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
  // implements REQ-003, REQ-kibi-operation-interface-parity
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
  const structured = result.structuredContent ?? { results: [], count: 0 };
  printDiscoveryResult(
    options.format,
    structured,
    result.content[0]?.text ?? `No search results for '${query}'.`,
  );
}
