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

type RelationshipDelete = Readonly<{
  relationship: Readonly<{ type: string; from: string; to: string }>;
}>;

async function relationshipDeleteRequest(agent: ScriptedAgent) {
  return (
    JSON.parse(
      await agent.read("relationship-delete.json"),
    ) as RelationshipDelete
  ).relationship;
}

/** Preview and apply one exact relationship delete, then read both ends. */
async function deleteExactEdge(
  agent: ScriptedAgent,
  edge: RelationshipDelete["relationship"],
): Promise<Json> {
  await agent.call("kb_delete", { relationships: [edge], dryRun: true });
  const deleted = await agent.data("kb_delete", { relationships: [edge] });
  await agent.call("kb_query", { id: edge.from });
  await agent.call("kb_query", { id: edge.to });
  return deleted;
}

/** The sanctioned shard edge goes; its endpoints and shard neighbors stay. */
const relationshipShardDelete: ReferenceScript = async (agent) => {
  const edge = await relationshipDeleteRequest(agent);
  await agent.call("kb_search", {
    query: `${edge.type} ${edge.from} ${edge.to}`,
  });
  await agent.call("kb_query", { id: edge.from });
  await outgoing(agent, [edge.from], [edge.type]);
  await agent.call("kb_status", {});
  const deleted = await deleteExactEdge(agent, edge);
  await agent.call("kb_check", {});
  return `Deleted exactly ${edge.type} ${edge.from} -> ${edge.to} with kb_delete (result: ${JSON.stringify(deleted).slice(0, 400)}). The relationship shard keeps its comments, order and the unrelated records; both endpoints remain and kb_check is clean.`;
};

/** A stale legacy shard: delete the sanctioned edge, then confirm the sync. */
const legacyShardEdgeCleanup: ReferenceScript = async (agent) => {
  const edge = await relationshipDeleteRequest(agent);
  await agent.call("kb_search", {
    query: `${edge.type} ${edge.from} ${edge.to}`,
  });
  await agent.call("kb_query", { id: edge.from });
  await outgoing(agent, [edge.from], [edge.type]);
  const deleted = await deleteExactEdge(agent, edge);
  await agent.call("kb_check", {});
  const status = await agent.data("kb_status", {});
  await outgoing(agent, [edge.from], [edge.type]);
  return `Deleted exactly ${edge.type} ${edge.from} -> ${edge.to} from its legacy relationship shard with kb_delete (${JSON.stringify(deleted).slice(0, 300)}). Both endpoints remain, kb_graph no longer returns the edge, and kb_status reports syncState ${String(status.syncState)} after the sync.`;
};

/** The shard no longer holds the edge: retract the compiled leftover only. */
const legacyShardReconciliation: ReferenceScript = async (agent) => {
  const edge = await relationshipDeleteRequest(agent);
  await agent.call("kb_search", {
    query: `${edge.type} ${edge.from} ${edge.to}`,
  });
  await agent.call("kb_query", { id: edge.from });
  await outgoing(agent, [edge.from], [edge.type]);
  const before = await agent.data("kb_status", {});
  const preview = await agent.data("kb_delete", {
    relationships: [edge],
    dryRun: true,
  });
  const deleted = await agent.data("kb_delete", { relationships: [edge] });
  await agent.call("kb_query", { id: edge.from });
  await agent.call("kb_query", { id: edge.to });
  await agent.call("kb_check", {});
  const after = await agent.data("kb_status", {});
  return `kb_status reported the KB stale (${JSON.stringify(before.staleReasons).slice(0, 300)}), and the delete preview showed the authored shard no longer holds ${edge.type} ${edge.from} -> ${edge.to} (${JSON.stringify(preview.relationship_results)}). Only the compiled edge was left, so I deleted that exact relationship (${JSON.stringify(deleted.relationship_results)}). Both endpoints remain and kb_status now reports syncState ${String(after.syncState)}.`;
};

