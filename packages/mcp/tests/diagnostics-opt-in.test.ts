import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  appendUsageLogLine,
  diagnosticModeRequested,
  initializeDiagnosticMode,
} from "../src/diagnostics.js";

const restorers: (() => void)[] = [];

afterEach(() => {
  while (restorers.length > 0) restorers.pop()?.();
});

function restoreEnv(key: string, previous: string | undefined): void {
  if (previous === undefined) Reflect.deleteProperty(process.env, key);
  else process.env[key] = previous;
}

function isolatedWorkspace(): string {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "kibi-mcp-opt-in-"));
  const previousWorkspace = process.env.KIBI_WORKSPACE;
  const previousMode = process.env.KIBI_MCP_DIAGNOSTIC_MODE;
  const previousHost = process.env.KIBI_MCP_HOST;
  const previousLogPath = process.env.KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH;
  restorers.push(() => {
    initializeDiagnosticMode(false);
    rmSync(workspaceRoot, { recursive: true, force: true });
    restoreEnv("KIBI_WORKSPACE", previousWorkspace);
    restoreEnv("KIBI_MCP_DIAGNOSTIC_MODE", previousMode);
    restoreEnv("KIBI_MCP_HOST", previousHost);
    restoreEnv("KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH", previousLogPath);
  });
  process.env.KIBI_WORKSPACE = workspaceRoot;
  Reflect.deleteProperty(process.env, "KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH");
  return workspaceRoot;
}

describe("usage telemetry is opt-in", () => {
  test("stays off when neither the flag nor the environment opts in", () => {
    expect(diagnosticModeRequested([], {})).toBe(false);
    expect(diagnosticModeRequested(["node", "kibi-mcp"], {})).toBe(false);
  });

  test("installing a host plugin alone never enables it", () => {
    // Plugin launchers set KIBI_MCP_HOST and KIBI_WORKSPACE; neither is an
    // opt-in signal.
    expect(
      diagnosticModeRequested(["node", "kibi-mcp"], {
        KIBI_MCP_HOST: "cursor",
        KIBI_WORKSPACE: "/repo",
      }),
    ).toBe(false);
  });

  test("honors the explicit launch flag", () => {
    expect(diagnosticModeRequested(["kibi-mcp", "--diagnostic-mode"], {})).toBe(
      true,
    );
  });

  test("honors an explicit environment opt-in for plugin-owned launchers", () => {
    expect(diagnosticModeRequested([], { KIBI_DIAGNOSTIC_MODE: "1" })).toBe(
      true,
    );
    expect(diagnosticModeRequested([], { KIBI_DIAGNOSTIC_MODE: "true" })).toBe(
      true,
    );
    expect(
      diagnosticModeRequested([], { KIBI_DIAGNOSTIC_MODE: " TRUE " }),
    ).toBe(true);
  });

  test("treats any other environment value as not opted in", () => {
    for (const value of ["0", "false", "", "yes", "on"]) {
      expect(diagnosticModeRequested([], { KIBI_DIAGNOSTIC_MODE: value })).toBe(
        false,
      );
    }
  });

  test("writes no usage log while opted out", () => {
    const workspaceRoot = isolatedWorkspace();
    initializeDiagnosticMode(false);
    appendUsageLogLine({ tool: "kb_search" });
    expect(existsSync(path.join(workspaceRoot, ".kb", "usage.log"))).toBe(
      false,
    );
  });

  test("stamps host, package version, and workspace once opted in", () => {
    const workspaceRoot = isolatedWorkspace();
    process.env.KIBI_MCP_HOST = "cursor";
    initializeDiagnosticMode(true);
    appendUsageLogLine({ tool: "kb_search" });

    const row = JSON.parse(
      readFileSync(path.join(workspaceRoot, ".kb", "usage.log"), "utf8").trim(),
    ) as Record<string, unknown>;
    expect(row).toMatchObject({
      tool: "kb_search",
      interface: "mcp",
      host: "cursor",
      workspace_root: workspaceRoot,
    });
    expect(typeof row.package_version).toBe("string");
  });

  test("records an unidentified host rather than guessing one", () => {
    const workspaceRoot = isolatedWorkspace();
    Reflect.deleteProperty(process.env, "KIBI_MCP_HOST");
    initializeDiagnosticMode(true);
    appendUsageLogLine({ tool: "kb_status" });

    const row = JSON.parse(
      readFileSync(path.join(workspaceRoot, ".kb", "usage.log"), "utf8").trim(),
    ) as Record<string, unknown>;
    expect(row.host).toBe("unknown");
  });
});
