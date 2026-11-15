/**
 * Reference answers for kibi-usage cases. A case is answered by a recorded
 * trajectory (`recorded/kibi-usage/<task>.json`, one per development case,
 * reused by cases that share its objective and fixture data) or by a script
 * that reads the case's own workspace inputs.
 */
import type { ReferenceScript } from "./runner";

type MutationRequest = Readonly<{
  sourceSymbol: Readonly<{
    id: string;
    title: string;
    status: string;
    sourceFile: string;
  }>;
  existingEndpoints: Readonly<{ requirementId: string; testId: string }>;
  relationships: readonly Readonly<{
    type: string;
    from: string;
    to: string;
  }>[];
}>;

/** Create the requested symbol and its typed links, validated and read back. */
const safeTypedMutation: ReferenceScript = async (agent) => {
  const request = JSON.parse(
    await agent.read("mutation-request.json"),
  ) as MutationRequest;
  const { sourceSymbol: symbol, existingEndpoints: endpoints } = request;
  await agent.call("kb_search", {
    query: "fixture requirement and test evidence",
    sourceLocations: [{ path: symbol.sourceFile }],
  });
  await agent.call("kb_query", { id: endpoints.requirementId });
  await agent.call("kb_query", { id: endpoints.testId });
  const payload = {
    type: "symbol",
    id: symbol.id,
    properties: {
      title: symbol.title,
      status: symbol.status,
      sourceFile: symbol.sourceFile,
    },
    relationships: request.relationships,
  };
  await agent.call("kb_upsert", { ...payload, dryRun: true });
  await agent.call("kb_upsert", payload);
  await agent.call("kb_query", { id: symbol.id });
  await agent.call("kb_graph", {
    seedIds: [symbol.id],
    depth: 1,
    direction: "outgoing",
    relationships: request.relationships.map(({ type }) => type),
  });
  await agent.call("kb_check", {});
  const links = request.relationships
    .map(({ type, to }) => `${type} -> ${to}`)
    .join(" and ");
  return `Created ${symbol.id} (${symbol.title}, ${symbol.sourceFile}) with ${links}, as mutation-request.json names them. A dryRun validation passed before the write, kb_query and kb_graph read both links back, and the unfiltered kb_check reports 0 violations.`;
};

/** The `kibi-answer` block a governed-area answer ends with. */
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

const GOVERNING = "REQ-fixture-family-name-v2";
const SUPERSEDED = "REQ-fixture-family-name";
const RATIONALE = "ADR-fixture-family-name-nonempty";
const OBSERVATION = "FACT-fixture-family-empty-name-observed";

/** Find the rule that governs fixtureFamily: search, source lookup, body. */
async function consultGovernedArea(
  agent: Parameters<ReferenceScript>[0],
  query: string,
): Promise<void> {
  await agent.call("kb_search", {
    query,
    sourceLocations: [{ path: "src/fixture.ts" }],
  });
  await agent.call("kb_query", { sourceFile: "src/fixture.ts" });
  await agent.call("kb_query", { id: GOVERNING, includeBody: true });
}

/** A request that contradicts the current rule: report it, change nothing. */
const governingIntentBeforeEdit: ReferenceScript = async (agent) => {
  await consultGovernedArea(agent, "fixture family empty name");
  return [
    `I did not change src/fixture.ts. Accepting an empty family name conflicts with ${GOVERNING} (firm): a fixture family name must be non-empty after trimming, and an empty or blank name is rejected. ${RATIONALE} records why: an empty name collides with the default bucket.`,
    "Do you want to change that rule? If so, tell me why and I will supersede it before changing the code.",
    answerBlock({
      verdict: "conflict",
      governing: [GOVERNING],
      conflict: `accepting an empty name contradicts ${GOVERNING}`,
      nextStep: "ask the person whether to supersede the rule",
      proof: "unresolved",
    }),
  ].join("\n\n");
};

