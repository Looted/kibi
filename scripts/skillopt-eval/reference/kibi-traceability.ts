/**
 * Reference answers for kibi-traceability cases: scripts that read the
 * case's own workspace inputs and follow the skill's workflow over the public
 * Kibi MCP surface.
 */
import type { ReferenceScript, ScriptedAgent } from "./runner";

type Json = Record<string, unknown>;

type TaskInput = Readonly<{ sourceFile?: string }>;

async function taskInput(agent: ScriptedAgent): Promise<TaskInput> {
  return JSON.parse(await agent.read("task-input.json")) as TaskInput;
}

function entities(data: Json): Json[] {
  return Array.isArray(data.entities)
    ? data.entities.filter(
        (entity): entity is Json =>
          typeof entity === "object" && entity !== null,
      )
    : [];
}

/** The symbols Kibi records at `sourceFile`. */
async function symbolsAt(
  agent: ScriptedAgent,
  sourceFile: string,
): Promise<Json[]> {
  return entities(await agent.data("kb_query", { sourceFile }));
}

function idOf(entity: Json): string {
  if (typeof entity.id !== "string")
    throw new Error(`entity without id: ${JSON.stringify(entity)}`);
  return entity.id;
}

/** Search by source location, then read the symbols recorded there. */
async function discover(
  agent: ScriptedAgent,
  query: string,
): Promise<Readonly<{ sourceFile: string; symbols: Json[] }>> {
  const sourceFile = (await taskInput(agent)).sourceFile ?? "src/fixture.ts";
  await agent.call("kb_search", {
    query,
    sourceLocations: [{ path: sourceFile }],
  });
  // A requirement document carries no symbol; its chain starts from the
  // recorded symbols.
  const atSource = await symbolsAt(agent, sourceFile);
  const symbols =
    atSource.length > 0
      ? atSource
      : entities(await agent.data("kb_query", { type: "symbol" }));
  if (symbols.length === 0)
    throw new Error(`no symbol recorded at ${sourceFile}`);
  return { sourceFile, symbols };
}

async function outgoing(
  agent: ScriptedAgent,
  seedIds: readonly string[],
  relationships: readonly string[],
): Promise<Json> {
  return agent.data("kb_graph", {
    seedIds: [...seedIds],
    depth: 2,
    direction: "outgoing",
    relationships: [...relationships],
  });
}

const discoverRequirement: ReferenceScript = async (agent) => {
  const { sourceFile, symbols } = await discover(
    agent,
    "requirement implemented by the fixture symbol",
  );
  const ids = symbols.map(idOf);
  await outgoing(agent, ids, ["implements"]);
  await agent.call("kb_status", {});
  const links = symbols
    .map((symbol) => `${idOf(symbol)} implements ${String(symbol.implements)}`)
    .join("; ");
  return `The symbol recorded at ${sourceFile} links to its requirement: ${links}. kb_graph confirms the implements edge, and kb_status reports the KB fresh on the exact branch. Nothing was changed.`;
};

/** Impact of the dirty edit, resolved to the symbols it touches. */
const symbolGranularity: ReferenceScript = async (agent) => {
  const { sourceFile, symbols } = await discover(
    agent,
    "behavior affected by the uncommitted fixture edit",
  );
  const ids = symbols.map(idOf);
  await outgoing(agent, ids, ["implements", "covered_by"]);
  await agent.call("kb_status", {});
  await agent.call("kb_check", {});
  return `The uncommitted edit to ${sourceFile} affects the behavioral symbol ${ids.join(", ")} (type symbol), not the whole file. Its implements and covered_by links name the requirement and test to recheck. kb_status reports the KB stale for that symbol and the worktree dirty; I kept the dirty edit and changed no coordinates.`;
};

/** Requirement, symbol and test, read as one chain. */
const traceRelationshipChain: ReferenceScript = async (agent) => {
  const { symbols } = await discover(
    agent,
    "requirement, symbol and test chain for the fixture",
  );
  const ids = symbols.map(idOf);
  await outgoing(agent, ids, ["implements", "covered_by"]);
  await agent.call("kb_status", {});
  const chain = symbols
    .map(
      (symbol) =>
        `${idOf(symbol)} implements ${String(symbol.implements)} and is covered_by ${String(symbol.covered_by)}`,
    )
    .join("; ");
  return `The chain is: ${chain}. kb_graph traversed both edges; nothing was changed.`;
};

