import * as child_process from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  KibiCodeActionProvider,
  browseLinkedEntities,
  openFileAtLine,
} from "./codeActionProvider";
import { KibiCodeLensProvider } from "./codeLensProvider";
import { KibiHoverProvider } from "./hoverProvider";
import { RelationshipCache } from "./relationshipCache";
import { type SymbolIndex, buildIndex } from "./symbolIndex";
import { KibiTreeDataProvider } from "./treeProvider";

const KIBI_VIEW_ID = "kibi-knowledge-base";

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Kibi");
  output.appendLine("Activating Kibi extension...");
  context.subscriptions.push(output);

  let workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    const envWorkspaceRoot = process.env.KIBI_WORKSPACE_ROOT;
    if (envWorkspaceRoot) {
      const resolved = path.resolve(envWorkspaceRoot);
      const kbConfigPath = path.join(resolved, ".kb", "config.json");
      if (fs.existsSync(kbConfigPath)) {
        workspaceRoot = resolved;
        output.appendLine(
          `No workspace folder attached; using KIBI_WORKSPACE_ROOT fallback: ${workspaceRoot}`,
        );
      } else {
        output.appendLine(
          `KIBI_WORKSPACE_ROOT is set but missing .kb/config.json: ${resolved}`,
        );
      }
    }
  }
  if (!workspaceRoot) {
    output.appendLine("No workspace folder found; activation skipped.");
    return;
  }

  const workspacePatternBase =
    vscode.workspace.workspaceFolders?.find(
      (folder) => folder.uri.fsPath === workspaceRoot,
    ) ?? vscode.Uri.file(workspaceRoot);

  output.appendLine(`Workspace root: ${workspaceRoot}`);

  // ── MCP Server Path Validation ─────────────────────────────────────────────
  validateMcpServerPath(output);

  // ── Tree view ──────────────────────────────────────────────────────────────
  const treeDataProvider = new KibiTreeDataProvider(workspaceRoot);

  const treeView = vscode.window.createTreeView(KIBI_VIEW_ID, {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,
  });
  output.appendLine(`Tree view registered: ${KIBI_VIEW_ID}`);

  const relationshipCache = new RelationshipCache();

  const refreshCommand = vscode.commands.registerCommand(
    "kibi.refreshTree",
    () => {
      treeDataProvider.refresh();
    },
  );

  // Watch .kb/branches/**/kb.rdf for changes and auto-refresh
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspacePatternBase, ".kb/branches/**/kb.rdf"),
  );
  watcher.onDidChange(() => treeDataProvider.refresh());
  watcher.onDidCreate(() => treeDataProvider.refresh());
  watcher.onDidDelete(() => treeDataProvider.refresh());

  // ── Navigation commands ────────────────────────────────────────────────────

  /** Open an entity's source file by its local filesystem path, optionally at a 1-based line. */
  const openEntityCommand = vscode.commands.registerCommand(
    "kibi.openEntity",
    async (localPath: string, line?: number) => {
      try {
        await openFileAtLine(localPath, line);
      } catch {
        vscode.window.showErrorMessage(
          `Kibi: Could not open file — ${localPath}`,
        );
      }
    },
  );

  /** Open an entity's source file by its KB ID (looks up the local path from the tree). */
  const openEntityByIdCommand = vscode.commands.registerCommand(
    "kibi.openEntityById",
    async (entityId: string) => {
      const localPath = treeDataProvider.getLocalPathForEntity(entityId);
      if (localPath) {
        try {
          const uri = vscode.Uri.file(localPath);
          await vscode.window.showTextDocument(uri);
        } catch {
          vscode.window.showErrorMessage(
            `Kibi: Could not open file for entity "${entityId}"`,
          );
        }
      } else {
        vscode.window.showInformationMessage(
          `Kibi: Entity "${entityId}" has no local source file.`,
        );
      }
    },
  );

  const focusKnowledgeBaseCommand = vscode.commands.registerCommand(
    "kibi.focusKnowledgeBase",
    async () => {
      await vscode.commands.executeCommand(
        "workbench.view.extension.kibi-sidebar",
      );
      await vscode.commands.executeCommand(`${KIBI_VIEW_ID}.focus`);
    },
  );

  // ── Code action provider ───────────────────────────────────────────────────
  let browseLinkedEntitiesCommand: vscode.Disposable | undefined;
  let codeActionRegistration: vscode.Disposable | undefined;

  try {
    const codeActionProvider = new KibiCodeActionProvider(workspaceRoot);
    codeActionProvider.watchManifest(context);

    browseLinkedEntitiesCommand = vscode.commands.registerCommand(
      "kibi.browseLinkedEntities",
      async (
        symbolId: string,
        relationships: Array<{ type: string; from: string; to: string }>,
        sourceFile?: string,
        sourceLine?: number,
      ) => {
        await browseLinkedEntities(
          symbolId,
          relationships ?? [],
          workspaceRoot,
          (id) => treeDataProvider.getLocalPathForEntity(id),
          sourceFile,
          sourceLine,
        );
      },
    );

    codeActionRegistration = vscode.languages.registerCodeActionsProvider(
      [{ language: "typescript" }, { language: "javascript" }],
      codeActionProvider,
      {
        providedCodeActionKinds: [KibiCodeActionProvider.ACTION_KIND],
      },
    );

    output.appendLine("Traceability code actions initialized.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`Traceability initialization failed: ${message}`);
    vscode.window.showWarningMessage(
      "Kibi traceability actions failed to initialize. Knowledge Base view remains available.",
    );
  }

  // ── CodeLens provider ──────────────────────────────────────────────────────
  let codeLensRegistration: vscode.Disposable | undefined;

  try {
    const codeLensProvider = new KibiCodeLensProvider(
      workspaceRoot,
      relationshipCache,
    );
    codeLensProvider.watchSources(context);

    codeLensRegistration = vscode.languages.registerCodeLensProvider(
      [{ language: "typescript" }, { language: "javascript" }],
      codeLensProvider,
    );
    codeLensProvider.refresh();

    output.appendLine("CodeLens indicators initialized.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`CodeLens initialization failed: ${message}`);
    vscode.window.showWarningMessage(
      "Kibi CodeLens indicators failed to initialize. Knowledge Base view remains available.",
    );
  }

  // ── Symbol index ─────────────────────────────────────────────────────────────
  // Resolve manifest path using same logic as CodeLens provider
  const resolveManifestPath = (): string => {
    const configPath = vscode.Uri.joinPath(
      vscode.Uri.file(workspaceRoot),
      ".kb",
      "config.json",
    ).fsPath;
    try {
      const fs = require("node:fs") as typeof import("node:fs");
      const path = require("node:path") as typeof import("node:path");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
          symbolsManifest?: string;
        };
        if (config.symbolsManifest) {
          return path.isAbsolute(config.symbolsManifest)
            ? config.symbolsManifest
            : path.resolve(workspaceRoot, config.symbolsManifest);
        }
      }
    } catch {
      // ignore
    }
    // Default convention: symbols.yaml at workspace root
    const path = require("node:path") as typeof import("node:path");
    const fs = require("node:fs") as typeof import("node:fs");
    const candidates = [
      path.join(workspaceRoot, "symbols.yaml"),
      path.join(workspaceRoot, "symbols.yml"),
    ];
    return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
  };

  const manifestPath = resolveManifestPath();
  const symbolIndex: SymbolIndex | null = buildIndex(
    manifestPath,
    workspaceRoot,
  );

  // ── Hover provider ─────────────────────────────────────────────────────────
  let hoverRegistration: vscode.Disposable | undefined;

  try {
    const hoverProvider = new KibiHoverProvider(
      workspaceRoot,
      symbolIndex,
      relationshipCache,
    );

    hoverRegistration = vscode.languages.registerHoverProvider(
      [{ language: "typescript" }, { language: "javascript" }],
      hoverProvider,
    );

    output.appendLine("Hover provider initialized.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`Hover provider initialization failed: ${message}`);
    vscode.window.showWarningMessage(
      "Kibi hover provider failed to initialize. Knowledge Base view remains available.",
    );
  }

  // ── Context on file open ───────────────────────────────────────────────────
  const config = vscode.workspace.getConfiguration("kibi");
  const contextOnOpen = config.get<boolean>("contextOnOpen", true);

  if (contextOnOpen) {
    const docOpenListener = vscode.workspace.onDidOpenTextDocument(
      async (document) => {
        if (!workspaceRoot || document.uri.scheme !== "file") {
          return;
        }

        const kbConfigPath = path.join(workspaceRoot, ".kb");
        const kbExists = fs.existsSync(kbConfigPath);

        if (!kbExists) {
          return;
        }

        const relativePath = path.relative(workspaceRoot, document.uri.fsPath);

        try {
          interface McpResult {
            structuredContent?: {
              entities?: unknown[];
            };
          }
          const mcpResult = await vscode.commands.executeCommand<McpResult>(
            "kibi-mcp.kbcontext",
            { sourceFile: relativePath },
          );

          if (
            mcpResult?.structuredContent?.entities &&
            Array.isArray(mcpResult.structuredContent.entities) &&
            mcpResult.structuredContent.entities.length > 0
          ) {
            const count = mcpResult.structuredContent.entities.length;
            vscode.window.showInformationMessage(
              `Kibi: ${count} KB entities linked to this file. Open Kibi panel to explore.`,
            );
          }
        } catch (error) {
          output.appendLine(
            `Context query failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );

    context.subscriptions.push(docOpenListener);
  }

  context.subscriptions.push(
    refreshCommand,
    treeView,
    watcher,
    openEntityCommand,
    openEntityByIdCommand,
    focusKnowledgeBaseCommand,
    ...(browseLinkedEntitiesCommand ? [browseLinkedEntitiesCommand] : []),
    ...(codeActionRegistration ? [codeActionRegistration] : []),
    ...(codeLensRegistration ? [codeLensRegistration] : []),
    ...(hoverRegistration ? [hoverRegistration] : []),
  );

  output.appendLine("Kibi extension activation complete.");
}

function validateMcpServerPath(output: vscode.OutputChannel): void {
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

function findKibiMcpInPath(): string | undefined {
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

export function deactivate() {}
