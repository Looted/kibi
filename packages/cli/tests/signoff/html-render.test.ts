// implements REQ-kibi-signoff-views
import { describe, expect, test } from "bun:test";
import {
  renderKibiFaviconDataUri,
  renderKibiLogo,
} from "../../src/report/brand.js";
import { REPORT_CSP } from "../../src/report/html-report.js";
import { renderSignoffHtml } from "../../src/signoff/html.js";
import type {
  SignoffQuestion,
  SignoffQuestions,
  SignoffRequirement,
  SignoffSummary,
} from "../../src/signoff/model.js";

const requirement = (
  fields: Partial<SignoffRequirement> = {},
): SignoffRequirement => ({
  id: "REQ-1",
  title: "Title",
  change: "new",
  status: "open",
  statement: "The rule holds.",
  supersedes: [],
  scenarios: [],
  symbols: [],
  source: "r.md",
  ...fields,
});

const summary = (
  requirements: SignoffRequirement[],
  fields: Partial<SignoffSummary> = {},
): SignoffSummary => ({
  version: "kibi.signoff.v1",
  kind: "summary",
  scope: "working",
  generatedAt: "2024-01-01T00:00:00Z",
  requirements,
  notes: [],
  ...fields,
});

const question = (fields: Partial<SignoffQuestion> = {}): SignoffQuestion => ({
  number: 1,
  statement: "Use the new rule.",
  conflicts: [],
  ...fields,
});

const questions = (
  list: SignoffQuestion[],
  notes: string[] = [],
): SignoffQuestions => ({
  version: "kibi.signoff.v1",
  kind: "questions",
  generatedAt: "2024-01-01T00:00:00Z",
  questions: list,
  notes,
});

/** The page between the logo header and the closing main tag. */
function main(html: string): string {
  const start = html.indexOf('<p class="meta">');
  return html.slice(start, html.indexOf("\n</main>"));
}

const DL = (rows: string) => `<dl>${rows}</dl>`;
const row = (label: string, value: string) =>
  `<dt>${label}</dt><dd>${value}</dd>`;
const NO_SCENARIOS = row("Scenarios", '<span class="empty">none yet</span>');
const NOT_CHECKED = row("Proof", '<span class="badge">not checked</span>');

