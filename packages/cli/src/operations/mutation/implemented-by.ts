import { createHash } from "node:crypto";
import path from "node:path";
import { collectGranularityCandidates } from "kibi-plugin-builtin";
import {
  InputError,
  KbRejection,
  OperationError,
  codedErrorOf,
} from "../../cli-errors.js";
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
  getNonBehavioralSymbolNames,
  getSymbolRole,
} from "../../public/symbol-granularity.js";
import {
  normalizeRepoRelativePath,
  resolveWorkspaceSourceAbsolute,
} from "../../utils/repo-relative-path.js";
import {
  type CaptureReads,
  captureFollowUp,
  prologCaptureReads,
  relatedCurrentRequirements,
  withRequirementCapture,
} from "./capture.js";
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
  const ascii = value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  // A name with letters the ASCII slug drops (non-ASCII ones), or with no
  // letter or digit at all (as `$`), keeps a short hash of itself, so it
  // never mints an empty id part or one another name shares.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: the ASCII range.
  if (ascii !== "" && /^[\x00-\x7F]*$/.test(value)) return ascii;
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 8);
  return ascii === "" ? hash : `${ascii}-${hash}`;
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
    const coveredBy = record.coveredBy;
    if (
      coveredBy !== undefined &&
      (!Array.isArray(coveredBy) ||
        coveredBy.some((id) => typeof id !== "string" || id.trim() === ""))
    )
      refuse(
        `Upsert of ${input.id} rejected: implementedBy[${index}].coveredBy must be an array of test ids.`,
      );
    return {
      sourceFile: sourceFile.trim(),
      symbol: symbol.trim(),
      ...(coveredBy !== undefined
        ? {
            coveredBy: [
              ...new Set((coveredBy as string[]).map((id) => id.trim())),
            ],
          }
        : {}),
    };
  });
}

/**
 * The declarations of a file an implements link may name, by every name an
 * entry may use: the declarations kb_upsert accepts as a granular symbol
 * link (none of whose behavioral members would make the link coarse). A
 * method is named canonically as Class.method; the bare name of a method
 * that only one class declares names the same declaration.
 */
type LinkableDeclarations = Readonly<{
  byName: ReadonlyMap<string, GranularSymbolCandidate>;
  /** Canonical names to offer as candidates, behavioral ones first. */
  names: readonly string[];
}>;

function isBareMethod(candidate: GranularSymbolCandidate): boolean {
  return candidate.kind === "method" && !candidate.name.includes(".");
}

function linkableDeclarations(
  candidates: readonly GranularSymbolCandidate[],
): LinkableDeclarations {
  const accepted = candidates.filter(
    (candidate) =>
      !isBareMethod(candidate) &&
      coarseLinkBehavioralNames(candidate.name, candidates).length === 0,
  );
  const byName = new Map(
    accepted.map((candidate) => [candidate.name, candidate] as const),
  );
  for (const candidate of candidates) {
    if (!isBareMethod(candidate)) continue;
    // The extractor lists a bare method name only when exactly one class
    // declares it, beside the qualified name.
    const qualified = accepted.find(
      (other) =>
        other.kind === "method" && other.name.endsWith(`.${candidate.name}`),
    );
    if (qualified !== undefined) byName.set(candidate.name, qualified);
  }
  return {
    byName,
    names: [
      ...getBehavioralSymbolNames(accepted),
      ...getNonBehavioralSymbolNames(accepted),
    ],
  };
}

/** Every name a declaration goes by: its canonical name, and a bare method name. */
function namesOf(
  declaration: GranularSymbolCandidate,
  linkable: LinkableDeclarations,
): Set<string> {
  const names = new Set([declaration.name]);
  for (const [name, target] of linkable.byName)
    if (target === declaration) names.add(name);
  return names;
}

