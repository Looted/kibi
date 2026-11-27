import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readKibiLevel } from "kibi-agent-core/kibi-level";
import { requestTopicWords } from "kibi-agent-core/requirement-candidates";
import { KbRejection } from "../../cli-errors.js";
import { effectiveFirmness } from "../../decision-firmness.js";
import {
  parseBodySections,
  reviseRequirementBody,
  withoutContextSections,
} from "../../entity-body-context.js";
import { requirementSemanticText } from "../../extractors/markdown.js";
import {
  escapeAtom,
  normalizeEntityId,
  parseAtomList,
} from "../../prolog/codec.js";
import {
  loadCurrentRequirementTexts,
  loadEntities,
} from "../../public/operations/discovery-entities.js";
import { readAuthoredEntity } from "../../public/operations/entity-context.js";
import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import { readSubjectNeighbours } from "../../public/operations/subject-domain.js";
import {
  type ClaimSubjectGap,
  anchoredSubjects,
  claimSubjectGaps,
  claimSubjectMissingPrefix,
  pairReviewPartners,
} from "./subject-warnings.js";
import type { UpsertInput, UpsertPayload } from "./types.js";
import { symbolCoverageWarning } from "./warnings.js";

/**
 * The capture side of a requirement kb_upsert: `why` written where the
 * reason belongs, the statement recorded as semantic_text, the steps the
 * write could not finish returned as nextActions with ready inputs, and the
 * current requirements on the same terms listed so a stale twin is seen.
 */

type Entity = Readonly<Record<string, unknown>>;

/** One step the agent takes next: the call, its input, and why. */
export type CaptureNextAction = Readonly<{
  operation: string;
  /** The check rule this step clears. */
  code: string;
  input: unknown;
  reason: string;
  required: boolean;
}>;

/**
 * A decision only a person can make before a written requirement reaches its
 * evidence floor, listed once so the agent asks the person one question.
 */
export type CaptureApproval = Readonly<{
  /** What is approved: a pair verdict, a tracked file, a waiver. */
  kind: "pair_review" | "proof_integration" | "failure_side_waiver";
  /** The requirement, pair or file the approval is about. */
  about: string;
  /** The question, in plain words, to put to the person. */
  ask: string;
  /** Needed only if the agent takes this route instead of the step itself. */
  alternative?: true;
}>;

/** A current requirement on the same terms as the one written. */
export type RelatedRequirement = Readonly<{ id: string; statement: string }>;

/** What the capture steps read from the KB; replaceable in tests. */
export type CaptureReads = Readonly<{
  /** The stored entity of that id and type, or undefined. */
  entity: (id: string, type: "req" | "symbol") => Promise<Entity | undefined>;
  /** Whether any entity has this id. */
  exists: (id: string) => Promise<boolean>;
  /** The symbols with an implements link to the requirement. */
  implementingSymbols: (requirementId: string) => Promise<string[]>;
  /** The scenarios the requirement is specified_by. */
  scenarios: (requirementId: string) => Promise<string[]>;
  /** Whether a symbol has a covered_by or executable_for link. */
  covered: (symbolId: string) => Promise<boolean>;
  /** Whether a test verifies the requirement, directly or through a scenario. */
  tested: (requirementId: string) => Promise<boolean>;
  /** The claims claim-subject-missing reports for a requirement entity. */
  subjectGaps: (entity: Entity) => Promise<ClaimSubjectGap[]>;
  /** Id, title and semantic text of every current requirement. */
  currentRequirements: () => Promise<
    readonly { id: string; title: string; semanticText: string }[]
  >;
  /**
   * The other current requirements kibi check pairs with the requirement on
   * these subjects (on each, a narrower or a broader one), with their titles.
   */
  neighbours: (
    requirementId: string,
    subjectKeys: readonly string[],
  ) => Promise<readonly { id: string; title: string }[]>;
  /** Whether the workspace declares a proof integration kibi prove can run. */
  proofIntegration: () => Promise<boolean>;
}>;

/**
 * The capture reads over a Prolog store. Without the workspace root the
 * reads that need its files report no neighbours and an integration, so a
 * step is never added on a guess.
 */