describe("the signoff page", () => {
  test("is a self-contained page with the brand and the report policy", () => {
    const html = renderSignoffHtml(summary([], { notes: ["n1", "<n2>"] }));
    expect(html).toStartWith(
      [
        "<!doctype html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        `<meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}">`,
        "<title>Kibi requirements signoff</title>",
        `<link rel="icon" href="${renderKibiFaviconDataUri()}">`,
        "<style>",
      ].join("\n"),
    );
    expect(html).toContain(".card--answered{opacity:.6}");
    expect(html).toContain(
      `</style>\n</head>\n<body>\n<main>\n<header class="page">${renderKibiLogo()}<h1>Requirements signoff</h1></header>\n`,
    );
    expect(html).toEndWith(
      '<footer><p class="notes">n1</p><p class="notes">&lt;n2&gt;</p></footer>\n</main>\n</body>\n</html>\n',
    );
  });

  test("the summary meta names the branch and scope", () => {
    expect(main(renderSignoffHtml(summary([])))).toBe(
      '<p class="meta">working tree · generated 2024-01-01T00:00:00Z</p>\n<p class="empty">This change adds, rewrites or affects no requirement.</p>\n',
    );
    expect(
      main(
        renderSignoffHtml(summary([], { branch: "feat/x", scope: "staged" })),
      ).split("\n")[0],
    ).toBe(
      '<p class="meta">Branch feat/x · staged changes · generated 2024-01-01T00:00:00Z</p>',
    );
  });

  test("text is escaped everywhere", () => {
    const html = renderSignoffHtml(
      summary([requirement({ title: `<a href="x">'&'</a>` })]),
    );
    expect(html).toContain(
      '<span class="title">&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;</span>',
    );
  });
});

describe("requirement cards", () => {
  test("a full card", () => {
    const html = main(
      renderSignoffHtml(
        summary([
          requirement({
            firmness: "firm",
            originKind: "human",
            originRef: "keep it",
            approvedBy: "pat",
            supersedes: [
              {
                id: "REQ-0",
                title: "O",
                statement: "Old.",
                firmness: "exploratory",
              },
              { id: "REQ-00", title: "O", statement: "Older." },
            ],
            symbols: ["a.ts#f", "b.ts#g"],
            scenarios: [
              { id: "SCEN-1", title: "SCEN-1" },
              { id: "SCEN-2", title: "Second" },
            ],
            proof: {
              status: "tested",
              gate: "tested",
              testCount: 2,
              contradictions: ["c1"],
              certificateRejections: ["cert"],
            },
          }),
        ]),
      ),
    );
    expect(html.split("\n").slice(1)).toEqual([
      "<h2>New (1)</h2>",
      '<article class="card" id="REQ-1">',
      '<div class="card__head"><span class="num">1.</span><span class="id">REQ-1</span><span class="badge badge--firm">firm</span><span class="title">Title</span></div>',
      "<blockquote>The rule holds.</blockquote>",
      DL(
        [
          row("Origin", "human, “keep it”, approved by pat"),
          row(
            "Replaces",
            '<span class="id">REQ-0</span> <span class="badge badge--exploratory">exploratory</span> Old.',
          ),
          row(
            "Replaces",
            '<span class="id">REQ-00</span> <span class="badge badge--default">default</span> Older.',
          ),
          row("Changed code", "a.ts#f, b.ts#g"),
          row(
            "Scenarios",
            '<span class="id">SCEN-1</span><br><span class="id">SCEN-2</span> Second',
          ),
          row(
            "Proof",
            '<span class="badge badge--tested">tested, 2 tests</span>',
          ),
          row("Contradiction", '<span class="conflict">c1</span>'),
          row("Certificate", '<span class="conflict">cert</span>'),
        ].join(""),
      ),
      "</article>",
      "",
    ]);
  });

  test("bare, retired and untested cards", () => {
    const html = main(
      renderSignoffHtml(
        summary([
          requirement({ id: "R-R", change: "retired", originRef: "why" }),
          requirement({ id: "R-A", change: "affected" }),
          requirement({
            id: "R-N",
            proof: {
              status: "missing",
              gate: "e2e",
              testCount: 0,
              contradictions: [],
            },
          }),
        ]),
      ),
    );
    const cards = html.split('<article class="card"');
    expect(cards[0]).toBe(
      '<p class="meta">working tree · generated 2024-01-01T00:00:00Z</p>\n<h2>New (1)</h2>\n',
    );
    expect(cards[1]).toContain(
      DL(
        `${NO_SCENARIOS}${row("Proof", '<span class="badge">no end-to-end test yet, 0 tests</span>')}`,
      ),
    );
    expect(cards[1]).toContain(
      '<span class="num">1.</span><span class="id">R-N</span>',
    );
    expect(cards[1]).toEndWith(
      "</article>\n<h2>Affected by the code change (statement unchanged) (1)</h2>\n",
    );
    expect(cards[2]).toContain(DL(`${NO_SCENARIOS}${NOT_CHECKED}`));
    expect(cards[2]).toContain('<span class="num">2.</span>');
    expect(cards[2]).toEndWith(
      "</article>\n<h2>Superseded or retired (1)</h2>\n",
    );
    expect(cards[3]).toContain(DL(row("Origin", "“why”")));
    expect(cards[3]).toContain('<span class="num">3.</span>');
  });

  test("agent requirements awaiting approval get a callout and a badge", () => {
    const html = main(
      renderSignoffHtml(
        summary([
          requirement({ id: "R-1", change: "changed", originKind: "agent" }),
          requirement({ id: "R-2", originKind: "agent", approvedBy: "pat" }),
        ]),
      ),
    );
    expect(html.split("\n")[1]).toBe(
      '<p class="callout">Requirement 2 was written by the agent and waits for your approval. Reply by number, for example “approve 1”.</p>',
    );
    expect(html).toContain(
      '<span class="title">Title</span><span class="badge badge--approval">awaits your approval</span></div>',
    );
    expect(html.match(/awaits your approval/g)).toHaveLength(1);
  });

  test("a rewrite marks changed sentences, or shows both statements", () => {
    const card = (previousStatement: string, statement: string) =>
      main(
        renderSignoffHtml(
          summary([
            requirement({ change: "changed", previousStatement, statement }),
          ]),
        ),
      ).split("\n")[4];
    expect(card("Keep this. Drop <that>.", "Keep this. Add <more>.")).toBe(
      '<div class="diff"><span class="label">Now, with the changed sentences marked</span><blockquote class="now">Keep this. <ins>Add &lt;more&gt;.</ins> <del>Drop &lt;that&gt;.</del></blockquote></div>',
    );
    expect(card("Old <one>.", "New <one>.")).toBe(
      '<div class="diff"><span class="label">Was</span><blockquote class="was">Old &lt;one&gt;.</blockquote><span class="label">Now</span><blockquote class="now">New &lt;one&gt;.</blockquote></div>',
    );
  });
});

describe("question cards", () => {
  test("open and answered questions in their sections", () => {
    const ref = { id: "REQ-9", title: "Recorded", statement: "Old rule." };
    const html = renderSignoffHtml(
      questions(
        [
          question({
            title: "New <thing>",
            firmness: "firm",
            quote: "do <it>",
            governs: ["a.ts", "b.ts"],
            conflicts: [
              { ...ref, firmness: "firm" },
              { id: "REQ-8", title: "T", statement: "Other." },
            ],
            question: "Record <this>?",
          }),
          question({ number: 2, current: ref, statement: "New rule." }),
          question({ number: 3, id: "REQ-3", answer: "<yes>" }),
          question({ number: 4, governs: [] }),
        ],
        ["note"],
      ),
    );
    expect(html).toContain("<title>Kibi decisions to confirm</title>");
    expect(html).toContain("<h1>Decisions to confirm</h1>");
    expect(main(html).split("\n")).toEqual([
      '<p class="meta">generated 2024-01-01T00:00:00Z</p>',
      "<h2>Open (3)</h2>",
      '<article class="card" id="q1">',
      '<div class="card__head"><span class="num">1.</span><span class="title">Conflict with a recorded rule: New &lt;thing&gt;</span><span class="badge badge--firm">would be firm</span></div>',
      "<blockquote>Use the new rule.</blockquote>",
      DL(
        [
          row("Your words", "“do &lt;it&gt;”"),
          row("Governs", "a.ts, b.ts"),
          row(
            "Conflicts with",
            '<span class="id conflict">REQ-9</span> <span class="badge badge--firm">firm</span> Old rule.',
          ),
          row(
            "Conflicts with",
            '<span class="id conflict">REQ-8</span> <span class="badge badge--default">default</span> Other.',
          ),
          row("Question", "Record &lt;this&gt;?"),
        ].join(""),
      ),
      "</article>",
      '<article class="card" id="q2">',
      '<div class="card__head"><span class="num">2.</span><span class="title">Change REQ-9: Recorded</span></div>',
      '<div class="diff"><span class="label">Recorded now</span><blockquote class="was">Old rule.</blockquote><span class="label">Proposed</span><blockquote class="now">New rule.</blockquote></div>',
      "<dl></dl>",
      "</article>",
      '<article class="card" id="q4">',
      '<div class="card__head"><span class="num">4.</span><span class="title">New rule</span></div>',
      "<blockquote>Use the new rule.</blockquote>",
      "<dl></dl>",
      "</article>",
      '<p class="notes">Answer in the chat by number, for example “1 yes, 2 exploratory, 3 reword: …”.</p>',
      "<h2>Answered (1)</h2>",
      '<article class="card card--answered"><div class="card__head"><span class="num">3.</span><span class="title">New rule: REQ-3</span><span class="badge badge--answered">answered: &lt;yes&gt;</span></div></article>',
      '<footer><p class="notes">note</p></footer>',
    ]);
  });

  test("only answered, or no questions", () => {
    expect(
      main(renderSignoffHtml(questions([question({ answer: "no" })]))).split(
        "\n",
      ),
    ).toEqual([
      '<p class="meta">generated 2024-01-01T00:00:00Z</p>',
      "<h2>Open (0)</h2>",
      "<h2>Answered (1)</h2>",
      '<article class="card card--answered"><div class="card__head"><span class="num">1.</span><span class="title">New rule</span><span class="badge badge--answered">answered: no</span></div></article>',
      "",
    ]);
    expect(main(renderSignoffHtml(questions([])))).toBe(
      '<p class="meta">generated 2024-01-01T00:00:00Z</p>\n<h2>Open (0)</h2>\n',
    );
  });
});