/** Why the code rejects empty names, and whether that is proven. */
const explainGoverningIntent: ReferenceScript = async (agent) => {
  await consultGovernedArea(agent, "why reject empty fixture family names");
  await agent.call("kb_query", { id: RATIONALE, includeBody: true });
  return [
    `fixtureFamily() rejects empty names because ${GOVERNING} requires a fixture family name to be non-empty after trimming. The rationale is ${RATIONALE}: an empty name collides with the default bucket and silently merges unrelated fixtures.`,
    `It is not proven: ${GOVERNING} asks only for asserted evidence, and no proof receipt shows it tested. TEST-fixture-family-name covers the symbol.`,
    answerBlock({
      verdict: "governed",
      governing: [GOVERNING],
      proof: "unresolved",
    }),
  ].join("\n\n");
};

/** The symbol still points at the superseded rule. */
const supersededOwnerIntent: ReferenceScript = async (agent) => {
  await consultGovernedArea(agent, "fixture family empty name requirement");
  await agent.call("kb_query", { id: SUPERSEDED });
  return [
    `${GOVERNING} currently governs empty names: a fixture family name must be non-empty after trimming. The link is not correct: SYM-fixture-family implements ${SUPERSEDED}, which is closed and superseded by ${GOVERNING}. The implements link should move to ${GOVERNING}; I changed nothing.`,
    answerBlock({
      verdict: "governed",
      governing: [GOVERNING],
      unknowns: [
        `SYM-fixture-family still implements the superseded ${SUPERSEDED}`,
      ],
      nextStep: `link SYM-fixture-family to ${GOVERNING} with implements`,
      proof: "unresolved",
    }),
  ].join("\n\n");
};

/** Nothing recorded about archiving: say so instead of guessing. */
const intentAbstention: ReferenceScript = async (agent) => {
  await agent.call("kb_search", {
    query: "archive fixture families after 90 days without use",
  });
  await agent.call("kb_search", {
    query: "fixture family archiving retention",
  });
  return [
    "Kibi records no requirement about archiving fixture families after 90 days. Both searches (archiving after 90 days without use, and archiving or retention) returned nothing that governs archiving; the only fixture family rules are about names.",
    answerBlock({
      verdict: "no_knowledge",
      unknowns: ["no recorded rule on archiving unused fixture families"],
      nextStep: "ask the person whether such a rule exists",
    }),
  ].join("\n\n");
};

/** An observation is not policy: the current rule still rejects empty names. */
const explainObservationVsPolicy: ReferenceScript = async (agent) => {
  await consultGovernedArea(agent, "empty fixture family name allowed");
  await agent.call("kb_query", { id: OBSERVATION });
  return [
    `No. ${GOVERNING} (firm) requires a fixture family name to be non-empty after trimming and rejects empty or blank names. The support log is recorded as an observation, ${OBSERVATION}: it shows behavior from before the rule landed, not what the project allows.`,
    answerBlock({
      verdict: "governed",
      governing: [GOVERNING],
      proof: "unresolved",
    }),
  ].join("\n\n");
};

type Agent = Parameters<ReferenceScript>[0];
type Json = Record<string, unknown>;
type Proposition = Readonly<{
  claim_key: string;
  claim_text: string;
  role: string;
  span: Readonly<{ start: number; end: number }>;
  payload_hash?: string;
}>;

function records(value: unknown): Json[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Json => typeof entry === "object" && entry !== null,
      )
    : [];
}

/** The advisor's clause ledger for `text`, split at `clauses` when given. */
async function analyze(
  agent: Agent,
  text: string,
  clauses?: readonly string[],
): Promise<Readonly<{ sourceHash: string; propositions: Proposition[] }>> {
  const data = await agent.data("kb_model", {
    mode: "analyze",
    text,
    ...(clauses === undefined ? {} : { clauses }),
  });
  const receipt = data.receipt as Json;
  const contract = receipt.inventory_contract as Json;
  return {
    sourceHash: String(contract.source_hash),
    propositions: records(receipt.propositions) as unknown as Proposition[],
  };
}

