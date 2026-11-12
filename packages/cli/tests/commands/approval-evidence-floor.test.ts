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
import { spawnSync } from "../helpers/isolated-env.js";

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 240_000;

function runKibi(args: string[], cwd: string) {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
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

const OLD = "2026-01-01T00:00:00.000Z";

function requirement(
  id: string,
  { created = OLD, priority = "must", origin = "  kind: agent\n", extra = "" },
): string {
  return `---\nid: ${id}\ntype: req\ntitle: ${id} keeps the review canvas editable\nstatus: open\npriority: ${priority}\ncreated_at: ${created}\nupdated_at: ${created}\norigin:\n${origin}${extra}---\n\n${id} keeps the review canvas editable for its owner.\n\n## Context\n\nA fixture requirement; reason not stated.\n`;
}

type Finding = {
  rule: string;
  entityId: string;
  evidence?: Record<string, unknown>;
};

function findings(root: string, rules: string): Finding[] {
  const check = runKibi(["check", "--rules", rules, "--format", "json"], root);
  return (
    JSON.parse(check.stdout) as {
      structuredContent: { violations: Finding[] };
    }
  ).structuredContent.violations
    .map(({ rule, entityId, evidence }) => ({ rule, entityId, evidence }))
    .sort((left, right) =>
      `${left.rule}:${left.entityId}`.localeCompare(
        `${right.rule}:${right.entityId}`,
      ),
    );
}

describe("approved requirements and implemented unapproved requirements", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-test-approval-floor-")),
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
    "an approval gives the tested floor, the schema 15 upgrade pins it, and an old unapproved must requirement that code implements fails kibi check",
    () => {
      const today = new Date().toISOString();
      // Approved, no firmness: tested floor (pinned by the upgrade).
      write(
        root,
        ".kb/requirements/REQ-approved.md",
        requirement("REQ-approved", {
          origin: "  kind: agent\n  approved_by: Owner\n",
        }),
      );
      // Approved with a stated default firmness: no floor.
      write(
        root,
        ".kb/requirements/REQ-approved-default.md",
        requirement("REQ-approved-default", {
          origin: "  kind: agent\n  approved_by: Owner\n",
          extra: "firmness: default\n",
        }),
      );
      // Unapproved must requirements code implements: one old, one new.
      write(
        root,
        ".kb/requirements/REQ-unapproved-old.md",
        requirement("REQ-unapproved-old", {}),
      );
      write(
        root,
        ".kb/requirements/REQ-unapproved-new.md",
        requirement("REQ-unapproved-new", { created: today }),
      );
      // Only a should requirement, or an approved one, is not reported.
      write(
        root,
        ".kb/requirements/REQ-unapproved-should.md",
        requirement("REQ-unapproved-should", { priority: "should" }),
      );
      write(
        root,
        "src/canvas.ts",
        "export function openCanvas() { return 1; }\n",
      );
      write(
        root,
        ".kb/symbols.yaml",
        `symbols:\n  - id: SYM-open-canvas\n    title: openCanvas\n    sourceFile: src/canvas.ts\n    status: active\n    relationships:\n${[
          "REQ-approved",
          "REQ-unapproved-old",
          "REQ-unapproved-new",
          "REQ-unapproved-should",
        ]
          .map((id) => `      - type: implements\n        target: ${id}\n`)
          .join("")}`,
      );
      // The KB starts at schema 14, before the approval floor.
      const manifest = JSON.parse(read(root, ".kb/manifest.json")) as Record<
        string,
        unknown
      >;
      write(
        root,
        ".kb/manifest.json",
        `${JSON.stringify({ ...manifest, schemaVersion: 14 }, null, 2)}\n`,
      );
      git(root, "add", "-A");
      git(root, "commit", "-m", "fixture", "--no-verify");
      expect(runKibi(["sync"], root).status).toBe(0);

      const coverage = JSON.parse(
        runKibi(
          ["coverage", "--by", "req", "--include-passing", "--format", "json"],
          root,
        ).stdout,
      ) as {
        rows: { id: string; evidenceFloor?: Record<string, string> }[];
      };
      const floor = (id: string) =>
        coverage.rows.find((row) => row.id === id)?.evidenceFloor;
      expect(floor("REQ-approved")).toEqual({
        required: "tested",
        source: "approval",
        status: "below",
      });
      expect(floor("REQ-approved-default")?.required).toBe("unverified");

      // Before the upgrade neither the approval floor nor the new rule blocks.
      const rules = "evidence-floor,agent-requirement-unapproved-implemented";
      expect(findings(root, rules)).toEqual([]);

      const migrate = runKibi(["migrate", "--yes"], root);
      expect(migrate.status).toBe(0);
      expect(read(root, ".kb/requirements/REQ-approved.md")).toContain(
        "required_evidence: asserted",
      );
      expect(
        read(root, ".kb/requirements/REQ-approved-default.md"),
      ).not.toContain("required_evidence");
      git(root, "add", "-A");
      expect(runKibi(["sync"], root).status).toBe(0);

      const after = findings(root, rules);
      expect(after.map(({ rule, entityId }) => `${rule}:${entityId}`)).toEqual([
        "agent-requirement-unapproved-implemented:REQ-unapproved-old",
      ]);
      expect(after[0]?.evidence).toMatchObject({
        createdAt: OLD,
        symbols: ["SYM-open-canvas"],
        graceDays: 14,
      });

      // Removing the pin puts the approved requirement below its floor.
      write(
        root,
        ".kb/requirements/REQ-approved.md",
        read(root, ".kb/requirements/REQ-approved.md").replace(
          "required_evidence: asserted\n",
          "",
        ),
      );
      git(root, "add", "-A");
      expect(runKibi(["sync"], root).status).toBe(0);
      expect(
        findings(root, "evidence-floor").map(
          ({ rule, entityId }) => `${rule}:${entityId}`,
        ),
      ).toEqual(["evidence-floor:REQ-approved"]);
    },
    TIMEOUT_MS,
  );
});
