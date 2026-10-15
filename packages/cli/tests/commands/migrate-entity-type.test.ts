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

// implements REQ-cli-migrate-entity-type-backfill, REQ-legacy-kb-first-step-migrate, REQ-cli-sync-summary-kb-totals

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 240_000;

function runKibi(args: string[], cwd: string, input?: string) {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    ...(input === undefined ? {} : { input }),
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function vcs(cwd: string, ...args: string[]): string {
  return spawnSync("git", args, { cwd, encoding: "utf8" }).stdout ?? "";
}

function write(root: string, relative: string, content: string): string {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

/** A requirement as Kibi wrote it before front matter stated the type. */
function untypedRequirement(id: string, extra = ""): string {
  return `---\nid: ${id}\ntitle: Editor saves drafts\nstatus: open\npriority: should\nsemantic_text: The editor must save a draft every 30 seconds.\n${extra}---\n\nThe editor must save a draft every 30 seconds.\n\n## Context\n\nUsers lost work when the tab crashed.\n`;
}

function upsertStatus(root: string, id: string, title: string, status: string) {
  return runKibi(
    ["upsert", "--input", "-"],
    root,
    JSON.stringify({ id, type: "req", properties: { title, status } }),
  );
}

/** Changed lines of one file since the last commit, without the diff header. */
function changedLines(root: string, relative: string): string[] {
  return vcs(root, "diff", "--unified=0", "--", relative)
    .split("\n")
    .filter(
      (line) =>
        /^[+-]/.test(line) &&
        !line.startsWith("+++") &&
        !line.startsWith("---"),
    );
}

describe("legacy entity files without a type line", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-entity-type-")),
    );
    vcs(root, "init", "-b", "main");
    vcs(root, "config", "user.email", "test@example.com");
    vcs(root, "config", "user.name", "Kibi Test");
    vcs(root, "commit", "--allow-empty", "-m", "init");
  });

  afterEach(() => {
    runKibi(["engine", "stop"], root);
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test(
    "a legacy KB: doctor and kb_status both name kibi migrate --yes first, migrate states the type, and a status-only upsert changes only the status line",
    () => {
      write(
        root,
        ".kb/config.json",
        `${JSON.stringify({ paths: { requirements: "requirements" } }, null, 2)}\n`,
      );
      write(
        root,
        "requirements/REQ-editor-autosave.md",
        untypedRequirement("REQ-editor-autosave"),
      );
      write(root, "README.md", "# Editor\n");
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "legacy");

      const doctor = runKibi(["doctor"], root);
      expect(`${doctor.stdout}${doctor.stderr}`).toContain(
        "Run: kibi migrate --yes (it creates the manifest from the legacy .kb/config.json; do not run kibi init first)",
      );
      const status = runKibi(["status", "--format", "json"], root);
      const parsed = JSON.parse(status.stdout) as Record<string, unknown>;
      const content = (parsed.structuredContent ??
        (parsed.data as Record<string, unknown> | undefined) ??
        parsed) as {
        bootstrap: { nextAction: { operation: string; reason: string } };
      };
      expect(content.bootstrap.nextAction).toMatchObject({
        operation: "kibi migrate --yes",
        required: true,
      });
      expect(content.bootstrap.nextAction.reason).toContain(
        "do not run kibi init first",
      );
      expect(JSON.stringify(content.bootstrap)).not.toContain("kibi init`");

      const migrated = runKibi(["migrate", "--yes"], root);
      expect(migrated.status, `${migrated.stdout}${migrated.stderr}`).toBe(0);
      expect(migrated.stdout).toContain(
        "Stated the folder-implied type on 1 entity file(s) without one (1 req); no other line changes.",
      );
      const relative = ".kb/requirements/REQ-editor-autosave.md";
      expect(readFileSync(path.join(root, relative), "utf8")).toContain(
        "\ntype: req\n",
      );
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "migrate");
      const synced = runKibi(["sync"], root);
      expect(synced.status, `${synced.stdout}${synced.stderr}`).toBe(0);

      const closed = upsertStatus(
        root,
        "REQ-editor-autosave",
        "Editor saves drafts",
        "in_progress",
      );
      expect(closed.status, `${closed.stdout}${closed.stderr}`).toBe(0);
      expect(changedLines(root, relative)).toEqual([
        "-status: open",
        "+status: in_progress",
      ]);
    },
    TIMEOUT_MS,
  );

  test(
    "a KB migrated without the type line gets it from the next kibi migrate, and sync reports KB totals beside what it imported",
    () => {
      expect(runKibi(["init", "--no-hooks"], root).status).toBe(0);
      write(
        root,
        ".kb/requirements/REQ-editor-autosave.md",
        untypedRequirement(
          "REQ-editor-autosave",
          "origin:\n  kind: migration\n  ref: kibi migrate v5->v6\n",
        ),
      );
      write(
        root,
        ".kb/requirements/REQ-editor-opens.md",
        "---\nid: REQ-editor-opens\ntitle: Editor opens files\ntype: req\nstatus: open\nsemantic_text: The editor must open files.\n---\n\nThe editor must open files.\n\n## Context\n\nCore editing.\n",
      );
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "already migrated");

      const plan = runKibi(["migrate", "--format", "json"], root);
      expect(plan.stdout).toContain('"id": "entity-type-backfill"');
      const migrated = runKibi(["migrate", "--yes"], root);
      expect(migrated.status, `${migrated.stdout}${migrated.stderr}`).toBe(0);
      expect(migrated.stdout).toContain(
        "Stated the folder-implied type on 1 entity file(s) without one (1 req)",
      );
      expect(
        changedLines(root, ".kb/requirements/REQ-editor-autosave.md"),
      ).toEqual(["+type: req"]);
      expect(runKibi(["migrate", "--yes"], root).stdout).not.toContain(
        "Stated the folder-implied type",
      );
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "type");

      const first = runKibi(["sync"], root);
      expect(first.status, `${first.stdout}${first.stderr}`).toBe(0);
      expect(first.stdout).toContain("KB Totals: 2 entities");

      const upserted = upsertStatus(
        root,
        "REQ-editor-opens",
        "Editor opens files",
        "in_progress",
      );
      expect(upserted.status, `${upserted.stdout}${upserted.stderr}`).toBe(0);
      const second = runKibi(["sync"], root);
      expect(second.status, `${second.stdout}${second.stderr}`).toBe(0);
      expect(second.stdout).toContain("KB Totals: 2 entities\n  req: 2");
      expect(second.stdout).toMatch(
        /Imported This Sync \(changed sources only\): [01] entities/,
      );
    },
    TIMEOUT_MS,
  );
});
