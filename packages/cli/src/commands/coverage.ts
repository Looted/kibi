import { coverageSpec } from "../public/operations/index.js";
import {
  executeReportingSpec,
  printDiscoveryResult,
} from "./discovery-shared.js";

interface CoverageOptions {
  by?: "req" | "symbol" | "type";
  tag?: string;
  includePassing?: boolean;
  includeTransitive?: boolean;
  limit?: string;
  offset?: string;
  format?: "json" | "table";
}

// implements REQ-002, REQ-003
export async function coverageCommand(options: CoverageOptions): Promise<void> {
  const result = await executeReportingSpec(coverageSpec, {
    by: options.by ?? "req",
    tags: options.tag
      ? options.tag
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    includePassing: options.includePassing ?? false,
    includeTransitive: options.includeTransitive ?? true,
    limit: Number.parseInt(options.limit || "100", 10),
    offset: Number.parseInt(options.offset || "0", 10),
  });
  printDiscoveryResult(
    options.format,
    result.structuredContent,
    result.content[0]?.text ?? "Coverage summary unavailable.",
  );
}
