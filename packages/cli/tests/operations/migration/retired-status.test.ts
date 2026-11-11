import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  REQ_RETIRED_STATUS_ACTION_PREFIX,
  REQ_RETIRED_STATUS_SUGGEST_CODE,
  RETIRED_REQUIREMENT_STATUS,
  RETIRED_STATUS_SCHEMA_VERSION,
  applyRetiredStatus,
  planRetiredStatusSuggestions,
} from "../../../src/operations/migration/retired-status.js";
import {
  SCHEMA6_APPROVABLE_REVIEW_CODES,
  SCHEMA6_AUTOMATIC_CODES,
  applySchema6MigrationAction,
  retiredStatusActions,
} from "../../../src/operations/migration/schema6.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../../src/utils/schema-version.js";

// implements REQ-kb-requirement-retired-status

function write(root: string, relative: string, content: string): string {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

function requirement(
  root: string,
  id: string,
  front: string,
  body = "The requirement statement.\n",
): string {
  return write(
    root,
    `.kb/requirements/${id}.md`,
    `---\nid: ${id}\ntype: req\n${front}---\n\n${body}`,
  );
}

const read = (file: string) => readFileSync(file, "utf8");

describe("retired status suggestions", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-retired-status-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("schema 14 is the latest schema and adds the retired status", () => {
    expect(RETIRED_STATUS_SCHEMA_VERSION).toBe(14);
    expect(LATEST_KB_SCHEMA_VERSION).toBe(RETIRED_STATUS_SCHEMA_VERSION);
    expect(RETIRED_REQUIREMENT_STATUS).toBe("retired");
  });

  test("suggests closed requirements whose own source says they were retired, strongest signal first", () => {
    requirement(
      root,
      "REQ-exempt",
      "title: Audit log\nstatus: closed\nproof_exempt: true\nproof_exempt_reason: Retired on 2026-10-30 because audit.log is gone.\ntags:\n  - historical-status:retired\n",
    );
    requirement(
      root,
      "REQ-body",
      "title: Briefs\nstatus: closed\n",
      "# Briefs\n\nThe statement.\n\n## Context\n> This requirement was archived when briefs were removed.\nIt stays for history.\n",
    );
    requirement(
      root,
      "REQ-tag",
      "title: Old roles\nstatus: closed\ntags:\n  - core\n  - historical-status:superseded\n",
    );
    requirement(
      root,
      "REQ-title",
      "title: Users have 3 roles (retired demo)\nstatus: closed\n",
    );
    // A missing id falls back to the file name.
    write(
      root,
      ".kb/requirements/REQ-nameless.md",
      "---\ntitle: Archived export\nstatus: closed\n---\n\nBody.\n",
    );

    const suggestions = planRetiredStatusSuggestions(root);

    expect(suggestions).toStrictEqual([
      {
        requirementId: "REQ-body",
        path: ".kb/requirements/REQ-body.md",
        signals: [
          {
            field: "body",
            text: "This requirement was archived when briefs were removed.",
          },
        ],
        retiredReason:
          "This requirement was archived when briefs were removed.",
      },
      {
        requirementId: "REQ-exempt",
        path: ".kb/requirements/REQ-exempt.md",
        signals: [
          {
            field: "proof_exempt_reason",
            text: "Retired on 2026-10-30 because audit.log is gone.",
          },
          { field: "tags", text: "historical-status:retired" },
        ],
        retiredReason: "Retired on 2026-10-30 because audit.log is gone.",
      },
      {
        requirementId: "REQ-nameless",
        path: ".kb/requirements/REQ-nameless.md",
        signals: [{ field: "title", text: "Archived export" }],
        retiredReason: "Its title marks it retired: Archived export.",
      },
      {
        requirementId: "REQ-tag",
        path: ".kb/requirements/REQ-tag.md",
        signals: [{ field: "tags", text: "historical-status:superseded" }],
        retiredReason:
          "Recorded with the tag historical-status:superseded and no successor before requirements had a retired status.",
      },
      {
        requirementId: "REQ-title",
        path: ".kb/requirements/REQ-title.md",
        signals: [
          { field: "title", text: "Users have 3 roles (retired demo)" },
        ],
        retiredReason:
          "Its title marks it retired: Users have 3 roles (retired demo).",
      },
    ]);
  });

  test("leaves open, superseded, already retired and silent requirements alone", () => {
    requirement(root, "REQ-open", "title: Retired export\nstatus: open\n");
    requirement(
      root,
      "REQ-retired",
      "title: Retired export\nstatus: retired\nretired_reason: Gone.\n",
    );
    requirement(root, "REQ-old", "title: Archived roles\nstatus: closed\n");
    requirement(
      root,
      "REQ-new",
      "title: Roles\nstatus: open\nlinks:\n  - type: supersedes\n    target: REQ-old\n",
    );
    requirement(
      root,
      "REQ-shard-old",
      "title: Archived audit\nstatus: closed\n",
    );
    write(
      root,
      ".kb/relationships/aa.yaml",
      "relationships:\n  - type: supersedes\n    from: REQ-new\n    to: REQ-shard-old\n    id: rel-1\n    created_at: '2026-11-11T00:00:00Z'\n    created_by: test\n    source: test\n",
    );
    // Words that only mention retirement, or retire something else.
    requirement(
      root,
      "REQ-done",
      "title: Export runs nightly\nstatus: closed\nproof_exempt: true\nproof_exempt_reason: Verified by the nightly job.\ntags:\n  - historical-status:active\n",
      "The export runs nightly.\n\n## Context\nThe old exporter was retired in May.\nIt retired cleanly.\n",
    );
    write(root, ".kb/requirements/REQ-plain.md", "No front matter.\n");

    expect(planRetiredStatusSuggestions(root)).toStrictEqual([]);
    expect(retiredStatusActions(root)).toStrictEqual([]);
  });

  test("plans one review action per suggestion that applies only when approved", async () => {
    const file = requirement(
      root,
      "REQ-audit",
      "title: Audit log\nstatus: closed\nproof_exempt_reason: Retired on 2026-10-30.\n",
    );
    const [action] = retiredStatusActions(root);

    expect(action).toMatchObject({
      id: `${REQ_RETIRED_STATUS_ACTION_PREFIX}REQ-audit`,
      code: REQ_RETIRED_STATUS_SUGGEST_CODE,
      category: "semantic",
      safety: "review",
      autoApplicable: false,
      affectedEntityIds: ["REQ-audit"],
      affectedFiles: [".kb/requirements/REQ-audit.md"],
      postconditions: [
        {
          rule: "retired-reason-missing",
          entityId: "REQ-audit",
          findings: 0,
        },
      ],
      dispositionRequired: true,
      allowedDispositions: ["fixed", "deferred"],
      evidence: {
        signals: [
          { field: "proof_exempt_reason", text: "Retired on 2026-10-30." },
        ],
        retiredReason: "Retired on 2026-10-30.",
        approve:
          "kibi migrate --apply-safe --approved-plan-hash <this plan's planHash> --approved-action req-retired-status-REQ-audit",
      },
    });
    expect(action?.invocation).toMatchObject({ kind: "cli" });
    expect(
      action?.invocation.kind === "cli" && action.invocation.command_argv,
    ).toContain("req-retired-status-REQ-audit");
    expect(
      SCHEMA6_APPROVABLE_REVIEW_CODES.has(REQ_RETIRED_STATUS_SUGGEST_CODE),
    ).toBe(true);
    expect(SCHEMA6_AUTOMATIC_CODES.has(REQ_RETIRED_STATUS_SUGGEST_CODE)).toBe(
      false,
    );

    const before = read(file);
    await applySchema6MigrationAction(action as NonNullable<typeof action>, {
      workspaceRoot: root,
      clock: () => new Date("2026-11-11T00:00:00.000Z"),
    });
    expect(read(file)).toBe(
      before
        .replace("status: closed\n", "status: retired\n")
        .replace(
          "proof_exempt_reason: Retired on 2026-10-30.\n",
          "proof_exempt_reason: Retired on 2026-10-30.\nretired_reason: Retired on 2026-10-30.\n",
        ),
    );
    expect(planRetiredStatusSuggestions(root)).toStrictEqual([]);
  });

  test("the executor refuses an action that names no file or reason", async () => {
    const [action] = (() => {
      requirement(
        root,
        "REQ-audit",
        "title: Audit log\nstatus: closed\nproof_exempt_reason: Retired.\n",
      );
      return retiredStatusActions(root);
    })();
    const context = { workspaceRoot: root, clock: () => new Date() };
    const base = action as NonNullable<typeof action>;
    await expect(
      applySchema6MigrationAction({ ...base, affectedFiles: [] }, context),
    ).rejects.toThrow(
      "Retired status suggestion names no file or reason; set status: retired and retired_reason by hand.",
    );
    await expect(
      applySchema6MigrationAction(
        { ...base, evidence: { ...base.evidence, retiredReason: 3 } },
        context,
      ),
    ).rejects.toThrow("names no file or reason");
  });

  test("applying refuses a requirement that is no longer closed or cannot be edited in place", () => {
    const open = requirement(root, "REQ-open", "title: X\nstatus: open\n");
    expect(() =>
      applyRetiredStatus(root, ".kb/requirements/REQ-open.md", "Gone."),
    ).toThrow(
      ".kb/requirements/REQ-open.md is no longer closed; rerun kibi migrate and approve the new plan.",
    );
    expect(read(open)).toContain("status: open\n");
    expect(() =>
      applyRetiredStatus(root, ".kb/requirements/REQ-missing.md", "Gone."),
    ).toThrow("is no longer closed");
    write(root, ".kb/requirements/REQ-bare.md", "status: closed\n");
    expect(() =>
      applyRetiredStatus(root, ".kb/requirements/REQ-bare.md", "Gone."),
    ).toThrow("is no longer closed");
    // A status written as a block scalar cannot be replaced on its line.
    const folded = requirement(
      root,
      "REQ-folded",
      "title: X\nstatus: >-\n  closed\n",
    );
    expect(() =>
      applyRetiredStatus(root, ".kb/requirements/REQ-folded.md", "Gone."),
    ).toThrow(
      ".kb/requirements/REQ-folded.md: status and retired_reason could not be set without changing other fields; set them by hand.",
    );
    expect(read(folded)).toContain("status: >-\n  closed\n");
  });

  test("a reason that cannot be written in place leaves the file unchanged", () => {
    const file = requirement(
      root,
      "REQ-audit",
      "title: X\nstatus: closed\nretired_reason:\n  - a\n  - b\n",
    );
    const before = read(file);
    expect(() =>
      applyRetiredStatus(root, ".kb/requirements/REQ-audit.md", "Gone."),
    ).toThrow("could not be set without changing other fields");
    expect(read(file)).toBe(before);
  });
});
