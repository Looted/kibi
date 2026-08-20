export const REPORT_FILTERS = [
  "all",
  "proven",
  "attention",
  "stale",
  "contradiction",
] as const;

export type ReportFilter = (typeof REPORT_FILTERS)[number];

export const PROOF_GATE_KEYS = [
  "semantic",
  "scenario",
  "implementation",
  "e2e",
  "evidence",
] as const;

export type ProofGateKey = (typeof PROOF_GATE_KEYS)[number];

export type RequirementView = Readonly<{
  text: string;
  states: readonly string[];
  earliestGate: ProofGateKey | "proven";
}>;

export type ReportViewQuery = Readonly<{
  query: string;
  filter: ReportFilter;
  gate: ProofGateKey | "all";
}>;

// implements REQ-kibi-html-health-report
export function matchesReportView(
  row: RequirementView,
  view: ReportViewQuery,
): boolean {
  const query = view.query.trim().toLocaleLowerCase();
  const matchesFilter =
    view.filter === "all" || row.states.includes(view.filter);
  const matchesGate = view.gate === "all" || row.earliestGate === view.gate;
  const matchesQuery =
    query.length === 0 || row.text.toLocaleLowerCase().includes(query);
  return matchesFilter && matchesGate && matchesQuery;
}

// implements REQ-kibi-html-health-report
export function reportFilterCounts(
  rows: readonly RequirementView[],
): Readonly<Record<ReportFilter, number>> {
  return {
    all: rows.length,
    proven: rows.filter((row) => row.states.includes("proven")).length,
    attention: rows.filter((row) => row.states.includes("attention")).length,
    stale: rows.filter((row) => row.states.includes("stale")).length,
    contradiction: rows.filter((row) => row.states.includes("contradiction"))
      .length,
  };
}
