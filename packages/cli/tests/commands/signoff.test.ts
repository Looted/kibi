import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { signoffCommand } from "../../src/commands/signoff.js";
import { parseSignoffQuestionsInput } from "../../src/signoff/collect.js";
import { renderSignoffHtml } from "../../src/signoff/html.js";
import {
  renderSignoffChatMarkdown,
  renderSignoffMarkdown,
} from "../../src/signoff/markdown.js";
import {
  floorLabel,
  proofLabel,
  statementSentenceDiff,
} from "../../src/signoff/model.js";
import type {
  SignoffProof,
  SignoffSummary,
  SignoffView,
} from "../../src/signoff/model.js";

let root: string;

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

function requirement(
  id: string,
  statement: string,
  extra: Record<string, string> = {},
): string {
  const fields = {
    id,
    title: `${id} title`,
    status: "open",
    priority: "must",
    semantic_text: statement,
    ...extra,
  };
  const frontmatter = Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n${statement}\n\n## Context\n\nWhy this rule exists, in enough words for the context rule.\n`;
}

function writeRequirement(id: string, content: string): void {
  const file = path.join(root, ".kb", "requirements", `${id}.md`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function capture() {
  const chunks: string[] = [];
  return { chunks, write: (text: string) => chunks.push(text) };
}

const now = () => new Date("2026-10-22T09:00:00.000Z");

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "kibi-signoff-"));
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  writeRequirement(
    "REQ-refunds-approval",
    requirement(
      "REQ-refunds-approval",
      "Refunds above 500 EUR need approval.",
      {
        firmness: "firm",
      },
    ),
  );
  writeRequirement(
    "REQ-refunds-audit",
    requirement(
      "REQ-refunds-audit",
      "Every refund is written to the audit log.",
    ),
  );
  writeRequirement(
    "REQ-refunds-legacy",
    requirement("REQ-refunds-legacy", "Refunds are batched nightly."),
  );
  mkdirSync(path.join(root, ".kb", "scenarios"), { recursive: true });
  writeFileSync(
    path.join(root, ".kb", "scenarios", "SCEN-refunds-approval.md"),
    "---\nid: SCEN-refunds-approval\ntitle: Finance approves a large refund\nstatus: active\n---\nGiven a refund of 600 EUR, when it is submitted, then finance must approve it first.\n",
  );
  git("add", ".");
  git("commit", "-q", "-m", "base");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("kibi signoff summary", () => {
  // implements REQ-kibi-signoff-views
  test("lists new, rewritten, retired and code-affected requirements with their statements", async () => {
    writeRequirement(
      "REQ-refunds-approval",
      requirement(
        "REQ-refunds-approval",
        "Refunds above 1000 EUR need approval.",
        { firmness: "firm" },
      ),
    );
    writeRequirement(
      "REQ-refunds-currency",
      requirement("REQ-refunds-currency", "Refunds use the order currency.", {
        firmness: "exploratory",
      }),
    );
    writeRequirement(
      "REQ-refunds-legacy",
      requirement("REQ-refunds-legacy", "Refunds are batched nightly.", {
        status: "superseded",
      }),
    );
    mkdirSync(path.join(root, ".kb", "relationships"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "relationships", "00.yaml"),
      [
        "relationships:",
        "  - id: rel-1",
        "    type: specified_by",
        "    from: REQ-refunds-approval",
        "    to: SCEN-refunds-approval",
        "    created_at: 2026-10-22T09:00:00.000Z",
        "    created_by: test",
        "    source: test",
        "  - id: rel-2",
        "    type: supersedes",
        "    from: REQ-refunds-currency",
        "    to: REQ-refunds-legacy",
        "    created_at: 2026-10-22T09:00:00.000Z",
        "    created_by: test",
        "    source: test",
        "",
      ].join("\n"),
    );
    const proof = new Map<string, SignoffProof>([
      [
        "REQ-refunds-approval",
        { status: "unresolved", gate: "e2e", testCount: 1, contradictions: [] },
      ],
      [
        "REQ-refunds-audit",
        { status: "tested", gate: "tested", testCount: 2, contradictions: [] },
      ],
      [
        "REQ-refunds-currency",
        {
          status: "unresolved",
          gate: "semantic",
          testCount: 0,
          contradictions: ["Refund currency conflicts with REQ-x."],
        },
      ],
    ]);
    const out = capture();
    const view = (await signoffCommand(
      { format: "json" },
      {
        cwd: () => root,
        now,
        write: out.write,
        loadAffected: async () =>
          new Map([["REQ-refunds-audit", ["writeAudit", "auditRefund"]]]),
        loadProof: async () => proof,
      },
    )) as SignoffSummary;

    expect(view.kind).toBe("summary");
    expect(view.branch).toBe("main");
    expect(
      view.requirements.map((row) => [row.id, row.change, row.firmness]),
    ).toEqual([
      ["REQ-refunds-currency", "new", "exploratory"],
      ["REQ-refunds-approval", "changed", "firm"],
      ["REQ-refunds-audit", "affected", "firm"],
      ["REQ-refunds-legacy", "retired", "firm"],
    ]);
    const approval = view.requirements[1];
    expect(approval?.previousStatement).toBe(
      "Refunds above 500 EUR need approval.",
    );
    expect(approval?.statement).toBe("Refunds above 1000 EUR need approval.");
    expect(approval?.scenarios).toEqual([
      { id: "SCEN-refunds-approval", title: "Finance approves a large refund" },
    ]);
    expect(view.requirements[0]?.supersedes.map((ref) => ref.id)).toEqual([
      "REQ-refunds-legacy",
    ]);
    expect(view.requirements[2]?.symbols).toEqual([
      "auditRefund",
      "writeAudit",
    ]);
    expect(JSON.parse(out.chunks.join(""))).toEqual(
      JSON.parse(JSON.stringify(view)),
    );

    const markdown = renderSignoffMarkdown(view);
    expect(markdown.startsWith("```kibi-signoff\n")).toBe(true);
    expect(markdown.trimEnd().endsWith("```")).toBe(true);
    expect(markdown).toContain(
      "## Requirements signoff: 1 new, 1 changed, 1 affected, 1 retired",
    );
    expect(markdown).toContain(
      "- Was:\n  > Refunds above 500 EUR need approval.",
    );
    expect(markdown).toContain(
      "- Now:\n  > Refunds above 1000 EUR need approval.",
    );
    expect(markdown).toContain(
      "- Replaces REQ-refunds-legacy (firm): Refunds are batched nightly.",
    );
    expect(markdown).toContain("- Changed code: auditRefund, writeAudit");
    expect(markdown).toContain("- Proof: no end-to-end test yet, 1 test");
    expect(markdown).toContain("- Proof: tested, 2 tests");
    expect(markdown).toContain(
      "- Contradiction: Refund currency conflicts with REQ-x.",
    );

    for (const file of ["latest.json", "latest.md", "latest.html"]) {
      expect(
        existsSync(path.join(root, ".kb", "briefs", "signoff", file)),
      ).toBe(true);
    }
    expect(
      readFileSync(
        path.join(root, ".kb", "briefs", "signoff", "latest.md"),
        "utf8",
      ),
    ).not.toContain("```");
  });

  test("--staged reads the index, and the summary says when nothing changed", async () => {
    writeRequirement(
      "REQ-refunds-audit",
      requirement("REQ-refunds-audit", "Every refund is logged twice."),
    );
    const out = capture();
    const view = (await signoffCommand(
      { staged: true, proof: false },
      {
        cwd: () => root,
        now,
        write: out.write,
        loadAffected: async () => new Map(),
      },
    )) as SignoffSummary;
    expect(view.requirements).toEqual([]);
    expect(out.chunks.join("")).toContain(
      "## Requirements signoff: no requirement changes",
    );

    git("add", ".kb/requirements/REQ-refunds-audit.md");
    const staged = (await signoffCommand(
      { staged: true, proof: false },
      {
        cwd: () => root,
        now,
        write: () => {},
        loadAffected: async () => new Map(),
      },
    )) as SignoffSummary;
    expect(staged.requirements.map((row) => row.id)).toEqual([
      "REQ-refunds-audit",
    ]);
  });

  // implements REQ-kibi-signoff-views
  test("an agent requirement is approved by origin.approved_by, not by the exception approved_by", async () => {
    const agentRequirement = (approval: string) =>
      `---\nid: REQ-refunds-agent\ntitle: REQ-refunds-agent title\nstatus: open\nsemantic_text: Refunds are capped at the order total.\norigin:\n  kind: agent\n${approval}---\nRefunds are capped at the order total.\n\n## Context\n\nWhy this rule exists, in enough words for the context rule.\n`;
    const render = async () => {
      const out = capture();
      await signoffCommand(
        { staged: false, proof: false },
        {
          cwd: () => root,
          now,
          write: out.write,
          loadAffected: async () => new Map(),
        },
      );
      return out.chunks.join("");
    };
    writeRequirement("REQ-refunds-agent", agentRequirement(""));
    expect(await render()).toContain(
      "- Origin: agent, **awaiting your approval**",
    );
    writeRequirement(
      "REQ-refunds-agent",
      agentRequirement("approved_by: dana\n"),
    );
    expect(await render()).toContain(
      "- Origin: agent, **awaiting your approval**",
    );
    writeRequirement(
      "REQ-refunds-agent",
      agentRequirement("  approved_by: dana\n"),
    );
    const approved = await render();
    expect(approved).toContain("approved by dana");
    expect(approved).not.toContain("awaiting your approval");
  });

  test("names what it could not compute instead of failing", async () => {
    writeRequirement(
      "REQ-refunds-new",
      requirement("REQ-refunds-new", "Refunds are idempotent."),
    );
    const view = (await signoffCommand(
      {},
      {
        cwd: () => root,
        now,
        write: () => {},
        loadAffected: async () => {
          throw new Error("source analysis unavailable");
        },
        loadProof: async () =>
          new Map([
            [
              "REQ-other",
              {
                status: "tested",
                gate: "tested",
                testCount: 1,
                contradictions: [],
              },
            ],
          ]),
      },
    )) as SignoffSummary;
    expect(view.notes).toEqual([
      "Requirements affected by code changes could not be computed: source analysis unavailable",
      "REQ-refunds-new is not in the synced knowledge base yet; run kibi sync to see its proof state.",
    ]);
  });

  test("writes and opens the HTML page", async () => {
    const opened: string[] = [];
    const out = capture();
    await signoffCommand(
      { format: "html", open: true, output: "signoff.html", proof: false },
      {
        cwd: () => root,
        now,
        write: out.write,
        loadAffected: async () => new Map(),
        openReport: async (file) => {
          opened.push(file);
        },
      },
    );
    expect(opened).toEqual([path.join(root, "signoff.html")]);
    expect(readFileSync(path.join(root, "signoff.html"), "utf8")).toContain(
      "<h1>Requirements signoff</h1>",
    );
  });

  test("prints chat Markdown by default and names the page on stderr", async () => {
    writeRequirement(
      "REQ-refunds-new",
      requirement("REQ-refunds-new", "Refunds are idempotent."),
    );
    const out = capture();
    const notes = capture();
    await signoffCommand(
      { proof: false },
      {
        cwd: () => root,
        now,
        env: {},
        write: out.write,
        writeNote: notes.write,
        loadAffected: async () => new Map(),
      },
    );
    const text = out.chunks.join("");
    expect(text.startsWith("## Requirements signoff: 1 new\n")).toBe(true);
    expect(text).not.toContain("```");
    expect(text).toContain("> Refunds are idempotent.");
    expect(notes.chunks.join("")).toContain(
      path.join(root, ".kb", "briefs", "signoff", "latest.html"),
    );
  });

  test("KIBI_SIGNOFF_FORMAT sets the default for a host renderer", async () => {
    const out = capture();
    await signoffCommand(
      { proof: false },
      {
        cwd: () => root,
        now,
        env: { KIBI_SIGNOFF_FORMAT: "md" },
        write: out.write,
        loadAffected: async () => new Map(),
      },
    );
    expect(out.chunks.join("").startsWith("```kibi-signoff\n")).toBe(true);

    const fallback = capture();
    await signoffCommand(
      { proof: false },
      {
        cwd: () => root,
        now,
        env: { KIBI_SIGNOFF_FORMAT: "fancy" },
        write: fallback.write,
        writeNote: () => {},
        loadAffected: async () => new Map(),
      },
    );
    expect(fallback.chunks.join("")).toStartWith("## Requirements signoff");
  });

  test("rejects an unknown format", async () => {
    await expect(
      signoffCommand({ format: "pdf" }, { cwd: () => root }),
    ).rejects.toThrow('Unknown signoff format "pdf"');
  });
});

