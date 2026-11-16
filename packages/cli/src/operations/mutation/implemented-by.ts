import path from "node:path";
import { collectGranularityCandidates } from "kibi-plugin-builtin";
import { KbRejection } from "../../cli-errors.js";
import { loadEntitiesPaged } from "../../public/operations/discovery-entities.js";
import type {
  FilesystemPort,
  OperationContext,
} from "../../public/operations/runtime-types.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import {
  type GranularSymbolCandidate,
  coarseLinkBehavioralNames,
  getBehavioralSymbolNames,
  getSymbolRole,
} from "../../public/symbol-granularity.js";
import {
  normalizeRepoRelativePath,
  resolveWorkspaceSourceAbsolute,
} from "../../utils/repo-relative-path.js";
import type {
  ImplementedByInput,
  ImplementedByLink,
  UpsertInput,
  UpsertPayload,
} from "./types.js";
import { executeUpsert, validateUpsertForCommit } from "./upsert.js";

const ISSUE = { rule: "implemented_by_unresolved", field: "implementedBy" };

function refuse(message: string): never {
  throw new KbRejection("VALIDATION_FAILED", message, [ISSUE]);
}

function listed(names: readonly string[]): string {
  const shown = names.slice(0, 10);
  const hidden = names.length - shown.length;
  return names.length === 0
    ? "none"
    : `${shown.join(", ")}${hidden > 0 ? `, and ${hidden} more` : ""}`;
}

