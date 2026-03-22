import { escapeAtom } from "../prolog/codec.js";
import {
  printDiscoveryResult,
  resolveCurrentKbPath,
  runJsonModuleQuery,
  withPrologProcess,
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
  await withPrologProcess(async (prolog) => {
    const kbPath = await resolveCurrentKbPath();
    const by = options.by || "req";
    const tags = options.tag
      ? `[${options.tag
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => `'${escapeAtom(item)}'`)
          .join(",")}]`
      : "[]";
    const includePassing = options.includePassing ?? false;
    const includeTransitive = options.includeTransitive ?? true;
    const limit = Number.parseInt(options.limit || "100", 10);
    const offset = Number.parseInt(options.offset || "0", 10);

    const result = await runJsonModuleQuery<Record<string, unknown>>(
      prolog,
      "discovery.pl",
      `discovery:coverage_report_json('${by}', ${tags}, ${includePassing}, ${includeTransitive}, ${limit}, ${offset}, JsonString)`,
      "coverage query failed",
      kbPath,
    );

    const summary = (result.summary ?? {}) as Record<string, unknown>;
    printDiscoveryResult(
      options.format,
      result,
      `Coverage summary: ${summary.fullyCovered ?? 0} fully covered out of ${summary.total ?? 0}.`,
    );
  });
}
