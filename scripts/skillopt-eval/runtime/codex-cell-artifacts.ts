import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CodexEpisodeReceipt } from "./codex-episode";

export async function readOptionalArtifact(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

// implements REQ-skillopt-codex-optimization
export async function persistCodexEpisode(
  directory: string,
  receipt: CodexEpisodeReceipt,
  content: Readonly<{
    transcript: string;
    stderr: string;
    brokerTrace: string;
    diagnosticReceipt: string;
    finalState: string;
  }>,
): Promise<string> {
  const normalizedEvents = receipt.evidenceIndex.events
    .map(({ sequence, event }) =>
      JSON.stringify({ sequence, type: event.type, payload: event.payload }),
    )
    .join("\n");
  await Promise.all([
    writeFile(join(directory, "raw-host.jsonl"), content.transcript, {
      mode: 0o600,
    }),
    writeFile(join(directory, "raw-stderr.log"), content.stderr, {
      mode: 0o600,
    }),
    writeFile(join(directory, "normalized-events.jsonl"), normalizedEvents, {
      mode: 0o600,
    }),
    writeFile(join(directory, "broker-trace.jsonl"), content.brokerTrace, {
      mode: 0o600,
    }),
    writeFile(
      join(directory, "diagnostic-receipt.jsonl"),
      content.diagnosticReceipt,
      { mode: 0o600 },
    ),
    writeFile(join(directory, "final-state.json"), content.finalState, {
      mode: 0o600,
    }),
    writeFile(
      join(directory, "evidence-index.json"),
      `${JSON.stringify(receipt.evidenceIndex)}\n`,
      { mode: 0o600 },
    ),
  ]);
  const receiptPath = join(directory, "episode-receipt.json");
  await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`, { mode: 0o600 });
  return receiptPath;
}
