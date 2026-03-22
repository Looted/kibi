import type { PrologProcess } from "kibi-cli/prolog";
import { runJsonModuleQuery } from "./core-module.js";

export type StatusArgs = Record<string, never>;

export interface StatusPayload {
  branch: string;
  snapshotId: string;
  syncedAt: string | null;
  dirty: boolean;
  syncState: string;
  kbPath?: string;
  lastSyncSource?: string;
}

export interface StatusResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: StatusPayload;
}

// implements REQ-002, REQ-013
export async function handleKbStatus(
  prolog: PrologProcess,
  _args: StatusArgs,
): Promise<StatusResult> {
  try {
    const payload = await runJsonModuleQuery<StatusPayload>(
      prolog,
      "status.pl",
      "status:kb_status_json(JsonString)",
      "Status execution",
    );

    return {
      content: [
        {
          type: "text",
          text: `Branch ${payload.branch} is ${payload.syncState} (snapshot ${payload.snapshotId}, dirty=${payload.dirty})`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Status execution failed: ${message}`);
  }
}
