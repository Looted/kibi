import {
  KIBI_BRAND,
  renderKibiFaviconDataUri,
  renderKibiLogo,
} from "../report/brand.js";
import { REPORT_CSP } from "../report/html-report.js";
import {
  SIGNOFF_CHANGE_LABELS,
  type SignoffChange,
  type SignoffQuestion,
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

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function styles(): string {
  return `
:root{--bg:${KIBI_BRAND.deepCarbon};--panel:${KIBI_BRAND.panel};--text:${KIBI_BRAND.snow};--muted:${KIBI_BRAND.mist};--rail:${KIBI_BRAND.rail};--accent:${KIBI_BRAND.ice};--signal:${KIBI_BRAND.signal};--ok:${KIBI_BRAND.success};--warn:${KIBI_BRAND.warning};--bad:${KIBI_BRAND.danger}}
@media (prefers-color-scheme: light){:root{--bg:#f4f6f8;--panel:#ffffff;--text:#1d1e23;--muted:#4f5b66;--rail:#d5dde3;--accent:#1f5f99;--signal:#1f5f99;--ok:#1e7a4f;--warn:#8a5a00;--bad:#b3261e}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:920px;margin:0 auto;padding:24px 16px 48px}
header.page{display:flex;gap:12px;align-items:center;margin-bottom:8px}
header.page svg{width:36px;height:36px;flex:none}
h1{font-size:22px;margin:0}
.meta{color:var(--muted);font-size:13px;margin:0 0 20px}
h2{font-size:16px;margin:28px 0 10px;color:var(--accent)}
.card{background:var(--panel);border:1px solid var(--rail);border-radius:10px;padding:14px 16px;margin:10px 0}
.card--answered{opacity:.6}
.card__head{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}
.num{font-weight:700;color:var(--muted)}
.id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:var(--accent)}
.title{font-weight:600}
.badge{font-size:12px;padding:1px 8px;border-radius:999px;border:1px solid var(--rail);color:var(--muted)}
.badge--firm{border-color:var(--warn);color:var(--warn)}
.badge--exploratory{border-color:var(--signal);color:var(--signal)}
.badge--tested{border-color:var(--ok);color:var(--ok)}
.badge--answered{border-color:var(--ok);color:var(--ok)}
.badge--approval{border-color:var(--signal);color:var(--signal);font-weight:600}
.callout{margin:12px 0 4px;padding:10px 14px;border:1px solid var(--signal);border-radius:8px;color:var(--text)}
blockquote{margin:10px 0;padding:8px 12px;border-left:3px solid var(--accent);background:rgba(127,127,127,.08);border-radius:0 6px 6px 0}
.diff{display:grid;gap:6px;margin:10px 0}
.diff blockquote{margin:0}
.diff .was{border-left-color:var(--bad);text-decoration:line-through;text-decoration-color:rgba(240,113,120,.6)}
.diff .now{border-left-color:var(--ok)}
.diff ins{text-decoration:none;background:rgba(61,186,128,.18);color:var(--text);border-radius:3px;padding:0 2px}
.diff del{color:var(--muted);text-decoration-color:var(--bad);background:rgba(240,113,120,.12);border-radius:3px;padding:0 2px}
.label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:8px 0 0;font-size:14px}
dt{color:var(--muted)}
dd{margin:0;overflow-wrap:anywhere}
.conflict{color:var(--bad)}
.notes{color:var(--muted);font-size:13px}
.empty{color:var(--muted)}
footer{margin-top:28px;color:var(--muted);font-size:13px}
`;
}

function firmnessBadge(firmness: string | undefined): string {
  const value = firmness ?? "default";
  return `<span class="badge badge--${escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

function row(label: string, value: string): string {
  return `<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`;
}

function statementBlock(
  statement: string,
  previous: string | undefined,
  previousLabel = "Was",
  currentLabel = "Now",
): string {
  if (previous === undefined) {
    return `<blockquote>${escapeHtml(statement)}</blockquote>`;
  }
  const diff = statementSentenceDiff(previous, statement);
  if (diff !== undefined) {
    const text = diff
      .map((part) =>
        part.change === "added"
          ? `<ins>${escapeHtml(part.text)}</ins>`
          : part.change === "removed"
            ? `<del>${escapeHtml(part.text)}</del>`
            : escapeHtml(part.text),
      )
      .join(" ");
    return `<div class="diff"><span class="label">${escapeHtml(currentLabel)}, with the changed sentences marked</span><blockquote class="now">${text}</blockquote></div>`;
  }
  return `<div class="diff"><span class="label">${escapeHtml(previousLabel)}</span><blockquote class="was">${escapeHtml(previous)}</blockquote><span class="label">${escapeHtml(currentLabel)}</span><blockquote class="now">${escapeHtml(statement)}</blockquote></div>`;
}

function requirementCard(
  requirement: SignoffRequirement,
  number: number,
): string {
  const details: string[] = [];
  const origin = [
    requirement.originKind,
    requirement.originRef ? `“${requirement.originRef}”` : undefined,
    requirement.approvedBy
      ? `approved by ${requirement.approvedBy}`
      : undefined,
  ].filter(Boolean);
  if (origin.length > 0)
    details.push(row("Origin", escapeHtml(origin.join(", "))));
  for (const superseded of requirement.supersedes) {
    details.push(
      row(
        "Replaces",
        `<span class="id">${escapeHtml(superseded.id)}</span> ${firmnessBadge(superseded.firmness)} ${escapeHtml(superseded.statement)}`,
      ),
    );
  }
  if (requirement.symbols.length > 0) {
    details.push(
      row("Changed code", escapeHtml(requirement.symbols.join(", "))),
    );
  }
  if (requirement.change !== "retired") {
    details.push(
      row(
        "Scenarios",
        requirement.scenarios.length === 0
          ? '<span class="empty">none yet</span>'
          : requirement.scenarios
              .map(
                (scenario) =>
                  `<span class="id">${escapeHtml(scenario.id)}</span>${scenario.title === scenario.id ? "" : ` ${escapeHtml(scenario.title)}`}`,
              )
              .join("<br>"),
      ),
    );
    const tested = requirement.proof?.gate === "tested";
    details.push(
      row(
        "Proof",
        `<span class="badge${tested ? " badge--tested" : ""}">${escapeHtml(proofLabel(requirement.proof))}</span>`,
      ),
    );
    for (const conflict of requirement.proof?.contradictions ?? []) {
      details.push(
        row(
          "Contradiction",
          `<span class="conflict">${escapeHtml(conflict)}</span>`,
        ),
      );
    }
  }
  return `<article class="card" id="${escapeHtml(requirement.id)}">
<div class="card__head"><span class="num">${number}.</span><span class="id">${escapeHtml(requirement.id)}</span>${firmnessBadge(requirement.firmness)}<span class="title">${escapeHtml(requirement.title)}</span>${awaitsApproval(requirement) ? '<span class="badge badge--approval">awaits your approval</span>' : ""}</div>
${statementBlock(requirement.statement, requirement.previousStatement)}
<dl>${details.join("")}</dl>
</article>`;
}

function summaryBody(summary: SignoffSummary): string {
  const order: readonly SignoffChange[] = [
    "new",
    "changed",
    "affected",
    "retired",
  ];
  const sections: string[] = [];
  const approvals = approvalNumbers(
    order.flatMap((change) =>
      summary.requirements.filter((item) => item.change === change),
    ),
  );
  if (approvals.length > 0) {
    sections.push(
      `<p class="callout">${escapeHtml(approvalSentence(approvals))} Reply by number, for example “approve 1”.</p>`,
    );
  }
  let number = 0;
  for (const change of order) {
    const rows = summary.requirements.filter((item) => item.change === change);
    if (rows.length === 0) continue;
    sections.push(
      `<h2>${escapeHtml(SIGNOFF_CHANGE_LABELS[change])} (${rows.length})</h2>`,
    );
    for (const item of rows) {
      number += 1;
      sections.push(requirementCard(item, number));
    }
  }
  if (sections.length === 0) {
    sections.push(
      '<p class="empty">This change adds, rewrites or affects no requirement.</p>',
    );
  }
  return sections.join("\n");
}

function questionCard(question: SignoffQuestion): string {
  const kind = questionKind(question);
  const title = question.title ?? question.current?.title ?? question.id;
  if (!questionOpen(question)) {
    return `<article class="card card--answered"><div class="card__head"><span class="num">${question.number}.</span><span class="title">${escapeHtml(kind)}${title ? `: ${escapeHtml(title)}` : ""}</span><span class="badge badge--answered">answered: ${escapeHtml(question.answer)}</span></div></article>`;
  }
  const details: string[] = [];
  if (question.quote)
    details.push(row("Your words", escapeHtml(`“${question.quote}”`)));
  if (question.governs?.length)
    details.push(row("Governs", escapeHtml(question.governs.join(", "))));
  for (const conflict of question.conflicts) {
    details.push(
      row(
        "Conflicts with",
        `<span class="id conflict">${escapeHtml(conflict.id)}</span> ${firmnessBadge(conflict.firmness)} ${escapeHtml(conflict.statement)}`,
      ),
    );
  }
  if (question.question)
    details.push(row("Question", escapeHtml(question.question)));
  return `<article class="card" id="q${question.number}">
<div class="card__head"><span class="num">${question.number}.</span><span class="title">${escapeHtml(kind)}${title ? `: ${escapeHtml(title)}` : ""}</span>${question.firmness ? `<span class="badge badge--${escapeHtml(question.firmness)}">would be ${escapeHtml(question.firmness)}</span>` : ""}</div>
${statementBlock(question.statement, question.current?.statement, "Recorded now", "Proposed")}
<dl>${details.join("")}</dl>
</article>`;
}

function questionsBody(view: SignoffQuestions): string {
  const open = view.questions.filter(questionOpen);
  const answered = view.questions.filter((question) => !questionOpen(question));
  const parts = [`<h2>Open (${open.length})</h2>`, ...open.map(questionCard)];
  if (open.length > 0) {
    parts.push(
      '<p class="notes">Answer in the chat by number, for example “1 yes, 2 exploratory, 3 reword: …”.</p>',
    );
  }
  if (answered.length > 0) {
    parts.push(
      `<h2>Answered (${answered.length})</h2>`,
      ...answered.map(questionCard),
    );
  }
  return parts.join("\n");
}

// implements REQ-kibi-signoff-views
/** A signoff view as a self-contained HTML page with no network assets. */
export function renderSignoffHtml(view: SignoffView): string {
  const heading =
    view.kind === "summary" ? "Requirements signoff" : "Decisions to confirm";
  const meta =
    view.kind === "summary"
      ? [
          view.branch ? `Branch ${view.branch}` : undefined,
          view.scope === "staged" ? "staged changes" : "working tree",
          `generated ${view.generatedAt}`,
        ]
      : [`generated ${view.generatedAt}`];
  const body =
    view.kind === "summary" ? summaryBody(view) : questionsBody(view);
  const notes = view.notes.length
    ? `<footer>${view.notes.map((note) => `<p class="notes">${escapeHtml(note)}</p>`).join("")}</footer>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}">
<title>Kibi ${escapeHtml(heading.toLowerCase())}</title>
<link rel="icon" href="${renderKibiFaviconDataUri()}">
<style>${styles()}</style>
</head>
<body>
<main>
<header class="page">${renderKibiLogo()}<h1>${escapeHtml(heading)}</h1></header>
<p class="meta">${escapeHtml(meta.filter(Boolean).join(" · "))}</p>
${body}
${notes}
</main>
</body>
</html>
`;
}