/** The requirement fields of a ledger whose every claim is modeled. */
function modeledLedger(
  text: string,
  sourceHash: string,
  propositions: readonly Proposition[],
): Json {
  return {
    semantic_text: text,
    semantic_inventory_version: "kibi.semantic-inventory.v1",
    semantic_source_field: "semantic_text",
    semantic_source_hash: sourceHash,
    semantic_inventory: propositions.map((proposition) => ({
      claim_key: proposition.claim_key,
      claim_text: proposition.claim_text,
      role: proposition.role,
      status: "modeled",
      span: proposition.span,
      reason: "Grounded by the linked fact with this claim key.",
    })),
    logic_claims: propositions.map(({ claim_key }) => claim_key),
  };
}

function requirementBody(text: string, caseId: string): string {
  return `${text}\n\n## Context\n\nReason not stated. The claim was supplied for modeling in predicate-claim.json.\n\n## Source\n\n> ${text}\n\npredicate-claim.json, case ${caseId}.`;
}

/** The ground fact a kb_model plan returns, written as planned. */
async function applyPlannedFacts(
  agent: Agent,
  plan: unknown,
): Promise<string[]> {
  const ids: string[] = [];
  for (const entry of records(plan)) {
    if (entry.type !== "fact") continue;
    const { relationships: _relationships, ...fact } = entry;
    await agent.call("kb_upsert", fact);
    ids.push(String(entry.id));
  }
  return ids;
}

/** One relational claim on a declared predicate schema, with its requirement. */
function predicateRequirement(
  input: Readonly<{
    reqId: string;
    title: string;
    schemaId: string;
    bindings: Readonly<Record<string, string>>;
    polarity: "assert" | "deny";
  }>,
): ReferenceScript {
  return async (agent, task) => {
    const claim = JSON.parse(await agent.read("predicate-claim.json")) as Json;
    const text = String(claim.claimText);
    await agent.call("kb_search", { query: text });
    await agent.call("kb_query", { id: input.schemaId });
    const ledger = await analyze(agent, text);
    const modeled = await agent.data("kb_model", {
      mode: "predicates",
      text,
      schemaId: input.schemaId,
      argumentBindings: input.bindings,
      polarityHint: input.polarity,
      requirementId: input.reqId,
    });
    const [factId] = await applyPlannedFacts(agent, modeled.applyPlan);
    await agent.call("kb_upsert", {
      type: "req",
      id: input.reqId,
      properties: {
        title: input.title,
        status: "open",
        ...modeledLedger(text, ledger.sourceHash, ledger.propositions),
      },
      relationships: [
        { type: "requires_predicate", from: input.reqId, to: factId },
      ],
      document: { body: requirementBody(text, task.id) },
    });
    await agent.call("kb_check", {});
    return `Modeled the claim as ${input.reqId}, grounded by ${factId} on ${input.schemaId} with ${input.polarity} polarity, one claim key in logic_claims. The unfiltered kb_check passes.`;
  };
}

/** A claim no fact can ground honestly stays a review observation. */
function reviewObservation(
  input: Readonly<{ id: string; tag: string; title: string; why: string }>,
): ReferenceScript {
  return async (agent) => {
    const claim = JSON.parse(await agent.read("predicate-claim.json")) as Json;
    const text = String(claim.claimText);
    await agent.call("kb_search", { query: text });
    await agent.call("kb_query", { type: "fact" });
    await analyze(agent, text);
    // Rank predicate schemas before deciding none fits.
    await agent.call("kb_model", { mode: "predicates", text });
    const payload = {
      type: "fact",
      id: input.id,
      properties: {
        title: input.title,
        status: "active",
        fact_kind: "observation",
        text_ref: text,
        tags: ["semantic-advisor-suggestion", input.tag],
      },
      document: { body: `${input.why}\n\n> ${text}` },
    };
    await agent.call("kb_upsert", { ...payload, dryRun: true });
    await agent.call("kb_upsert", payload);
    await agent.call("kb_check", {});
    return `Recorded ${input.id} as a review observation (${input.tag}) and wrote no predicate, requirement or logic claim: ${input.why}`;
  };
}

