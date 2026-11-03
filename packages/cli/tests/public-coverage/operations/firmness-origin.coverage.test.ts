import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  DECISION_FIRM_EDITED_RULE,
  collectDecisionFirmnessViolations,
} from "../../../src/public/operations/decision-firmness.js";
import {
  EXCEPTION_UNAPPROVED_RULE,
  collectOriginReviewViolations,
} from "../../../src/public/operations/origin-review.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function requirement(id: string, title: string): string {
  return `---\nid: ${id}\ntitle: ${title}\nstatus: open\nfirmness: firm\ncreated_at: 2026-01-01T00:00:00Z\nupdated_at: 2026-01-01T00:00:00Z\n---\n${title}.\n`;
}

describe("collectDecisionFirmnessViolations", () => {
  test("judges firm decisions edited since HEAD, and skips new ones", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-firm-edit-cov-"));
    roots.push(root);
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, stdio: "pipe", encoding: "utf8" });
    const write = (path: string, content: string) => {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    };
    git("init", "-q");
    git("config", "user.name", "Fixture");
    git("config", "user.email", "fixture@example.invalid");
    write(".kb/requirements/REQ-b.md", requirement("REQ-b", "Keep B"));
    write(".kb/requirements/REQ-a.md", requirement("REQ-a", "Keep A"));
    git("add", ".");
    git("commit", "-qm", "baseline");
    write(".kb/requirements/REQ-b.md", requirement("REQ-b", "Drop B"));
    write(".kb/requirements/REQ-a.md", requirement("REQ-a", "Drop A"));
    write(".kb/requirements/REQ-c.md", requirement("REQ-c", "New C"));
    git("add", ".");
    const violations = collectDecisionFirmnessViolations(
      new Set([DECISION_FIRM_EDITED_RULE]),
      root,
    );
    expect(
      violations
        .filter((violation) => violation.rule === DECISION_FIRM_EDITED_RULE)
        .map((violation) => violation.entityId),
    ).toStrictEqual(["REQ-a", "REQ-b"]);
  });
});

describe("collectOriginReviewViolations", () => {
  function port(rows: { success: boolean; Rows?: string; error?: string }) {
    return {
      async query(goal: string) {
        if (goal.startsWith("kb_query_entities"))
          return { success: true, bindings: { Results: "[]" } };
        return {
          success: rows.success,
          bindings: rows.Rows === undefined ? {} : { Rows: rows.Rows },
          ...(rows.error !== undefined ? { error: rows.error } : {}),
        };
      },
    };
  }
  const rules = new Set([EXCEPTION_UNAPPROVED_RULE]);

  test("reads the review relationships", async () => {
    expect(
      await collectOriginReviewViolations(
        port({ success: true, Rows: "[[exempts,'REQ-a','REQ-b']]" }),
        rules,
      ),
    ).toStrictEqual([]);
  });

  test("a failed relationship read throws", async () => {
    await expect(
      collectOriginReviewViolations(port({ success: false, error: "x" }), rules),
    ).rejects.toThrow(
      "Unable to read exempts, supersedes and ADR relationships: x",
    );
    await expect(
      collectOriginReviewViolations(port({ success: false }), rules),
    ).rejects.toThrow(
      "Unable to read exempts, supersedes and ADR relationships: query failed",
    );
  });
});
