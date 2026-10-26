export const REPORT_FILTERS = [
  "all",
  "proved",
  "tested",
  "attention",
  "below_floor",
  "pending_reproof",
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
  "proved",
] as const;

export type ProofGateKey = (typeof PROOF_GATE_KEYS)[number];

export type RequirementView = Readonly<{
  text: string;
  states: readonly string[];
  earliestGate: ProofGateKey | "tested";
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
    proved: rows.filter((row) => row.states.includes("proved")).length,
    tested: rows.filter((row) => row.states.includes("tested")).length,
    attention: rows.filter((row) => row.states.includes("attention")).length,
    below_floor: rows.filter((row) => row.states.includes("below_floor"))
      .length,
    pending_reproof: rows.filter((row) =>
      row.states.includes("pending_reproof"),
    ).length,
    stale: rows.filter((row) => row.states.includes("stale")).length,
    contradiction: rows.filter((row) => row.states.includes("contradiction"))
      .length,
  };
}
