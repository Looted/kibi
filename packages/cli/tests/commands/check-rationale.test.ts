import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "../helpers/isolated-env.js";

// implements REQ-core-validation-rules

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

function requirement(
  id: string,
  origin: string,
  extra = "",
  body = `# ${id}\n`,
): string {
  return `---\nid: ${id}\ntitle: ${id}\nstatus: open\ncreated_at: 2026-10-01T00:00:00.000Z\nupdated_at: 2026-10-01T00:00:00.000Z\norigin:\n  kind: ${origin}\n${extra}---\n\n${body}`;
}

describe("kibi check requirement-rationale-missing", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-test-rationale-")),
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
    "asks human- and agent-authored requirements why they exist unless a field, a section or an ADR answers it",
    () => {
      write(
        root,
        ".kb/requirements/REQ-why-bare.md",
        requirement("REQ-why-bare", "human"),
      );
      write(
        root,
        ".kb/requirements/REQ-why-field.md",
        requirement(
          "REQ-why-field",
          "agent",
          "rationale: Support asked for it after the outage.\n",
        ),
      );
      write(
        root,
        ".kb/requirements/REQ-why-section.md",
        requirement(
          "REQ-why-section",
          "human",
          "",
          "# REQ-why-section\n\n## Why\n",
        ),
      );
      write(
        root,
        ".kb/requirements/REQ-why-adr.md",
        requirement("REQ-why-adr", "human"),
      );
      write(
        root,
        ".kb/requirements/REQ-why-imported.md",
        requirement("REQ-why-imported", "import"),
      );
      write(
        root,
        ".kb/adr/ADR-why.md",
        "---\nid: ADR-why\ntitle: Why\nstatus: accepted\ncreated_at: 2026-10-01T00:00:00.000Z\nupdated_at: 2026-10-01T00:00:00.000Z\nlinks:\n  - type: relates_to\n    target: REQ-why-adr\n---\n\n# Why\n",
      );
      git(root, "add", "--all");
      const sync = runKibi(["sync"], root);
      expect(sync.status, `${sync.stdout}\n${sync.stderr}`).toBe(0);

      const check = runKibi(
        [
          "check",
          "--rules",
          "requirement-rationale-missing",
          "--format",
          "json",
        ],
        root,
      );
      expect(check.status, check.stderr).toBe(0);
      const quality = (
        JSON.parse(check.stdout) as {
          structuredContent: {
            qualityDiagnostics: Array<{
              id: string;
              entityId: string;
              blocking: boolean;
            }>;
          };
        }
      ).structuredContent.qualityDiagnostics.filter(
        (diagnostic) => diagnostic.id === "rule.requirement-rationale-missing",
      );
      expect(
        quality.map((diagnostic) => [diagnostic.entityId, diagnostic.blocking]),
      ).toEqual([["REQ-why-bare", false]]);
    },
    TIMEOUT_MS,
  );
});
