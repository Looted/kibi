import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  pathTopicWords,
  rankRequirementCandidates,
  replacedRequirements,
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

  test("a closed requirement is offered only after every current one", () => {
    const ranked = rankRequirementCandidates(COACH_PAGE, [
      {
        id: "REQ-coach-dashboard-done",
        title: "Coach dashboard shows totals",
        status: " Closed ",
      },
      { id: "REQ-dashboard-theme", title: "The dashboard follows the theme" },
    ]);
    expect(ranked.map((candidate) => candidate.id)).toEqual([
      "REQ-dashboard-theme",
      "REQ-coach-dashboard-done",
    ]);
  });

  test("a closed requirement a current one supersedes is not offered", () => {
    const root = workspace({
      "REQ-old": "title: Coach dashboard shows totals\nstatus: closed",
      "REQ-done": "title: Coach dashboard exports totals\nstatus: closed",
      "REQ-new":
        "title: Coach inbox lists requests\nstatus: open\nlinks:\n  - type: supersedes\n    target: REQ-old",
      // A closed successor does not make its predecessor stale.
      "REQ-gone": "title: Coach dashboard counts sessions\nstatus: closed",
      "REQ-later":
        "title: Payments settle daily\nstatus: closed\nlinks:\n  - type: supersedes\n    target: REQ-gone",
      // Nor does a retired one, or a link of another type.
      "REQ-gone-too": "title: Coach dashboard counts minutes\nstatus: closed",
      "REQ-retired":
        "title: Payments refund weekly\nstatus: deprecated\nlinks:\n  - type: supersedes\n    target: REQ-gone-too",
      "REQ-related":
        "title: Payments refund monthly\nstatus: open\nlinks:\n  - type: relates_to\n    target: REQ-gone-too",
      "REQ-plain": "title: Payments settle weekly\nstatus: open",
    });
    expect(
      requirementCandidatesForPath(root, COACH_PAGE).map(
        (candidate) => candidate.id,
      ),
    ).toEqual(["REQ-new", "REQ-done", "REQ-gone"]);
    expect(
      requirementCandidatesForPath(root, COACH_PAGE, 5).map(
        (candidate) => candidate.id,
      ),
    ).toEqual(["REQ-new", "REQ-done", "REQ-gone", "REQ-gone-too"]);
  });

  test("a closed requirement reached by request words alone is also checked for a successor", () => {
    const root = workspace({
      "REQ-old": "title: Owner removal keeps one owner\nstatus: closed",
      "REQ-new":
        "title: Owner removal needs a second owner\nstatus: open\nlinks:\n  - type: supersedes\n    target: REQ-old",
    });
    expect(
      requirementCandidatesForPath(
        root,
        "src/app/index.ts",
        3,
        requestTopicWords("Owner removal must keep one owner"),
      ).map((candidate) => candidate.id),
    ).toEqual(["REQ-new"]);
  });

  test("only closed requirements are ever treated as replaced", () => {
    const root = workspace({
      "REQ-a": "title: Payments settle daily\nstatus: open",
      "REQ-b":
        "title: Payments settle hourly\nstatus: open\nlinks:\n  - type: supersedes\n    target: REQ-a",
    });
    expect(
      replacedRequirements(
        root,
        [
          { id: "REQ-a", title: "Payments settle daily", status: "open" },
          { id: "REQ-b", title: "Payments settle hourly", status: "open" },
        ],
        new Set(["REQ-c"]),
      ),
    ).toEqual(new Set());
    // An open requirement the path reaches stays offered even though a
    // current one names it in a supersedes link.
    const reached = workspace({
      "REQ-a": "title: Coach dashboard shows totals\nstatus: open",
      "REQ-b":
        "title: Payments settle hourly\nstatus: open\nlinks:\n  - type: supersedes\n    target: REQ-a",
    });
    expect(
      requirementCandidatesForPath(reached, COACH_PAGE).map(
        (candidate) => candidate.id,
      ),
    ).toEqual(["REQ-a"]);
  });

  test("supersedes links in relationship shards also retire a closed requirement", () => {
    const root = workspace({
      "REQ-old": "title: Coach dashboard shows totals\nstatus: closed",
      "REQ-new": "title: Payments settle daily\nstatus: open",
    });
    const shard = createHash("sha256")
      .update("REQ-new")
      .digest("hex")
      .slice(0, 2);
    fs.mkdirSync(path.join(root, ".kb", "relationships"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".kb", "relationships", `${shard}.yaml`),
      "relationships:\n  - type: supersedes\n    from: REQ-new\n    to: REQ-old\n",
    );
    expect(requirementCandidatesForPath(root, COACH_PAGE)).toEqual([]);
    expect(
      replacedRequirements(
        root,
        [
          {
            id: "REQ-old",
            title: "Coach dashboard shows totals",
            status: "closed",
          },
          { id: "REQ-new", title: "Payments settle daily", status: "open" },
        ],
        new Set(["REQ-old"]),
      ),
    ).toEqual(new Set(["REQ-old"]));
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
