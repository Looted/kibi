/*
 * Traceability feature registration utilities for Kibi VS Code extension
 * Includes code actions, code lens, and hover providers
 */
import * as vscode from "vscode";
import {
  KibiCodeActionProvider,
  browseLinkedEntities,
} from "../codeActionProvider";
import { KibiCodeLensProvider } from "../codeLensProvider";
import { KibiHoverProvider } from "../hoverProvider";
import { RelationshipCache } from "../relationshipCache";
import { resolveSymbolsManifestPaths } from "../shared/manifestResolver";
import { type SymbolIndex, buildIndex } from "../symbolIndex";

export interface TraceabilityRegistrationResult {
  browseLinkedEntitiesCommand?: vscode.Disposable;
  codeActionRegistration?: vscode.Disposable;
  codeLensRegistration?: vscode.Disposable;
  hoverRegistration?: vscode.Disposable;
  relationshipCache: RelationshipCache;
  symbolIndex: SymbolIndex | null;
}

/**
 * Registers traceability features: code actions, code lens, and hover providers.
 */
export function registerTraceability(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  workspaceRoot: string,
  treeDataProvider: {
    getLocalPathForEntity: (entityId: string) => string | undefined;
    getNavigationTargetForEntity?: (
      entityId: string,
    ) => { localPath: string; line?: number | undefined } | undefined;
  },
): TraceabilityRegistrationResult {
  // implements REQ-vscode-traceability
  const relationshipCache = new RelationshipCache();
  const results: TraceabilityRegistrationResult = {
    relationshipCache,
    symbolIndex: null,
  };

  try {
    const codeActionProvider = new KibiCodeActionProvider(workspaceRoot);
    codeActionProvider.watchManifest(context);

    results.browseLinkedEntitiesCommand = vscode.commands.registerCommand(
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
          (id) =>
            treeDataProvider.getNavigationTargetForEntity?.(id) ??
            (() => {
              const localPath = treeDataProvider.getLocalPathForEntity(id);
              return localPath ? { localPath } : undefined;
            })(),
          sourceFile,
          sourceLine,
        );
      },
    );

    results.codeActionRegistration =
      vscode.languages.registerCodeActionsProvider(
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

  try {
    const codeLensProvider = new KibiCodeLensProvider(
      workspaceRoot,
      relationshipCache,
    );
    codeLensProvider.watchSources(context);

    results.codeLensRegistration = vscode.languages.registerCodeLensProvider(
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

  const { symbolsPath, coordinatesPath } =
    resolveSymbolsManifestPaths(workspaceRoot);
  const symbolIndex: SymbolIndex | null = buildIndex(
    symbolsPath,
    workspaceRoot,
    coordinatesPath,
  );
  results.symbolIndex = symbolIndex;

  try {
    const hoverProvider = new KibiHoverProvider(
      workspaceRoot,
      symbolIndex,
      relationshipCache,
    );

    results.hoverRegistration = vscode.languages.registerHoverProvider(
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

  return results;
}