export function prologCaptureReads(
  prolog: PrologPort,
  workspaceRoot?: string,
): CaptureReads {
  const holds = async (goal: string) =>
    (await prolog.query(`once((${goal}))`)).success;
  const atom = (id: string) => `'${escapeAtom(id)}'`;
  // One output variable: the engine reports a second one bound to the same
  // list as an equation.
  const ids = async (goal: string) => {
    const result = await prolog.query(`findall(X, ${goal}, Ids)`);
    return result.success
      ? [
          ...new Set(
            parseAtomList(result.bindings.Ids ?? "").map(normalizeEntityId),
          ),
        ].sort()
      : [];
  };
  return {
    entity: async (id, type) => (await loadEntities(prolog, { id, type }))[0],
    exists: (id) => holds(`kb_entity(${atom(id)}, _, _)`),
    implementingSymbols: (requirementId) =>
      ids(`kb_relationship(implements, X, ${atom(requirementId)})`),
    scenarios: (requirementId) =>
      ids(`kb_relationship(specified_by, ${atom(requirementId)}, X)`),
    covered: (symbolId) =>
      holds(
        `kb_relationship(covered_by, ${atom(symbolId)}, _) ; kb_relationship(executable_for, ${atom(symbolId)}, _)`,
      ),
    tested: (requirementId) => {
      const req = atom(requirementId);
      return holds(
        `kb_relationship(verified_by, ${req}, _) ; kb_relationship(validates, _, ${req}) ; (kb_relationship(specified_by, ${req}, S), (kb_relationship(verified_by, S, _) ; kb_relationship(validates, _, S)))`,
      );
    },
    subjectGaps: (entity) => claimSubjectGaps(entity, prolog),
    currentRequirements: () => loadCurrentRequirementTexts(prolog),
    neighbours: async (requirementId, subjectKeys) => {
      if (workspaceRoot === undefined || subjectKeys.length === 0) return [];
      const read = await readSubjectNeighbours(prolog, workspaceRoot, {
        requirementId,
        subjectKeys,
        withIds: [],
      });
      const seen = new Map<string, string>();
      for (const subject of read.subjects)
        for (const requirement of subject.requirements)
          if (requirement.id !== requirementId && !seen.has(requirement.id))
            seen.set(requirement.id, requirement.title);
      return [...seen].map(([id, title]) => ({ id, title }));
    },
    proofIntegration: async () =>
      workspaceRoot === undefined ||
      existsSync(path.join(workspaceRoot, ".kb", "proof", "integrations.json")),
  };
}

function readsFor(context: OperationContext): CaptureReads | undefined {
  return context.prolog === undefined
    ? undefined
    : prologCaptureReads(context.prolog, context.workspaceRoot);
}

/** At most this many related requirements a pair-review step names. */
export const MAX_PAIR_REVIEW_STEPS = 5;

/** Context section headings `why` may fill, in the order one is chosen. */
const REASON_HEADINGS = ["Context", "Why", "Rationale"] as const;

