import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { changedCheckContent } from "../../src/public/operations/changed-check.js";
import {
  type ConsumerWorkspace,
  KIBI_CLI,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * kb_check changed:true is the commit gate's verdict, so it also runs the
 * generated-manifest check the pre-commit hook runs before the staged check:
 * a symbols manifest out of its canonical layout is refused by both.
 */

let workspace: ConsumerWorkspace;

const RECORD = (id: string, title: string, file: string) =>
  `  - id: "${id}"\n    title: ${title}\n    sourceFile: ${file}\n    status: active\n    symbol_role: type-shape\n    sourceLine: 1\n`;

beforeAll(() => {
  workspace = createConsumerWorkspace("kibi-changed-generated-");
  workspace.write("src/t.ts", "export type T = string;\n");
  workspace.write(
    ".kb/symbols.yaml",
    `symbols:\n${RECORD("SYM-t-t", "T", "src/t.ts")}`,
  );
  workspace.git("add", "-A");
  workspace.kibi(["sync", "--refresh-symbol-coordinates"]);
  workspace.git("add", "-A");
  workspace.git("commit", "-qm", "base");
}, 300_000);

afterAll(() => workspace?.cleanup());

function verdict() {
  const run = workspace.kibi(["check", "--changed", "--format", "json"]);
  return changedCheckContent({
    exitCode: run.status ?? 1,
    stdout: run.stdout,
    stderr: run.stderr,
  });
}

describe("kibi check --changed and the generated-manifest check", () => {
  test("a hand-written record out of the canonical layout is refused until sync rewrites it", () => {
    workspace.write("src/v.ts", "export type V = number;\n");
    workspace.write(
      ".kb/symbols.yaml",
      `${workspace.read(".kb/symbols.yaml")}${RECORD("SYM-v-v", "V", "src/v.ts")}`,
    );
    const refused = verdict();
    expect(refused.commitAllowed).toBe(false);
    expect(refused.messages.join("\n")).toContain(
      "generated manifest drift in staged snapshot: .kb/symbols.yaml",
    );
    // The changed check never writes the real index.
    expect(workspace.git("diff", "--cached", "--name-only")).toBe("");

    workspace.kibi(["sync", "--refresh-symbol-coordinates"]);
    const fixed = verdict();
    expect(fixed.messages.join("\n")).not.toContain("generated manifest");
    expect(fixed.commitAllowed).toBe(true);
  }, 300_000);
});

describe("kibi check --changed with files, run from a subdirectory", () => {
  const fromSrc = (...files: string[]) =>
    spawnSync(
      "node",
      [KIBI_CLI, "check", "--changed", ...files, "--format", "json"],
      {
        cwd: path.join(workspace.root, "src"),
        encoding: "utf8",
        timeout: 120_000,
      },
    );

  test("reads the files from that directory and refuses one that names nothing", () => {
    workspace.write(
      "src/b c.ts",
      "export function fb(): number {\n  return 1;\n}\n",
    );
    const run = fromSrc("b c.ts");
    const judged = changedCheckContent({
      exitCode: run.status ?? 1,
      stdout: run.stdout,
      stderr: run.stderr,
    });
    expect(judged.commitAllowed).toBe(false);
    expect(run.stdout).toContain("fb");

    const missing = fromSrc("nope.ts");
    expect(missing.status).not.toBe(0);
    expect(`${missing.stdout}${missing.stderr}`).toContain(
      "src/nope.ts is neither in the working tree nor tracked by git",
    );
  }, 300_000);
});