/** Link the uncovered symbol to its executable test, then read it back. */
const executableCoverage: ReferenceScript = async (agent) => {
  const { symbols } = await discover(
    agent,
    "executable test for the uncovered fixture symbol",
  );
  const tests = entities(await agent.data("kb_query", { type: "test" }));
  const test = tests.find(
    (entity) =>
      typeof entity.text_ref === "string" &&
      typeof entity.verification_scope === "string",
  );
  if (test === undefined) throw new Error("no executable test recorded");
  const ids = symbols.map(idOf);
  await outgoing(agent, ids, ["implements", "covered_by"]);
  for (const symbol of symbols) {
    await agent.call("kb_upsert", {
      type: "symbol",
      id: idOf(symbol),
      properties: {
        title: symbol.title,
        status: symbol.status,
        sourceFile: symbol.sourceFile,
      },
      relationships: [
        { type: "covered_by", from: idOf(symbol), to: idOf(test) },
      ],
    });
  }
  await agent.call("kb_query", { id: ids[0] });
  await agent.call("kb_check", {});
  return `${ids.join(", ")} had no test coverage. ${idOf(test)} is an executable test (${String(test.text_ref)}, ${String(test.verification_scope)} scope), so I linked the symbol to it with covered_by, read the link back and ran kb_check (0 violations). No coordinates were written by hand.`;
};

/** The `kibi-answer` block an answer-scored case ends with. */
function answerBlock(fields: Record<string, unknown>): string {
  return [
    "```kibi-answer",
    JSON.stringify({
      verdict: null,
      governing: [],
      conflict: null,
      unknowns: [],
      nextStep: null,
      proof: null,
      ...fields,
    }),
    "```",
  ].join("\n");
}

const QUOTA_REQUIREMENT = "REQ-client-call-quota";
const ZERO_QUOTA_FACT = "FACT-call-quota-remaining-zero";

/** Read the call-quota rule and the zero-quota fact the scenarios assume. */
async function readQuotaRule(agent: ScriptedAgent, query: string) {
  await agent.call("kb_search", { query });
  const [base] = entities(
    await agent.data("kb_query", { id: QUOTA_REQUIREMENT, includeBody: true }),
  );
  await agent.call("kb_query", { id: ZERO_QUOTA_FACT });
  if (base === undefined) throw new Error(`${QUOTA_REQUIREMENT} not found`);
  return base;
}

/** A success scenario the rule forbids: report it, write nothing. */
const scenarioPreconditionPreapproval: ReferenceScript = async (agent) => {
  await readQuotaRule(agent, "client call with zero remaining call quota");
  return [
    `I did not write the scenario. ${QUOTA_REQUIREMENT} says a client call may happen only when the remaining call quota is positive, so a call with zero remaining quota that completes successfully cannot be an intended-success scenario under the current rule.`,
    `There are two ways forward: record the scenario as one where the call is rejected (it then matches ${QUOTA_REQUIREMENT}), or, if the maintenance-window case really should succeed, have the rate limit owner approve an exception requirement that exempts it from ${QUOTA_REQUIREMENT}. Which do you want?`,
    answerBlock({
      verdict: "infeasible",
      governing: [QUOTA_REQUIREMENT],
      conflict: `a successful call with zero remaining quota contradicts ${QUOTA_REQUIREMENT}`,
      nextStep:
        "ask whether to record a rejection scenario or an approved exception",
      proof: "not_applicable",
    }),
  ].join("\n\n");
};

type ApprovedException = Readonly<{
  scenario: string;
  baseRequirement: string;
  approvedBy: string;
  approvalRef: string;
  scope: string;
}>;

async function upsertValidated(agent: ScriptedAgent, payload: Json) {
  await agent.call("kb_upsert", { ...payload, dryRun: true });
  await agent.call("kb_upsert", payload);
}

