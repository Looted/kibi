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

// implements REQ-kb-entity-body-context

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 180_000;

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

const STAMP =
  "created_at: 2026-10-01T00:00:00.000Z\nupdated_at: 2026-10-01T00:00:00.000Z\n";
const REASON =
  "Support asked for this after the outage because customers could not tell which export was retained and for how long.";

function requirement(id: string, extra: string, body: string): string {
  return `---\nid: ${id}\ntitle: ${id} title\nstatus: open\nsemantic_text: ${id} must hold.\n${STAMP}${extra}---\n\n${body}`;
}

describe("kibi check entity-context-missing", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-test-context-")),
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
    "blocks a thin entity and a self-applied tag, accepts context, and counts migration-acknowledged entities",
    () => {
      write(
        root,
        ".kb/requirements/REQ-ctx-thin.md",
        requirement("REQ-ctx-thin", "", "REQ-ctx-thin must hold.\n"),
      );
      write(
        root,
        ".kb/requirements/REQ-ctx-ok.md",
        requirement(
          "REQ-ctx-ok",
          "",
          `REQ-ctx-ok must hold.\n\n## Context\n\n${REASON}\n`,
        ),
      );
      write(
        root,
        ".kb/requirements/REQ-ctx-legacy.md",
        requirement(
          "REQ-ctx-legacy",
          "tags:\n  - review:context-missing\n",
          "REQ-ctx-legacy must hold.\n",
        ),
      );
      write(
        root,
        ".kb/requirements/REQ-ctx-selftag.md",
        requirement(
          "REQ-ctx-selftag",
          "tags:\n  - review:context-missing\n",
          "REQ-ctx-selftag must hold.\n",
        ),
      );
      // Only ids the schema 8 migration recorded in the manifest are honored.
      const manifestPath = path.join(root, ".kb/manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      writeFileSync(
        manifestPath,
        `${JSON.stringify({ ...manifest, contextAcknowledged: ["REQ-ctx-legacy"] }, null, 2)}\n`,
      );
      git(root, "add", "--all");
      const sync = runKibi(["sync"], root);
      expect(sync.status, `${sync.stdout}\n${sync.stderr}`).toBe(0);

      const check = runKibi(
        [
          "check",
          "--rules",
          "entity-context-missing,entity-context-acknowledged",
          "--format",
          "json",
        ],
        root,
      );
      expect(check.status, check.stderr).not.toBe(0);
      const content = (
        JSON.parse(check.stdout) as {
          structuredContent: {
            violations: Array<{ rule: string; entityId: string }>;
            qualityDiagnostics: Array<{
              id: string;
              entityId: string;
              blocking: boolean;
              severity: string;
            }>;
          };
        }
      ).structuredContent;
      expect(
        content.violations.map((violation) => [
          violation.rule,
          violation.entityId,
        ]),
      ).toEqual([
        ["entity-context-missing", "REQ-ctx-selftag"],
        ["entity-context-missing", "REQ-ctx-thin"],
      ]);
      const acknowledged = content.qualityDiagnostics.filter(
        (diagnostic) => diagnostic.id === "rule.entity-context-acknowledged",
      );
      expect(
        acknowledged.map((diagnostic) => [
          diagnostic.entityId,
          diagnostic.blocking,
          diagnostic.severity,
        ]),
      ).toEqual([["workspace", false, "info"]]);
    },
    TIMEOUT_MS,
  );
});
