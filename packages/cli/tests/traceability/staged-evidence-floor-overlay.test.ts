import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractFromMarkdownString } from "../../src/extractors/markdown.js";
import { collectStagedEvidenceFloorViolations } from "../../src/traceability/staged-evidence-floor.js";
import {
  execFileSync,
  isolatedCliSandboxEnv,
} from "../helpers/isolated-env.js";

const kibiBin = path.resolve(import.meta.dir, "../../bin/kibi");
const REQUIREMENT_PATH = ".kb/requirements/REQ-login-session.md";

/**
 * A must requirement an agent wrote long ago that production code
 * implements; `approved` adds a person's approval and an asserted floor.
 */
function requirement(approved: boolean): string {
  return `---
id: REQ-login-session
type: req
title: Login returns a session token
status: open
priority: must
${approved ? "required_evidence: asserted\n" : ""}origin:
  kind: agent
${approved ? "  approved_by: alice\n" : ""}  recorded_at: '2026-01-01T00:00:00.000Z'
---
Login must return a session token to the user.

## Context

Added by an agent from reading src/auth.ts; who asked for it and why were not stated.

## Source

> Login must return a session token to the user.
`;
}

let root: string;

function kibi(...args: string[]): void {
  execFileSync("bun", [kibiBin, ...args], {
    cwd: root,
    env: isolatedCliSandboxEnv(),
    stdio: "pipe",
  });
}

/** Sync the store to `approved`, then judge the staged other state. */
async function judge(synced: boolean, staged: boolean) {
  writeFileSync(path.join(root, REQUIREMENT_PATH), requirement(synced));
  kibi("sync");
  const content = requirement(staged);
  return collectStagedEvidenceFloorViolations({
    workspaceRoot: root,
    branch: "main",
    requirementIds: ["REQ-login-session"],
    schemaVersion: 18,
    stagedEntities: [
      {
        ...extractFromMarkdownString(content, REQUIREMENT_PATH),
        sourceFile: REQUIREMENT_PATH,
      },
    ],
  });
}

beforeAll(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "kibi-staged-floor-overlay-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git("init", "-q", "-b", "main");
  kibi("init");
  mkdirSync(path.join(root, "src"), { recursive: true });
  mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
  writeFileSync(
    path.join(root, "src", "auth.ts"),
    'export function login() {\n  return "tok";\n}\n',
  );
  writeFileSync(
    path.join(root, ".kb", "symbols.yaml"),
    `symbols:
  - id: SYM-login
    title: login
    sourceFile: src/auth.ts
    status: active
    symbol_role: behavioral
    relationships:
      - type: implements
        target: REQ-login-session
`,
  );
  writeFileSync(path.join(root, REQUIREMENT_PATH), requirement(false));
  git("add", "-A");
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("collectStagedEvidenceFloorViolations", () => {
  test("judges a staged approval the store has not synced yet", async () => {
    expect(await judge(false, true)).toEqual([]);
  }, 120_000);

  test("judges a staged removal of the approval the store has not synced yet", async () => {
    const findings = await judge(true, false);
    expect(findings.map((finding) => finding.rule)).toEqual([
      "agent-requirement-unapproved-implemented",
    ]);
    expect(findings[0]?.entityId).toBe("REQ-login-session");
  }, 120_000);

  test("does not judge a requirement the store does not hold yet", async () => {
    writeFileSync(path.join(root, REQUIREMENT_PATH), requirement(false));
    kibi("sync");
    const content = requirement(false).replaceAll(
      "REQ-login-session",
      "REQ-login-new",
    );
    expect(
      await collectStagedEvidenceFloorViolations({
        workspaceRoot: root,
        branch: "main",
        requirementIds: ["REQ-login-new"],
        schemaVersion: 18,
        stagedEntities: [
          {
            ...extractFromMarkdownString(
              content,
              ".kb/requirements/REQ-login-new.md",
            ),
            sourceFile: ".kb/requirements/REQ-login-new.md",
          },
        ],
      }),
    ).toEqual([]);
  }, 120_000);
});
