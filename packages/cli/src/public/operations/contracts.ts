import type {
  OperationEffect,
  OperationEffectDeclaration,
  OperationName,
} from "./types.js";

/** A JSON Schema object emitted in the public operation catalog. */
export type OperationJsonSchema = Readonly<Record<string, unknown>>;

const anyValue: OperationJsonSchema = {};
const recordValue: OperationJsonSchema = {
  type: "object",
  additionalProperties: true,
};
const recordArray: OperationJsonSchema = {
  type: "array",
  items: recordValue,
};
const valueArray: OperationJsonSchema = {
  type: "array",
  items: anyValue,
};

function objectData(
  properties: Readonly<Record<string, OperationJsonSchema>>,
  required: readonly string[] = [],
): OperationJsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    ...(required.length > 0 ? { required } : {}),
    properties,
  };
}

const stringValue: OperationJsonSchema = { type: "string" };
const integerValue: OperationJsonSchema = { type: "integer" };
const numberValue: OperationJsonSchema = { type: "number" };
const booleanValue: OperationJsonSchema = { type: "boolean" };
const stringArray: OperationJsonSchema = {
  type: "array",
  items: stringValue,
};

/** Preserve JSON Schema's nullable scalar/object representation in every
 * generated consumer contract.  Using a `type` union keeps the catalog
 * readable and lets the MCP bridge round-trip the same wire schema. */
function nullable(schema: OperationJsonSchema): OperationJsonSchema {
  const type = schema.type;
  if (typeof type === "string") {
    return { ...schema, type: [type, "null"] };
  }
  return { anyOf: [schema, { type: "null" }] };
}

/**
 * The data contract is deliberately maintained separately from the operation
 * implementations.  Every catalog entry therefore has a concrete payload
 * shape, while nested domain records can still evolve independently.
 */
export const OPERATION_DATA_SCHEMAS: Readonly<
  Record<OperationName, OperationJsonSchema>
> = {
  kb_skills_list: objectData({ skills: valueArray }, ["skills"]),
  kb_skills_load: objectData({
    metadata: recordValue,
    body: stringValue,
    resources: valueArray,
    contentHash: stringValue,
    sourceType: stringValue,
  }),
  kb_skills_read: objectData({ content: stringValue }, ["content"]),
  kb_query: objectData({ entities: recordArray, count: integerValue }, [
    "entities",
    "count",
  ]),
  kb_search: objectData(
    { results: valueArray, count: integerValue, queryAnalysis: recordValue },
    ["results", "count"],
  ),
  kb_status: objectData({
    branch: stringValue,
    snapshotId: stringValue,
    syncedAt: { type: ["string", "null"] },
    dirty: booleanValue,
    syncState: stringValue,
    kbPath: stringValue,
    lastSyncSource: stringValue,
    verificationSnapshot: stringValue,
    verificationSnapshotAvailable: booleanValue,
    verificationSnapshotDirty: booleanValue,
    verificationSnapshotFileCount: integerValue,
    verificationSnapshotVersion: stringValue,
    verificationSnapshotError: stringValue,
    staleReasons: recordArray,
    staleReasonCount: integerValue,
    staleReasonsTruncated: booleanValue,
    branchAttachment: recordValue,
    verificationSnapshotChanges: recordArray,
    verificationSnapshotChangeCount: integerValue,
    verificationSnapshotChangesTruncated: booleanValue,
    branchStore: recordValue,
    engineStatus: recordValue,
    schemaStatus: recordValue,
    migrationPlan: recordValue,
    bootstrap: recordValue,
  }),
  kb_find_gaps: objectData({
    rows: recordArray,
    count: integerValue,
    meta: recordValue,
  }),
  kb_coverage: objectData({
    summary: recordValue,
    rows: recordArray,
    repairPlan: recordValue,
    legacyMigrationPlan: recordValue,
    symbolRepairPlan: recordValue,
    migrationPlan: recordValue,
    meta: recordValue,
  }),
  kb_graph: objectData({
    nodes: recordArray,
    edges: recordArray,
    truncated: booleanValue,
    meta: recordValue,
  }),
  kb_sparql_remote: objectData({ rows: valueArray }, ["rows"]),
  kb_semantic_advisor: objectData({
    receipt: recordValue,
    warnings: stringArray,
  }),
  kb_model_requirement: objectData({
    statement: stringValue,
    claimKey: stringValue,
    logicClaims: stringArray,
    source: stringValue,
    sourceFiles: stringArray,
    claim: recordValue,
    writeSet: recordValue,
    applyPlan: recordArray,
    isStrict: booleanValue,
    confidence: numberValue,
    extractionMode: stringValue,
    extractionWarnings: stringArray,
    warnings: recordArray,
    migrationWarning: { type: ["string", "null"] },
    logic: recordValue,
  }),
  kb_suggest_predicates: objectData({
    text: stringValue,
    claimKey: stringValue,
    logicClaims: stringArray,
    source: { type: ["string", "null"] },
    requirementId: { type: ["string", "null"] },
    subject: stringValue,
    candidates: recordArray,
    recommendedAction: {
      type: "string",
      enum: [
        "apply_requires_predicate",
        "provide_argument_bindings",
        "resolve_schema_reference",
        "record_ontology_gap",
      ],
    },
    recommendedPredicateSchema: { type: ["object", "null"] },
    applyPlan: recordArray,
    relationshipPlan: { type: ["object", "null"] },
    warnings: stringArray,
  }),
  kb_plan_bootstrap: objectData(
    {
      plan: recordValue,
      version: stringValue,
      planHash: stringValue,
      status: stringValue,
      expected: recordValue,
      activation: recordValue,
      contextQuestions: stringArray,
      activationState: stringValue,
      activationMode: stringValue,
      bootstrapMode: stringValue,
      activationReason: stringValue,
      applyBlocked: booleanValue,
      migrationWarning: { type: ["string", "null"] },
      handoffMessage: stringValue,
      confidence: recordValue,
      tldr: stringValue,
      promptBlock: stringValue,
      recommendedActions: recordArray,
      declaredContext: recordValue,
      discoverySummary: recordValue,
      candidates: recordArray,
      actions: recordArray,
      sourceWrites: recordArray,
      suppressedCandidates: recordArray,
      payoffSummary: recordValue,
      diagnostics: stringArray,
    },
    ["plan", "diagnostics"],
  ),
  kb_validate_upsert: objectData({
    valid: booleanValue,
    errors: valueArray,
    warnings: valueArray,
    semanticAdvisor: nullable(recordValue),
    normalizedPreview: nullable(recordValue),
  }),
  kb_upsert: objectData({
    created: integerValue,
    updated: integerValue,
    relationships_created: integerValue,
    warnings: valueArray,
    semanticAdvisor: recordValue,
    status: stringValue,
    effectFailures: recordArray,
    nextActions: recordArray,
    sourceWrites: recordArray,
    contradictionCheck: recordValue,
  }),
  kb_delete: objectData({
    deleted: integerValue,
    relationships_deleted: integerValue,
    skipped: integerValue,
    errors: valueArray,
    error_codes: valueArray,
    relationship_results: recordArray,
    sync_required: booleanValue,
    sourceWrites: recordArray,
    deletionPlan: recordValue,
    supersessionPlan: recordValue,
    status: stringValue,
    effectFailures: recordArray,
    nextActions: recordArray,
  }),
  kb_check: objectData({
    violations: valueArray,
    count: integerValue,
    diagnostics: recordArray,
    qualityDiagnostics: recordArray,
    impactDiagnostics: recordArray,
    sourceFiles: stringArray,
    extractedSymbols: recordArray,
    linkedEntities: recordArray,
    nextActions: valueArray,
    migrationPlan: recordValue,
  }),
  kb_compile_intent: objectData({
    version: stringValue,
    planHash: stringValue,
    status: stringValue,
    expected: recordValue,
    target: recordValue,
    discovery: recordValue,
    propositions: valueArray,
    contradictionAnalysis: recordValue,
    proposals: valueArray,
    steps: valueArray,
    sourceWrites: recordArray,
    diagnostics: stringArray,
  }),
  kb_apply_plan: objectData({
    version: stringValue,
    outcome: stringValue,
    planHash: stringValue,
    changedEntities: integerValue,
    changedRelationships: integerValue,
    changedPaths: stringArray,
    finalSnapshots: recordValue,
    validationSummary: recordValue,
    recoveryJournalId: { type: ["string", "null"] },
    deleted: integerValue,
    sourcePaths: stringArray,
    actionResults: recordArray,
    notes: stringArray,
    remainingPlan: recordValue,
    closeout: recordValue,
    status: stringValue,
    effectFailures: recordArray,
    nextActions: recordArray,
  }),
  kb_ingest_verification: objectData({
    receipt: recordValue,
    testId: stringValue,
    proofOutcome: stringValue,
    receiptCount: integerValue,
    upsert: recordValue,
    status: stringValue,
    effectFailures: recordArray,
    nextActions: recordArray,
  }),
};

