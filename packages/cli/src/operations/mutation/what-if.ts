import { normalizeEntityId } from "../../prolog/codec.js";

// implements REQ-kibi-truthful-consistency
/** A contradiction or scenario-infeasibility witness the checker reports. */
export type ContradictionWitness = Readonly<
  {
    requirements: readonly string[];
    reason: string;
    status?: string;
    /** property | predicate | rule | scenario_feasibility */
    kind?: string;
  } & Record<string, unknown>
>;

// implements REQ-kibi-truthful-consistency
export type WhatIfAnalysis = Readonly<{
  after: readonly ContradictionWitness[];
  introduced: readonly ContradictionWitness[];
  removed: readonly ContradictionWitness[];
  unchanged: readonly ContradictionWitness[];
}>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function whatIfWitness(witness: Record<string, unknown>): ContradictionWitness {
  const { kind, ...rest } = witness;
  return {
    ...rest,
    requirements: Array.isArray(witness.requirements)
      ? witness.requirements.map((id) => normalizeEntityId(String(id)))
      : [],
    reason: text(witness.reason),
    status: text(witness.status) || "contradiction",
    ...(typeof kind === "string" ? { kind } : {}),
  };
}

function whatIfWitnesses(value: unknown): ContradictionWitness[] {
  return (Array.isArray(value) ? value.filter(isRecord) : []).map(
    whatIfWitness,
  );
}

/** The parsed JSON value, or undefined when `raw` is not JSON. */
function decodeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // Unreadable output: undefined, which the caller rejects.
  }
  return undefined;
}

// implements REQ-kibi-truthful-consistency
/**
 * Parse checks:what_if_analysis_json/2 output. The binding is a quoted Prolog
 * string, so the JSON may arrive encoded once more as a JSON string. A bare
 * witness array (the what_if_contradiction_witnesses_json/2 shape) carries no
 * current-KB baseline, so every witness in it is treated as introduced.
 * Returns null when the output cannot be read.
 */
export function parseWhatIfAnalysis(raw: unknown): WhatIfAnalysis | null {
  if (typeof raw !== "string") return null;
  const once = decodeJson(raw);
  const parsed = typeof once === "string" ? decodeJson(once) : once;
  if (Array.isArray(parsed)) {
    const after = whatIfWitnesses(parsed);
    return { after, introduced: after, removed: [], unchanged: [] };
  }
  if (!isRecord(parsed)) return null;
  return {
    after: whatIfWitnesses(parsed.after),
    introduced: whatIfWitnesses(parsed.introduced),
    removed: whatIfWitnesses(parsed.removed),
    unchanged: whatIfWitnesses(parsed.unchanged),
  };
}

// implements REQ-kibi-truthful-consistency
/** Blocking: a proven contradiction or an infeasible success scenario. */
export function isBlockingWitness(witness: ContradictionWitness): boolean {
  return witness.status === "contradiction" || witness.status === "infeasible";
}
