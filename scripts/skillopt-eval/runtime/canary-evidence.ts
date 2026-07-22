import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const CommandEventSchema = z.object({
  type: z.literal("item.completed"),
  item: z.object({
    type: z.literal("command_execution"),
    command: z.string(),
    aggregated_output: z.string(),
    exit_code: z.number().int(),
    status: z.literal("completed"),
  }),
});

export type CapabilityProbeEvidence = Readonly<{
  absolutePath: string;
  command: string;
  expectedOutput: string;
  sha256: string;
}>;

export class CanaryEvidenceError extends Error {
  readonly name = "CanaryEvidenceError";

  constructor(readonly kind: "missing_probe_execution" | "probe_changed") {
    super(kind);
  }
}

export async function sha256File(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

// implements REQ-skillopt-codex-optimization
export async function verifyCapabilityEvidence(
  events: readonly Readonly<Record<string, unknown>>[],
  probe: CapabilityProbeEvidence,
): Promise<void> {
  const commandEvents = events.flatMap((event) => {
    const parsed = CommandEventSchema.safeParse(event);
    return parsed.success ? [parsed.data] : [];
  });
  const matching = commandEvents.filter(
    ({ item }) =>
      item.command === probe.command &&
      item.aggregated_output === probe.expectedOutput &&
      item.exit_code === 0,
  );
  if (matching.length !== 1) {
    throw new CanaryEvidenceError("missing_probe_execution");
  }
  if ((await sha256File(probe.absolutePath)) !== probe.sha256) {
    throw new CanaryEvidenceError("probe_changed");
  }
}
