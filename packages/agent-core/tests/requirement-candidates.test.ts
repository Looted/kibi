// implements REQ-kb-unowned-file-candidates, REQ-claude-request-topic-candidates
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  pathTopicWords,
  rankRequirementCandidates,
  requestTopicWords,
  requirementCandidatesForPath,
} from "../src/requirement-candidates";
import { MAX_SNIPPET_CHARS, unownedSourceNote } from "../src/snippets";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function workspace(requirements: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-candidates-"));
  roots.push(root);
  const directory = path.join(root, ".kb", "requirements");
  fs.mkdirSync(directory, { recursive: true });
  for (const [id, frontMatter] of Object.entries(requirements)) {
    fs.writeFileSync(
      path.join(directory, `${id}.md`),
      `---\nid: ${id}\n${frontMatter}\n---\n\nBody.\n`,
    );
  }
  return root;
}

const COACH_PAGE = "src/app/pages/coach-dashboard/coach-dashboard.html";

describe("candidate requirements for an unlinked file", () => {
  test("path words drop layout, language and role words", () => {
    expect(pathTopicWords(COACH_PAGE)).toEqual(["coach", "dashboard"]);
    expect(pathTopicWords("src/services/BillingInvoices.service.ts")).toEqual([
      "billing",
      "invoice",
    ]);
    expect(pathTopicWords("src/app/index.ts")).toEqual([]);
  });

  test("current requirements sharing the path's words are named, best first", () => {
    const ranked = rankRequirementCandidates(COACH_PAGE, [
      {
        id: "REQ-AUTO-E1EE",
        title:
          "The coach inbox must list the analysis requests assigned to the coach.",
        status: "open",
      },
      { id: "REQ-dashboard-theme", title: "The dashboard follows the theme" },
      {
        id: "REQ-coach-dashboard-old",
        title: "Coach dashboard shows totals",
        status: "superseded",
      },
      { id: "REQ-login", title: "Users sign in with a password" },
    ]);
    expect(ranked.map((candidate) => candidate.id)).toEqual([
      "REQ-AUTO-E1EE",
      "REQ-dashboard-theme",
    ]);
  });

  test("requirement documents are read from the KB, at most three", () => {
    const root = workspace({
      "REQ-a": "title: Coach inbox lists requests\nstatus: open",
      "REQ-b": "title: 'Coach profile shows ratings'",
      "REQ-c": "title: Coach dashboard counts pending requests",
      "REQ-d": "title: Coach availability is weekly",
      "REQ-e": "title: Payments settle daily",
    });
    expect(
      requirementCandidatesForPath(root, COACH_PAGE).map(
        (candidate) => candidate.id,
      ),
    ).toEqual(["REQ-c", "REQ-a", "REQ-b"]);
    expect(requirementCandidatesForPath(root, "src/app/index.ts")).toEqual([]);
    expect(
      requirementCandidatesForPath(path.join(root, "missing"), COACH_PAGE),
    ).toEqual([]);
  });

  test("the unowned-file note names the candidates and says no link is not no rule", () => {
    const note = unownedSourceNote(COACH_PAGE, [
      {
        id: "REQ-AUTO-E1EE",
        title:
          "The coach inbox must list the analysis requests assigned to the coach.",
      },
    ]);
    expect(note).toContain("that does not mean no recorded rule covers");
    expect(note).toContain(
      "Requirements whose titles share words with this path or the request: REQ-AUTO-E1EE: The coach inbox",
    );
    expect(note).toContain('kb_query({id:"REQ-AUTO-E1EE"})');
    expect(unownedSourceNote(COACH_PAGE)).not.toContain("titles share");
  });

  test("the note drops candidates rather than exceed the snippet budget", () => {
    const deep = `src/${"coach-dashboard/".repeat(12)}coach-dashboard.html`;
    const long = "Coach dashboard ".repeat(10);
    const note = unownedSourceNote(deep, [
      { id: "REQ-a", title: long },
      { id: "REQ-b", title: long },
      { id: "REQ-c", title: long },
    ]);
    expect(note.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);
    expect(note).toContain("REQ-a");
    expect(note).not.toContain("REQ-c");
  });

  test("request words reach a requirement the path does not name", () => {
    const words = requestTopicWords(
      "Please make sure API keys never expire after 30 days.",
    );
    expect(words).toEqual(["api", "keys", "expire", "after", "days"]);
    const heads = [
      { id: "REQ-key-expiry", title: "API keys expire after a fixed period" },
      { id: "REQ-docs-expiry", title: "Documents expire after deletion" },
      { id: "REQ-intake", title: "Intake emails are signed" },
    ];
    // One shared request word is chance; two make a candidate.
    expect(
      rankRequirementCandidates("src/routes/tokens.ts", heads, 3, words).map(
        (candidate) => candidate.id,
      ),
    ).toEqual(["REQ-key-expiry", "REQ-docs-expiry"]);
    expect(
      rankRequirementCandidates("src/routes/tokens.ts", heads, 3, ["api"]),
    ).toEqual([]);
    // Path words still lead.
    expect(
      rankRequirementCandidates("src/intake/handler.ts", heads, 3, words)[0]
        ?.id,
    ).toBe("REQ-intake");
  });

  test("with no candidate, the note says nothing recorded is known to cover the file and asks for the decision to be recorded", () => {
    const note = unownedSourceNote("src/routes/tokens.ts");
    expect(note).toContain("that does not mean no recorded rule covers");
    expect(note).toContain("nothing recorded is known to cover it");
    expect(note).toContain("is recorded with kb_upsert");
    expect(note.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);
  });
});
