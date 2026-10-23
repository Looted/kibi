import {
  SIGNOFF_CHANGE_LABELS,
  SIGNOFF_FENCES,
  type SignoffChange,
  type SignoffQuestions,
  type SignoffRequirement,
  type SignoffSummary,
  type SignoffView,
  approvalNumbers,
  approvalSentence,
  awaitsApproval,
  proofLabel,
  questionKind,
  questionOpen,
  statementSentenceDiff,
} from "./model.js";

/** Rows shown in chat before the rest is left to the HTML view. */
export const SIGNOFF_MARKDOWN_LIMIT = 15;

const CHANGE_ORDER: readonly SignoffChange[] = [
  "new",
  "changed",
  "affected",
  "retired",
];

function quote(text: string): string {
  return `> ${text.replace(/\s+/g, " ").trim()}`;
}

/**
 * A rewritten statement as lines under a list item: the new statement with
 * added sentences in bold and removed ones struck through when sentences
 * survive the rewrite, or the old and new statements otherwise.
 */
function rewriteLines(
  previous: string,
  statement: string,
  labels: readonly [string, string] = ["Was", "Now"],
): string[] {
  const diff = statementSentenceDiff(previous, statement);
  if (diff === undefined) {
    return [
      `- ${labels[0]}:`,
      `  ${quote(previous)}`,
      `- ${labels[1]}:`,
      `  ${quote(statement)}`,
    ];
  }
  const added = diff.filter((part) => part.change === "added").length;
  const removed = diff.filter((part) => part.change === "removed").length;
  const counts = [
    added > 0 ? `${added} added in bold` : undefined,
    removed > 0 ? `${removed} removed struck through` : undefined,
  ].filter(Boolean);
  const text = diff
    .map((part) =>
      part.change === "added"
        ? `**${part.text}**`
        : part.change === "removed"
          ? `~~${part.text}~~`
          : part.text,
    )
    .join(" ");
  return [
    `- ${labels[1]}, sentences ${counts.join(", ")}:`,
    `  ${quote(text)}`,
  ];
}

function firmnessTag(firmness: string | undefined): string {
  return firmness === "firm"
    ? "firm"
    : firmness === "exploratory"
      ? "exploratory"
      : "default";
}

function originLine(requirement: SignoffRequirement): string | undefined {
  const parts: string[] = [];
  if (requirement.originKind) parts.push(requirement.originKind);
  if (requirement.originRef) parts.push(`"${requirement.originRef}"`);
  if (requirement.approvedBy)
    parts.push(`approved by ${requirement.approvedBy}`);
  if (awaitsApproval(requirement)) parts.push("**awaiting your approval**");
  return parts.length > 0 ? `- Origin: ${parts.join(", ")}` : undefined;
}

function requirementBlock(
  requirement: SignoffRequirement,
  number: number,
): string[] {
  const lines = [
    `**${number}. ${requirement.id}** · ${firmnessTag(requirement.firmness)} · ${requirement.title}`,
  ];
  if (requirement.previousStatement !== undefined) {
    lines.push(
      ...rewriteLines(requirement.previousStatement, requirement.statement),
    );
  } else {
    lines.push(quote(requirement.statement));
  }
  const origin = originLine(requirement);
  if (origin) lines.push(origin);
  for (const superseded of requirement.supersedes) {
    lines.push(
      `- Replaces ${superseded.id} (${firmnessTag(superseded.firmness)}): ${superseded.statement}`,
    );
  }
  if (requirement.symbols.length > 0) {
    lines.push(`- Changed code: ${requirement.symbols.join(", ")}`);
  }
  if (requirement.change !== "retired") {
    lines.push(
      requirement.scenarios.length > 0
        ? `- Scenarios: ${requirement.scenarios.map((scenario) => (scenario.title === scenario.id ? scenario.id : `${scenario.id} (${scenario.title})`)).join("; ")}`
        : "- Scenarios: none yet",
    );
    lines.push(`- Proof: ${proofLabel(requirement.proof)}`);
    for (const conflict of requirement.proof?.contradictions ?? []) {
      lines.push(`- Contradiction: ${conflict}`);
    }
  }
  return lines;
}

function headline(summary: SignoffSummary): string {
  const counts = CHANGE_ORDER.map(
    (change) =>
      [
        change,
        summary.requirements.filter((row) => row.change === change).length,
      ] as const,
  )
    .filter(([, count]) => count > 0)
    .map(([change, count]) => `${count} ${change}`);
  return counts.length === 0
    ? "## Requirements signoff: no requirement changes"
    : `## Requirements signoff: ${counts.join(", ")}`;
}