/** Symbol rows whose recorded source file is gone, with their repair plan. */
async function staleSymbols(agent: ScriptedAgent) {
  const symbols = entities(await agent.data("kb_query", { type: "symbol" }));
  const missing: Json[] = [];
  for (const symbol of symbols) {
    if (typeof symbol.sourceFile !== "string") continue;
    const present = await agent.read(symbol.sourceFile).then(
      () => true,
      () => false,
    );
    if (!present) missing.push(symbol);
  }
  return missing;
}

/** Read-only: report the remap and obsolete-delete options with evidence. */
const staleSymbolRemap: ReferenceScript = async (agent) => {
  await agent.call("kb_search", {
    query: "symbol whose source file was deleted",
  });
  const [symbol] = await staleSymbols(agent);
  if (symbol === undefined) throw new Error("no symbol with a deleted file");
  const id = idOf(symbol);
  await outgoing(agent, [id], ["implements", "covered_by"]);
  const status = await agent.data("kb_status", {});
  const coverage = await agent.data("kb_coverage", { by: "symbol" });
  const repair = records(
    (coverage.symbolRepairPlan as Json | undefined)?.repairs,
  ).find((entry) => entry.symbolId === id);
  return [
    `${id} (${String(symbol.title)}) still points at ${String(symbol.sourceFile)}, which no longer exists. kb_status lists the stale reasons ${JSON.stringify(status.staleReasons)}; kb_coverage's symbol repair plan for it is ${JSON.stringify(repair)}.`,
    `Repair candidates: remap ${id} to src/fixture.ts, where ${String(symbol.title)} is declared now (it keeps its implements and covered_by links), or delete it as obsolete if that declaration is a different behavior. I changed nothing and wrote no coordinates; the remap needs your approval.`,
  ].join("\n\n");
};

/** Delete the obsolete symbol; move coverage only where the test shows it. */
const obsoleteSymbolDeleteWithReplacement: ReferenceScript = async (agent) => {
  const { sourceFile, symbols } = await discover(
    agent,
    "obsolete symbol with a replacement",
  );
  const source = await agent.read(sourceFile);
  const declared = (symbol: Json): boolean =>
    new RegExp(`\\b${String(symbol.title)}\\b`).test(source);
  const obsolete = symbols.filter((symbol) => !declared(symbol));
  const [old] = obsolete;
  if (old === undefined || obsolete.length !== 1)
    throw new Error(`expected one obsolete symbol in ${sourceFile}`);
  const replacement = symbols.find(
    (symbol) =>
      symbol !== old &&
      String(symbol.title).startsWith(String(old.title).replace(/V\d+$/, "")) &&
      declared(symbol) &&
      symbol.covered_by === undefined,
  );
  if (replacement === undefined) throw new Error("no replacement symbol");
  await outgoing(
    agent,
    [idOf(old), idOf(replacement)],
    ["implements", "covered_by"],
  );
  await agent.call("kb_status", {});
  const testId = String(old.covered_by).replace("kb:entity/", "");
  const [test] = entities(
    await agent.data("kb_query", { id: testId, includeBody: true }),
  );
  if (test === undefined) throw new Error(`${testId} not found`);
  const testSource = await agent.read(String(test.text_ref));
  if (!testSource.includes(String(replacement.title)))
    throw new Error(`${testId} does not exercise ${String(replacement.title)}`);
  const plan = await agent.data("kb_delete", { ids: [idOf(old)] });
  await agent.call("kb_delete", {
    ids: [idOf(old)],
    approvedPlanHash: (plan.deletionPlan as Json | undefined)?.planHash,
  });
  const payload = {
    type: "symbol",
    id: idOf(replacement),
    properties: {
      title: replacement.title,
      status: replacement.status,
      sourceFile: replacement.sourceFile,
    },
    relationships: [
      { type: "covered_by", from: idOf(replacement), to: testId },
    ],
  };
  await agent.call("kb_upsert", { ...payload, dryRun: true });
  await agent.call("kb_upsert", payload);
  await agent.call("kb_query", { id: idOf(replacement) });
  await agent.call("kb_check", {});
  return `${idOf(old)} (${String(old.title)}) is obsolete: ${sourceFile} no longer declares it, and ${idOf(replacement)} (${String(replacement.title)}) replaces it. I deleted only ${idOf(old)} through kb_delete's approved deletion plan. ${testId} (${String(test.text_ref)}) calls ${String(replacement.title)}, so that test evidence supports moving its coverage: ${idOf(replacement)} is now covered_by ${testId}. The replacement's coordinates come from the sync; none were written by hand.`;
};

