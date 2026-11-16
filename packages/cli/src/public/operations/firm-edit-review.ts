import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  FIRM_EDIT_RECEIPT_VERSION,
  type FirmEditReceipt,
  type FirmEditVerdict,
  firmEditCodeHash,
  firmEditReceiptPath,
  firmEditStatementHash,
  serializeFirmEditReceipt,
} from "kibi-agent-core/firm-edit-review";
import { KbRejection } from "../../cli-errors.js";
import { createMaintenanceSourceAnalysisService } from "../../plugins/maintenance-source-analysis.js";
import {
  type ExtractedSymbol,
  extractSymbolsFromStagedFileAsync,
} from "../../traceability/symbol-extract.js";
import {
  normalizeRepoRelativePath,
  resolveWorkspaceSourceAbsolute,
} from "../../utils/repo-relative-path.js";
import {
  implementedRequirementIds,
  isCurrentFirmRequirement,
  requirementStatement,
} from "../impact/firm-edit-gate.js";
import {
  createImpactManifestLookup,
  readImpactManifestResults,
} from "../impact/manifest.js";
import { readWorkspaceRequirement } from "../impact/requirement-statements.js";
import type { OperationContext, OperationResult } from "./types.js";

/**
 * `kb_review_firm_edit` (CLI `kibi review-firm-edit`, not an MCP tool): record the agent's verdict that its change to a
 * symbol implementing a current firm requirement keeps that rule or changes
 * it. Each receipt is one file under `.kb/firm-edit-reviews/`, bound to the
 * requirement's statement and the symbol's code as they are now, so it stops
 * matching when either changes. `kibi check --staged` reads the receipts.
 */

export type FirmEditReviewEntry = {
  requirementId: string;
  sourceFile: string;
  symbol: string;
  verdict: FirmEditVerdict;
  note: string;
  requestQuote?: string;
};

export type ReviewFirmEditInput = {
  reviews: readonly FirmEditReviewEntry[];
  dryRun?: boolean;
};

export type ReviewFirmEditDeps = {
  /** The symbols of a workspace file, with their implements links. */
  symbolsOf: (
    workspaceRoot: string,
    sourceFile: string,
    content: string,
  ) => Promise<readonly ExtractedSymbol[]>;
  now: () => Date;
};

async function workspaceSymbols(
  workspaceRoot: string,
  sourceFile: string,
  content: string,
): Promise<readonly ExtractedSymbol[]> {
  const service = createMaintenanceSourceAnalysisService(workspaceRoot);
  const analysis = await service.analyzeTextV2(sourceFile, content);
  return extractSymbolsFromStagedFileAsync(
    // rationale: with no hunks the extractor keeps every symbol whatever the
    // status, and a placeholder hunk without line numbers is owned by every
    // symbol, so either way it keeps them all.
    // Stryker disable next-line StringLiteral, ArrayDeclaration
    { path: sourceFile, status: "M", content, hunkRanges: [] },
    createImpactManifestLookup(readImpactManifestResults(workspaceRoot)),
    { analyzeText: async () => analysis },
  );
}

export const REVIEW_FIRM_EDIT_DEPS: ReviewFirmEditDeps = {
  symbolsOf: workspaceSymbols,
  now: () => new Date(),
};

function refuse(message: string): never {
  throw new KbRejection("VALIDATION_FAILED", message, [
    { rule: "firm_edit_review_invalid", field: "reviews" },
  ]);
}

type Planned = { path: string; receipt: FirmEditReceipt };

