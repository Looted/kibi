/*
 * MCP server path validation utilities for Kibi VS Code extension
 */
import * as child_process from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { KIBI_MCP_PROVIDER_ID, KIBI_MCP_PROVIDER_LABEL } from "../extensionIds";

/** Dependency injection for testability — avoids mock.module pollution. */
export interface McpDeps {
  existsSync: typeof fs.existsSync;
  execSync: typeof child_process.execSync;
  platform?: NodeJS.Platform;
  vscodeApi?: McpProviderApi;
}
const defaultDeps: McpDeps = {
  existsSync: fs.existsSync,
  execSync: child_process.execSync,
};

export interface ResolvedMcpServerCommand {
  command: string;
  args: string[];
}

interface McpServerDefinitionLike {
  label: string;
  command: string;
  args?: string[];
  env?: Record<string, string | number | null>;
  cwd?: vscode.Uri;
}

interface McpStdioServerDefinitionCtor {
  new (
    label: string,
    command: string,
    args?: string[],
    env?: Record<string, string | number | null>,
  ): McpServerDefinitionLike;
}

interface McpProviderApi {
  lm?: {
    registerMcpServerDefinitionProvider?: (
      id: string,
      provider: {
        onDidChangeMcpServerDefinitions?: vscode.Event<void>;
        provideMcpServerDefinitions: () => McpServerDefinitionLike[];
      },
    ) => vscode.Disposable;
  };
  McpStdioServerDefinition?: McpStdioServerDefinitionCtor;
}

const NODE_SCRIPT_EXTENSIONS = new Set([".js", ".cjs", ".mjs"]);

function toServerCommand(resolvedPath: string): ResolvedMcpServerCommand {
  const ext = path.extname(resolvedPath).toLowerCase();
  if (NODE_SCRIPT_EXTENSIONS.has(ext)) {
    return { command: "node", args: [resolvedPath] };
  }
  return { command: resolvedPath, args: [] };
}

/**
 * Resolves the Kibi MCP server command for a workspace:
 * 1. Explicit `kibi.mcp.serverPath` setting (if set and exists)
 * 2. Project-local `node_modules/.bin/kibi-mcp` (`.cmd` on Windows)
 * 3. `kibi-mcp` found on PATH or common install locations
 */
export function resolveKibiMcpServerCommand(
  workspaceRoot: string,
  deps?: Partial<McpDeps>,
): ResolvedMcpServerCommand | undefined {
  const d = { ...defaultDeps, ...deps };
  const config = vscode.workspace.getConfiguration("kibi");
  const configured = config.get<string>("mcp.serverPath")?.trim();
  if (configured && d.existsSync(configured)) {
    return toServerCommand(configured);
  }

  const platform = d.platform ?? process.platform;
  const binNames =
    platform === "win32" ? ["kibi-mcp.cmd", "kibi-mcp"] : ["kibi-mcp"];
  for (const binName of binNames) {
    const localBin = path.join(workspaceRoot, "node_modules", ".bin", binName);
    if (d.existsSync(localBin)) {
      return toServerCommand(localBin);
    }
  }

  const detected = findKibiMcpInPath(d);
  return detected ? toServerCommand(detected) : undefined;
}

/**
 * Registers the Kibi MCP server definition provider with VS Code when the host
 * supports `vscode.lm.registerMcpServerDefinitionProvider` (VS Code >= 1.101).
 * Returns `undefined` on older VS Code hosts without throwing.
 */
export function registerMcpServerProvider(
  output: vscode.OutputChannel,
  workspaceRoot: string,
  deps?: Partial<McpDeps>,
): vscode.Disposable | undefined {
  const api = deps?.vscodeApi ?? (vscode as unknown as McpProviderApi);
  const register = api.lm?.registerMcpServerDefinitionProvider;
  if (typeof register !== "function") {
    output.appendLine(
      "VS Code MCP server definition provider API is unavailable; skipping registration.",
    );
    return undefined;
  }

  const d = { ...defaultDeps, ...deps };
  const changeEmitter = new vscode.EventEmitter<void>();

  const providerRegistration = register(KIBI_MCP_PROVIDER_ID, {
    onDidChangeMcpServerDefinitions: changeEmitter.event,
    provideMcpServerDefinitions: () => {
      const manifestPath = path.join(workspaceRoot, ".kb", "manifest.json");
      if (!d.existsSync(manifestPath)) {
        return [];
      }
      const resolved = resolveKibiMcpServerCommand(workspaceRoot, d);
      if (!resolved) {
        return [];
      }
      const env: Record<string, string> = {
        KIBI_MCP_ATTACH_ROOT: workspaceRoot,
        KIBI_MCP_HOST: "vscode",
      };
      const StdioCtor = api.McpStdioServerDefinition;
      const definition: McpServerDefinitionLike =
        typeof StdioCtor === "function"
          ? new StdioCtor(
              KIBI_MCP_PROVIDER_LABEL,
              resolved.command,
              resolved.args,
              env,
            )
          : {
              label: KIBI_MCP_PROVIDER_LABEL,
              command: resolved.command,
              args: resolved.args,
              env,
            };
      definition.cwd = vscode.Uri.file(workspaceRoot);
      return [definition];
    },
  });

  const configListener =
    typeof vscode.workspace.onDidChangeConfiguration === "function"
      ? vscode.workspace.onDidChangeConfiguration((event) => {
          if (event.affectsConfiguration("kibi.mcp.serverPath")) {
            changeEmitter.fire();
          }
        })
      : undefined;

  output.appendLine(
    `Registered Kibi MCP server definition provider (${KIBI_MCP_PROVIDER_ID}).`,
  );

  return {
    dispose() {
      providerRegistration.dispose();
      configListener?.dispose();
      changeEmitter.dispose();
    },
  };
}

/**
 * Validates the MCP server path configuration.
 * Auto-detects if not configured and shows warnings if not found.
 */
export function validateMcpServerPath(
  output: vscode.OutputChannel,
  deps?: Partial<McpDeps>,
): void {
  const d = { ...defaultDeps, ...deps };
  const config = vscode.workspace.getConfiguration("kibi");
  let serverPath = config.get<string>("mcp.serverPath");

  if (!serverPath?.trim()) {
    const detectedPath = findKibiMcpInPath(d);
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

  if (!d.existsSync(serverPath)) {
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
export function findKibiMcpInPath(deps?: Partial<McpDeps>): string | undefined {
  const d = { ...defaultDeps, ...deps };
  try {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "where kibi-mcp" : "which kibi-mcp";

    const result = d.execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });

    // Blank lines are skipped below, so the output needs no outer trim.
    const paths = result.split(/\r?\n/);
    for (const p of paths) {
      const trimmed = p.trim();
      if (trimmed && d.existsSync(trimmed)) {
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
    if (d.existsSync(p)) {
      return p;
    }
  }

  return undefined;
}
