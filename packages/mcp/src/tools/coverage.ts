import {
  type CoverageInput,
  type LegacyMigrationPlan,
  type RepairPlan,
  executeCoverage,
  type MigrationPlan,
} from "kibi-runtime";
import type { OperationContext } from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { createDiscoveryContext } from "./discovery-adapter.js";

type ReportingProlog = Pick<PrologProcess, "query">;

export type CoverageArgs = CoverageInput;

export interface CoverageResult {
  readonly content: readonly {
    readonly type: string;
    readonly text?: string;
  }[];
  structuredContent?: {
    readonly summary: Readonly<Record<string, number>>;
    readonly rows: readonly Readonly<Record<string, unknown>>[];
    readonly repairPlan?: RepairPlan;
    readonly legacyMigrationPlan?: LegacyMigrationPlan;
    readonly symbolRepairPlan?: Readonly<Record<string, unknown>>;
    readonly migrationPlan?: MigrationPlan;
    readonly meta?: Readonly<Record<string, unknown>>;
  };
}

// implements REQ-002, REQ-013
export async function handleKbCoverage(
  prolog: ReportingProlog,
  args: CoverageArgs,
  context?: OperationContext,
): Promise<CoverageResult> {
  return executeCoverage(
    { ...args },
    createDiscoveryContext(prolog as PrologProcess, context),
  );
}
