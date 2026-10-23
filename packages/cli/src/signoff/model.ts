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

// implements REQ-kibi-signoff-views
/** One sentence of a rewritten statement and how the rewrite changed it. */
export type StatementSentence = Readonly<{
  text: string;
  change: "kept" | "added" | "removed";
}>;

function sentences(statement: string): string[] {
  return statement
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'`(])/)
    .filter((sentence) => sentence.length > 0);
}

// implements REQ-kibi-signoff-views
/**
 * A rewrite of a statement as its sentences in reading order, each kept,
 * added or removed (a longest-common-subsequence diff), so the person reads
 * what changed instead of comparing two paragraphs. Undefined when no
 * sentence survives the rewrite, where before and after reads better.
 */
export function statementSentenceDiff(
  previous: string,
  statement: string,
): readonly StatementSentence[] | undefined {
  const before = sentences(previous);
  const after = sentences(statement);
  const table = before.map(() => new Array<number>(after.length + 1).fill(0));
  table.push(new Array<number>(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      const row = table[i] as number[];
      const next = table[i + 1] as number[];
      row[j] =
        before[i] === after[j]
          ? (next[j + 1] as number) + 1
          : Math.max(next[j] as number, row[j + 1] as number);
    }
  }
  if ((table[0]?.[0] ?? 0) === 0) return undefined;
  const result: StatementSentence[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      result.push({ text: after[j] as string, change: "kept" });
      i += 1;
      j += 1;
    } else if (
      j < after.length &&
      (i >= before.length ||
        (table[i]?.[j + 1] as number) >= (table[i + 1]?.[j] as number))
    ) {
      result.push({ text: after[j] as string, change: "added" });
      j += 1;
    } else {
      result.push({ text: before[i] as string, change: "removed" });
      i += 1;
    }
  }
  return result;
}

// implements REQ-kibi-signoff-views
/**
 * Whether the change asks the person to approve a requirement: the agent
 * wrote or rewrote it and nobody has approved it.
 */
export function awaitsApproval(requirement: SignoffRequirement): boolean {
  return (
    (requirement.change === "new" || requirement.change === "changed") &&
    requirement.originKind === "agent" &&
    !requirement.approvedBy
  );
}

// implements REQ-kibi-signoff-views
/** The numbers (in view order) of the requirements awaiting approval. */
export function approvalNumbers(
  ordered: readonly SignoffRequirement[],
): number[] {
  return ordered.flatMap((requirement, index) =>
    awaitsApproval(requirement) ? [index + 1] : [],
  );
}

// implements REQ-kibi-signoff-views
/** One sentence naming the requirements that wait for the person. */
export function approvalSentence(numbers: readonly number[]): string {
  if (numbers.length === 0) return "";
  const list =
    numbers.length === 1
      ? `${numbers[0]}`
      : `${numbers.slice(0, -1).join(", ")} and ${numbers.at(-1)}`;
  return numbers.length === 1
    ? `Requirement ${list} was written by the agent and waits for your approval.`
    : `Requirements ${list} were written by the agent and wait for your approval.`;
}
