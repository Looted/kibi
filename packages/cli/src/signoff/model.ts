/**
 * Requirement signoff views. A person signs off requirements at two moments:
 * mid-work, when the agent asks them to confirm rules before recording them
 * (questions), and at the end of the work, before the commit (summary). Both
 * views are one JSON document that every host renders: the CLI prints it as a
 * fenced Markdown block or a self-contained HTML page, and editor plugins read
 * the copies written to `.kb/briefs/signoff/` (latest.json, latest.md and
 * latest.html; `.kb/briefs/` is git-ignored and never synced).
 */

export const SIGNOFF_VERSION = "kibi.signoff.v1";

/** The fence info strings host renderers key on. */
export const SIGNOFF_FENCES = {
  summary: "kibi-signoff",
  questions: "kibi-questions",
} as const;

/** Where the latest signoff view is written, relative to the workspace. */
export const SIGNOFF_BRIEF_DIR = ".kb/briefs/signoff";
export const SIGNOFF_LATEST_JSON = `${SIGNOFF_BRIEF_DIR}/latest.json`;
/** The latest view's Markdown body (no fence), for plain-text host views. */
export const SIGNOFF_LATEST_MARKDOWN = `${SIGNOFF_BRIEF_DIR}/latest.md`;
/** The latest view as a self-contained page, for browsers and webviews. */
export const SIGNOFF_LATEST_HTML = `${SIGNOFF_BRIEF_DIR}/latest.html`;

export type SignoffFirmness = "firm" | "default" | "exploratory";

/** How a requirement entered the change. */
export type SignoffChange = "new" | "changed" | "affected" | "retired";

export type SignoffStatementRef = Readonly<{
  id: string;
  title: string;
  statement: string;
  firmness?: SignoffFirmness;
}>;

export type SignoffProof = Readonly<{
  /** Coverage proof status: proven, missing, unresolved or not_applicable. */
  status: string;
  /** The earliest unmet proof gate, or "proven". */
  gate: string;
  testCount: number;
  contradictions: readonly string[];
}>;

export type SignoffRequirement = Readonly<{
  id: string;
  title: string;
  change: SignoffChange;
  status: string;
  statement: string;
  /** The statement at the base commit, when the change rewrote it. */
  previousStatement?: string;
  firmness?: SignoffFirmness;
  originKind?: string;
  originRef?: string;
  approvedBy?: string;
  supersedes: readonly SignoffStatementRef[];
  scenarios: readonly Readonly<{ id: string; title: string }>[];
  /** Changed code symbols that implement it (affected requirements). */
  symbols: readonly string[];
  proof?: SignoffProof;
  source: string;
}>;

export type SignoffSummary = Readonly<{
  version: typeof SIGNOFF_VERSION;
  kind: "summary";
  scope: "staged" | "working";
  generatedAt: string;
  branch?: string;
  requirements: readonly SignoffRequirement[];
  /** Parts of the view Kibi could not compute, in plain words. */
  notes: readonly string[];
}>;

/** One decision the agent asks the person to confirm. */
export type SignoffQuestionInput = Readonly<{
  /** Existing or proposed requirement id. */
  id?: string;
  title?: string;
  /** The rule as it would be recorded. */
  statement: string;
  /** The person's words that would go in origin.ref. */
  quote?: string;
  firmness?: SignoffFirmness;
  /** Files or symbols the rule governs. */
  governs?: readonly string[];
  /** Recorded requirements the rule conflicts with. */
  conflictsWith?: readonly string[];
  /** What the agent asks, when it is more than "record this?". */
  question?: string;
  /** The person's answer, once given. */
  answer?: string;
}>;

export type SignoffQuestion = SignoffQuestionInput &
  Readonly<{
    number: number;
    /** The recorded requirement this question would change. */
    current?: SignoffStatementRef;
    conflicts: readonly SignoffStatementRef[];
  }>;

export type SignoffQuestions = Readonly<{
  version: typeof SIGNOFF_VERSION;
  kind: "questions";
  generatedAt: string;
  questions: readonly SignoffQuestion[];
  notes: readonly string[];
}>;

export type SignoffView = SignoffSummary | SignoffQuestions;

export const SIGNOFF_CHANGE_LABELS: Readonly<Record<SignoffChange, string>> = {
  new: "New",
  changed: "Changed",
  affected: "Affected by the code change (statement unchanged)",
  retired: "Superseded or retired",
};

export const SIGNOFF_GATE_LABELS: Readonly<Record<string, string>> = {
  semantic: "semantic model incomplete",
  scenario: "no scenario yet",
  implementation: "no owning code yet",
  e2e: "no end-to-end test yet",
  evidence: "end-to-end evidence not current",
  proven: "proven",
};

/** A short proof label for one requirement. */
export function proofLabel(proof: SignoffProof | undefined): string {
  if (proof === undefined) return "not checked";
  if (proof.status === "not_applicable") return "not applicable";
  const gate = SIGNOFF_GATE_LABELS[proof.gate] ?? proof.gate;
  const tests = `${proof.testCount} ${proof.testCount === 1 ? "test" : "tests"}`;
  return proof.gate === "proven" ? `proven, ${tests}` : `${gate}, ${tests}`;
}

/** Whether a question still waits for the person. */
export function questionOpen(question: SignoffQuestionInput): boolean {
  return (question.answer ?? "").trim() === "";
}

/** The kind of decision a question asks for. */
export function questionKind(question: SignoffQuestion): string {
  if (question.current) return `Change ${question.current.id}`;
  if (question.conflicts.length > 0) return "Conflict with a recorded rule";
  return "New rule";
}