type Resolved = Readonly<{
  sourceFile: string;
  /** The declaration's canonical name. */
  symbol: string;
  /** Every name the declaration goes by, to match stored symbols. */
  names: ReadonlySet<string>;
  candidate: GranularSymbolCandidate;
  coveredBy: readonly string[];
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
  const linkable = linkableDeclarations(candidates);
  const declaration = linkable.byName.get(entry.symbol);
  if (declaration !== undefined)
    return {
      sourceFile: relative,
      symbol: declaration.name,
      names: namesOf(declaration, linkable),
      candidate: declaration,
      coveredBy: entry.coveredBy ?? [],
    };
  if (candidates.some((candidate) => candidate.name === entry.symbol))
    refuse(
      `Upsert of ${requirementId} rejected: implementedBy symbol ${entry.symbol} in ${relative} is a coarse link; link the declarations that implement the requirement instead. Candidates: ${listed(coarseLinkBehavioralNames(entry.symbol, candidates))}.`,
    );
  // Declaration names are unique in a file; a bare method name that
  // several classes declare is listed only qualified, as Class.method.
  const qualified = candidates
    .filter((candidate) => candidate.name.endsWith(`.${entry.symbol}`))
    .map((candidate) => candidate.name);
  refuse(
    qualified.length > 0
      ? `Upsert of ${requirementId} rejected: implementedBy symbol ${entry.symbol} names ${qualified.length} declarations in ${relative}; name one as Class.method. Candidates: ${listed(qualified)}.`
      : `Upsert of ${requirementId} rejected: implementedBy symbol ${entry.symbol} resolves to no declaration in ${relative}. Candidates: ${listed(linkable.names)}.`,
  );
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
        typeof entity.title === "string" &&
        entry.names.has(entity.title) &&
        typeof entity.sourceFile === "string" &&
        normalizeRepoRelativePath(context.workspaceRoot, entity.sourceFile) ===
          entry.sourceFile,
    );
    if (matches.length > 1)
      refuse(
        `Upsert of ${requirementId} rejected: implementedBy symbol ${entry.symbol} in ${entry.sourceFile} has several symbol entities (${matches.map((entity) => String(entity.id)).join(", ")}); link the one that implements the requirement with a relationship.`,
      );
    // Every link starts at the symbol, whose id is known below.
    const links = [
      { type: "implements", to: requirementId },
      ...entry.coveredBy.map((test) => ({ type: "covered_by", to: test })),
    ];
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
            title: String(existing.title),
            ...(typeof existing.status === "string"
              ? { status: existing.status }
              : {}),
          },
          relationships: links.map((link) => ({
            type: link.type,
            from: id,
            to: link.to,
          })),
        },
      });
      continue;
    }
    const parsed = path.posix.parse(entry.sourceFile);
    const directory = path.posix.basename(parsed.dir);
    const symbol = slug(entry.symbol);
    const options = [
      `SYM-${slug(parsed.name)}-${symbol}`,
      `SYM-${slug(directory)}-${slug(parsed.name)}-${symbol}`,
      `SYM-${slug(path.posix.join(parsed.dir, parsed.name))}-${symbol}`,
    ];
    let id = options.find((option) => !taken.has(option));
    // The path-qualified id is taken too: number the file-qualified one.
    for (let suffix = 2; id === undefined; suffix += 1)
      if (!taken.has(`${options[0]}-${suffix}`)) id = `${options[0]}-${suffix}`;
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
        relationships: links.map((link) => ({
          type: link.type,
          from: id,
          to: link.to,
        })),
      },
    });
  }
  return steps;
}

type SourceWrite = NonNullable<UpsertPayload["sourceWrites"]>[number];

/**
 * The result of the requirement write with a symbol write folded in: the
 * counts add up, and each written file is reported once, from its state
 * before the first write to its state after the last.
 */
function mergedPayload(
  into: UpsertPayload,
  symbol: UpsertPayload,
): UpsertPayload {
  const writes = new Map<string, SourceWrite>();
  for (const write of [
    ...(into.sourceWrites ?? []),
    ...(symbol.sourceWrites ?? []),
  ]) {
    const earlier = writes.get(write.path);
    writes.set(
      write.path,
      earlier === undefined
        ? write
        : {
            ...write,
            beforeHash: earlier.beforeHash,
            created: earlier.created,
          },
    );
  }
  return {
    ...into,
    created: into.created + symbol.created,
    updated: into.updated + symbol.updated,
    relationships_created:
      into.relationships_created + symbol.relationships_created,
    warnings: [...into.warnings, ...symbol.warnings],
    ...(writes.size > 0 ? { sourceWrites: [...writes.values()] } : {}),
  };
}

/**
 * A symbol write that failed after the requirement was written, reported
 * with what is left to do. A coded failure keeps its code and whether a
 * retry may succeed, and a refusal stays a refusal.
 */
function partialFailure(message: string, error: unknown): Error {
  if (error instanceof KbRejection)
    return new KbRejection(error.code, message, error.issues);
  const coded = codedErrorOf(error);
  if (coded === null) return new Error(message, { cause: error });
  const failure =
    (error as Error).name === "InputError"
      ? new InputError(coded.code, message)
      : new OperationError(coded.code, message, coded.retryable);
  failure.cause = error;
  return failure;
}

/** The writes and reads executeUpsertRequest composes, replaceable in tests. */
export type ImplementedByDeps = Readonly<{
  execute: typeof executeUpsert;
  validate: typeof validateUpsertForCommit;
  storedSymbols: (
    context: OperationContext,
  ) => Promise<readonly Record<string, unknown>[]>;
  /** What the capture steps read; none without a store. */
  captureReads: (context: OperationContext) => CaptureReads | undefined;
}>;