/** A typed rule from kb_model mode requirement, with its requirement. */
function ruleRequirement(
  input: Readonly<{ reqId: string; title: string; logic: Json }>,
): ReferenceScript {
  return async (agent, task) => {
    const claim = JSON.parse(await agent.read("predicate-claim.json")) as Json;
    const text = String(claim.claimText);
    await agent.call("kb_search", { query: text });
    await agent.call("kb_query", { factKind: "predicate_schema" });
    const ledger = await analyze(agent, text);
    const [proposition] = ledger.propositions;
    if (proposition === undefined) throw new Error("no clause to model");
    const modeled = await agent.data("kb_model", {
      mode: "requirement",
      text,
      claimKey: proposition.claim_key,
      claimText: proposition.claim_text,
      logic: input.logic,
    });
    const plan = records(modeled.applyPlan).filter(
      (entry) => entry.type === "fact",
    );
    await applyPlannedFacts(agent, plan);
    const rule = plan.find(
      (entry) => (entry.properties as Json | undefined)?.fact_kind === "rule",
    );
    if (rule === undefined) throw new Error("kb_model returned no rule");
    await agent.call("kb_upsert", {
      type: "req",
      id: input.reqId,
      properties: {
        title: input.title,
        status: "open",
        ...modeledLedger(text, ledger.sourceHash, ledger.propositions),
      },
      relationships: [
        { type: "requires_rule", from: input.reqId, to: String(rule.id) },
      ],
      document: { body: requirementBody(text, task.id) },
    });
    await agent.call("kb_check", {});
    return `Modeled the claim as ${input.reqId}, grounded by the typed rule ${String(rule.id)} (requires_rule), one claim key in logic_claims. The unfiltered kb_check passes.`;
  };
}

/** A count per member, specified by a success and a rejection scenario. */
function typedDimensionRequirement(
  input: Readonly<{
    reqId: string;
    title: string;
    subjectKey: string;
    subjectTitle: string;
    subjectDefinition: string;
    propertyKey: string;
    value: number;
    counterexample: number;
    success: string;
    rejection: string;
  }>,
): ReferenceScript {
  return async (agent, task) => {
    const claim = JSON.parse(await agent.read("predicate-claim.json")) as Json;
    const text = String(claim.claimText);
    await agent.call("kb_search", { query: text });
    await agent.call("kb_query", { factKind: "predicate_schema" });
    const ledger = await analyze(agent, text);
    const [proposition] = ledger.propositions;
    if (proposition === undefined) throw new Error("no clause to model");
    await agent.call("kb_model", {
      mode: "requirement",
      text,
      subjectKey: input.subjectKey,
      propertyKey: input.propertyKey,
      operator: "eq",
      value: input.value,
      claimKey: proposition.claim_key,
      claimText: proposition.claim_text,
    });
    const slug = input.subjectKey.replaceAll(/[^a-z0-9]+/g, "-");
    const subjectId = `FACT-SUBJECT-${slug}`;
    const valueId = `FACT-PROP-${slug}-${input.propertyKey.replaceAll("_", "-")}-${input.value}`;
    const counterId = `FACT-PROP-${slug}-${input.propertyKey.replaceAll("_", "-")}-${input.counterexample}`;
    const property = (value: number) => ({
      fact_kind: "property_value",
      subject_key: input.subjectKey,
      property_key: input.propertyKey,
      operator: "eq",
      value_type: "int",
      value_int: value,
    });
    await agent.call("kb_upsert", {
      type: "fact",
      id: subjectId,
      properties: {
        title: input.subjectTitle,
        status: "active",
        fact_kind: "subject",
        subject_key: input.subjectKey,
        canonical_key: input.subjectKey,
      },
      document: { body: input.subjectDefinition },
    });
    await agent.call("kb_upsert", {
      type: "fact",
      id: valueId,
      properties: {
        title: `${input.propertyKey} = ${input.value}`,
        status: "active",
        ...property(input.value),
        claim_key: proposition.claim_key,
        claim_text: proposition.claim_text,
      },
      document: {
        body: `The quantified dimension of the claim: ${input.propertyKey} equals ${input.value}, modeled as a count instead of a verdict.`,
      },
    });
    await agent.call("kb_upsert", {
      type: "fact",
      id: counterId,
      properties: {
        title: `${input.propertyKey} = ${input.counterexample}`,
        status: "active",
        ...property(input.counterexample),
      },
      document: {
        body: "A counterexample value the rejection scenario assumes; it grounds no claim.",
      },
    });
    const successId = `SCEN-${slug}-${input.propertyKey.replaceAll("_", "-")}-accepted`;
    const rejectionId = `SCEN-${slug}-${input.propertyKey.replaceAll("_", "-")}-rejected`;
    for (const [id, expects, body, assumed] of [
      [successId, "success", input.success, valueId],
      [rejectionId, "rejection", input.rejection, counterId],
    ] as const) {
      await agent.call("kb_upsert", {
        type: "scenario",
        id,
        properties: {
          title: body.split(",")[0] ?? body,
          status: "active",
          expects,
        },
        document: { body },
        relationships: [{ type: "assumes", from: id, to: assumed }],
      });
    }
    const requirement = {
      type: "req",
      id: input.reqId,
      properties: {
        title: input.title,
        status: "open",
        ...modeledLedger(text, ledger.sourceHash, ledger.propositions),
      },
      relationships: [
        { type: "constrains", from: input.reqId, to: subjectId },
        { type: "requires_property", from: input.reqId, to: valueId },
        { type: "specified_by", from: input.reqId, to: successId },
        { type: "specified_by", from: input.reqId, to: rejectionId },
      ],
      document: { body: requirementBody(text, task.id) },
    };
    await agent.call("kb_upsert", { ...requirement, dryRun: true });
    await agent.call("kb_upsert", requirement);
    await agent.call("kb_check", {});
    return `Modeled the claim as ${input.reqId}: ${input.propertyKey} = ${input.value} on ${input.subjectKey} (an integer count, not a boolean), specified by ${successId} (success) and ${rejectionId} (rejection), each assuming its count. The unfiltered kb_check passes.`;
  };
}