// implements REQ-kibi-signoff-views
/** The end-of-work summary as Markdown, without the fence. */
export function renderSummaryMarkdownBody(
  summary: SignoffSummary,
  limit = SIGNOFF_MARKDOWN_LIMIT,
): string {
  const lines = [headline(summary)];
  const approvals = approvalNumbers(
    CHANGE_ORDER.flatMap((change) =>
      summary.requirements.filter((row) => row.change === change),
    ),
  );
  if (approvals.length > 0)
    lines.push("", `**${approvalSentence(approvals)}**`);
  let number = 0;
  for (const change of CHANGE_ORDER) {
    const rows = summary.requirements.filter((row) => row.change === change);
    const shown = rows.slice(0, Math.max(0, limit - number));
    if (shown.length === 0) continue;
    lines.push("", `### ${SIGNOFF_CHANGE_LABELS[change]}`);
    for (const row of shown) {
      number += 1;
      lines.push("", ...requirementBlock(row, number));
    }
  }
  const hidden = summary.requirements.length - limit;
  if (hidden > 0) {
    lines.push(
      "",
      `…and ${hidden} more. Run \`kibi signoff --format html --open\` to see them all.`,
    );
  }
  if (approvals.length > 0) {
    lines.push(
      "",
      'Reply by number, for example "approve 1" or "1: reword …".',
    );
  }
  for (const note of summary.notes) lines.push("", `Note: ${note}`);
  return lines.join("\n");
}

// implements REQ-kibi-signoff-views
/** The mid-work decision questions as Markdown, without the fence. */
export function renderQuestionsMarkdownBody(view: SignoffQuestions): string {
  const open = view.questions.filter(questionOpen).length;
  const answered = view.questions.length - open;
  const lines = [
    `## Decisions to confirm: ${open} open${answered > 0 ? `, ${answered} answered` : ""}`,
  ];
  for (const question of view.questions) {
    const title = question.title ?? question.current?.title ?? question.id;
    const heading = `${question.number}. ${questionKind(question)}${title ? `: ${title}` : ""}`;
    lines.push("");
    if (!questionOpen(question)) {
      lines.push(`~~**${heading}**~~ · answered: ${question.answer}`);
      continue;
    }
    lines.push(
      `**${heading}**${question.firmness ? ` · would be ${question.firmness}` : ""}`,
    );
    if (question.current) {
      lines.push(
        ...rewriteLines(question.current.statement, question.statement, [
          `Recorded now (${firmnessTag(question.current.firmness)})`,
          "Proposed",
        ]),
      );
    } else {
      lines.push(quote(question.statement));
    }
    if (question.quote) lines.push(`- Your words: "${question.quote}"`);
    if (question.governs?.length) {
      lines.push(`- Governs: ${question.governs.join(", ")}`);
    }
    for (const conflict of question.conflicts) {
      lines.push(
        `- Conflicts with ${conflict.id} (${firmnessTag(conflict.firmness)}): ${conflict.statement}`,
      );
    }
    if (question.question) lines.push(`- Question: ${question.question}`);
  }
  if (open > 0) {
    lines.push(
      "",
      'Reply by number, for example "1 yes, 2 exploratory, 3 reword: …".',
    );
  }
  for (const note of view.notes) lines.push("", `Note: ${note}`);
  return lines.join("\n");
}

// implements REQ-kibi-signoff-views
/**
 * A signoff view as plain Markdown for a chat reply or a messaging tool
 * (headings, quotes and lists that any Markdown surface renders), with no
 * fence for a host renderer to find.
 */
export function renderSignoffChatMarkdown(view: SignoffView): string {
  return view.kind === "summary"
    ? renderSummaryMarkdownBody(view)
    : renderQuestionsMarkdownBody(view);
}

// implements REQ-kibi-signoff-views
/**
 * A signoff view as the fenced block agents paste into chat. Host renderers
 * (the Claude Code display hook, the OpenCode TUI) key on the fence's info
 * string; hosts without one show it as a code block, so they get `chat`.
 */
export function renderSignoffMarkdown(view: SignoffView): string {
  const fence = SIGNOFF_FENCES[view.kind];
  const body = renderSignoffChatMarkdown(view);
  // A body line starting with ``` would close the fence early.
  const safe = body.replace(/^```/gm, "'''");
  return `\`\`\`${fence}\n${safe}\n\`\`\`\n`;
}