/** The end-to-end test with a proof contract on the requirement's chain. */
async function contractedTest(
  agent: ScriptedAgent,
  query: string,
  graph: boolean,
): Promise<Readonly<{ test: Json; status: Json; coverage: Json }>> {
  const { symbols } = await discover(agent, query);
  if (graph)
    await outgoing(agent, symbols.map(idOf), ["implements", "covered_by"]);
  const tests = entities(await agent.data("kb_query", { type: "test" })).filter(
    (test) => test.proof_contract !== undefined,
  );
  const [test] = tests;
  if (test === undefined || tests.length !== 1)
    throw new Error(`expected one contracted test, found ${tests.length}`);
  const status = await agent.data("kb_status", {});
  const coverage = await agent.data("kb_coverage", { by: "req" });
  return { test, status, coverage };
}

function receiptsOf(test: Json): Json[] {
  const receipts = test.proof_receipts;
  return (Array.isArray(receipts) ? receipts : []).filter(
    (receipt): receipt is Json =>
      typeof receipt === "object" && receipt !== null,
  );
}

function proofGaps(coverage: Json): string[] {
  const rows = Array.isArray(coverage.rows) ? coverage.rows : [];
  return [
    ...new Set(
      rows.flatMap((row) =>
        typeof row === "object" && row !== null && Array.isArray(row.proofGaps)
          ? row.proofGaps.filter(
              (gap: unknown): gap is string => typeof gap === "string",
            )
          : [],
      ),
    ),
  ];
}

/**
 * Ingest the evaluator's run of the current contract against the live
 * snapshot, then read the test back and validate.
 */
async function ingestCurrentRun(
  agent: ScriptedAgent,
  test: Json,
  status: Json,
): Promise<Readonly<{ ingest: Json; receipts: Json[] }>> {
  const snapshot = status.proofSnapshot;
  if (typeof snapshot !== "string")
    throw new Error(
      `kb_status has no proofSnapshot: ${JSON.stringify(status)}`,
    );
  const artifact = JSON.parse(
    await agent.read(`proof-runs/${idOf(test)}.json`),
  ) as Json;
  if (artifact.code_snapshot !== snapshot)
    throw new Error("the proof run is not for the live snapshot");
  const ingest = await agent.data("kb_ingest_proof", {
    snapshot,
    artifact,
    testIds: [idOf(test)],
  });
  await agent.data("kb_coverage", { by: "req" });
  await agent.data("kb_check", {});
  const [readback] = entities(await agent.data("kb_query", { id: idOf(test) }));
  return {
    ingest,
    receipts: readback === undefined ? [] : receiptsOf(readback),
  };
}

const unchangedSnapshotReceiptReuse: ReferenceScript = async (agent) => {
  const { test, status, coverage } = await contractedTest(
    agent,
    "end-to-end test proving the fixture family requirement",
    true,
  );
  await agent.data("kb_check", {});
  const latest = receiptsOf(test).at(-1);
  if (latest === undefined) throw new Error("the test has no receipt");
  return [
    `${idOf(test)}'s latest receipt ${String(latest.receipt_id)} passed on code snapshot ${String(latest.code_snapshot)}, which is the live snapshot kb_status reports (${String(status.proofSnapshot)}), under contract hash ${String(latest.contract_hash)}, the current contract's hash.`,
    `It finished at ${String(latest.finished_at)}, inside the seven-day freshness window, and every required case passed, so the receipt is reused and the end-to-end command is not run again. kb_coverage reports ${proofGaps(coverage).length === 0 ? "no proof gaps" : proofGaps(coverage).join(", ")}.`,
  ].join("\n\n");
};

