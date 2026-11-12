import { describe, expect, test } from "bun:test";
import {
  SIGNOFF_MARKDOWN_LIMIT,
  renderQuestionsMarkdownBody,
  renderSignoffChatMarkdown,
  renderSignoffMarkdown,
  renderSummaryMarkdownBody,
} from "../../src/signoff/markdown.js";
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
  notes: string[] = [],
): SignoffSummary => ({
  version: "kibi.signoff.v1",
  kind: "summary",
  scope: "working",
  generatedAt: "2024-01-01T00:00:00Z",
  requirements,
  notes,
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

describe("renderSummaryMarkdownBody", () => {
  test("an empty change says so", () => {
    expect(SIGNOFF_MARKDOWN_LIMIT).toBe(15);
    expect(renderSummaryMarkdownBody(summary([]))).toBe(
      "## Requirements signoff: no requirement changes",
    );
  });

  test("a full requirement block", () => {
    const body = renderSummaryMarkdownBody(
      summary(
        [
          requirement({
            firmness: "firm",
            statement: "  The   rule\nholds. ",
            originKind: "human",
            originRef: "keep it",
            approvedBy: "pat",
            supersedes: [
              {
                id: "REQ-0",
                title: "Old",
                statement: "Old rule.",
                firmness: "exploratory",
              },
              { id: "REQ-00", title: "Older", statement: "Older rule." },
            ],
            symbols: ["a.ts#f", "b.ts#g"],
            scenarios: [
              { id: "SCEN-1", title: "SCEN-1" },
              { id: "SCEN-2", title: "Second" },
            ],
            proof: {
              status: "tested",
              gate: "tested",
              testCount: 1,
              contradictions: ["c1", "c2"],
              certificateRejections: ["cert"],
            },
          }),
        ],
        ["first note", "second note"],
      ),
    );
    expect(body).toBe(
      [
        "## Requirements signoff: 1 new",
        "",
        "### New",
        "",
        "**1. REQ-1** · firm · Title",
        "> The rule holds.",
        '- Origin: human, "keep it", approved by pat',
        "- Replaces REQ-0 (exploratory): Old rule.",
        "- Replaces REQ-00 (default): Older rule.",
        "- Changed code: a.ts#f, b.ts#g",
        "- Scenarios: SCEN-1; SCEN-2 (Second)",
        "- Proof: tested, 1 test",
        "- Contradiction: c1",
        "- Contradiction: c2",
        "- Certificate: cert",
        "",
        "Note: first note",
        "",
        "Note: second note",
      ].join("\n"),
    );
  });

  test("a bare requirement has no origin, code, scenarios or proof", () => {
    expect(
      renderSummaryMarkdownBody(
        summary([requirement({ firmness: "other" as "firm" })]),
      ),
    ).toBe(
      [
        "## Requirements signoff: 1 new",
        "",
        "### New",
        "",
        "**1. REQ-1** · default · Title",
        "> The rule holds.",
        "- Scenarios: none yet",
        "- Proof: not checked",
      ].join("\n"),
    );
  });

  test("a retired requirement lists no scenarios or proof", () => {
    expect(
      renderSummaryMarkdownBody(
        summary([requirement({ change: "retired", originRef: "why" })]),
      ),
    ).toBe(
      [
        "## Requirements signoff: 1 retired",
        "",
        "### Superseded or retired",
        "",
        "**1. REQ-1** · default · Title",
        "> The rule holds.",
        '- Origin: "why"',
      ].join("\n"),
    );
  });

  test("groups by change in a fixed order and numbers across groups", () => {
    const body = renderSummaryMarkdownBody(
      summary([
        requirement({ id: "R-A", change: "affected" }),
        requirement({ id: "R-C", change: "changed" }),
        requirement({ id: "R-N", change: "new" }),
        requirement({ id: "R-R", change: "retired" }),
        requirement({ id: "R-N2", change: "new" }),
      ]),
    );
    expect(body.split("\n")[0]).toBe(
      "## Requirements signoff: 2 new, 1 changed, 1 affected, 1 retired",
    );
    expect(
      body.split("\n").filter((line) => /^(###|\*\*\d)/.test(line)),
    ).toEqual([
      "### New",
      "**1. R-N** · default · Title",
      "**2. R-N2** · default · Title",
      "### Changed",
      "**3. R-C** · default · Title",
      "### Affected by the code change (statement unchanged)",
      "**4. R-A** · default · Title",
      "### Superseded or retired",
      "**5. R-R** · default · Title",
    ]);
  });

  test("agent requirements awaiting approval are called out", () => {
    const body = renderSummaryMarkdownBody(
      summary([
        requirement({ id: "R-1", change: "changed", originKind: "agent" }),
        requirement({ id: "R-2", originKind: "agent" }),
      ]),
    );
    expect(body).toBe(
      [
        "## Requirements signoff: 1 new, 1 changed",
        "",
        "**Requirements 1 and 2 were written by the agent and wait for your approval.**",
        "",
        "### New",
        "",
        "**1. R-2** · default · Title",
        "> The rule holds.",
        "- Origin: agent, **awaiting your approval**",
        "- Scenarios: none yet",
        "- Proof: not checked",
        "",
        "### Changed",
        "",
        "**2. R-1** · default · Title",
        "> The rule holds.",
        "- Origin: agent, **awaiting your approval**",
        "- Scenarios: none yet",
        "- Proof: not checked",
        "",
        'Reply by number, for example "approve 1" or "1: reword …".',
      ].join("\n"),
    );
  });

  test("rows past the limit are left to the HTML view", () => {
    const rows = [
      requirement({ id: "R-1" }),
      requirement({ id: "R-2" }),
      requirement({ id: "R-3", change: "changed" }),
    ];
    const ids = (body: string) =>
      body.split("\n").filter((line) => line.startsWith("**"));
    const two = renderSummaryMarkdownBody(summary(rows), 2);
    expect(ids(two)).toEqual([
      "**1. R-1** · default · Title",
      "**2. R-2** · default · Title",
    ]);
    expect(two).not.toContain("### Changed");
    expect(two.split("\n").at(-2)).toBe("");
    expect(two.split("\n").at(-1)).toBe(
      "…and 1 more. Run `kibi signoff --format html --open` to see them all.",
    );
    const three = renderSummaryMarkdownBody(summary(rows), 3);
    expect(ids(three)).toHaveLength(3);
    expect(three).not.toContain("more. Run");
    expect(ids(renderSummaryMarkdownBody(summary(rows), 1))).toEqual([
      "**1. R-1** · default · Title",
    ]);
    const many = Array.from({ length: 16 }, (_, index) =>
      requirement({ id: `R-${index}` }),
    );
    expect(renderSummaryMarkdownBody(summary(many))).toContain("…and 1 more.");
  });

  test("a rewrite shows the sentence diff, or both statements", () => {
    const body = (previousStatement: string, statement: string) =>
      renderSummaryMarkdownBody(
        summary([
          requirement({ change: "changed", previousStatement, statement }),
        ]),
      )
        .split("\n")
        .slice(5, -2);
    expect(body("Keep this. Drop that.", "Keep this. Add more.")).toEqual([
      "- Now, sentences 1 added in bold, 1 removed struck through:",
      "  > Keep this. **Add more.** ~~Drop that.~~",
    ]);
    expect(body("Keep this.", "Keep this. Add more.")).toEqual([
      "- Now, sentences 1 added in bold:",
      "  > Keep this. **Add more.**",
    ]);
    expect(body("Keep this. Drop that.", "Keep this.")).toEqual([
      "- Now, sentences 1 removed struck through:",
      "  > Keep this. ~~Drop that.~~",
    ]);
    expect(body("Old   one.", "New\none.")).toEqual([
      "- Was:",
      "  > Old one.",
      "- Now:",
      "  > New one.",
    ]);
  });
});

describe("renderQuestionsMarkdownBody", () => {
  test("open and answered questions", () => {
    const ref = {
      id: "REQ-9",
      title: "Recorded",
      statement: "Old rule. Kept.",
    };
    expect(
      renderQuestionsMarkdownBody(
        questions(
          [
            question({
              title: "New thing",
              firmness: "firm",
              quote: "do it",
              governs: ["a.ts", "b.ts"],
              conflicts: [
                { ...ref, firmness: "firm" },
                { id: "REQ-8", title: "T", statement: "Other." },
              ],
              question: "Record this?",
            }),
            question({
              number: 2,
              current: ref,
              statement: "New rule. Kept.",
            }),
            question({
              number: 3,
              id: "REQ-3",
              answer: "yes",
            }),
            question({ number: 4, governs: [] }),
          ],
          ["a note"],
        ),
      ),
    ).toBe(
      [
        "## Decisions to confirm: 3 open, 1 answered",
        "",
        "**1. Conflict with a recorded rule: New thing** · would be firm",
        "> Use the new rule.",
        '- Your words: "do it"',
        "- Governs: a.ts, b.ts",
        "- Conflicts with REQ-9 (firm): Old rule. Kept.",
        "- Conflicts with REQ-8 (default): Other.",
        "- Question: Record this?",
        "",
        "**2. Change REQ-9: Recorded**",
        "- Proposed, sentences 1 added in bold, 1 removed struck through:",
        "  > **New rule.** ~~Old rule.~~ Kept.",
        "",
        "~~**3. New rule: REQ-3**~~ · answered: yes",
        "",
        "**4. New rule**",
        "> Use the new rule.",
        "",
        'Reply by number, for example "1 yes, 2 exploratory, 3 reword: …".',
        "",
        "Note: a note",
      ].join("\n"),
    );
  });

  test("a rewrite with nothing kept shows the recorded and proposed rules", () => {
    expect(
      renderQuestionsMarkdownBody(
        questions([
          question({
            current: {
              id: "REQ-9",
              title: "T",
              statement: "Old.",
              firmness: "exploratory",
            },
          }),
        ]),
      ).split("\n"),
    ).toEqual([
      "## Decisions to confirm: 1 open",
      "",
      "**1. Change REQ-9: T**",
      "- Recorded now (exploratory):",
      "  > Old.",
      "- Proposed:",
      "  > Use the new rule.",
      "",
      'Reply by number, for example "1 yes, 2 exploratory, 3 reword: …".',
    ]);
  });

  test("with every question answered there is nothing to reply to", () => {
    expect(
      renderQuestionsMarkdownBody(
        questions([question({ answer: "no", title: "T" })]),
      ),
    ).toBe(
      "## Decisions to confirm: 0 open, 1 answered\n\n~~**1. New rule: T**~~ · answered: no",
    );
    expect(renderQuestionsMarkdownBody(questions([]))).toBe(
      "## Decisions to confirm: 0 open",
    );
  });
});

describe("fenced and chat views", () => {
  test("the chat view picks the renderer by kind", () => {
    const view = summary([]);
    expect(renderSignoffChatMarkdown(view)).toBe(
      renderSummaryMarkdownBody(view),
    );
    const asked = questions([question()]);
    expect(renderSignoffChatMarkdown(asked)).toBe(
      renderQuestionsMarkdownBody(asked),
    );
  });

  test("the fence names the view and no body line can close it", () => {
    expect(renderSignoffMarkdown(summary([]))).toBe(
      "```kibi-signoff\n## Requirements signoff: no requirement changes\n```\n",
    );
    expect(
      renderSignoffMarkdown(questions([], ["a\n```js\nb ``` c\n```"])),
    ).toBe(
      [
        "```kibi-questions",
        "## Decisions to confirm: 0 open",
        "",
        "Note: a",
        "'''js",
        "b ``` c",
        "'''",
        "```",
        "",
      ].join("\n"),
    );
  });
});
