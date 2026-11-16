import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  FIRM_EDIT_RECEIPT_VERSION,
  FIRM_EDIT_REMOVED_CODE_HASH,
  type FirmEditReceipt,
  type FirmEditVerdict,
  firmEditCodeHash,
  firmEditLegacyReceiptPath,
  firmEditReceiptPath,
  firmEditStatementHash,
  parseFirmEditReceipt,
  serializeFirmEditReceipt,
} from "kibi-agent-core/firm-edit-review";
import {
  type IndexedSymbol,
  loadKnowledgeIndex,
} from "kibi-agent-core/knowledge-index";
import { KbRejection } from "../../cli-errors.js";
import type { ExtractionResult } from "../../extractors/markdown.js";
import { createMaintenanceSourceAnalysisService } from "../../plugins/maintenance-source-analysis.js";
import { readSnapshotKnowledge } from "../../traceability/snapshot-knowledge.js";
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
  removedSymbolRecords,
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
 *
 * The symbol is found the way the gate and the hooks find it: a declaration
 * the source analysis places, else a `.kb/symbols.yaml` record with source
 * coordinates (a module-level or coarse symbol, as the hooks' index reads
 * it), else a record HEAD has and the workspace removed. With `staged`, the
 * code and the requirement are read from the Git index, as the commit gate
 * reads them.
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
  staged?: boolean;
};

