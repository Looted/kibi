import {
  printDiscoveryResult,
  resolveCurrentKbPath,
  runJsonModuleQuery,
  withPrologProcess,
} from "./discovery-shared.js";

interface StatusOptions {
  format?: "json" | "table";
}

// implements REQ-002, REQ-003
export async function statusCommand(options: StatusOptions): Promise<void> {
  await withPrologProcess(async (prolog) => {
    const kbPath = await resolveCurrentKbPath();
    const result = await runJsonModuleQuery<Record<string, unknown>>(
      prolog,
      "status.pl",
      "status:kb_status_json(JsonString)",
      "status query failed",
      kbPath,
    );
    printDiscoveryResult(
      options.format,
      result,
      `Branch ${result.branch} is ${result.syncState} (dirty=${result.dirty})`,
    );
  });
}