describe("rewritten statements", () => {
  const previous =
    "Refunds are logged. Refunds above 500 EUR need approval. Refunds are idempotent.";
  const statement =
    "Refunds are logged. Refunds above 1000 EUR need approval. Refunds are idempotent. Refunds notify the buyer.";

  test("marks the sentences a rewrite adds and removes", () => {
    expect(statementSentenceDiff(previous, statement)).toEqual([
      { text: "Refunds are logged.", change: "kept" },
      { text: "Refunds above 1000 EUR need approval.", change: "added" },
      { text: "Refunds above 500 EUR need approval.", change: "removed" },
      { text: "Refunds are idempotent.", change: "kept" },
      { text: "Refunds notify the buyer.", change: "added" },
    ]);
    expect(statementSentenceDiff("Old rule.", "New rule.")).toBeUndefined();
  });

  test("shows a partial rewrite as one statement with the changes marked", () => {
    const summary: SignoffSummary = {
      version: "kibi.signoff.v1",
      kind: "summary",
      scope: "working",
      generatedAt: "2026-10-23T09:00:00.000Z",
      notes: [],
      requirements: [
        {
          id: "REQ-refunds",
          title: "Refund rules",
          change: "changed",
          status: "open",
          statement,
          previousStatement: previous,
          originKind: "agent",
          supersedes: [],
          scenarios: [],
          symbols: [],
          source: ".kb/requirements/REQ-refunds.md",
        },
      ],
    };
    const markdown = renderSignoffChatMarkdown(summary);
    expect(markdown).toContain(
      "- Now, sentences 2 added in bold, 1 removed struck through:\n  > Refunds are logged. **Refunds above 1000 EUR need approval.** ~~Refunds above 500 EUR need approval.~~ Refunds are idempotent. **Refunds notify the buyer.**",
    );
    expect(markdown).not.toContain("- Was:");
    expect(markdown).toContain(
      "**Requirement 1 was written by the agent and waits for your approval.**",
    );
    expect(markdown).toContain("- Origin: agent, **awaiting your approval**");
    const html = renderSignoffHtml(summary);
    expect(html).toContain("<ins>Refunds notify the buyer.</ins>");
    expect(html).toContain("awaits your approval</span>");
    expect(html).toContain("<del>Refunds above 500 EUR need approval.</del>");
  });
});