export type ReviewFirmEditDeps = {
  /** The symbols of a workspace file, with their implements links. */
  symbolsOf: (
    workspaceRoot: string,
    sourceFile: string,
    content: string,
  ) => Promise<readonly ExtractedSymbol[]>;
  /** A file's text in the Git index; undefined when it is not there. */
  readStaged: (
    workspaceRoot: string,
    relativePath: string,
  ) => string | undefined;
  /** The symbols the hooks' knowledge index holds for a file. */
  indexedSymbols: (
    workspaceRoot: string,
    sourceFile: string,
  ) => readonly IndexedSymbol[];
  /** The authored knowledge at HEAD; empty without a HEAD commit. */
  headKnowledge: (workspaceRoot: string) => readonly ExtractionResult[];
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

function gitIn(workspaceRoot: string) {
  return (args: readonly string[]): Buffer =>
    execFileSync("git", args, {
      cwd: workspaceRoot,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
}

function readStagedFile(
  workspaceRoot: string,
  relativePath: string,
): string | undefined {
  try {
    return gitIn(workspaceRoot)(["show", `:${relativePath}`]).toString("utf8");
  } catch {
    // Not in the index, or not a repository.
  }
  return undefined;
}

function readHeadKnowledge(workspaceRoot: string): readonly ExtractionResult[] {
  try {
    return readSnapshotKnowledge(gitIn(workspaceRoot), "HEAD");
  } catch {
    // No HEAD commit, or knowledge HEAD cannot compile: nothing was removed.
  }
  return [];
}

export const REVIEW_FIRM_EDIT_DEPS: ReviewFirmEditDeps = {
  symbolsOf: workspaceSymbols,
  readStaged: readStagedFile,
  indexedSymbols: (workspaceRoot, sourceFile) =>
    loadKnowledgeIndex(workspaceRoot).files[sourceFile] ?? [],
  headKnowledge: readHeadKnowledge,
  now: () => new Date(),
};

function refuse(message: string): never {
  throw new KbRejection("VALIDATION_FAILED", message, [
    { rule: "firm_edit_review_invalid", field: "reviews" },
  ]);
}

type Planned = {
  path: string;
  /** A receipt file an earlier release wrote for the same pair, to remove. */
  legacyPath?: string;
  receipt: FirmEditReceipt;
};

type ReviewedCode = { codeHash: string; startLine: number; endLine: number };

/**
 * The code of the reviewed symbol: a placed declaration, else a coarse
 * manifest record with coordinates, else a record HEAD has and the workspace
 * removed. Refuses with the symbols that do implement the requirement.
 */
async function reviewedCode(input: {
  workspaceRoot: string;
  requirementId: string;
  sourceFile: string;
  name: string;
  content: string | undefined;
  deps: ReviewFirmEditDeps;
}): Promise<ReviewedCode> {
  const { workspaceRoot, requirementId, sourceFile, name, content, deps } =
    input;
  const implementing =
    content === undefined
      ? []
      : (await deps.symbolsOf(workspaceRoot, sourceFile, content)).filter(
          (symbol) => implementedRequirementIds(symbol).includes(requirementId),
        );
  const symbol = implementing.find((candidate) => candidate.name === name);
  if (symbol !== undefined)
    return {
      // The extractor's span always lies inside the text it read.
      codeHash: firmEditCodeHash(
        content as string,
        symbol.location.startLine,
        symbol.location.endLine,
      ) as string,
      startLine: symbol.location.startLine,
      endLine: symbol.location.endLine,
    };
  const indexed = deps
    .indexedSymbols(workspaceRoot, sourceFile)
    .filter((candidate) => candidate.implements.includes(requirementId));
  const coarse = indexed.find((candidate) => candidate.title === name);
  const coarseHash =
    coarse?.line !== undefined &&
    coarse.endLine !== undefined &&
    content !== undefined
      ? firmEditCodeHash(content, coarse.line, coarse.endLine)
      : undefined;
  if (coarseHash !== undefined)
    return {
      codeHash: coarseHash,
      startLine: coarse?.line as number,
      endLine: coarse?.endLine as number,
    };
  const removed = removedSymbolRecords(
    deps.headKnowledge(workspaceRoot),
    readImpactManifestResults(workspaceRoot),
  ).some(
    (record) =>
      record.sourceFile === sourceFile &&
      record.symbol === name &&
      record.requirementIds.includes(requirementId),
  );
  if (removed)
    return { codeHash: FIRM_EDIT_REMOVED_CODE_HASH, startLine: 0, endLine: 0 };
  const names = [
    ...new Set([
      ...implementing.map((candidate) => candidate.name),
      ...indexed.map((candidate) => candidate.title),
    ]),
  ];
  if (coarse !== undefined)
    refuse(
      `${name} in ${sourceFile} has no source coordinates to bind the review to; run kibi sync and record the review again.`,
    );
  if (content === undefined) refuse(`${sourceFile} cannot be read.`);
  return refuse(
    `${name} in ${sourceFile} does not implement ${requirementId}. ${
      names.length === 0
        ? `No symbol in ${sourceFile} implements ${requirementId}.`
        : `Symbols there that implement it: ${names.join(", ")}.`
    }`,
  );
}

function readWorkspaceText(absolute: string): string | undefined {
  try {
    return readFileSync(absolute, "utf8");
  } catch {
    // A missing or unreadable file has no text.
  }
  return undefined;
}

async function planReceipt(
  entry: FirmEditReviewEntry,
  workspaceRoot: string,
  deps: ReviewFirmEditDeps,
  recordedAt: string,
  staged: boolean,
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
  const requirementPath = `.kb/requirements/${requirementId}.md`;
  const content = staged
    ? deps.readStaged(workspaceRoot, sourceFile)
    : readWorkspaceText(absolute);
  const requirementText = staged
    ? deps.readStaged(workspaceRoot, requirementPath)
    : readWorkspaceText(path.join(workspaceRoot, requirementPath));
  const name = entry.symbol.trim();
  const code = await reviewedCode({
    workspaceRoot,
    requirementId,
    sourceFile,
    name,
    content,
    deps,
  });
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
  const legacyPath = firmEditLegacyReceiptPath(requirementId, sourceFile, name);
  const legacy =
    legacyPath === undefined
      ? undefined
      : parseFirmEditReceipt(
          readWorkspaceText(path.join(workspaceRoot, legacyPath)),
        );
  return {
    path: receiptPath,
    ...(legacy?.sourceFile === sourceFile && legacy.symbol === name
      ? { legacyPath: legacyPath as string }
      : {}),
    receipt: {
      version: FIRM_EDIT_RECEIPT_VERSION,
      requirementId,
      sourceFile,
      symbol: name,
      verdict: entry.verdict,
      note,
      ...(requestQuote ? { requestQuote } : {}),
      statementHash: firmEditStatementHash(
        requirementStatement(requirement, requirementText),
      ),
      ...code,
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
  if (planned.legacyPath !== undefined)
    rmSync(path.join(workspaceRoot, planned.legacyPath), { force: true });
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
    planned.push(
      await planReceipt(
        entry,
        workspaceRoot,
        deps,
        recordedAt,
        input.staged === true,
      ),
    );
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
