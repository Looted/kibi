import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  MigrationAction,
  MigrationPlan,
} from "../../src/public/operations/migration-plan.js";
import { spawnSync } from "../helpers/isolated-env.js";


const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 240_000;

function runKibi(args: string[], cwd: string, input?: string) {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    ...(input !== undefined ? { input } : {}),
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function git(cwd: string, ...args: string[]): void {
  spawnSync("git", args, { cwd, encoding: "utf8" });
}

function write(root: string, relative: string, content: string): void {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function read(root: string, relative: string): string {
  return readFileSync(path.join(root, relative), "utf8");
}

const DATES =
  "created_at: 2026-10-01T00:00:00.000Z\nupdated_at: 2026-10-01T00:00:00.000Z\n";

function requirement(id: string, status: string, extra = ""): string {
  return `---\nid: ${id}\ntype: req\ntitle: ${id} keeps an audit trail of writes\nstatus: ${status}\n${DATES}origin:\n  kind: import\n${extra}---\n\n${id} keeps an audit trail of every write.\n`;
}

function fact(id: string): string {
  return `---\nid: ${id}\ntype: fact\ntitle: Audit trail of writes\nstatus: active\n${DATES}fact_kind: observation\n---\n\nThe audit trail records every write with its time and operation.\n`;
}

type Violation = { rule: string; entityId: string };

function violations(root: string, rules: string): Violation[] {
  const check = runKibi(["check", "--rules", rules, "--format", "json"], root);
  return (
    JSON.parse(check.stdout) as {
      structuredContent: { violations: Violation[] };
    }
  ).structuredContent.violations
    .map(({ rule, entityId }) => ({ rule, entityId }))
    .sort((left, right) => left.entityId.localeCompare(right.entityId));
}

describe("retired requirements", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-test-retired-")),
    );
    git(root, "init", "-b", "main");
    git(root, "config", "user.email", "test@example.com");
    git(root, "config", "user.name", "Kibi Test");
    git(root, "commit", "--allow-empty", "-m", "init");
    expect(runKibi(["init", "--no-hooks"], root).status).toBe(0);
  });

  afterEach(() => {
    runKibi(["engine", "stop"], root);
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test(
    "kibi check asks a retired requirement why and reports what it alone still owns, and search stops treating it as governing",
    () => {
      write(
        root,
        ".kb/requirements/REQ-audit-retired.md",
        requirement(
          "REQ-audit-retired",
          "retired",
          "retired_reason: Retired on 2026-10-30 because writes no longer keep an audit trail.\nlinks:\n  - type: constrains\n    target: FACT-audit-only\n  - type: constrains\n    target: FACT-audit-shared\n",
        ),
      );
      write(
        root,
        ".kb/requirements/REQ-audit-unexplained.md",
        requirement("REQ-audit-unexplained", "retired"),
      );
      write(
        root,
        ".kb/requirements/REQ-audit-live.md",
        requirement(
          "REQ-audit-live",
          "closed",
          "links:\n  - type: constrains\n    target: FACT-audit-shared\n",
        ),
      );
      write(root, ".kb/facts/FACT-audit-only.md", fact("FACT-audit-only"));
      write(root, ".kb/facts/FACT-audit-shared.md", fact("FACT-audit-shared"));
      git(root, "add", "--all");
      const sync = runKibi(["sync"], root);
      expect(sync.status, `${sync.stdout}\n${sync.stderr}`).toBe(0);

      expect(
        violations(
          root,
          "retired-reason-missing,retired-owner-only,req-status-vocabulary",
        ),
      ).toEqual([
        { rule: "retired-owner-only", entityId: "FACT-audit-only" },
        { rule: "retired-reason-missing", entityId: "REQ-audit-unexplained" },
      ]);

      const search = runKibi(
        ["search", "--input", "-"],
        root,
        JSON.stringify({ query: "audit trail of every write", limit: 6 }),
      );
      expect(search.status, search.stderr).toBe(0);
      const answer = (
        JSON.parse(search.stdout) as {
          data: {
            answer: {
              governing: Array<{ id: string }>;
              notGoverning: Array<{ id: string }>;
            };
          };
        }
      ).data.answer;
      const governing = answer.governing.map((row) => row.id);
      expect(governing).not.toContain("REQ-audit-retired");
      expect(governing).not.toContain("REQ-audit-unexplained");
    },
    TIMEOUT_MS,
  );

  test(
    "kb_upsert refuses status retired without retired_reason",
    () => {
      const refused = runKibi(
        ["upsert", "--input", "-"],
        root,
        JSON.stringify({
          type: "req",
          id: "REQ-gone",
          properties: { title: "Gone behavior", status: "retired" },
        }),
      );
      expect(refused.status).not.toBe(0);
      expect(`${refused.stdout}${refused.stderr}`).toContain(
        "status retired requires retired_reason",
      );
    },
    TIMEOUT_MS,
  );

  test(
    "kibi migrate suggests retiring a closed requirement whose source says so and retires it only once approved",
    () => {
      const RETIRED = ".kb/requirements/REQ-audit-old.md";
      const SUPERSEDED = ".kb/requirements/REQ-audit-replaced.md";
      write(
        root,
        RETIRED,
        requirement(
          "REQ-audit-old",
          "closed",
          "proof_exempt: true\nproof_exempt_reason: Retired on 2026-10-30 because writes no longer keep an audit trail.\n",
        ),
      );
      write(
        root,
        SUPERSEDED,
        requirement(
          "REQ-audit-replaced",
          "closed",
          "tags:\n  - historical-status:retired\n",
        ),
      );
      write(
        root,
        ".kb/requirements/REQ-audit-new.md",
        requirement(
          "REQ-audit-new",
          "open",
          "links:\n  - type: supersedes\n    target: REQ-audit-replaced\n",
        ),
      );
      write(
        root,
        ".kb/requirements/REQ-audit-done.md",
        requirement("REQ-audit-done", "closed"),
      );
      git(root, "add", "--all");
      expect(runKibi(["sync"], root).status).toBe(0);

      const planned = runKibi(["migrate", "--format", "json"], root);
      expect(planned.status, planned.stderr).toBe(0);
      const plan = JSON.parse(planned.stdout) as MigrationPlan;
      const suggestions = plan.actions.filter(
        (candidate: MigrationAction) =>
          candidate.code === "req_retired_status_suggest",
      );
      expect(suggestions.map((candidate) => candidate.id)).toEqual([
        "req-retired-status-REQ-audit-old",
      ]);
      expect(suggestions[0]).toMatchObject({
        safety: "review",
        autoApplicable: false,
        affectedFiles: [RETIRED],
        evidence: {
          retiredReason:
            "Retired on 2026-10-30 because writes no longer keep an audit trail.",
        },
      });

      const before = read(root, RETIRED);
      const unapproved = runKibi(
        ["migrate", "--apply-safe", "--approved-plan-hash", plan.planHash],
        root,
      );
      expect(unapproved.status, unapproved.stderr).toBe(0);
      expect(read(root, RETIRED)).toBe(before);

      const replanned = JSON.parse(
        runKibi(["migrate", "--format", "json"], root).stdout,
      ) as MigrationPlan;
      const approved = runKibi(
        [
          "migrate",
          "--apply-safe",
          "--approved-plan-hash",
          replanned.planHash,
          "--approved-action",
          "req-retired-status-REQ-audit-old",
        ],
        root,
      );
      expect(approved.status, `${approved.stdout}\n${approved.stderr}`).toBe(0);
      expect(read(root, RETIRED)).toBe(
        `${before
          .replace("status: closed\n", "status: retired\n")
          .replace(
            "---\n\n",
            "retired_reason: Retired on 2026-10-30 because writes no longer keep an audit trail.\n---\n\n",
          )}`,
      );
    },
    TIMEOUT_MS,
  );
});