/** The approved exception and the one success scenario it covers. */
const scenarioExceptionPostApproval: ReferenceScript = async (agent) => {
  const approval = (
    JSON.parse(await agent.read("approval-state.json")) as {
      approvedException: ApprovedException;
    }
  ).approvedException;
  await readQuotaRule(agent, "zero remaining call quota promo call exception");
  const scenarioId = "SCEN-client-zero-quota-promo-call-completes";
  const exceptionId = "REQ-client-call-quota-promo-exception";
  await upsertValidated(agent, {
    type: "scenario",
    id: scenarioId,
    properties: {
      title: approval.scenario,
      status: "active",
      expects: "success",
    },
    document: {
      body: "Given a client whose remaining call quota is zero, when it makes a promo call, the call completes.",
    },
    relationships: [{ type: "assumes", from: scenarioId, to: ZERO_QUOTA_FACT }],
  });
  await upsertValidated(agent, {
    type: "req",
    id: exceptionId,
    properties: {
      title: "A zero-quota client's promo call is exempt from the quota rule",
      status: "open",
      approved_by: approval.approvedBy,
      origin: { kind: "human", ref: approval.approvalRef },
    },
    document: {
      body: [
        "A promo call from a client with zero remaining call quota completes.",
        "## Context",
        `${approval.approvedBy} approved this exception to ${approval.baseRequirement} in ${approval.approvalRef}. It covers ${approval.scope}.`,
      ].join("\n\n"),
    },
    relationships: [
      { type: "exempts", from: exceptionId, to: approval.baseRequirement },
      { type: "specified_by", from: exceptionId, to: scenarioId },
    ],
  });
  await agent.call("kb_query", { id: exceptionId });
  await agent.call("kb_check", {});
  return [
    `Recorded ${exceptionId}, approved by ${approval.approvedBy} (${approval.approvalRef}), which exempts ${approval.scenario.toLowerCase()} from ${approval.baseRequirement}. It is specified by ${scenarioId}, which expects success and assumes ${ZERO_QUOTA_FACT}. The exception covers only that scenario; ${approval.baseRequirement} and its rejection scenario are unchanged. kb_check still reports evidence-floor on the exception: as a person-approved requirement it needs tested evidence, so the scenario needs an end-to-end test before it is proven.`,
    answerBlock({
      verdict: "governed",
      governing: [approval.baseRequirement, exceptionId],
      nextStep: `add an end-to-end test for ${scenarioId}`,
      proof: "missing",
    }),
  ].join("\n\n");
};

/** A rejection scenario that the rule already implies. */
const scenarioExpectsRejection: ReferenceScript = async (agent) => {
  const base = await readQuotaRule(
    agent,
    "promo call with zero remaining call quota",
  );
  const scenarioId = "SCEN-client-zero-quota-promo-call-rejected";
  await upsertValidated(agent, {
    type: "scenario",
    id: scenarioId,
    properties: {
      title: "A promo call from a client with zero remaining quota is rejected",
      status: "active",
      expects: "rejection",
    },
    document: {
      body: "Given a client whose remaining call quota is zero, when it makes a promo call, the call is rejected with a quota error.",
    },
    relationships: [{ type: "assumes", from: scenarioId, to: ZERO_QUOTA_FACT }],
  });
  await upsertValidated(agent, {
    type: "req",
    id: QUOTA_REQUIREMENT,
    properties: { title: base.title, status: base.status },
    relationships: [
      { type: "specified_by", from: QUOTA_REQUIREMENT, to: scenarioId },
    ],
  });
  await agent.call("kb_query", { id: scenarioId });
  await agent.call("kb_check", {});
  return [
    `Recorded ${scenarioId}: a promo call from a client with zero remaining call quota is rejected. It expects rejection, assumes ${ZERO_QUOTA_FACT}, and specifies ${QUOTA_REQUIREMENT}, which allows a call only when the remaining quota is positive. No exception was needed and the requirement's statement is unchanged.`,
    answerBlock({
      verdict: "governed",
      governing: [QUOTA_REQUIREMENT],
      proof: "not_applicable",
    }),
  ].join("\n\n");
};

const LENGTH_RULE = "REQ-fixture-family-name-length";
const LENGTH_TEST = "TEST-fixture-family-name-length";

