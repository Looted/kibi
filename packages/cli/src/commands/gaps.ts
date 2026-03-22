import { escapeAtom } from "../prolog/codec.js";
import {
  printDiscoveryResult,
  resolveCurrentKbPath,
  runJsonModuleQuery,
  withPrologProcess,
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
  await withPrologProcess(async (prolog) => {
    const kbPath = await resolveCurrentKbPath();
    const missing = csvToPrologList(options.missingRel);
    const present = csvToPrologList(options.presentRel);
    const tags = csvToPrologList(options.tag);
    const source = options.source ? `'${escapeAtom(options.source)}'` : "none";
    const limit = Number.parseInt(options.limit || "100", 10);
    const offset = Number.parseInt(options.offset || "0", 10);
    const typeArg = type ? `'${escapeAtom(type)}'` : "none";

    const result = await runJsonModuleQuery<Record<string, unknown>>(
      prolog,
      "discovery.pl",
      `discovery:find_gaps_json(${typeArg}, ${missing}, ${present}, ${tags}, ${source}, ${limit}, ${offset}, JsonString)`,
      "gaps query failed",
      kbPath,
    );

    printDiscoveryResult(
      options.format,
      result,
      `Found ${result.count ?? 0} gap rows.`,
    );
  });
}

function csvToPrologList(value?: string): string {
  if (!value?.trim()) {
    return "[]";
  }

  return `[${value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `'${escapeAtom(item)}'`)
    .join(",")}]`;
}
