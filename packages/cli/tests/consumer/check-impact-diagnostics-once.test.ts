import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs the built CLI as a consumer does: the check operation scoped to a
 * changed source file, in a fresh repository with a compiled KB.
 * KIBI_E2E_CLI points the same checks at another build.
 */
const cli =
  process.env.KIBI_E2E_CLI ??
  fileURLToPath(new URL("../../bin/kibi", import.meta.url));

type Diagnostic = { id: string; message: string; entityId?: string };
type Action = {
  code: string;
  evidence: { diagnostic?: Record<string, unknown> };
};

let root = "";

function env(): NodeJS.ProcessEnv {
  const value: NodeJS.ProcessEnv = { ...process.env, KIBI_TELEMETRY: "0" };
  Reflect.deleteProperty(value, "KIBI_BRANCH");
  return value;
}

function run(command: string, args: readonly string[], input?: string) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: env(),
    input,
    timeout: 120_000,
  });
  return result;
}

function kibi(args: readonly string[], input?: string) {
  return run(process.execPath, [cli, ...args], input);
}

function write(relativePath: string, content: string): void {
  const absolute = path.join(root, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

beforeAll(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "kibi-check-once-"));
  expect(run("git", ["init", "-q", "-b", "main"]).status).toBe(0);
  expect(kibi(["init", "--no-hooks"]).status).toBe(0);
  for (const id of ["REQ-once-a", "REQ-once-b", "REQ-once-c"]) {
    write(
      `.kb/requirements/${id}.md`,
      `---\nid: ${id}\ntitle: Requirement ${id} of the check fixture\nstatus: open\npriority: should\n---\n\nThe fixture action keeps ${id} true for the scoped check test.\n`,
    );
  }
  write(
    "src/multi.ts",
    ["export function multiAction() {", "  return 'changed';", "}", ""].join(
      "\n",
    ),
  );
  write(
    ".kb/symbols.yaml",
    `symbols:
  - id: SYM-once-multi
    title: multiAction
    sourceFile: src/multi.ts
    status: active
    symbol_role: behavioral
    relationships:
      - type: implements
        target: REQ-once-a
      - type: implements
        target: REQ-once-b
      - type: implements
        target: REQ-once-c
`,
  );
  expect(run("git", ["add", "-A"]).status).toBe(0);
  const sync = kibi(["sync"]);
  expect(sync.stderr + sync.stdout).toContain("Success");
}, 180_000);

afterAll(() => {
  if (root === "") return;
  kibi(["engine", "stop"]);
  rmSync(root, { recursive: true, force: true });
});

describe("a check scoped to a changed source file", () => {
  test("returns each impact diagnostic once", () => {
    const result = kibi(
      ["check", "--input", "-"],
      JSON.stringify({
        sourceFiles: ["src/multi.ts"],
        includeImpactDiagnostics: true,
      }),
    );
    const envelope = JSON.parse(result.stdout) as {
      data?: Record<string, unknown>;
      structuredContent?: Record<string, unknown>;
    };
    const data = (envelope.data ?? envelope.structuredContent) as {
      impactDiagnostics: Diagnostic[];
      qualityDiagnostics?: Diagnostic[];
      migrationPlan: { actions: Action[] };
    };
    const key = (diagnostic: Diagnostic) =>
      `${diagnostic.id}|${diagnostic.entityId ?? ""}|${diagnostic.message}`;

    const impact = data.impactDiagnostics;
    expect(impact.length).toBeGreaterThan(0);
    const impactKeys = new Set(impact.map(key));
    expect(
      (data.qualityDiagnostics ?? []).filter((diagnostic) =>
        impactKeys.has(key(diagnostic)),
      ),
    ).toEqual([]);

    const impactIds = new Set(impact.map((diagnostic) => diagnostic.id));
    const reviews = data.migrationPlan.actions.filter((action) =>
      impactIds.has(action.code.replace(/^quality_/, "")),
    );
    expect(reviews.length).toBeGreaterThan(0);
    for (const action of reviews) {
      expect(action.evidence.diagnostic?.listedIn).toBe("impactDiagnostics");
      expect(action.evidence.diagnostic).not.toHaveProperty("message");
    }
  }, 120_000);
});
