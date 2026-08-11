import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const cliPath = path.resolve(__dirname, "../src/cli.ts");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("CLI JSON diagnostic usage", () => {
  test("appends correlated semantic evidence in diagnostic mode", () => {
    const workspace = mkdtempSync(path.join(os.tmpdir(), "kibi-cli-diag-"));
    temporaryDirectories.push(workspace);
    const result = spawnSync(
      "bun",
      [cliPath, "--diagnostic-mode", "skills-list", "--input", "-"],
      {
        cwd: workspace,
        encoding: "utf8",
        input: JSON.stringify({
          _diagnostic_telemetry: {
            is_autonomous: true,
            session_id: "session-cli",
            actor_id: "actor-cli",
          },
        }),
      }
    );

    expect(result.status).toBe(0);
    const logPath = path.join(workspace, ".kb", "usage.log");
    expect(existsSync(logPath)).toBe(true);
    const rows = readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tool: "kb_skills_list",
      interface: "cli_json",
      status: "success",
      telemetry_status: "provided",
      session_id: "session-cli",
      actor_id: "actor-cli",
    });
  });
});