const appendOnlyContractDrift: ReferenceScript = async (agent) => {
  const { test, status, coverage } = await contractedTest(
    agent,
    "end-to-end test proving the fixture family requirement",
    false,
  );
  const before = receiptsOf(test);
  const gaps = proofGaps(coverage);
  const { ingest, receipts } = await ingestCurrentRun(agent, test, status);
  const [result] = Array.isArray(ingest.results) ? ingest.results : [];
  const compacted =
    typeof result === "object" && result !== null
      ? Number(result.compacted)
      : 0;
  return [
    `Before the run, kb_coverage reported ${gaps.join(", ")}: the ${before.length} historical receipt(s) of ${idOf(test)} were for the earlier contract, so they did not prove the test: a contract mismatch is never proof.`,
    `I ingested the run of the exact current contract on the live snapshot and edited no receipt by hand. The ingest appended the current-contract receipt ${String(receipts.at(-1)?.receipt_id)}, the only one that proves the test${compacted > 0 ? `, and Kibi's receipt compaction dropped ${compacted} superseded earlier-contract receipt(s) that could no longer decide proof` : ""}.`,
  ].join("\n\n");
};

const finalIntegrationInvalidatesReceipts: ReferenceScript = async (agent) => {
  const { test, status, coverage } = await contractedTest(
    agent,
    "end-to-end test proving the fixture family requirement",
    true,
  );
  const gaps = proofGaps(coverage);
  const { receipts } = await ingestCurrentRun(agent, test, status);
  return [
    `The final integration snapshot is ${String(status.proofSnapshot)}. The pre-integration receipts were for an older snapshot, so kb_coverage reported ${gaps.join(", ") || "them as stale"} and they were not reused as proof.`,
    `With the final snapshot established before verification, I ingested the run of the exact current contract on it; ${idOf(test)} now ends with the appended receipt ${String(receipts.at(-1)?.receipt_id)} and keeps its earlier receipts as history.`,
  ].join("\n\n");
};

const contractedE2eWithOntologyGap: ReferenceScript = async (agent) => {
  const { test, status, coverage } = await contractedTest(
    agent,
    "end-to-end test proving the fixture family requirement",
    true,
  );
  const { receipts } = await ingestCurrentRun(agent, test, status);
  const after = await agent.data("kb_coverage", { by: "req" });
  return [
    `I ingested the run of ${idOf(test)}'s exact proof contract on the live snapshot; it appended the passing kibi.proof-receipt.v1 ${String(receipts.at(-1)?.receipt_id)}.`,
    `The task is complete, but overall proof stays unresolved: the requirement still has a clause no fact grounds (${proofGaps(after).join(", ")}). The passing end-to-end evidence is current, so a coverage-depth warning would contradict it and is not accepted. Coverage before the run reported ${proofGaps(coverage).join(", ") || "no gaps"}.`,
  ].join("\n\n");
};

export const KIBI_TRACEABILITY_SCRIPTS: Readonly<
  Record<string, ReferenceScript>
> = {
  discover_requirement: discoverRequirement,
  unchanged_snapshot_receipt_reuse: unchangedSnapshotReceiptReuse,
  append_only_contract_drift: appendOnlyContractDrift,
  final_integration_invalidates_receipts: finalIntegrationInvalidatesReceipts,
  contracted_e2e_with_ontology_gap: contractedE2eWithOntologyGap,
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
  relationship_shard_delete: relationshipShardDelete,
  legacy_shard_edge_cleanup: legacyShardEdgeCleanup,
  legacy_shard_reconciliation: legacyShardReconciliation,
  stale_symbol_remap: staleSymbolRemap,
  obsolete_symbol_delete_with_replacement: obsoleteSymbolDeleteWithReplacement,
};
