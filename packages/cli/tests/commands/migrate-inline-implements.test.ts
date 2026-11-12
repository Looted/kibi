import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { migrateCommand } from "../../src/commands/migrate.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
});

// Built from parts so the fixture is not itself a comment in this file.
const COMMENT = ["//", "implements", "REQ-greet"].join(" ");
const SOURCE = `${COMMENT}\nexport function greet(): string {\n  return "hi";\n}\n`;

function workspace(): string {
  restores.push(isolateKibiEnv());
  const cwd = createGitWorkspace();
  roots.push(cwd);
  mkdirSync(path.join(cwd, "src"), { recursive: true });
  writeFileSync(path.join(cwd, "src", "greet.ts"), SOURCE);
  execFileSync("git", ["add", "src/greet.ts"], { cwd });
  return cwd;
}

async function plan(cwd: string) {
  const out = captureIo();
  restores.push(out.restore);
  const result = await migrateCommand({ format: "json", workspaceRoot: cwd });
  return { result, plan: JSON.parse(out.logText()) };
}

describe("kibi migrate lists inline implements comments", () => {
  test("plans one review action naming the comment and leaves the source as it is", async () => {
    const cwd = workspace();
    const { result, plan: migrationPlan } = await plan(cwd);
    expect(result.exitCode).toBe(0);
    const actions = migrationPlan.actions.filter(
      (action: { code: string }) =>
        action.code === "review_inline_implements_comment",
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      id: "review-inline-implements-comments",
      safety: "review",
      affectedFiles: ["src/greet.ts"],
      affectedEntityIds: ["REQ-greet"],
      evidence: {
        total: 1,
        comments: [
          {
            file: "src/greet.ts",
            line: 1,
            requirements: ["REQ-greet"],
            manifestLinked: [],
          },
        ],
      },
    });
    expect(readFileSync(path.join(cwd, "src", "greet.ts"), "utf8")).toBe(
      SOURCE,
    );
  });

  test("plans nothing once the comment is gone", async () => {
    const cwd = workspace();
    writeFileSync(
      path.join(cwd, "src", "greet.ts"),
      SOURCE.replace(`${COMMENT}\n`, ""),
    );
    const { plan: migrationPlan } = await plan(cwd);
    expect(
      migrationPlan.actions.some(
        (action: { code: string }) =>
          action.code === "review_inline_implements_comment",
      ),
    ).toBe(false);
  });
});