function refuse(message: string): never {
  throw new KbRejection("VALIDATION_FAILED", message, [
    { rule: "requirement_why_invalid", field: "why" },
  ]);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readBody(workspaceRoot: string, source: unknown): string | undefined {
  if (typeof source !== "string" || !source.endsWith(".md")) return undefined;
  try {
    return readAuthoredEntity(
      readFileSync(path.resolve(workspaceRoot, source), "utf8"),
      source,
    )?.body;
  } catch {
    return undefined;
  }
}

/** The first word of a context section's heading. */
function headingWord(heading: string): string {
  return (heading.replace(/^[*_`\s]+/, "").split(/\W/)[0] ?? "").toLowerCase();
}

/**
 * The heading of the body's first reason section, if it has one. Only a
 * heading that opens a context run counts: one nested under another context
 * section (`### Rationale` under `## Notes`) belongs to that section.
 */
function reasonHeading(body: string): string | undefined {
  let openLevel = 0;
  for (const section of parseBodySections(body)) {
    if (!section.isContext) {
      openLevel = 0;
      continue;
    }
    if (openLevel > 0 && section.level > openLevel) continue;
    openLevel = section.level;
    const word = headingWord(section.heading);
    const heading = REASON_HEADINGS.find((name) => name.toLowerCase() === word);
    if (heading !== undefined) return heading;
  }
  return undefined;
}

function hasSourceSection(body: string): boolean {
  return parseBodySections(body).some(
    (section) => section.isContext && headingWord(section.heading) === "source",
  );
}

/**
 * The requirement payload with `why` applied and its statement recorded:
 * `why` becomes `rationale` and the body's reason section (its Context, Why
 * or Rationale section, a new Context section when it has none), and the
 * origin.ref text becomes the Source section of a body that has none, or
 * replaces it when the payload sends a new origin.ref. A
 * requirement whose semantic_text is not sent gets its body's statement as
 * semantic_text when none is stored or the sent body states another one, so
 * its proposition inventory is derived from the statement its file will
 * hold. Other payloads pass unchanged.
 */
export async function withRequirementCapture(
  input: UpsertInput,
  context: OperationContext,
  reads: CaptureReads | undefined = readsFor(context),
): Promise<UpsertInput> {
  if (input.why !== undefined && input.type !== "req")
    refuse(
      `Upsert of ${input.id} rejected: why is accepted only on a requirement; give a ${input.type} its reason in the document body.`,
    );
  if (input.type !== "req") return input;
  const { why: sentWhy, ...rest } = input;
  const properties = input.properties ?? {};
  if (
    sentWhy !== undefined &&
    (typeof sentWhy !== "string" || sentWhy.trim() === "")
  )
    refuse(
      `Upsert of ${input.id} rejected: why must be the reason the requirement exists, as text; write 'Reason not stated' when the person gave none.`,
    );
  const why = sentWhy?.trim();
  if (
    why !== undefined &&
    properties.rationale !== undefined &&
    text(properties.rationale) !== why
  )
    refuse(
      `Upsert of ${input.id} rejected: why and rationale disagree; send the reason once, in why.`,
    );
  const sentBody = input.document?.body;
  const sentRef = text((properties.origin as Entity | undefined)?.ref);
  const stored =
    why !== undefined ||
    sentRef !== "" ||
    (sentBody !== undefined && properties.semantic_text === undefined)
      ? await reads?.entity(input.id, "req")
      : undefined;
  // A new origin.ref in place of a stored one is new words of the person's:
  // the Source section quotes them, unless the sent body brings its own.
  const storedRef = text((stored?.origin as Entity | undefined)?.ref);
  const refreshSource =
    storedRef !== "" &&
    sentRef !== "" &&
    sentRef !== storedRef &&
    (sentBody === undefined || !hasSourceSection(sentBody));
  let body = sentBody;
  if (why !== undefined || refreshSource) {
    const base =
      sentBody ??
      readBody(context.workspaceRoot, input.document?.path ?? stored?.source) ??
      `${text(properties.semantic_text) || text(stored?.semantic_text) || text(properties.title) || text(stored?.title)}\n`;
    const origin = (properties.origin ?? stored?.origin) as Entity | undefined;
    const ref = text(origin?.ref);
    body = reviseRequirementBody({
      existingBody: base,
      statement: withoutContextSections(base).trim(),
      context: why,
      contextHeading: reasonHeading(base),
      source:
        ref !== "" && (refreshSource || !hasSourceSection(base))
          ? { excerpt: ref }
          : undefined,
    });
  }
  // A sent body that states something new replaces the stored statement, so
  // the claims Kibi checks never drift from the file's statement.
  const derived =
    properties.semantic_text === undefined && body !== undefined
      ? requirementSemanticText(body)
      : "";
  // The sent body restates the requirement only when its statement differs
  // from the one the body on disk holds: a semantic_text written apart from
  // the body (an upsert that sent both) is kept while the body's statement
  // stays the same. Without a readable stored body, semantic_text is compared.
  const storedStatement = text(stored?.semantic_text);
  const storedBody =
    sentBody === undefined || storedStatement === ""
      ? undefined
      : readBody(context.workspaceRoot, input.document?.path ?? stored?.source);
  const previousStatement =
    storedBody === undefined
      ? storedStatement
      : requirementSemanticText(storedBody).trim();
  const statement =
    storedStatement === "" ||
    (sentBody !== undefined && derived.trim() !== previousStatement)
      ? derived
      : "";
  if (why === undefined && statement === "" && !refreshSource) return rest;
  return {
    ...rest,
    properties: {
      ...properties,
      ...(why !== undefined ? { rationale: why } : {}),
      ...(statement !== "" ? { semantic_text: statement } : {}),
    },
    ...(body !== undefined ? { document: { ...input.document, body } } : {}),
  };
}

/**
 * The evidence level a requirement entity must reach: its required_evidence,
 * else tested for a firm one or one a person approved that states no
 * firmness, else none.
 */
export function evidenceFloorOf(entity: Entity): string | undefined {
  const explicit = text(entity.required_evidence);
  if (explicit !== "") return explicit;
  if (entity.firmness === "firm") return "tested";
  const origin = entity.origin as Entity | undefined;
  if (entity.firmness === undefined && text(origin?.approved_by) !== "")
    return "tested";
  return undefined;
}

/** How the context warning for a requirement starts. */
function contextWarningPrefix(id: string): string {
  return `requirement ${id} has no body context:`;
}

/** The `why` placeholder of a step that asks for the reason. */
export const WHY_PLACEHOLDER =
  "<why the person wants it, in their words; 'Reason not stated' if they gave none>";

/** The `origin.ref` placeholder of a step that asks for the person's words. */
export const REF_PLACEHOLDER =
  "<the person's words or where they said them, quoted>";

const SUBJECT_PLACEHOLDER = "<subject_key>";

/**
 * The requirement's stored inventory with a subject on each claim that
 * lacks one, as partial entries ({claim_key, status, subjects}). Every claim
 * goes back, so none loses its status, and Kibi derives the rest of the
 * ledger from the stored prose: full entries would be judged against the
 * title, which kb_record sets to the statement's first sentence.
 */
function inventoryWithSubjects(
  entity: Record<string, unknown>,
  gaps: readonly ClaimSubjectGap[],
): Record<string, unknown>[] {
  const subjects = new Map(
    gaps.map((gap) => [
      gap.claimKey,
      [gap.candidates[0] ?? SUBJECT_PLACEHOLDER],
    ]),
  );
  const stored = Array.isArray(entity.semantic_inventory)
    ? entity.semantic_inventory
    : [];
  return stored
    .filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" && entry !== null,
    )
    .map((entry) => {
      // The partial shape: Kibi derives the rest of the ledger from the
      // stored prose, so the step stays valid whatever the title says.
      const added = subjects.get(String(entry.claim_key));
      const kept = added ?? entry.subjects;
      return {
        claim_key: entry.claim_key,
        status: entry.status,
        ...(Array.isArray(kept) ? { subjects: kept } : {}),
      };
    });
}

/** Inventory statuses of a claim no fact grounds yet. */
const UNMODELED_STATUSES = new Set(["missing", "ontology_gap", "ambiguous"]);

/** The claim keys of the requirement's claims that no fact grounds yet. */
function unmodeledClaimKeys(entity: Entity): string[] {
  const stored = Array.isArray(entity.semantic_inventory)
    ? entity.semantic_inventory
    : [];
  return stored
    .filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" &&
        entry !== null &&
        UNMODELED_STATUSES.has(String(entry.status)),
    )
    .map((entry) => String(entry.claim_key));
}

const VERDICT_PLACEHOLDER = "<no_conflict | interacts | conflict>";
const SEPARATED_PLACEHOLDER =
  "<for no_conflict: the condition or term that separates the two rules>";

/** The reason of the claim-subject-missing step. */
function subjectReason(id: string, gaps: readonly ClaimSubjectGap[]): string {
  const claims =
    gaps.length === 1
      ? `claim ${gaps[0]?.claimKey} names the subject it is about`
      : `claims ${gaps.map((gap) => gap.claimKey).join(", ")} name the subjects they are about`;
  const others = gaps.flatMap((gap) => gap.labels.slice(1));
  const choice = gaps.every((gap) => gap.candidates.length > 0)
    ? `subjects holds the closest existing subject by its words${others.length > 0 ? `; use ${others.join(", ")} instead if one fits better` : ""}, or a subject you define first as a subject fact.`
    : "Name an existing subject (kb_query factKind subject lists them), or define one first as a subject fact.";
  return `kb_check blocks ${id} until ${claims}. ${choice}`;
}

/**
 * The steps a written requirement still needs before kb_check passes that
 * the write itself could not take, each with the call and a ready input,
 * with the warnings they replace removed. A step that needs a judgment only
 * the agent can make (a reason, a test case) carries a <placeholder>.
 */
type FollowUp = Readonly<{
  action: CaptureNextAction;
  approvals: CaptureApproval[];
}>;

function required(
  operation: string,
  code: string,
  input: unknown,
  reason: string,
): CaptureNextAction {
  return { operation, code, input, reason, required: true };
}

/**
 * The pair reviews kb_check asks for once the claims name their subjects,
 * listed with the first write; a verdict on a firm pair is a person's.
 */
export function pairReviewFollowUp(
  id: string,
  head: Readonly<{ title: string; status: string }>,
  claims: readonly string[],
  subjectKeys: readonly string[],
  partners: readonly Readonly<{ id: string; title: string }>[],
  firmPartners: readonly string[],
): FollowUp {
  return {
    action: required(
      "kb_upsert",
      "related-requirement-unmodeled",
      {
        type: "req",
        id,
        properties: {
          ...head,
          pair_reviews: partners.map((partner) => ({
            with: partner.id,
            verdict: VERDICT_PLACEHOLDER,
            separated_by: SEPARATED_PLACEHOLDER,
            claims,
            origin: { kind: "agent" },
          })),
        },
      },
      `Once its claims name ${subjectKeys.join(", ")}, kb_check pairs ${id} with ${partners.map((partner) => `${partner.id} ("${partner.title}")`).join(", ")} and blocks until each pair is modeled or has a verdict. Model both claims, or send one pair review per partner: no_conflict with separated_by naming what separates them, interacts with resolved_by naming what resolves it, or conflict, which stays blocking until a person decides.${firmPartners.length > 0 ? " A verdict on a firm pair counts only with approved_by from a person, so those pairs are in approvalsNeeded." : ""}`,
    ),
    approvals: firmPartners.map((partner) => ({
      kind: "pair_review",
      about: `${id} and ${partner}`,
      ask: `Do ${id} and ${partner} both hold as written, and is the agent's verdict on the pair right? The person's name goes in that review's approved_by.`,
    })),
  };
}

/**
 * Unmodeled claims get a kb_model step at every level: a grounded claim is
 * what lets kb_check catch a contradiction. Below a proof floor at level
 * test, grounding is also what the floor needs first.
 */
export function groundingStep(
  id: string,
  floor: string | undefined,
  claims: readonly string[],
  statement: string,
): CaptureNextAction {
  return required(
    "kb_model",
    floor === undefined ? "missing_logic_grounding" : "evidence-floor",
    { mode: "requirement", requirementId: id, text: statement },
    floor === undefined
      ? `Each claim of ${id} (${claims.join(", ")}) is still unmodeled, so kb_check cannot tell when another requirement contradicts it: kb_model returns the facts to upsert.`
      : `${id} reaches ${floor} only when each claim (${claims.join(", ")}) is grounded by a fact: kb_model returns the facts to upsert. A grounded claim also needs the failure-side scenario below.`,
  );
}

/**
 * A new requirement with a proof floor gets its failure-side scenario in the
 * first list, so its second wave of gaps is not a second question.
 */
export function failureScenarioFollowUp(
  id: string,
  scenarioId: string,
  floor: string | undefined,
): FollowUp {
  return {
    action: required(
      "kb_upsert",
      "evidence-floor",
      {
        type: "scenario",
        id: scenarioId,
        properties: {
          title: `<a value ${id} forbids is refused>`,
          status: "active",
          expects: "rejection",
        },
        document: {
          body: `<given a value or situation ${id} forbids, when ..., then it is refused>\n`,
        },
      },
      `Once its claims are grounded, ${id} is not ${floor} while only its happy path is: this failure-side scenario expects rejection and assumes a value the requirement forbids; the same test verifies it. If ${id} has no input to refuse (it states a capability or an output shape), a person may approve a failure_side_waiver instead, listed in approvalsNeeded.`,
    ),
    approvals: [
      {
        kind: "failure_side_waiver",
        about: id,
        ask: `Only if ${id} has no input to refuse: may its failure side be waived (failure_side_waiver_approved_by)?`,
        alternative: true,
      },
    ],
  };
}

/** A workspace with no proof integration is named, with the file it adds. */
export function proofIntegrationFollowUp(testId: string): FollowUp {
  return {
    action: required(
      "kibi proof inspect",
      "evidence-floor",
      { command: "kibi proof run-steps", json: true },
      `This workspace has no proof integration (.kb/proof/integrations.json), so kibi prove cannot run ${testId} yet. Run kibi proof inspect --command "kibi proof run-steps" --json and apply the plan it returns with kb_apply_plan. It adds .kb/proof/integrations.json, a new tracked file the person approves (listed in approvalsNeeded).`,
    ),
    approvals: [
      {
        kind: "proof_integration",
        about: ".kb/proof/integrations.json",
        ask: "May the change add .kb/proof/integrations.json, which tells kibi prove how to run this repository's tests?",
      },
    ],
  };
}

export async function captureFollowUp(
  input: UpsertInput,
  payload: UpsertPayload,
  context: OperationContext,
  reads: CaptureReads | undefined = readsFor(context),
): Promise<{
  warnings: string[];
  nextActions: CaptureNextAction[];
  approvalsNeeded: CaptureApproval[];
}> {
  const warnings = [...payload.warnings];
  if (input.type !== "req" || reads === undefined)
    return { warnings, nextActions: [], approvalsNeeded: [] };
  const id = input.id;
  const entity = await reads.entity(id, "req");
  if (entity === undefined)
    return { warnings, nextActions: [], approvalsNeeded: [] };
  const approvals: CaptureApproval[] = [];
  const head = {
    title: text(entity.title) || id,
    status: text(entity.status) || "open",
  };
  const actions: CaptureNextAction[] = [];
  const drop = (matches: (warning: string) => boolean): boolean => {
    const before = warnings.length;
    const kept = warnings.filter((warning) => !matches(warning));
    warnings.splice(0, warnings.length, ...kept);
    return kept.length < before;
  };
  const step = (
    code: string,
    stepInput: unknown,
    reason: string,
    operation = "kb_upsert",
  ) =>
    actions.push({ operation, code, input: stepInput, reason, required: true });

  if (drop((warning) => warning.startsWith(contextWarningPrefix(id)))) {
    // A firm requirement's reason is credited to the person and is not
    // written in place, so the step asks for their words with it.
    const firmReason =
      effectiveFirmness("req", entity.firmness, entity.origin) === "firm";
    step(
      "entity-context-missing",
      firmReason
        ? {
            type: "req",
            id,
            properties: {
              ...head,
              origin: {
                ...(entity.origin as Entity | undefined),
                ref: REF_PLACEHOLDER,
              },
            },
            why: WHY_PLACEHOLDER,
          }
        : { type: "req", id, properties: head, why: WHY_PLACEHOLDER },
      firmReason
        ? `kb_check blocks ${id} until its body says why it exists, in 12 words or more with its Source. ${id} is firm and its reason is credited to the person, so ask the person: send their fuller reason as why and their words as origin.ref, which the body keeps as its Source. Never pad their reason to reach 12 words.`
        : `kb_check blocks ${id} until its body says why it exists, in 12 words or more with its Source: send the person's reason as why, in their words. Never pad it to reach 12 words; cite their words as origin.ref, which the body keeps as its Source.`,
    );
  }

  const gaps = await reads.subjectGaps(entity);
  if (gaps.length > 0) {
    drop((warning) => warning.startsWith(claimSubjectMissingPrefix(id)));
    step(
      "claim-subject-missing",
      {
        type: "req",
        id,
        properties: {
          ...head,
          semantic_inventory: inventoryWithSubjects(entity, gaps),
        },
      },
      subjectReason(id, gaps),
    );
  }

  // kb_check pairs the requirement with the others on its subjects once its
  // claims name them, so the pair reviews are listed now, not after the
  // subject step is done.
  const subjectKeys =
    gaps.length > 0
      ? [
          ...new Set(
            gaps
              .map((gap) => gap.candidates[0])
              .filter((key): key is string => key !== undefined),
          ),
        ]
      : anchoredSubjects(entity);
  const reviewed = new Set(pairReviewPartners(entity));
  const claims = unmodeledClaimKeys(entity);
  const partners =
    claims.length === 0
      ? []
      : (await reads.neighbours(id, subjectKeys))
          .filter((partner) => !reviewed.has(partner.id))
          .slice(0, MAX_PAIR_REVIEW_STEPS);
  if (partners.length > 0) {
    const ownFirm =
      effectiveFirmness("req", entity.firmness, entity.origin) === "firm";
    const firmPartners: string[] = [];
    for (const partner of partners) {
      const stored = await reads.entity(partner.id, "req");
      if (
        ownFirm ||
        effectiveFirmness("req", stored?.firmness, stored?.origin) === "firm"
      )
        firmPartners.push(partner.id);
    }
    const review = pairReviewFollowUp(
      id,
      head,
      claims,
      subjectKeys,
      partners,
      firmPartners,
    );
    actions.push(review.action);
    approvals.push(...review.approvals);
  }

  // Level remember asks for no scenario, test or proof: only the knowledge
  // steps above and the grounding below are listed, and a symbol's missing
  // test is neither a step nor a warning.
  const verifies = readKibiLevel(context.workspaceRoot).level === "test";
  const notCovered: string[] = [];
  for (const symbol of await reads.implementingSymbols(id))
    if (!(await reads.covered(symbol))) notCovered.push(symbol);
  const coverage = new Set(notCovered.flatMap(symbolCoverageWarning));
  drop((warning) => coverage.has(warning));
  const uncovered = verifies ? notCovered : [];
  const floor = evidenceFloorOf(entity);
  const needsProof = verifies && (floor === "tested" || floor === "proved");
  const tested = await reads.tested(id);
  const free = async (prefix: string) => {
    const first = `${prefix}-${id.replace(/^REQ-/, "")}`;
    return (await reads.exists(first)) ? `${first}-check` : first;
  };
  let testId = "<a TEST that verifies this requirement>";
  // Unmodeled claims are grounded at every level; below a tested floor the
  // failure-side scenario below is asked for once they are.
  if (claims.length > 0)
    actions.push(
      groundingStep(
        id,
        !tested && needsProof ? floor : undefined,
        claims,
        text(entity.semantic_text) || head.title,
      ),
    );
  if (!tested && (needsProof || uncovered.length > 0)) {
    const code = needsProof ? "evidence-floor" : "symbol-coverage";
    const need = needsProof
      ? ` to reach its evidence floor (${floor})`
      : " that covers its code";
    // A requirement that has its scenarios needs only the test of them.
    const specified = await reads.scenarios(id);
    const mainScenario = await free("SCEN");
    // A new requirement with a proof floor gets its failure-side scenario in
    // the same list, so its second wave of gaps is not a second question.
    const failureScenario =
      specified.length === 0 && needsProof
        ? `${mainScenario}-rejected`
        : undefined;
    const scenarioIds =
      specified.length > 0
        ? specified
        : [mainScenario, ...(failureScenario ? [failureScenario] : [])];
    testId = await free("TEST");
    if (specified.length === 0)
      step(
        code,
        {
          type: "scenario",
          id: mainScenario,
          properties: { title: head.title, status: "active" },
          document: {
            body: `<one case ${id} decides: given ..., when ..., then ...>\n`,
          },
        },
        `${id} needs a scenario and a test${need}; this records the scenario.`,
      );
    if (failureScenario !== undefined) {
      const failure = failureScenarioFollowUp(id, failureScenario, floor);
      actions.push(failure.action);
      approvals.push(...failure.approvals);
    }
    step(
      code,
      {
        type: "test",
        id: testId,
        properties: {
          title: `<what the test checks about ${head.title}>`,
          status: "active",
          verification_scope: "end_to_end",
        },
        document: { body: "<what the test runs and what it checks>\n" },
        relationships: scenarioIds.map((scenario) => ({
          type: "validates",
          from: testId,
          to: scenario,
        })),
      },
      specified.length > 0
        ? `${id} needs a test of its scenarios${need}; this records it.`
        : `Records the test of ${scenarioIds[0]}.`,
    );
    if (specified.length === 0)
      step(
        code,
        {
          type: "req",
          id,
          properties: head,
          relationships: scenarioIds.map((scenario) => ({
            type: "specified_by",
            from: id,
            to: scenario,
          })),
        },
        `Links ${id} to ${scenarioIds.join(" and ")}.`,
      );
  }
  for (const symbol of uncovered) {
    const stored = await reads.entity(symbol, "symbol");
    step(
      "symbol-coverage",
      {
        type: "symbol",
        id: symbol,
        properties: {
          title: text(stored?.title) || symbol,
          ...(text(stored?.status) !== ""
            ? { status: text(stored?.status) }
            : {}),
        },
        relationships: [{ type: "covered_by", from: symbol, to: testId }],
      },
      `kb_check blocks ${symbol} until a test of ${id} covers it.`,
    );
  }
  if (!tested && needsProof && !(await reads.proofIntegration())) {
    const setup = proofIntegrationFollowUp(testId);
    actions.push(setup.action);
    approvals.push(...setup.approvals);
  }
  if (!tested && needsProof)
    step(
      "evidence-floor",
      { test: testId },
      `kb_check blocks ${id} below its evidence floor (${floor}) until ${testId} has a passing proof: give it a proof_contract naming the test code's symbol (executable_for ${testId}) and proof/steps/${testId}.json with the commands that run it, then run kibi prove --test ${testId}. kibi proof explain ${id} lists what is left.`,
      "kibi prove",
    );
  return {
    warnings,
    nextActions: actions,
    // A rule the person stated is approved by their own words (its quote is
    // origin.ref), so its statement is not put back to them; only the
    // decisions no write can make on their behalf are listed.
    approvalsNeeded: approvals,
  };
}

/** At most this many related requirements a write lists. */
export const MAX_RELATED_REQUIREMENTS = 5;
/** The longest statement a related requirement shows. */
export const MAX_RELATED_STATEMENT = 200;

/**
 * Other current requirements whose title and statement share at least two
 * of the written requirement's topic words and at least half of the smaller
 * set (numbers are not words, so a floor of 9 and one of 10 match), closest
 * first, at most five, each with its statement. Best effort: a failed read
 * lists none.
 */
export async function relatedCurrentRequirements(
  input: UpsertInput,
  context: OperationContext,
  reads: CaptureReads | undefined = readsFor(context),
): Promise<RelatedRequirement[]> {
  if (input.type !== "req" || reads === undefined) return [];
  let requirements: Awaited<ReturnType<CaptureReads["currentRequirements"]>>;
  try {
    requirements = await reads.currentRequirements();
  } catch {
    return [];
  }
  const own = requirements.find((requirement) => requirement.id === input.id);
  const properties = input.properties ?? {};
  const words = new Set(
    requestTopicWords(
      `${text(properties.title) || own?.title || ""} ${text(properties.semantic_text) || own?.semanticText || ""}`,
    ),
  );
  return requirements
    .filter((requirement) => requirement.id !== input.id)
    .map((requirement) => {
      const theirs = new Set(
        requestTopicWords(`${requirement.title} ${requirement.semanticText}`),
      );
      const shared = [...theirs].filter((word) => words.has(word)).length;
      return {
        requirement,
        shared,
        score: shared / Math.min(words.size, theirs.size),
      };
    })
    .filter((row) => row.shared >= 2 && row.score >= 0.5)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.shared - left.shared ||
        (left.requirement.id < right.requirement.id ? -1 : 1),
    )
    .slice(0, MAX_RELATED_REQUIREMENTS)
    .map(({ requirement }) => {
      const statement = requirement.semanticText || requirement.title;
      return {
        id: requirement.id,
        statement:
          statement.length > MAX_RELATED_STATEMENT
            ? `${statement.slice(0, MAX_RELATED_STATEMENT - 1).trimEnd()}…`
            : statement,
      };
    });
}