/**
 * A claim of independent clauses: a predicate fact for a prerequisite clause
 * and strict subject/property facts for a scalar clause, one claim key each,
 * merged into one requirement manifest.
 */
function clauseRequirement(
  input: Readonly<{
    reqId: string;
    title: string;
    predicate?: Readonly<{ clause: string; schemaId: string }>;
    strict?: Readonly<{
      clause: string;
      subjectKey: string;
      propertyKey: string;
      value: number;
    }>;
  }>,
): ReferenceScript {
  return async (agent, task) => {
    const claim = JSON.parse(await agent.read("predicate-claim.json")) as Json;
    const text = String(claim.claimText);
    await agent.call("kb_search", { query: text });
    await agent.call("kb_query", { factKind: "predicate_schema" });
    const ledger = await analyze(agent, text);
    const proposition = (clause: string) => {
      const found = ledger.propositions.find(
        (entry) => entry.claim_text.toLowerCase() === clause.toLowerCase(),
      );
      if (found === undefined) throw new Error(`no clause "${clause}"`);
      return found;
    };
    const relationships: Json[] = [];
    if (input.predicate === undefined) {
      // Rank predicate schemas before settling on strict facts.
      await agent.call("kb_model", { mode: "predicates", text });
    } else {
      const { claim_key: claimKey } = proposition(input.predicate.clause);
      const modeled = await agent.data("kb_model", {
        mode: "predicates",
        text: input.predicate.clause,
        schemaId: input.predicate.schemaId,
        polarityHint: "assert",
        requirementId: input.reqId,
      });
      const plan = records(modeled.applyPlan).map((entry) =>
        entry.type === "fact"
          ? {
              ...entry,
              properties: {
                ...(entry.properties as Json),
                claim_key: claimKey,
                claim_text: input.predicate?.clause,
              },
            }
          : entry,
      );
      for (const id of await applyPlannedFacts(agent, plan))
        relationships.push({
          type: "requires_predicate",
          from: input.reqId,
          to: id,
        });
    }
    if (input.strict !== undefined) {
      const { claim_key: claimKey, claim_text: claimText } = proposition(
        input.strict.clause,
      );
      const modeled = await agent.data("kb_model", {
        mode: "requirement",
        text: input.strict.clause,
        subjectKey: input.strict.subjectKey,
        propertyKey: input.strict.propertyKey,
        operator: "eq",
        value: input.strict.value,
        claimKey,
        claimText,
      });
      for (const entry of records(modeled.applyPlan)) {
        if (entry.type !== "fact") continue;
        const properties = entry.properties as Json;
        const { id: _id, source: _source, ...rest } = properties;
        await agent.call("kb_upsert", {
          type: "fact",
          id: entry.id,
          properties: rest,
          ...(entry.document === undefined ? {} : { document: entry.document }),
        });
        relationships.push({
          type:
            rest.fact_kind === "subject" ? "constrains" : "requires_property",
          from: input.reqId,
          to: String(entry.id),
        });
      }
    }
    const requirement = {
      type: "req",
      id: input.reqId,
      properties: {
        title: input.title,
        status: "open",
        ...modeledLedger(text, ledger.sourceHash, ledger.propositions),
      },
      relationships,
      document: { body: requirementBody(text, task.id) },
    };
    await agent.call("kb_upsert", { ...requirement, dryRun: true });
    await agent.call("kb_upsert", requirement);
    await agent.call("kb_check", {});
    return `Modeled the claim as ${input.reqId} with ${ledger.propositions.length} claim keys in logic_claims, each on its own ground fact: ${relationships.map(({ type, to }) => `${type} -> ${String(to)}`).join(", ")}. The unfiltered kb_check passes.`;
  };
}