describe("kibi signoff --questions", () => {
  test("numbers the questions and quotes recorded rules from the knowledge base", async () => {
    const out = capture();
    const view = await signoffCommand(
      { questions: "-", format: "md" },
      {
        cwd: () => root,
        now,
        write: out.write,
        readStdin: () =>
          JSON.stringify({
            questions: [
              {
                title: "Refund currency",
                statement: "Refunds use the order currency.",
                quote: "always refund in the order's currency",
                firmness: "firm",
                governs: ["src/refunds.ts"],
                question: "Record this as a firm rule?",
              },
              {
                id: "REQ-refunds-approval",
                statement: "Refunds above 1000 EUR need approval.",
                quote: "raise it to 1000",
                conflictsWith: ["REQ-refunds-audit", "REQ-missing"],
              },
              {
                title: "Nightly batch",
                statement: "Refunds are batched nightly.",
                answer: "drop it",
              },
            ],
          }),
      },
    );
    expect(view.kind).toBe("questions");
    const markdown = out.chunks.join("");
    expect(markdown.startsWith("```kibi-questions\n")).toBe(true);
    expect(markdown).toContain("## Decisions to confirm: 2 open, 1 answered");
    expect(markdown).toContain(
      "**1. New rule: Refund currency** · would be firm",
    );
    expect(markdown).toContain(
      '- Your words: "always refund in the order\'s currency"',
    );
    expect(markdown).toContain(
      "**2. Change REQ-refunds-approval: REQ-refunds-approval title**",
    );
    expect(markdown).toContain(
      "- Recorded now (firm):\n  > Refunds above 500 EUR need approval.\n- Proposed:\n  > Refunds above 1000 EUR need approval.",
    );
    expect(markdown).toContain(
      "- Conflicts with REQ-refunds-audit (firm): Every refund is written to the audit log.",
    );
    expect(markdown).toContain(
      "~~**3. New rule: Nightly batch**~~ · answered: drop it",
    );
    expect(markdown).toContain(
      "Note: Question 2: REQ-missing is not a recorded requirement.",
    );
  });

  test("validates the questions input", () => {
    expect(() => parseSignoffQuestionsInput("nope")).toThrow(
      "Questions input is not valid JSON",
    );
    expect(() => parseSignoffQuestionsInput("[]")).toThrow(
      "at least one question",
    );
    expect(() => parseSignoffQuestionsInput('[{"quote":"x"}]')).toThrow(
      "questions[0].statement is required",
    );
    expect(() =>
      parseSignoffQuestionsInput('[{"statement":"x","firmness":"strong"}]'),
    ).toThrow("questions[0].firmness must be firm, default or exploratory");
    expect(() =>
      parseSignoffQuestionsInput('[{"statement":"x","governs":"a.ts"}]'),
    ).toThrow("questions[0].governs must be an array of strings");
    expect(parseSignoffQuestionsInput('[{"statement":"  a\\n b "}]')).toEqual([
      { statement: "a b" },
    ]);
  });
});

