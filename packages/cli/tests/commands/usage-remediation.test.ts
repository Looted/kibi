import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "../helpers/isolated-env.js";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const cliPath = path.resolve(__dirname, "../../src/cli.ts");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function workspaceWithUsageLog(): string {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "kibi-remediation-"));
  temporaryDirectories.push(workspace);
  mkdirSync(path.join(workspace, ".kb"), { recursive: true });
  const now = Date.now();
  const events = Array.from({ length: 20 }, (_, index) => ({
    timestamp: new Date(now - (20 - index) * 1_000).toISOString(),
    request_id: `request-${index + 1}`,
    tool: "kb_status",
    status: "success",
    telemetry_status: index < 2 ? "missing" : "provided",
    telemetry: index < 2 ? null : { is_autonomous: true },
    business_args: {},
  }));
  writeFileSync(
    path.join(workspace, ".kb", "usage.log"),
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
  return workspace;
}

describe("kibi usage-remediation", () => {
  test("renders the versioned report as JSON", () => {
    const workspace = workspaceWithUsageLog();
    const output = execFileSync(
      "bun",
      [cliPath, "usage-remediation", "--format", "json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const report = JSON.parse(output);

    expect(report.version).toBe("kibi.telemetry-remediation.v1");
    expect(report.status).toBe("action_required");
    expect(report.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "telemetry_completeness",
          scope: "event",
          event: expect.objectContaining({ logLine: 1 }),
        }),
        expect.objectContaining({
          metric: "proof_gap_recovery",
          scope: "report",
        }),
      ]),
    );
  });

  test("renders a compact bounded table", () => {
    const workspace = workspaceWithUsageLog();
    const output = execFileSync(
      "bun",
      [cliPath, "usage-remediation", "--limit", "1"],
      { cwd: workspace, encoding: "utf8" },
    );

    expect(output).toContain("Telemetry remediation: action_required");
    expect(output).toContain("Showing 1/");
  });
});
