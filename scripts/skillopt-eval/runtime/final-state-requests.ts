import { createHash } from "node:crypto";
import type { CatalogSkill } from "../catalog";

export interface FinalStateRequest {
  readonly tool: "kb_query" | "kb_status" | "kb_check" | "kb_coverage" | "kb_graph";
  readonly args: Readonly<Record<string, unknown>>;
}

export const DEFAULT_FINAL_STATE_REQUESTS: FinalStateRequest[] = [
  { tool: "kb_query", args: {} },
  { tool: "kb_check", args: {} },
  { tool: "kb_status", args: {} },
  { tool: "kb_coverage", args: { by: "req" } },
];

function fixtureSymbolId(taskId: string): string {
  const suffix = createHash("sha256").update(taskId).digest("hex").slice(0, 12).toUpperCase();
  return `SYM-FIXTURE-${suffix}`;
}

/**
 * Task-specific independent final-state evidence requests. The generated
 * coordinate repair objective must prove exact symbol readback, clean
 * validation, fresh status, unchanged graph, and symbol-scoped coverage with
 * passing rows included — requirement coverage cannot see the gap.
 */
// implements REQ-skillopt-codex-optimization
export function taskFinalStateRequests(
  taskId: string,
  hasExactMigrationContract: boolean,
): FinalStateRequest[] {
  if (hasExactMigrationContract) {
    const symbolId = fixtureSymbolId(taskId);
    return [
      { tool: "kb_query", args: { type: "symbol", id: symbolId } },
      { tool: "kb_check", args: {} },
      { tool: "kb_status", args: {} },
      { tool: "kb_graph", args: { seedIds: [symbolId] } },
      { tool: "kb_coverage", args: { by: "symbol", includePassing: true } },
    ];
  }
  return DEFAULT_FINAL_STATE_REQUESTS;
}

export type FinalStateSkill = CatalogSkill;