/** Only the function that decides the limit implements it. */
const decidingOwnerLink: ReferenceScript = async (agent) => {
  await agent.call("kb_search", {
    query: "fixture family name length limit",
    sourceLocations: [{ path: "src/fixture.ts" }],
  });
  await agent.call("kb_query", { id: LENGTH_RULE, includeBody: true });
  await agent.call("kb_query", { id: LENGTH_TEST });
  await agent.call("kb_query", { sourceFile: "src/fixture.ts" });
  await outgoing(agent, [LENGTH_RULE], ["specified_by", "verified_by"]);
  const symbolId = "SYM-check-family-name";
  await upsertValidated(agent, {
    type: "symbol",
    id: symbolId,
    properties: {
      title: "checkFamilyName",
      status: "active",
      sourceFile: "src/fixture.ts",
    },
    relationships: [
      { type: "implements", from: symbolId, to: LENGTH_RULE },
      { type: "covered_by", from: symbolId, to: LENGTH_TEST },
    ],
  });
  await agent.call("kb_query", { id: symbolId });
  await agent.call("kb_check", {});
  return [
    `Recorded ${symbolId} (checkFamilyName in src/fixture.ts) as the code that implements ${LENGTH_RULE}, covered by ${LENGTH_TEST}. checkFamilyName is the function that trims the name and rejects one longer than 32 characters. fixtureFamily and fixtureFamilyFromEnv only forward to it, so they get no implements link.`,
    answerBlock({
      verdict: "governed",
      governing: [LENGTH_RULE],
      proof: "not_applicable",
    }),
  ].join("\n\n");
};

const SLUG_TEST = "TEST-fixture-family-slug";

/** New behavior gets its own requirement, not a link on a full one. */
const linkKeepsRequirementSize: ReferenceScript = async (agent) => {
  await agent.call("kb_search", {
    query: "fixture family slug",
    sourceLocations: [{ path: "src/fixture.ts" }],
  });
  await agent.call("kb_query", { sourceFile: "src/fixture.ts" });
  await agent.call("kb_query", { id: SLUG_TEST, includeBody: true });
  const requirementId = "REQ-fixture-family-slug";
  const scenarioId = "SCEN-fixture-family-slug";
  const symbolId = "SYM-fixture-family-slug";
  await upsertValidated(agent, {
    type: "scenario",
    id: scenarioId,
    properties: {
      title: "A fixture family slug replaces spaces with hyphens",
      status: "active",
    },
    document: {
      body: "Given the fixture family name night shift, when its slug is built, then it is night-shift.",
    },
    relationships: [{ type: "verified_by", from: scenarioId, to: SLUG_TEST }],
  });
  await upsertValidated(agent, {
    type: "req",
    id: requirementId,
    properties: {
      title: "A fixture family slug replaces spaces with hyphens",
      status: "open",
      priority: "should",
      origin: { kind: "agent", ref: "src/fixture.ts fixtureFamilySlug" },
    },
    document: {
      body: [
        "A fixture family slug must be the family name with each space replaced by a hyphen.",
        "## Context",
        `Recorded from the current behavior of fixtureFamilySlug in src/fixture.ts and ${SLUG_TEST}, which were added without a requirement. Who asked for it is not recorded, and the reason is not stated.`,
      ].join("\n\n"),
    },
    relationships: [
      { type: "specified_by", from: requirementId, to: scenarioId },
    ],
  });
  await upsertValidated(agent, {
    type: "symbol",
    id: symbolId,
    properties: {
      title: "fixtureFamilySlug",
      status: "active",
      sourceFile: "src/fixture.ts",
    },
    relationships: [
      { type: "implements", from: symbolId, to: requirementId },
      { type: "covered_by", from: symbolId, to: SLUG_TEST },
    ],
  });
  await agent.call("kb_query", { id: symbolId });
  await agent.call("kb_check", {});
  return [
    `Recorded fixtureFamilySlug as ${symbolId}, implementing a new requirement ${requirementId} (a slug replaces spaces with hyphens), specified by ${scenarioId} and covered by ${SLUG_TEST}. I did not link it to REQ-fixture-family-name-normalization or REQ-fixture-family-label: slugs are a separate behavior, and the normalization requirement already has 8 implementing symbols. The new requirement is agent-inferred and needs a person's review before it is approved.`,
    answerBlock({
      verdict: "governed",
      governing: [requirementId],
      nextStep: `ask the owner to review ${requirementId}`,
      proof: "not_applicable",
    }),
  ].join("\n\n");
};

function records(value: unknown): Json[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Json => typeof entry === "object" && entry !== null,
      )
    : [];
}

/** The migration plan kb_status returns, with its ready automatic actions. */
async function migrationPreview(
  agent: ScriptedAgent,
): Promise<Readonly<{ plan: Json; planHash: string; automatic: string[] }>> {
  const status = await agent.data("kb_status", {});
  const plan = status.migrationPlan as Json | undefined;
  if (plan === undefined)
    throw new Error("kb_status returned no migration plan");
  const automatic = records(plan.actions)
    .filter(
      (action) =>
        action.state === "ready" &&
        action.safety === "automatic" &&
        action.autoApplicable === true,
    )
    .map((action) => String(action.id));
  return { plan, planHash: String(plan.planHash), automatic };
}