function slug(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function entries(input: UpsertInput): readonly ImplementedByInput[] {
  const raw = input.implementedBy as unknown;
  if (!Array.isArray(raw) || raw.length === 0)
    refuse(
      `Upsert of ${input.id} rejected: implementedBy must be a non-empty array of {sourceFile, symbol} entries.`,
    );
  if (input.type !== "req")
    refuse(
      `Upsert of ${input.id} rejected: implementedBy is accepted only on a requirement; link a ${input.type} from its symbol with a relationship instead.`,
    );
  return raw.map((entry, index) => {
    const record = (entry ?? {}) as Record<string, unknown>;
    const sourceFile = record.sourceFile;
    const symbol = record.symbol;
    if (
      typeof sourceFile !== "string" ||
      sourceFile.trim() === "" ||
      typeof symbol !== "string" ||
      symbol.trim() === ""
    )
      refuse(
        `Upsert of ${input.id} rejected: implementedBy[${index}] must name a sourceFile and the symbol declared in it; a whole file is never an implements link.`,
      );
    return { sourceFile: sourceFile.trim(), symbol: symbol.trim() };
  });
}

/** The declarations of a file an implements link may name: behavioral and not coarse. */
function granularNames(
  candidates: readonly GranularSymbolCandidate[],
): string[] {
  return getBehavioralSymbolNames(
    candidates.filter(
      (candidate) =>
        coarseLinkBehavioralNames(candidate.name, candidates).length === 0,
    ),
  );
}

type Resolved = Readonly<{
  sourceFile: string;
  symbol: string;
  candidate: GranularSymbolCandidate;
}>;

/**
 * Resolve one entry to exactly one granular declaration of its file: the
 * declaration must exist under that name, and must not be coarse (a class
 * whose behavior lives in its methods is refused with the methods to link).
 */
async function resolveEntry(
  entry: ImplementedByInput,
  requirementId: string,
  context: OperationContext,
): Promise<Resolved> {
  const absolute = resolveWorkspaceSourceAbsolute(
    context.workspaceRoot,
    entry.sourceFile,
  );
  if (absolute === null)
    refuse(
      `Upsert of ${requirementId} rejected: implementedBy names ${entry.sourceFile}, which is not a file inside the workspace.`,
    );
  // resolveWorkspaceSourceAbsolute resolved it, so the path normalizes.
  const relative = normalizeRepoRelativePath(
    context.workspaceRoot,
    entry.sourceFile,
  ) as string;
  let content: string;
  try {
    const fs = context.fs as FilesystemPort;
    content = await fs.readFile(absolute);
  } catch {
    refuse(
      `Upsert of ${requirementId} rejected: implementedBy names ${relative}, which cannot be read.`,
    );
  }
  const candidates = collectGranularityCandidates(
    relative,
    content,
  ) as GranularSymbolCandidate[];
  const named = candidates.find((candidate) => candidate.name === entry.symbol);
  if (named === undefined) {
    // Declaration names are unique in a file; a bare method name that
    // several classes declare is listed only qualified, as Class.method.
    const qualified = candidates
      .filter((candidate) => candidate.name.endsWith(`.${entry.symbol}`))
      .map((candidate) => candidate.name);
    refuse(
      qualified.length > 0
        ? `Upsert of ${requirementId} rejected: implementedBy symbol ${entry.symbol} names ${qualified.length} declarations in ${relative}; name one as Class.method. Candidates: ${listed(qualified)}.`
        : `Upsert of ${requirementId} rejected: implementedBy symbol ${entry.symbol} resolves to no declaration in ${relative}. Candidates: ${listed(granularNames(candidates))}.`,
    );
  }
  const coarse = coarseLinkBehavioralNames(entry.symbol, candidates);
  if (coarse.length > 0)
    refuse(
      `Upsert of ${requirementId} rejected: implementedBy symbol ${entry.symbol} in ${relative} is a coarse link; link the declarations that implement the requirement instead. Candidates: ${listed(coarse)}.`,
    );
  return {
    sourceFile: relative,
    symbol: entry.symbol,
    candidate: named,
  };
}

/** kb_upsert always returns its payload; a result without one is a fault. */
function payloadOf(result: OperationResult<UpsertPayload>): UpsertPayload {
  const payload = result.structuredContent;
  if (payload === undefined) throw new Error("kb_upsert returned no payload");
  return payload;
}

type SymbolStep = Readonly<{ link: ImplementedByLink; input: UpsertInput }>;

/**
 * The symbol upsert each resolved entry needs: the stored symbol entity of
 * that declaration gets the implements link added, and a declaration the KB
 * has no symbol for gets a new symbol entity named after its file and name.
 */
async function symbolSteps(
  requirementId: string,
  resolved: readonly Resolved[],
  context: OperationContext,
  deps: ImplementedByDeps,
): Promise<SymbolStep[]> {
  const stored = await deps.storedSymbols(context);
  const taken = new Set(stored.map((entity) => String(entity.id)));
  const steps: SymbolStep[] = [];
  for (const entry of resolved) {
    const matches = stored.filter(
      (entity) =>
        entity.title === entry.symbol &&
        typeof entity.sourceFile === "string" &&
        normalizeRepoRelativePath(context.workspaceRoot, entity.sourceFile) ===
          entry.sourceFile,
    );
    if (matches.length > 1)
      refuse(
        `Upsert of ${requirementId} rejected: implementedBy symbol ${entry.symbol} in ${entry.sourceFile} has several symbol entities (${matches.map((entity) => String(entity.id)).join(", ")}); link the one that implements the requirement with a relationship.`,
      );
    const relationships = [
      { type: "implements", from: "", to: requirementId },
    ] as const;
    const existing = matches[0];
    if (existing !== undefined) {
      const id = String(existing.id);
      steps.push({
        link: {
          sourceFile: entry.sourceFile,
          symbol: entry.symbol,
          symbolId: id,
          created: false,
        },
        input: {
          type: "symbol",
          id,
          properties: {
            title: entry.symbol,
            ...(typeof existing.status === "string"
              ? { status: existing.status }
              : {}),
          },
          relationships: relationships.map((rel) => ({ ...rel, from: id })),
        },
      });
      continue;
    }
    const parsed = path.posix.parse(entry.sourceFile);
    const directory = path.posix.basename(parsed.dir);
    const options = [
      `SYM-${slug(parsed.name)}-${slug(entry.symbol)}`,
      `SYM-${slug(directory)}-${slug(parsed.name)}-${slug(entry.symbol)}`,
      `SYM-${slug(path.posix.join(parsed.dir, parsed.name))}-${slug(entry.symbol)}`,
    ];
    const id = options.find((option) => !taken.has(option));
    if (id === undefined)
      refuse(
        `Upsert of ${requirementId} rejected: no free symbol id for ${entry.symbol} in ${entry.sourceFile} (${options.join(", ")} are taken); upsert its symbol with an id of your choosing.`,
      );
    taken.add(id);
    const role = getSymbolRole(entry.candidate);
    steps.push({
      link: {
        sourceFile: entry.sourceFile,
        symbol: entry.symbol,
        symbolId: id,
        created: true,
      },
      input: {
        type: "symbol",
        id,
        properties: {
          title: entry.symbol,
          sourceFile: entry.sourceFile,
          status: "active",
          ...(role !== "unknown" ? { symbol_role: role } : {}),
        },
        relationships: relationships.map((rel) => ({ ...rel, from: id })),
      },
    });
  }
  return steps;
}

/** The writes and reads executeUpsertRequest composes, replaceable in tests. */
export type ImplementedByDeps = Readonly<{
  execute: typeof executeUpsert;
  validate: typeof validateUpsertForCommit;
  storedSymbols: (
    context: OperationContext,
  ) => Promise<readonly Record<string, unknown>[]>;
}>;

export const IMPLEMENTED_BY_DEPS: ImplementedByDeps = {
  execute: executeUpsert,
  validate: validateUpsertForCommit,
  // kb_upsert requires Prolog, so the operation runtime always supplies it.
  storedSymbols: (context) =>
    loadEntitiesPaged(context.prolog as PrologPort, "symbol"),
};

/**
 * kb_upsert with implementedBy: resolve every entry and validate the
 * requirement and each symbol write (the symbols against the requirement as
 * it will be) before anything is written, then write the requirement and
 * the symbols in order. A write without implementedBy is executeUpsert.
 */
export async function executeUpsertRequest(
  input: UpsertInput,
  context: OperationContext,
  deps: ImplementedByDeps = IMPLEMENTED_BY_DEPS,
): Promise<OperationResult<UpsertPayload>> {
  if (input.implementedBy === undefined) return deps.execute(input, context);
  const wanted = entries(input);
  const { implementedBy: _implementedBy, ...requirement } = input;
  const resolved: Resolved[] = [];
  for (const entry of wanted)
    resolved.push(await resolveEntry(entry, input.id, context));
  const steps = await symbolSteps(input.id, resolved, context, deps);

  const { dryRun: _dryRun, ...commitRequirement } = requirement;
  const links = steps.map((step) => step.link);
  const validateSymbols = async () => {
    const checked = await deps.validate(commitRequirement, context);
    const staged = {
      entities: new Map([[input.id, checked.validated.entity]]),
      relationships: [...checked.validated.relationships],
    };
    for (const step of steps)
      await deps.validate(step.input, context, { staged });
  };

  if (input.dryRun === true) {
    // The requirement's own preview decides first; its symbol writes are
    // judged only against a requirement that would be accepted.
    const preview = await deps.execute(requirement, context);
    const previewed = payloadOf(preview) as UpsertPayload & { valid?: boolean };
    if (previewed.valid === false) return preview;
    await validateSymbols();
    return {
      ...preview,
      structuredContent: { ...previewed, implementedBy: links },
    };
  }
  await validateSymbols();
  const result = await deps.execute(requirement, context);
  const payload = payloadOf(result);
  const written: ImplementedByLink[] = [];
  let relationshipsCreated = payload.relationships_created;
  const warnings = [...payload.warnings];
  for (const step of steps) {
    try {
      const symbol = payloadOf(await deps.execute(step.input, context));
      relationshipsCreated += symbol.relationships_created;
      warnings.push(...symbol.warnings);
      written.push(step.link);
    } catch (error) {
      const remaining = steps.slice(written.length).map((left) => left.input);
      throw new Error(
        `${input.id} was written, and ${written.length} of ${steps.length} implementedBy link(s) with it; linking ${step.link.symbol} in ${step.link.sourceFile} failed: ${error instanceof Error ? error.message : String(error)}. Upsert the remaining symbol payloads to finish: ${JSON.stringify(remaining)}`,
        { cause: error },
      );
    }
  }
  return {
    ...result,
    content: [
      ...result.content,
      {
        type: "text",
        text: `Linked ${written.length} implementing symbol(s): ${written.map((link) => `${link.symbolId}${link.created ? " (new)" : ""}`).join(", ")}.`,
      },
    ],
    structuredContent: {
      ...payload,
      relationships_created: relationshipsCreated,
      warnings,
      implementedBy: written,
    },
  };
}
