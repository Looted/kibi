/**
 * Reference answers for kibi-freshness cases: scripts that read the case's
 * own workspace inputs and the KB state over the public Kibi MCP surface,
 * then report what that state establishes.
 */
import type { ReferenceScript, ScriptedAgent } from "./runner";

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function list(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

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

/** The five-axis closeout every freshness answer ends with. */
function closeout(
  fields: Readonly<{
    taskOutcome: string;
    kbState: string;
    verificationState: string;
    proofState: string;
    limitationDisposition?: string;
  }>,
): string {
  return [
    "```json",
    JSON.stringify({ limitationDisposition: "not_applicable", ...fields }),
    "```",
  ].join("\n");
}

type Status = Readonly<{
  syncState?: string;
  dirty?: boolean;
  staleReasons?: unknown;
  proofSnapshotChanges?: unknown;
  branchAttachment?: unknown;
}> &
  Json;

function kbStateOf(status: Status): string {
  if (status.syncState === "fresh" && list(status.staleReasons).length === 0)
    return "clean_fresh";
  return typeof status.syncState === "string" ? status.syncState : "unknown";
}

function verificationStateOf(status: Status): string {
  return list(status.proofSnapshotChanges).length > 0 || status.dirty === true
    ? "dirty"
    : "fresh";
}

function blockingCount(check: Json): number {
  const violations = list(check.violations);
  return violations.filter((violation) => violation.severity !== "warning")
    .length;
}

/** Status first, then a source query and a final check. */
async function inspect(
  agent: ScriptedAgent,
): Promise<Readonly<{ status: Status; check: Json }>> {
  const status = (await agent.data("kb_status", {})) as Status;
  await agent.data("kb_query", { sourceFile: "src/fixture.ts" });
  const check = await agent.data("kb_check", {});
  return { status, check };
}

function staleSummary(status: Status): string {
  const reasons = list(status.staleReasons);
  return reasons.length === 0
    ? "kb_status reports no stale reasons"
    : `kb_status reports ${reasons.length} stale reason(s): ${reasons
        .map((reason) => String(reason.code ?? reason.kind ?? "unknown"))
        .join(", ")}`;
}

const classifyBranchStatus: ReferenceScript = async (agent) => {
  const { status, check } = await inspect(agent);
  const attachment = isRecord(status.branchAttachment)
    ? status.branchAttachment
    : {};
  return [
    `kb_status attaches Git branch ${String(attachment.gitBranch)} to KB branch ${String(attachment.kbBranch)} (${String(attachment.kind)} match), syncState ${String(status.syncState)}.`,
    `${staleSummary(status)}; kb_check reports ${blockingCount(check)} blocking finding(s), so work can continue on this branch.`,
    closeout({
      taskOutcome: "complete",
      kbState: kbStateOf(status),
      verificationState: verificationStateOf(status),
      proofState: "not_evaluated",
    }),
  ].join("\n\n");
};

const recoverStaleState: ReferenceScript = async (agent) => {
  const { status } = await inspect(agent);
  return [
    `${staleSummary(status)}. The KB is stale until the next sync; the supported recovery is \`kibi sync\` over the committed sources, never a direct .kb edit.`,
    closeout({
      taskOutcome: "complete",
      kbState: kbStateOf(status),
      verificationState: verificationStateOf(status),
      proofState: "not_evaluated",
    }),
  ].join("\n\n");
};

const inspectSourceImpact: ReferenceScript = async (agent) => {
  const patch = await agent.read("changes/uncommitted.patch");
  const { status, check } = await inspect(agent);
  const paths = [...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(
    (match) => match[1],
  );
  return [
    `The worktree is dirty (${paths.join(", ") || "uncommitted changes"}); I left those changes in place.`,
    `${staleSummary(status)}; kb_check reports ${blockingCount(check)} blocking finding(s) for the source-linked entities.`,
    closeout({
      taskOutcome: "complete",
      kbState: kbStateOf(status),
      verificationState: verificationStateOf(status),
      proofState: "not_evaluated",
    }),
  ].join("\n\n");
};

const determineCompletionOutcome: ReferenceScript = async (agent) => {
  const { status, check } = await inspect(agent);
  return [
    `${staleSummary(status)}; kb_check reports ${blockingCount(check)} blocking finding(s). The task is complete; KB state and verification state are reported separately.`,
    closeout({
      taskOutcome: "complete",
      kbState: kbStateOf(status),
      verificationState: verificationStateOf(status),
      proofState: "not_evaluated",
    }),
  ].join("\n\n");
};

/** A read-only consistency report over the rule the prompt names. */
function consistencyReport(
  input: Readonly<{
    rule: string;
    ids: readonly string[];
    coverage?: boolean;
    report: (
      check: Json,
      unchecked: readonly Json[],
    ) => Readonly<{ text: string; fields: Json }>;
  }>,
): ReferenceScript {
  return async (agent) => {
    const unchecked = await uncheckedClaims(agent, input.ids);
    const check = await agent.data("kb_check", { rules: [input.rule] });
    if (input.coverage === true) await agent.data("kb_coverage", { by: "req" });
    const { text, fields } = input.report(check, unchecked);
    return [text, answerBlock({ governing: [...input.ids], ...fields })].join(
      "\n\n",
    );
  };
}

function findings(check: Json): Json[] {
  return list(check.violations);
}

/** Requirement ids a check's findings name. */
function namedIds(check: Json): string[] {
  return [
    ...new Set(
      JSON.stringify(findings(check)).match(/REQ-[A-Za-z0-9-]+/g) ?? [],
    ),
  ].sort();
}

/** Claims of the named requirements that no fact models. */
async function uncheckedClaims(
  agent: ScriptedAgent,
  ids: readonly string[],
): Promise<Json[]> {
  const claims: Json[] = [];
  for (const id of ids) {
    const [requirement] = list((await agent.data("kb_query", { id })).entities);
    for (const claim of list(requirement?.semantic_inventory))
      if (claim.status === "ontology_gap" || claim.status === "ambiguous")
        claims.push(claim);
  }
  return claims;
}

type Plan = Json & Readonly<{ planHash: string; actions: Json[] }>;

function planOf(status: Status): Plan {
  const plan = status.migrationPlan;
  if (!isRecord(plan) || typeof plan.planHash !== "string")
    throw new Error(
      `kb_status returned no migration plan: ${JSON.stringify(status)}`,
    );
  return { ...plan, planHash: plan.planHash, actions: list(plan.actions) };
}

function automaticIds(plan: Plan): string[] {
  return plan.actions
    .filter(
      (action) =>
        action.state === "ready" &&
        action.safety === "automatic" &&
        action.autoApplicable === true,
    )
    .map((action) => String(action.id));
}

function actionList(plan: Plan): string {
  return plan.actions
    .map(
      (action) =>
        `${String(action.id)} (${String(action.code)}, ${String(action.safety)})`,
    )
    .join("; ");
}

/** Apply exactly `ids` of the previewed plan, bound to its hash. */
async function applyActions(
  agent: ScriptedAgent,
  plan: Plan,
  ids: readonly string[],
): Promise<Json> {
  return agent.data("kb_apply_plan", {
    plan,
    approvedPlanHash: plan.planHash,
    approvedActionIds: [...ids],
  });
}

function storeOf(status: Status): Json {
  return isRecord(status.branchStore) ? status.branchStore : {};
}

function attachmentOf(status: Status): Json {
  return isRecord(status.branchAttachment) ? status.branchAttachment : {};
}

/**
 * Status first; then the discovery and check reads, which Kibi refuses while
 * a legacy store still needs its explicit migration.
 */
async function inspectBeforeMigration(
  agent: ScriptedAgent,
  search: string | null,
): Promise<Readonly<{ status: Status; refusal: string }>> {
  const status = (await agent.data("kb_status", {})) as Status;
  const refusals: string[] = [];
  const reads: [string, Json][] = [
    ...(search === null
      ? []
      : [["kb_search", { query: search }] as [string, Json]]),
    ["kb_query", { sourceFile: "src/fixture.ts" }],
    ["kb_check", {}],
  ];
  for (const [tool, args] of reads) {
    const result = await agent.raw(tool, args);
    if (result.isError === true)
      refusals.push(
        `${tool}: ${JSON.stringify(result.content).match(/requires explicit migration|recover[^"]*|[A-Z][^"]{0,120}/)?.[0] ?? "refused"}`,
      );
  }
  return {
    status,
    refusal:
      refusals.length === 0
        ? "The reads ran normally."
        : `Kibi refused the reads until the migration is applied (${refusals.join("; ")}).`,
  };
}

const exactBranchIdentity: ReferenceScript = async (agent) => {
  const { status } = await inspect(agent);
  const attachment = attachmentOf(status);
  return [
    `kb_status resolves the active Git branch exactly as ${JSON.stringify(attachment.gitBranch)} and attaches the KB branch ${JSON.stringify(attachment.kbBranch)} (kind ${String(attachment.kind)}), materialized only in its hashed store ${String(storeOf(status).path)}.`,
    `There is no legacy mapping: migrationRequired is ${String(attachment.migrationRequired)}. The same exact resolution applies to slash, Unicode, @, main and master refs; I would not rename a ref or copy a store between refs.`,
  ].join("\n\n");
};

const arbitraryBranchMigrationRefused: ReferenceScript = async (agent) => {
  const { status } = await inspect(agent);
  const attachment = attachmentOf(status);
  return [
    `kb_status attaches Git branch ${String(attachment.gitBranch)} exactly to its own store (${String(attachment.kind)}), which is ${String(storeOf(status).state)}.`,
    "I refuse to use branch migrate as a cross-branch clone: it only moves one branch's own legacy store to that same branch's hashed path, and a branch never takes another branch's store. When a branch has no store, `kibi branch ensure` creates its store and `kibi sync` compiles it from the authored sources; a damaged store of the same branch goes through `kibi branch recover`. I made no .kb edit.",
  ].join("\n\n");
};

const legacyBranchStorage: ReferenceScript = async (agent) => {
  const { status, refusal } = await inspectBeforeMigration(agent, null);
  const plan = planOf(status);
  const migrate = plan.actions.find(
    (action) => action.code === "legacy_branch_storage",
  );
  if (migrate === undefined) throw new Error("no legacy branch migration");
  const store = storeOf(status);
  await applyActions(agent, plan, [String(migrate.id)]);
  const after = (await agent.data("kb_status", {})) as Status;
  await agent.data("kb_query", { sourceFile: "src/fixture.ts" });
  await agent.data("kb_check", {});
  return [
    `kb_status reports a historical literal-path store (${String(store.errorCode)}) at ${String(store.path)} while Git uses ${String(attachmentOf(status).gitBranch)}. ${refusal}`,
    `The migration preview (planHash ${plan.planHash}) moves it from that old literal path to the new hashed store via ${JSON.stringify((migrate.invocation as Json | undefined)?.command_argv)}. I applied only that action, bound to the previewed hash, at an explicit apply boundary; nothing in .kb was edited by hand.`,
    `Afterwards the store is ${String(storeOf(after).state)} at ${String(storeOf(after).path)} and the KB is ${String(after.syncState)}: the migrated store was compiled from the current sources.`,
  ].join("\n\n");
};

const legacyMigrationPostconditions: ReferenceScript = async (agent) => {
  const { status, refusal } = await inspectBeforeMigration(
    agent,
    "legacy branch store migration",
  );
  const plan = planOf(status);
  const legacyPath = String(storeOf(status).path);
  const first = automaticIds(plan).filter(
    (id) => id !== "branch-store-recover",
  );
  await applyActions(agent, plan, first);
  let after = (await agent.data("kb_status", {})) as Status;
  const rest = automaticIds(planOf(after));
  if (rest.length > 0) {
    await applyActions(agent, planOf(after), rest);
    after = (await agent.data("kb_status", {})) as Status;
  }
  await agent.data("kb_search", { query: "legacy branch store migration" });
  await agent.data("kb_query", { sourceFile: "src/fixture.ts" });
  await agent.data("kb_check", {});
  const attachment = attachmentOf(after);
  return [
    `${refusal} I applied the explicit legacy literal-store migration (${first.join(", ")}) with the previewed plan hash ${plan.planHash}${rest.length > 0 ? `, then the follow-up ${rest.join(", ")}` : ""}.`,
    `Postconditions: the store is now ${String(storeOf(after).state)} at the hashed target ${String(storeOf(after).path)}; the old literal path ${legacyPath} is absent as a target and was never renamed or edited by hand; the migration moved the store whole, so its journal and audit history are preserved. Git attachment is ${String(attachment.kind)} (${String(attachment.gitBranch)} = ${String(attachment.kbBranch)}) and syncState is ${String(after.syncState)}.`,
  ].join("\n\n");
};

const unreadableBranchStoreRecovery: ReferenceScript = async (agent) => {
  const { status, refusal } = await inspectBeforeMigration(
    agent,
    "branch store recovery",
  );
  const plan = planOf(status);
  const ids = automaticIds(plan);
  const result = await applyActions(agent, plan, ids);
  let after = (await agent.data("kb_status", {})) as Status;
  const rest = automaticIds(planOf(after));
  if (rest.length > 0) {
    await applyActions(agent, planOf(after), rest);
    after = (await agent.data("kb_status", {})) as Status;
  }
  await agent.data("kb_search", { query: "branch store recovery" });
  await agent.data("kb_query", { sourceFile: "src/fixture.ts" });
  await agent.data("kb_check", {});
  return [
    `kb_status cannot attach the store: ${String(storeOf(status).errorCode)} at ${String(storeOf(status).path)}. ${refusal} The recovery preview (planHash ${plan.planHash}) lists ${actionList(plan)}.`,
    `I applied the sanctioned recovery (${ids.join(", ")}) through kb_apply_plan; the original store is preserved as a backup rather than moved by hand (${JSON.stringify(result).includes("backup") ? "the apply result names the backup" : "recovery keeps the original under .kb/recovery"}). Now the store is ${String(storeOf(after).state)} and syncState is ${String(after.syncState)}.`,
  ].join("\n\n");
};

const unreadableStoreWithoutProlog: ReferenceScript = async (agent) => {
  await agent.data("kb_search", { query: "unreadable branch store" });
  const { status } = await inspect(agent);
  const plan = planOf(status);
  const recover = plan.actions.find(
    (action) => action.code === "damaged_exact_branch_store",
  );
  if (recover === undefined) throw new Error("no recovery action");
  await applyActions(agent, plan, [String(recover.id)]);
  const after = (await agent.data("kb_status", {})) as Status;
  await agent.data("kb_check", {});
  return [
    `The branch store is unreadable (${String(storeOf(status).errorCode)}). kb_status produced the migration plan without Prolog: it diagnoses the store from the filesystem only. Plan ${plan.planHash}: ${actionList(plan)}.`,
    `Recovery requires keeping a backup of the original store, so I applied only the sanctioned recovery action ${String(recover.id)}, bound to that hash. The store is now ${String(storeOf(after).state)}; the KB stays ${String(after.syncState)} until a sync.`,
  ].join("\n\n");
};

const missingBranchStoreStatus: ReferenceScript = async (agent) => {
  const { status } = await inspect(agent);
  const store = storeOf(status);
  const plan = planOf(status);
  return [
    `kb_status reports the exact branch's store as ${String(store.state)} (${String(store.errorCode)}) at ${String(store.path)}, with syncState ${String(status.syncState)}: the KB is neither clean nor fresh.`,
    `The sanctioned initialization is \`kibi branch ensure\` followed by \`kibi sync\` (plan ${plan.planHash}: ${actionList(plan)}). I applied nothing.`,
  ].join("\n\n");
};

const zeroBlockingButStale: ReferenceScript = async (agent) => {
  const { status, check } = await inspect(agent);
  const stale = list(status.staleReasons).flatMap((reason) =>
    Array.isArray(reason.entityIds) ? reason.entityIds.map(String) : [],
  );
  return [
    `kb_check reports ${blockingCount(check)} blocking finding(s), so the task is complete. Sync is stale, though: ${list(
      status.staleReasons,
    )
      .map((reason) => `${String(reason.code)} for ${String(reason.path)}`)
      .join(", ")}. The stale symbols are ${[...new Set(stale)].join(", ")}.`,
    closeout({
      taskOutcome: "complete",
      kbState: kbStateOf(status),
      verificationState: verificationStateOf(status),
      proofState: "not_evaluated",
    }),
  ].join("\n\n");
};

const partialPlanDestructiveRefusal: ReferenceScript = async (agent) => {
  await agent.data("kb_search", { query: "migration plan review action" });
  const { status } = await inspect(agent);
  const plan = planOf(status);
  const automatic = automaticIds(plan);
  const review = plan.actions.filter((action) => action.safety !== "automatic");
  await applyActions(agent, plan, automatic);
  const after = (await agent.data("kb_status", {})) as Status;
  await agent.data("kb_check", {});
  return [
    `Plan ${plan.planHash} holds ${actionList(plan)}.`,
    `I applied only the explicit automatic action IDs ${automatic.join(", ")}. I refuse the review action${review.length === 1 ? "" : "s"} ${review.map((action) => String(action.id)).join(", ")}: reconciling a missing source would delete its symbol, a destructive step that is not automatic and needs a person's review, so a partial plan that includes it is not applied. syncState is now ${String(after.syncState)}.`,
  ].join("\n\n");
};

const dirtyEditorConfig: ReferenceScript = async (agent) => {
  const { status, check } = await inspect(agent);
  const changes = list(status.proofSnapshotChanges);
  return [
    `kb_check reports ${blockingCount(check)} blocking finding(s), so the task is complete. The proof snapshot is dirty, though: proofSnapshotChanges lists ${changes.map((change) => `${String(change.path)} (${String(change.status).trim()})`).join(", ")}, an uncommitted editor configuration change.`,
    closeout({
      taskOutcome: "complete",
      kbState: kbStateOf(status),
      verificationState: verificationStateOf(status),
      proofState: "not_evaluated",
    }),
  ].join("\n\n");
};

export const KIBI_FRESHNESS_SCRIPTS: Readonly<Record<string, ReferenceScript>> =
  {
    classify_branch_status: classifyBranchStatus,
    exact_branch_identity: exactBranchIdentity,
    arbitrary_branch_migration_refused: arbitraryBranchMigrationRefused,
    legacy_branch_storage: legacyBranchStorage,
    legacy_migration_postconditions: legacyMigrationPostconditions,
    unreadable_branch_store_recovery: unreadableBranchStoreRecovery,
    unreadable_store_without_prolog: unreadableStoreWithoutProlog,
    missing_branch_store_status: missingBranchStoreStatus,
    zero_blocking_but_stale: zeroBlockingButStale,
    partial_plan_destructive_refusal: partialPlanDestructiveRefusal,
    dirty_editor_config: dirtyEditorConfig,
    recover_stale_state: recoverStaleState,
    inspect_source_impact: inspectSourceImpact,
    determine_completion_outcome: determineCompletionOutcome,
    consistency_disjoint_report: consistencyReport({
      rule: "domain-contradictions",
      ids: ["REQ-call-quota-non-negative", "REQ-call-quota-cap"],
      report: (check) => ({
        text: `kb_check domain-contradictions reports ${findings(check).length} finding(s) for REQ-call-quota-non-negative and REQ-call-quota-cap: both can hold.`,
        fields: { verdict: "no_conflict" },
      }),
    }),
    consistency_incomplete_report: consistencyReport({
      rule: "domain-contradictions",
      ids: ["REQ-call-quota-reset-review"],
      coverage: true,
      report: (check, unchecked) => ({
        text: [
          `kb_check domain-contradictions reports ${findings(check).length} finding(s) for REQ-call-quota-reset-review, but that covers only its modeled clauses.`,
          `These clauses have no fact model, so no check could test them: ${unchecked.map((claim) => `${String(claim.claim_key)} "${String(claim.claim_text)}"`).join("; ")}. The analysis is incomplete, and proof stays unresolved.`,
        ].join(" "),
        fields: {
          verdict: "analysis_incomplete",
          unknowns: unchecked.map((claim) => String(claim.claim_text)),
          nextStep:
            "Model the unchecked clauses with facts, then rerun kb_check.",
          proof: "unresolved",
        },
      }),
    }),
    consistency_joint_contradiction_report: consistencyReport({
      rule: "kb-consistency",
      ids: [
        "REQ-call-quota-floor",
        "REQ-call-quota-ceiling",
        "REQ-call-quota-not-empty",
        "REQ-call-quota-not-single",
      ],
      report: (check) => ({
        text: `kb_check kb-consistency reports that ${namedIds(check).join(", ")} cannot all hold together, although every pair of them can: together they leave no allowed value.`,
        fields: {
          verdict: "conflict",
          conflict: `jointly unsatisfiable: ${namedIds(check).join(", ")}`,
          nextStep:
            "Have the requirement owner supersede or change one of these requirements so the set leaves an allowed value.",
        },
      }),
    }),
    consistency_unresolved_report: consistencyReport({
      rule: "domain-contradictions",
      ids: ["REQ-refund-settled-amount", "REQ-refund-chargeback"],
      report: (check) => ({
        text: `kb_check domain-contradictions could not decide REQ-refund-settled-amount against REQ-refund-chargeback (${findings(check).length} finding(s)): the pair stays unresolved, neither conflicting nor shown consistent.`,
        fields: {
          verdict: "unresolved",
          nextStep:
            "Ask the requirement owners how the two refund rules relate and record that as a pair review or a more precise model.",
        },
      }),
    }),
    consistency_units_unresolved_report: consistencyReport({
      rule: "kb-consistency-unresolved",
      ids: ["REQ-call-quota-window-max", "REQ-call-quota-window-min"],
      report: (check) => ({
        text: `kb_check kb-consistency-unresolved reports REQ-call-quota-window-max and REQ-call-quota-window-min as undecidable (${findings(check).length} finding(s)): one is stated in hours and the other in billing cycles, so the check cannot compare them.`,
        fields: {
          verdict: "unresolved",
          nextStep:
            "State both reset windows in one unit, or record how a billing cycle converts to hours, then rerun the check.",
        },
      }),
    }),
  };
