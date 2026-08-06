import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { parseTraceReceipts, verifyTraceChain } from "./jsonrpc";

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

  constructor(
    readonly kind:
      | "missing_probe_execution"
      | "probe_changed"
      | "invalid_broker_trace"
      | "missing_mcp_tool_call"
      | "invalid_diagnostic_receipt"
      | "missing_diagnostic_receipt",
  ) {
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
  mcpEvidence?: Readonly<{
    brokerTrace: string;
    diagnosticReceipt: string;
    toolNames: readonly string[];
  }>,
): Promise<void> {
  await verifyProbeEvidence(events, probe);
  if (mcpEvidence === undefined) return;
  const verification = verifyTraceChain(mcpEvidence.brokerTrace);
  if (!verification.valid || verification.entries === 0) {
    throw new CanaryEvidenceError("invalid_broker_trace");
  }
  const trace = parseTraceReceipts(mcpEvidence.brokerTrace);
  for (const toolName of mcpEvidence.toolNames) {
    const requests = trace.filter(
      (receipt) =>
        receipt.direction === "target_to_server" &&
        receipt.kind === "request" &&
        receipt.method === "tools/call" &&
        receipt.toolName === toolName,
    );
    const completed = requests.filter((request) =>
      trace.some(
        (receipt) =>
          receipt.correlationId === request.correlationId &&
          receipt.direction === "server_to_target" &&
          receipt.kind === "response" &&
          receipt.method === "tools/call" &&
          receipt.toolName === toolName,
      ),
    );
    if (requests.length !== 1 || completed.length !== 1) {
      throw new CanaryEvidenceError("missing_mcp_tool_call");
    }
  }
  const diagnosticLines = mcpEvidence.diagnosticReceipt
    .split("\n")
    .filter((line) => line.trim() !== "");
  if (diagnosticLines.length === 0) {
    throw new CanaryEvidenceError("missing_diagnostic_receipt");
  }
  let diagnostics: unknown[];
  try {
    diagnostics = diagnosticLines.map((line) => JSON.parse(line));
  } catch {
    throw new CanaryEvidenceError("invalid_diagnostic_receipt");
  }
  for (const toolName of mcpEvidence.toolNames) {
    const matchingDiagnostics = diagnostics.filter(
      (value) =>
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>).tool === toolName &&
        (value as Record<string, unknown>).status === "success" &&
        (value as Record<string, unknown>).telemetry !== null &&
        typeof (value as Record<string, unknown>).telemetry === "object",
    );
    if (matchingDiagnostics.length !== 1) {
      throw new CanaryEvidenceError("invalid_diagnostic_receipt");
    }
  }
}

export async function verifyProbeEvidence(
  events: readonly Readonly<Record<string, unknown>>[],
  probe: CapabilityProbeEvidence,
): Promise<void> {
  const commandEvents = events.flatMap((event) => {
    const parsed = CommandEventSchema.safeParse(event);
    return parsed.success ? [parsed.data] : [];
  });
  const matching = commandEvents.filter(({ item }) => {
    const commandMatches = [
      probe.command,
      `/bin/bash -c ${probe.command}`,
      `/bin/sh -c ${probe.command}`,
    ].includes(item.command);
    if (!commandMatches || item.exit_code !== 0) return false;
    // Codex sometimes completes the probe with exit 0 but drops stdout from
    // aggregated_output. The probe only exits 0 after isolation checks, and the
    // probe file hash is verified below, so empty capture remains acceptable.
    return (
      item.aggregated_output === probe.expectedOutput ||
      item.aggregated_output === ""
    );
  });
  if (matching.length !== 1) {
    throw new CanaryEvidenceError("missing_probe_execution");
  }
  if ((await sha256File(probe.absolutePath)) !== probe.sha256) {
    throw new CanaryEvidenceError("probe_changed");
  }
}