describe("signoff HTML", () => {
  test("escapes knowledge-base text and loads nothing from the network", () => {
    const view: SignoffView = {
      version: "kibi.signoff.v1",
      kind: "summary",
      scope: "working",
      generatedAt: "2026-10-22T09:00:00.000Z",
      requirements: [
        {
          id: "REQ-x",
          title: "<script>alert(1)</script>",
          change: "new",
          status: "open",
          statement: 'Use "quotes" & <b>tags</b>',
          supersedes: [],
          scenarios: [],
          symbols: [],
          source: ".kb/requirements/REQ-x.md",
        },
      ],
      notes: [],
    };
    const html = renderSignoffHtml(view);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain(
      "Use &quot;quotes&quot; &amp; &lt;b&gt;tags&lt;/b&gt;",
    );
    expect(html).toContain("Content-Security-Policy");
    expect(html).not.toMatch(/(?:src|href)="https?:/);
  });
});

describe("signoff evidence floors and certificates", () => {
  const proof: SignoffProof = {
    status: "missing",
    gate: "e2e",
    testCount: 0,
    evidenceLevel: "asserted",
    evidenceFloor: { required: "asserted", source: "explicit", status: "met" },
    contradictions: [],
    certificateRejections: [
      "TEST-x: certificate rejected, the domain gained a member",
    ],
  };

  test("names the floor and says when required_evidence set it", () => {
    expect(floorLabel(undefined)).toBeUndefined();
    expect(
      floorLabel({ required: "unverified", source: "firmness", status: "met" }),
    ).toBeUndefined();
    expect(
      floorLabel({ required: "tested", source: "firmness", status: "below" }),
    ).toBe("floor tested (below)");
    expect(
      floorLabel({
        required: "tested",
        source: "firmness",
        status: "pending_reproof",
      }),
    ).toBe("floor tested (pending re-proof)");
    expect(proofLabel(proof)).toBe(
      "no end-to-end test yet, 0 tests; evidence asserted; floor asserted set by required_evidence (met)",
    );
  });

  test("Markdown and HTML list certificates that no longer re-check", () => {
    const view: SignoffView = {
      version: "kibi.signoff.v1",
      kind: "summary",
      scope: "working",
      generatedAt: "2026-10-22T09:00:00.000Z",
      requirements: [
        {
          id: "REQ-x",
          title: "Palette",
          change: "affected",
          status: "open",
          statement: "The palette is red, green or blue.",
          supersedes: [],
          scenarios: [],
          symbols: ["SYM-palette"],
          proof,
          source: ".kb/requirements/REQ-x.md",
        },
      ],
      notes: [],
    };
    const markdown = renderSignoffMarkdown(view);
    expect(markdown).toContain("floor asserted set by required_evidence (met)");
    expect(markdown).toContain(
      "- Certificate: TEST-x: certificate rejected, the domain gained a member",
    );
    const html = renderSignoffHtml(view);
    expect(html).toContain(
      "TEST-x: certificate rejected, the domain gained a member",
    );
  });
});
