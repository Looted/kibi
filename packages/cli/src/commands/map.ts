import { executeOperation } from "../public/operations/runtime-types.js";
import { mapSpec } from "../public/operations/specs/discovery.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";
import { noteCliOperationCall } from "../usage-telemetry.js";
import { printDiscoveryResult } from "./discovery-shared.js";

export interface MapCommandOptions {
  readonly depth?: string;
  readonly adrs?: boolean;
  readonly maxBytes?: string;
  readonly format?: "json" | "table";
}

function parseOptionalInt(
  raw: string | undefined,
  label: string,
): number | undefined {
  if (raw === undefined) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${label}: '${raw}' must be an integer.`);
  }
  return parsed;
}

export async function mapCommand(
  domain: string | undefined,
  options: MapCommandOptions,
): Promise<void> {
  const depth = parseOptionalInt(options.depth, "--depth");
  const maxBytes = parseOptionalInt(options.maxBytes, "--max-bytes");
  const trimmedDomain = domain?.trim();
  const input = {
    ...(trimmedDomain ? { domain: trimmedDomain } : {}),
    ...(depth !== undefined ? { depth } : {}),
    ...(options.adrs !== undefined ? { includeAdrs: options.adrs } : {}),
    ...(maxBytes !== undefined ? { maxBytes } : {}),
  };

  const result = await executeOperation(
    createCliRuntime(),
    mapSpec,
    input,
    { workspaceRoot: process.cwd() },
  );
  noteCliOperationCall({ operation: "kb_map", result });
  const structured = result.structuredContent ?? {};
  printDiscoveryResult(
    options.format,
    structured,
    result.content[0]?.text ?? "",
  );
}