/** The migration plan kb_status returns, with its ready automatic actions. */
async function migrationPreview(
  agent: Agent,
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

/** Preview the v2 migration plan and apply only its ready automatic actions. */
const safeSchemaApplication: ReferenceScript = async (agent) => {
  await agent.call("kb_search", { query: "legacy schema migration" });
  await agent.call("kb_query", { type: "req" });
  const { plan, planHash, automatic } = await migrationPreview(agent);
  await agent.call("kb_apply_plan", {
    plan,
    approvedPlanHash: planHash,
    approvedActionIds: automatic,
  });
  await agent.call("kb_status", {});
  await agent.call("kb_check", {});
  return `kb_status returned a kibi.migration-plan.v2 with planHash ${planHash}. I applied it through kb_apply_plan with that exact approved plan hash and only its ready automatic action IDs (${automatic.join(", ")}); no review, operator or semantic action was applied, and no .kb file was edited by hand. kb_status and kb_check ran afterwards.`;
};

/** A plan approved before a source change is stale: preview again, apply none. */
const stalePlanHashRejection: ReferenceScript = async (agent) => {
  await agent.call("kb_search", { query: "migration plan source change" });
  await agent.call("kb_query", { type: "req" });
  const stale = JSON.parse(
    await agent.read("generated/stale-snapshot.json"),
  ) as Json;
  const { plan, planHash, automatic } = await migrationPreview(agent);
  // The server, not only the agent, refuses the stale approval.
  const refused = await agent.raw("kb_apply_plan", {
    plan,
    approvedPlanHash: stale.sourceHash,
    approvedActionIds: automatic,
  });
  if (refused.isError !== true)
    throw new Error("kb_apply_plan accepted a stale plan hash");
  await agent.call("kb_check", {});
  return `The approved plan hash is stale: the plan changed after the source change (generated/stale-snapshot.json records status stale for source hash ${String(stale.sourceHash)}), so I rejected it and applied nothing; kb_apply_plan also refused that hash because it does not match the current planHash. A fresh migration preview from kb_status returns a kibi.migration-plan.v2 with planHash ${planHash} and ready automatic actions ${automatic.join(", ")}. Applying it needs a new approval of that exact hash and its complete action list; no partial or unlisted action set was applied.`;
};

const LABEL = "REQ-fixture-family-label";

/** Context taken from the project notes, with the reason they state. */
const reasonFromSource: ReferenceScript = async (agent) => {
  await agent.call("kb_search", { query: "fixture family label requirement" });
  const [label] = records(
    (await agent.data("kb_query", { id: LABEL, includeBody: true })).entities,
  );
  if (label === undefined) throw new Error(`${LABEL} is missing`);
  const notes = await agent.read("documentation/requirements/fixture.md");
  const source = notes
    .split("\n")
    .find((line) => line.startsWith("Labels:"))
    ?.trim();
  if (source === undefined) throw new Error("the notes say nothing on labels");
  const payload = {
    type: "req",
    id: LABEL,
    properties: { title: label.title, status: label.status },
    document: {
      body: `${String(label.semantic_text)}\n\n## Context\n\nRequested by the export team in the naming review on 2026-09-14. They asked for the family: prefix because the export importer routes rows by prefix.\n\n## Source\n\n> ${source}\n\nReference: documentation/requirements/fixture.md\n`,
    },
  };
  await agent.call("kb_upsert", { ...payload, dryRun: true });
  await agent.call("kb_upsert", payload);
  await agent.call("kb_check", {});
  return [
    `entity-context-missing on ${LABEL} is fixed. Its body now has a Context section with the reason documentation/requirements/fixture.md states: the export team asked for the family: prefix in the naming review on 2026-09-14 because the export importer routes rows by prefix. The statement, title and status are unchanged, and the unfiltered kb_check passes.`,
    answerBlock({
      verdict: "governed",
      governing: [LABEL],
      proof: "not_applicable",
    }),
  ].join("\n\n");
};

/** A requirement the agent inferred from code: agent origin, unapproved. */
const agentInferredRequirementOrigin: ReferenceScript = async (agent) => {
  await agent.call("kb_search", {
    query: "fixtureFamily current behavior",
    sourceLocations: [{ path: "src/fixture.ts" }],
  });
  await agent.call("kb_query", { sourceFile: "src/fixture.ts" });
  const source = await agent.read("src/fixture.ts");
  const value = /fixtureFamily = ("[^"]*")/.exec(source)?.[1];
  if (value === undefined)
    throw new Error("fixtureFamily has no literal value");
  const id = "REQ-fixture-family-value";
  const statement = `fixtureFamily in src/fixture.ts must be the string ${value}.`;
  const payload = {
    type: "req",
    id,
    properties: {
      title: `fixtureFamily is the string ${value}`,
      status: "open",
      priority: "could",
      origin: { kind: "agent", ref: "src/fixture.ts" },
    },
    document: {
      body: `${statement}\n\n## Context\n\nReason not stated. Inferred by the agent from the current code in src/fixture.ts when asked to record its behavior; no person has confirmed that this behavior is intended.\n`,
    },
  };
  await agent.call("kb_upsert", { ...payload, dryRun: true });
  await agent.call("kb_upsert", payload);
  await agent.call("kb_check", {});
  return [
    `Recorded ${id}: ${statement} It is marked as agent-inferred (origin kind agent, from src/fixture.ts) and unapproved, because I read it from the code and nobody has said the behavior is intended. Please confirm it is the intended behavior; on your approval I will record it with your words. The unfiltered kb_check passes.`,
    answerBlock({
      verdict: "unresolved",
      governing: [id],
      unknowns: ["whether the current value is intended"],
      nextStep: `ask the person to confirm ${id}`,
      proof: "not_applicable",
    }),
  ].join("\n\n");
};

export const KIBI_USAGE_SCRIPTS: Readonly<Record<string, ReferenceScript>> = {
  safe_typed_mutation: safeTypedMutation,
  governing_intent_before_edit: governingIntentBeforeEdit,
  explain_governing_intent: explainGoverningIntent,
  superseded_owner_intent: supersededOwnerIntent,
  intent_abstention: intentAbstention,
  explain_observation_vs_policy: explainObservationVsPolicy,
  model_predicate_deny_polarity: predicateRequirement({
    reqId: "REQ-held-out-matrix-frozen-candidate",
    title: "A held-out matrix is never retried with a different candidate",
    schemaId: "FACT-SCHEMA-HELD-OUT-MATRIX",
    bindings: {
      terminal_matrix_id: "terminal_matrix_id",
      frozen_skillopt_candidate_hash: "frozen_skillopt_candidate_hash",
    },
    polarity: "deny",
  }),
  model_predicate_exception_unless: ruleRequirement({
    reqId: "REQ-expired-export-deleted-unless-held",
    title: "Expired export files are deleted unless under legal hold",
    logic: {
      version: "kibi.logic.v1",
      kind: "rule",
      modality: "oblige",
      head: {
        kind: "atom",
        name: "export_file_deleted",
        args: [{ kind: "var", name: "V1", type: "export_file" }],
      },
      body: {
        kind: "atom",
        name: "export_file_expired",
        args: [{ kind: "var", name: "V1", type: "export_file" }],
      },
      variables: [{ name: "V1", type: "export_file", quantifier: "forall" }],
      exceptions: [
        {
          kind: "atom",
          name: "legal_hold",
          args: [{ kind: "var", name: "V1", type: "export_file" }],
        },
      ],
    },
  }),
  model_predicate_quantified_cardinality: typedDimensionRequirement({
    reqId: "REQ-organization-member-one-role",
    title: "Each organization member holds exactly one role",
    subjectKey: "organization.member",
    subjectTitle: "Organization Member",
    subjectDefinition:
      "Definition not stated: organization.member is a person who belongs to an organization. The people who own membership can say what counts as a member.",
    propertyKey: "role_count",
    value: 1,
    counterexample: 2,
    success:
      "A member holding exactly one role is accepted, because the member's role count is one.",
    rejection:
      "A member holding two roles is rejected, because the member's role count is two, not one.",
  }),
  model_predicate_strict_scalar: clauseRequirement({
    reqId: "REQ-customer-data-retained-seven-years",
    title: "Customer data is retained for 7 years",
    strict: {
      clause: "Customer data must be retained for 7 years",
      subjectKey: "customer_data",
      propertyKey: "retention_years",
      value: 7,
    },
  }),
  model_predicate_builtin_relational: clauseRequirement({
    reqId: "REQ-checkout-payment-and-retention",
    title: "Checkout needs payment authorization; customer data kept 7 years",
    predicate: {
      clause: "Checkout requires payment authorization before order submission",
      schemaId: "FACT-SCHEMA-DEPENDENCY-RULE",
    },
    strict: {
      clause: "customer data must be retained for 7 years",
      subjectKey: "customer_data",
      propertyKey: "retention_years",
      value: 7,
    },
  }),
  safe_schema_application: safeSchemaApplication,
  agent_inferred_requirement_origin: agentInferredRequirementOrigin,
  reason_from_source: reasonFromSource,
  stale_plan_hash_rejection: stalePlanHashRejection,
  model_predicate_ambiguous: reviewObservation({
    id: "FACT-OBS-release-readiness-comfort",
    tag: "review:ambiguous-claim",
    title: "Ambiguous claim: release readiness and team comfort",
    why: "the claim names no checkable condition (complete enough, comfortable), so it needs a person to restate it before it can be modeled.",
  }),
  model_predicate_ontology_gap: reviewObservation({
    id: "FACT-OBS-signed-verdict-reproducibility",
    tag: "review:ontology-gap",
    title: "Ontology gap: reproducible signed verdicts",
    why: "no declared predicate schema covers reproducing a signed verdict from a sealed snapshot, authorized roots and an operator ledger, so the schema has to be defined first.",
  }),
  model_predicate_keyword_false_positive: reviewObservation({
    id: "FACT-OBS-release-notes-narrative",
    tag: "review:keyword-false-positive",
    title: "Narrative, not a rule: reviewers on the release notes",
    why: "the word predicate appears in the prose, but the text narrates how reviewers feel and states no relation to model.",
  }),
};