export const IMPLEMENTED_BY_DEPS: ImplementedByDeps = {
  execute: executeUpsert,
  validate: validateUpsertForCommit,
  // kb_upsert requires Prolog, so the operation runtime always supplies it.
  storedSymbols: (context) =>
    loadEntitiesPaged(context.prolog as PrologPort, "symbol"),
  captureReads: (context) =>
    context.prolog === undefined
      ? undefined
      : prologCaptureReads(context.prolog),
};

/**
 * kb_upsert as requested: `why` and the statement applied to a requirement
 * (withRequirementCapture), its implementedBy links written with it, and a
 * written requirement's result completed with the steps left as nextActions
 * and the current requirements on the same terms.
 */
export async function executeUpsertRequest(
  input: UpsertInput,
  context: OperationContext,
  deps: ImplementedByDeps = IMPLEMENTED_BY_DEPS,
): Promise<OperationResult<UpsertPayload>> {
  const reads = deps.captureReads(context);
  const captured = await withRequirementCapture(input, context, reads);
  const result = await executeLinkedUpsert(captured, context, deps);
  if (captured.type !== "req" || captured.dryRun === true) return result;
  const payload = payloadOf(result);
  // A write that needs repair already names its own next steps.
  if (payload.status === "committed_with_repairs") return result;
  // The write is committed: a store that fails a follow-up read leaves the
  // result as the write returned it.
  const followUp = await captureFollowUp(
    captured,
    payload,
    context,
    reads,
  ).catch(() => ({ warnings: payload.warnings, nextActions: [] }));
  const related = await relatedCurrentRequirements(captured, context, reads);
  return {
    ...result,
    content: [
      ...result.content,
      ...(followUp.nextActions.length > 0
        ? [
            {
              type: "text" as const,
              // Spelled out in the text: Cursor, Gemini CLI and other
              // text-only hosts never show the model structuredContent.
              text: [
                `Left before kb_check passes: ${followUp.nextActions.length} step(s), also in nextActions:`,
                ...followUp.nextActions.map(
                  (action, index) =>
                    `${index + 1}. ${action.operation} (${action.code}): ${action.reason} Input: ${JSON.stringify(action.input)}`,
                ),
              ].join("\n"),
            },
          ]
        : []),
      ...(related.length > 0
        ? [
            {
              type: "text" as const,
              text: `Current requirements on the same terms: ${related.map((requirement) => requirement.id).join(", ")}. If ${captured.id} replaces one, add a supersedes link to it and close it.`,
            },
          ]
        : []),
    ],
    structuredContent: {
      ...payload,
      warnings: followUp.warnings,
      ...(followUp.nextActions.length > 0
        ? { nextActions: followUp.nextActions }
        : {}),
      ...(related.length > 0 ? { relatedRequirements: related } : {}),
    },
  };
}

/**
 * kb_upsert with implementedBy: resolve every entry and validate the
 * requirement and each symbol write (the symbols against the requirement as
 * it will be) before anything is written, then write the requirement and
 * the symbols in order. A write without implementedBy is executeUpsert.
 */
async function executeLinkedUpsert(
  input: UpsertInput,
  context: OperationContext,
  deps: ImplementedByDeps,
): Promise<OperationResult<UpsertPayload>> {
  if (input.implementedBy === undefined) return deps.execute(input, context);
  const wanted = entries(input);
  const { implementedBy: _implementedBy, ...requirement } = input;
  const resolved: Resolved[] = [];
  const seen = new Set<string>();
  for (const entry of wanted) {
    const declaration = await resolveEntry(entry, input.id, context);
    // Two entries naming one declaration (another spelling of the path or
    // of a method name) record one link.
    const key = `${declaration.sourceFile}\0${declaration.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(declaration);
  }
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
  let merged = payload;
  for (const step of steps) {
    try {
      merged = mergedPayload(
        merged,
        payloadOf(await deps.execute(step.input, context)),
      );
      written.push(step.link);
    } catch (error) {
      const remaining = steps.slice(written.length).map((left) => left.input);
      throw partialFailure(
        `${input.id} was written, and ${written.length} of ${steps.length} implementedBy link(s) with it; linking ${step.link.symbol} in ${step.link.sourceFile} failed: ${error instanceof Error ? error.message : String(error)}. Upsert the remaining symbol payloads to finish: ${JSON.stringify(remaining)}`,
        error,
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
    structuredContent: { ...merged, implementedBy: written },
  };
}
