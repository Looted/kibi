/*
 * MCP server path validation utilities for Kibi VS Code extension
 */
import * as child_process from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

/**
 * Validates the MCP server path configuration.
 * Auto-detects if not configured and shows warnings if not found.
 */
export function validateMcpServerPath(output: vscode.OutputChannel): void {
  const config = vscode.workspace.getConfiguration("kibi");
  let serverPath = config.get<string>("mcp.serverPath", "");

  if (!serverPath || serverPath.trim() === "") {
    const detectedPath = findKibiMcpInPath();
    if (detectedPath) {
      output.appendLine(`Auto-detected kibi-mcp at: ${detectedPath}`);
      serverPath = detectedPath;
    } else {
      output.appendLine(
        "Kibi MCP server path is not configured and kibi-mcp was not found in PATH.",
      );
      vscode.window
        .showWarningMessage(
          "Kibi MCP server path is not configured and kibi-mcp was not found in PATH.",
          "Open Settings",
        )
        .then((selection) => {
          if (selection === "Open Settings") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "kibi.mcp.serverPath",
            );
          }
        });
      return;
    }
  }

  if (!fs.existsSync(serverPath)) {
    output.appendLine(
      `Kibi MCP server not found at configured path: ${serverPath}`,
    );
    vscode.window
      .showErrorMessage(
        "Kibi MCP server not found at configured path. Please check your settings.",
        "Open Settings",
      )
      .then((selection) => {
        if (selection === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "kibi.mcp.serverPath",
          );
        }
      });
    return;
  }

  output.appendLine(`Kibi MCP server path validated: ${serverPath}`);
}

/**
 * Attempts to find the kibi-mcp executable in the system PATH.
 * Returns the path if found, undefined otherwise.
 */
export function findKibiMcpInPath(): string | undefined {
  try {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "where kibi-mcp" : "which kibi-mcp";

    const result = child_process.execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });

    const paths = result.trim().split(/\r?\n/);
    for (const p of paths) {
      const trimmed = p.trim();
      if (trimmed && fs.existsSync(trimmed)) {
        return trimmed;
      }
    }
  } catch {
    // Command failed or kibi-mcp not found in PATH
  }

  // Check common installation paths
  const commonPaths = [
    "/usr/local/bin/kibi-mcp",
    "/usr/bin/kibi-mcp",
    path.join(process.env.HOME || "", ".local/bin/kibi-mcp"),
    path.join(process.env.HOME || "", ".bun/bin/kibi-mcp"),
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return undefined;
}