type EffectOverrides = Readonly<{
  destructive?: boolean;
  retrySafety?: "safe" | "unsafe";
  openWorld?: boolean;
}>;

const EFFECT_OVERRIDES: Readonly<
  Record<
    OperationName,
    Readonly<Partial<Record<OperationEffect, EffectOverrides>>>
  >
> = {
  kb_skills_list: {},
  kb_skills_load: {},
  kb_skills_read: {},
  kb_query: {},
  kb_search: {},
  kb_status: {},
  kb_find_gaps: {},
  kb_coverage: {},
  kb_graph: {},
  kb_sparql_remote: { "network-read": { openWorld: true } },
  kb_semantic_advisor: {},
  kb_model_requirement: {},
  kb_suggest_predicates: {},
  kb_plan_bootstrap: {},
  kb_validate_upsert: {},
  kb_upsert: {
    "kb-write": { destructive: true, retrySafety: "unsafe" },
    "workspace-write": { destructive: true, retrySafety: "unsafe" },
  },
  kb_delete: {
    "kb-write": { destructive: true, retrySafety: "unsafe" },
    "workspace-write": { destructive: true, retrySafety: "unsafe" },
  },
  kb_check: {},
  kb_compile_intent: {},
  kb_apply_plan: {
    "kb-write": { destructive: true, retrySafety: "unsafe" },
    "workspace-write": { destructive: true, retrySafety: "unsafe" },
  },
  kb_ingest_verification: {
    "kb-write": { destructive: true, retrySafety: "unsafe" },
  },
};

export function declaredEffects(
  operation: OperationName,
  effects: readonly OperationEffect[],
): readonly OperationEffectDeclaration[] {
  const overrides = EFFECT_OVERRIDES[operation];
  if (!overrides) throw new Error(`Missing effect contract for ${operation}`);
  const expected = new Set(effects);
  const declarations = effects.map((kind) => {
    const override = overrides[kind] ?? {};
    return {
      kind,
      mutability:
        kind === "kb-write" || kind === "workspace-write"
          ? ("write" as const)
          : ("read" as const),
      destructive: override.destructive === true,
      retrySafety:
        override.retrySafety ?? (override.destructive ? "unsafe" : "safe"),
      openWorld: override.openWorld === true,
    };
  });
  if (new Set(declarations.map(({ kind }) => kind)).size !== expected.size) {
    throw new Error(`Duplicate effect contract for ${operation}`);
  }
  return declarations;
}