async function planReceipt(
  entry: FirmEditReviewEntry,
  workspaceRoot: string,
  deps: ReviewFirmEditDeps,
  recordedAt: string,
): Promise<Planned> {
  const requirementId = entry.requirementId.trim();
  const requirement = readWorkspaceRequirement(workspaceRoot, requirementId);
  if (requirement === undefined)
    refuse(`${requirementId} is not a requirement in .kb/requirements.`);
  if (!isCurrentFirmRequirement(requirement))
    refuse(
      `${requirementId} is not a current firm requirement, so an edit of its code needs no review.`,
    );
  const outside = () =>
    refuse(`${entry.sourceFile} is not a file inside the workspace.`);
  const sourceFile =
    normalizeRepoRelativePath(workspaceRoot, entry.sourceFile) ?? outside();
  const absolute =
    resolveWorkspaceSourceAbsolute(workspaceRoot, sourceFile) ?? outside();
  let content: string;
  try {
    content = readFileSync(absolute, "utf8");
  } catch {
    refuse(`${sourceFile} cannot be read.`);
  }
  const symbols = await deps.symbolsOf(workspaceRoot, sourceFile, content);
  const implementing = symbols.filter((symbol) =>
    implementedRequirementIds(symbol).includes(requirementId),
  );
  const name = entry.symbol.trim();
  const symbol = implementing.find((candidate) => candidate.name === name);
  if (symbol === undefined)
    refuse(
      `${name} in ${sourceFile} does not implement ${requirementId}. ${
        implementing.length === 0
          ? `No symbol in ${sourceFile} implements ${requirementId}.`
          : `Symbols there that implement it: ${implementing
              .map((candidate) => candidate.name)
              .join(", ")}.`
      }`,
    );
  const note = entry.note.trim();
  if (note === "")
    refuse(
      `The review of ${name} for ${requirementId} needs a note saying why the change keeps or changes the rule.`,
    );
  const requestQuote = entry.requestQuote?.trim();
  // A requirement id always yields a receipt path.
  const receiptPath = firmEditReceiptPath(
    requirementId,
    sourceFile,
    name,
  ) as string;
  return {
    path: receiptPath,
    receipt: {
      version: FIRM_EDIT_RECEIPT_VERSION,
      requirementId,
      sourceFile,
      symbol: name,
      verdict: entry.verdict,
      note,
      ...(requestQuote ? { requestQuote } : {}),
      statementHash: firmEditStatementHash(requirementStatement(requirement)),
      // The extractor's span always lies inside the text it read.
      codeHash: firmEditCodeHash(
        content,
        symbol.location.startLine,
        symbol.location.endLine,
      ) as string,
      startLine: symbol.location.startLine,
      endLine: symbol.location.endLine,
      recordedAt,
    },
  };
}

function writeReceipt(workspaceRoot: string, planned: Planned): void {
  const absolute = path.join(workspaceRoot, planned.path);
  mkdirSync(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  writeFileSync(temporary, serializeFirmEditReceipt(planned.receipt));
  renameSync(temporary, absolute);
}

export async function executeReviewFirmEdit(
  input: ReviewFirmEditInput,
  context: OperationContext,
  deps: ReviewFirmEditDeps = REVIEW_FIRM_EDIT_DEPS,
): Promise<OperationResult<Record<string, unknown>>> {
  const workspaceRoot = context.workspaceRoot;
  const recordedAt = deps.now().toISOString();
  const planned: Planned[] = [];
  for (const entry of input.reviews)
    planned.push(await planReceipt(entry, workspaceRoot, deps, recordedAt));
  const paths = planned.map((entry) => entry.path);
  const duplicate = paths.find(
    (entry, index) => paths.indexOf(entry) !== index,
  );
  if (duplicate !== undefined)
    refuse(`Two reviews name the same requirement and symbol (${duplicate}).`);
  const dryRun = input.dryRun === true;
  if (!dryRun) for (const entry of planned) writeReceipt(workspaceRoot, entry);
  const changes = planned.filter(
    (entry) => entry.receipt.verdict === "changes",
  );
  const lines = planned.map(
    (entry) =>
      `${entry.receipt.requirementId} ${entry.receipt.verdict} (${entry.receipt.symbol} in ${entry.receipt.sourceFile})`,
  );
  return {
    content: [
      {
        type: "text",
        text: [
          `${dryRun ? "Would record" : "Recorded"} ${planned.length} firm-edit review${planned.length === 1 ? "" : "s"}: ${lines.join("; ")}.`,
          "A receipt is the agent's judgment, not the person's approval; it stops matching when the requirement or the code changes.",
          ...(changes.length > 0
            ? [
                `A "changes" verdict keeps kibi check --staged blocked until the requirement is superseded with the person's words: ask them about ${[...new Set(changes.map((entry) => entry.receipt.requirementId))].join(", ")}.`,
              ]
            : []),
        ].join("\n"),
      },
    ],
    structuredContent: {
      dryRun,
      receipts: planned.map((entry) => ({
        path: entry.path,
        ...entry.receipt,
      })),
    },
  };
}