/** Preview the migration, apply its automatic actions, read the attachment. */
const exactLegacyBranchMigration: ReferenceScript = async (agent) => {
  const { symbols } = await discover(agent, "legacy branch store migration");
  await outgoing(agent, symbols.map(idOf), ["implements", "covered_by"]);
  const { plan, planHash, automatic } = await migrationPreview(agent);
  await agent.call("kb_apply_plan", {
    plan,
    approvedPlanHash: planHash,
    approvedActionIds: automatic,
  });
  await agent.call("kb_check", {});
  const after = await agent.data("kb_status", {});
  return `The migration preview from kb_status is a kibi.migration-plan.v2 with planHash ${planHash}. I applied it explicitly with kb_apply_plan, approving that hash and only its ready automatic actions (${automatic.join(", ")}). The Git ref was not renamed; afterwards kb_status reports branch attachment ${JSON.stringify(after.branchAttachment)} and syncState ${String(after.syncState)}.`;
};

/** The first migration plan anywhere in a result. */
function findPlan(value: unknown): Json | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Json;
  if (record.version === "kibi.migration-plan.v2" && "planHash" in record)
    return record;
  for (const entry of Object.values(record)) {
    const found = findPlan(entry);
    if (found !== undefined) return found;
  }
  return undefined;
}

type CoordinateRepair = Readonly<{
  symbol: Readonly<{ id: string; sourceFile: string }>;
}>;

/** Apply only the ready automatic coordinate refresh, then verify it. */
const generatedOnlySymbolCoordinateRepair: ReferenceScript = async (agent) => {
  const { symbol } = JSON.parse(
    await agent.read("symbol-coordinate-repair.json"),
  ) as CoordinateRepair;
  await agent.call("kb_search", {
    query: "symbol coordinates missing refresh",
    sourceLocations: [{ path: symbol.sourceFile }],
  });
  await agent.call("kb_query", { type: "symbol", id: symbol.id });
  await agent.call("kb_status", {});
  // The coverage plan evaluates the symbol domain; the status plan does not.
  const coverage = await agent.data("kb_coverage", {
    by: "symbol",
    includePassing: true,
  });
  const plan = findPlan(coverage);
  if (plan === undefined) throw new Error("kb_coverage returned no plan");
  const refresh = records(plan.actions).find(
    (action) =>
      action.code === "symbol_refresh_coordinates" &&
      action.state === "ready" &&
      action.safety === "automatic",
  );
  if (refresh === undefined)
    throw new Error("no ready automatic coordinate refresh in the plan");
  await agent.call("kb_apply_plan", {
    plan,
    approvedPlanHash: plan.planHash,
    approvedActionIds: [refresh.id],
  });
  await agent.call("kb_query", { type: "symbol", id: symbol.id });
  await agent.call("kb_check", {});
  const after = await agent.data("kb_status", {});
  await agent.call("kb_coverage", { by: "symbol", includePassing: true });
  return `kb_status's migration plan (planHash ${String(plan.planHash)}) held one ready automatic action for this gap, ${String(refresh.id)} (symbol_refresh_coordinates, kibi sync --refresh-symbol-coordinates). I applied that plan unchanged with its exact hash and only that action ID. Afterwards ${symbol.id} reads back with its generated coordinates, kb_check is clean, kb_status reports syncState ${String(after.syncState)}, and kb_coverage by symbol shows no coordinate gap. The authored manifest stays coordinate-free; nothing was upserted, deleted or edited by hand.`;
};

export const KIBI_TRACEABILITY_SCRIPTS: Readonly<
  Record<string, ReferenceScript>
> = {
  discover_requirement: discoverRequirement,
  symbol_granularity: symbolGranularity,
  trace_relationship_chain: traceRelationshipChain,
  executable_coverage: executableCoverage,
  scenario_precondition_preapproval: scenarioPreconditionPreapproval,
  scenario_exception_post_approval: scenarioExceptionPostApproval,
  scenario_expects_rejection: scenarioExpectsRejection,
  deciding_owner_link: decidingOwnerLink,
  link_keeps_requirement_size: linkKeepsRequirementSize,
  exact_legacy_branch_migration: exactLegacyBranchMigration,
  generated_only_symbol_coordinate_repair: generatedOnlySymbolCoordinateRepair,
};
