import { findGapsSpec } from "../public/operations/index.js";
import {
  executeReportingSpec,
  printDiscoveryResult,
} from "./discovery-shared.js";

interface GapsOptions {
  missingRel?: string;
  presentRel?: string;
  tag?: string;
  source?: string;
  limit?: string;
  offset?: string;
  format?: "json" | "table";
}

// implements REQ-002, REQ-003
export async function gapsCommand(
  type: string | undefined,
  options: GapsOptions,
): Promise<void> {
  const result = await executeReportingSpec(findGapsSpec, {
    ...(type === undefined ? {} : { type }),
    missingRelationships: csvValues(options.missingRel),
    presentRelationships: csvValues(options.presentRel),
    tags: csvValues(options.tag),
    ...(options.source === undefined ? {} : { sourceFile: options.source }),
    limit: Number.parseInt(options.limit || "100", 10),
    offset: Number.parseInt(options.offset || "0", 10),
  });
  printDiscoveryResult(
    options.format,
    result.structuredContent,
    result.content[0]?.text ?? "No matching gaps found.",
  );
}

function csvValues(value?: string): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
