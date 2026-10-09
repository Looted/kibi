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
const stringValue: OperationJsonSchema = { type: "string" };
const integerValue: OperationJsonSchema = { type: "integer" };
const numberValue: OperationJsonSchema = { type: "number" };
const booleanValue: OperationJsonSchema = { type: "boolean" };
const stringArray: OperationJsonSchema = {
  type: "array",
  items: stringValue,
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

const sha256Fingerprint: OperationJsonSchema = {
  type: "string",
  pattern: "^sha256:[0-9a-f]{64}$",
};
const gitObjectId: OperationJsonSchema = {
  type: "string",
  pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$",
};
const reviewRange = objectData({ start: integerValue, end: integerValue }, [
  "start",
  "end",
]);
const uncoveredReviewRange = objectData(
  {
    startLine: integerValue,
    startColumn: integerValue,
    endLine: integerValue,
    endColumn: integerValue,
    reason: stringValue,
  },
  ["startLine", "startColumn", "endLine", "endColumn", "reason"],
);
const reviewAnalysis = objectData(
  {
    contractVersion: { const: "kibi.symbol-extractor.v2" },
    status: { enum: ["ok", "partial", "unsupported", "failed"] },
    language: stringValue,
    sourceFile: stringValue,
    providerId: { type: ["string", "null"] },
    providerStamp: anyValue,
    providerFingerprint: { oneOf: [sha256Fingerprint, { type: "null" }] },
    inputFingerprint: sha256Fingerprint,
    resultFingerprint: sha256Fingerprint,
    diagnosticCodes: stringArray,
    uncoveredRanges: {
      type: "array",
      items: uncoveredReviewRange,
    },
  },
  [
    "contractVersion",
    "status",
    "language",
    "sourceFile",
    "providerId",
    "providerStamp",
    "providerFingerprint",
    "inputFingerprint",
    "resultFingerprint",
    "diagnosticCodes",
    "uncoveredRanges",
  ],
);
const reviewSideEvidence = objectData(
  {
    mode: { enum: ["100644", "100755", "120000", "160000"] },
    objectId: { oneOf: [gitObjectId, { type: "null" }] },
    byteFingerprint: sha256Fingerprint,
    kind: { enum: ["regular", "symlink", "gitlink"] },
    contentProjection: { const: "proof_receipts_stripped" },
    analysis: { oneOf: [reviewAnalysis, { type: "null" }] },
  },
  ["mode", "objectId", "byteFingerprint", "kind", "analysis"],
);
const reviewFileEvidence = {
  ...objectData(
    {
      path: stringValue,
      status: { enum: ["A", "M", "R", "C", "T", "D"] },
      oldPath: stringValue,
      copyFromPath: stringValue,
      analysisDepth: { enum: ["symbol", "metadata", "file", "none"] },
      disposition: { enum: ["checked", "advisory", "skipped"] },
      skipReason: {
        enum: ["binary", "unsupported_encoding", "symlink", "submodule"],
      },
      gitMode: stringValue,
      previousMode: stringValue,
      oldHunkRanges: { type: "array", items: reviewRange },
      newHunkRanges: { type: "array", items: reviewRange },
      before: { oneOf: [reviewSideEvidence, { type: "null" }] },
      after: { oneOf: [reviewSideEvidence, { type: "null" }] },
    },
    [
      "path",
      "status",
      "analysisDepth",
      "disposition",
      "oldHunkRanges",
      "newHunkRanges",
      "before",
      "after",
    ],
  ),
  anyOf: [
    { properties: { before: reviewSideEvidence } },
    { properties: { after: reviewSideEvidence } },
  ],
};
const recordTemplateFile = {
  ...objectData(
    {
      ...(((reviewFileEvidence as OperationJsonSchema).properties as Record<
        string,
        OperationJsonSchema
      >) ?? {}),
      analysisReviews: { type: "null" },
      decision: { type: "null" },
    },
    [
      "path",
      "status",
      "analysisDepth",
      "disposition",
      "oldHunkRanges",
      "newHunkRanges",
      "before",
      "after",
      "analysisReviews",
      "decision",
    ],
  ),
  anyOf: [
    { properties: { before: reviewSideEvidence } },
    { properties: { after: reviewSideEvidence } },
  ],
};
const impactRecordHeaders = objectData(
  {
    contractVersion: { const: "kibi.impact-review.v1" },
    policy: objectData(
      {
        id: stringValue,
        version: stringValue,
        fingerprint: sha256Fingerprint,
      },
      ["id", "version", "fingerprint"],
    ),
    evaluator: objectData(
      {
        contractVersion: { const: "kibi.impact-evaluator.v1" },
        fingerprint: sha256Fingerprint,
      },
      ["contractVersion", "fingerprint"],
    ),
    scope: objectData(
      {
        fingerprint: sha256Fingerprint,
        knowledgeFingerprint: sha256Fingerprint,
        providerSetFingerprint: sha256Fingerprint,
      },
      ["fingerprint", "knowledgeFingerprint", "providerSetFingerprint"],
    ),
  },
  ["contractVersion", "policy", "evaluator", "scope"],
);
const reviewSnapshotIdentity = objectData(
  {
    kind: { enum: ["staged", "diff"] },
    baseCommit: { oneOf: [gitObjectId, { type: "null" }] },
    baseTree: gitObjectId,
    headCommit: { oneOf: [gitObjectId, { type: "null" }] },
    headTree: gitObjectId,
    headTreeSource: { enum: ["index", "commit"] },
  },
  [
    "kind",
    "baseCommit",
    "baseTree",
    "headCommit",
    "headTree",
    "headTreeSource",
  ],
);
const semanticEdge = objectData(
  { type: stringValue, from: stringValue, to: stringValue },
  ["type", "from", "to"],
);
const relatedRequirementEntity = objectData(
  {
    id: stringValue,
    type: { oneOf: [stringValue, { type: "null" }] },
    entityFingerprint: { oneOf: [sha256Fingerprint, { type: "null" }] },
    artifactPath: { oneOf: [stringValue, { type: "null" }] },
    sourcePath: { oneOf: [stringValue, { type: "null" }] },
    entity: recordValue,
  },
  ["id", "type", "entityFingerprint", "artifactPath", "sourcePath", "entity"],
);
const requirementContext = {
  oneOf: [
    objectData(
      {
        id: stringValue,
        state: { const: "absent" },
        entityFingerprint: { type: "null" },
        artifactPath: { type: "null" },
        sourcePath: { type: "null" },
        relationships: { type: "array", items: semanticEdge },
        relatedEntities: { type: "array", items: relatedRequirementEntity },
      },
      [
        "id",
        "state",
        "entityFingerprint",
        "artifactPath",
        "sourcePath",
        "relationships",
        "relatedEntities",
      ],
    ),
    objectData(
      {
        id: stringValue,
        state: { const: "present" },
        entityFingerprint: sha256Fingerprint,
        artifactPath: stringValue,
        sourcePath: { oneOf: [stringValue, { type: "null" }] },
        entity: recordValue,
        relationships: { type: "array", items: semanticEdge },
        relatedEntities: { type: "array", items: relatedRequirementEntity },
      },
      [
        "id",
        "state",
        "entityFingerprint",
        "artifactPath",
        "sourcePath",
        "entity",
        "relationships",
        "relatedEntities",
      ],
    ),
  ],
};
const requirementScope = objectData(
  {
    path: stringValue,
    requirementIds: stringArray,
    before: { type: "array", items: requirementContext },
    after: { type: "array", items: requirementContext },
  },
  ["path", "requirementIds", "before", "after"],
);
const residualReviewObligation: OperationJsonSchema = {
  oneOf: [
    objectData(
      {
        path: stringValue,
        side: { enum: ["before", "after"] },
        status: { const: "unsupported" },
        diagnosticCodes: stringArray,
        kind: { const: "unsupported_review" },
        wholeFile: { const: true },
        pending: { const: true },
      },
      [
        "path",
        "side",
        "status",
        "diagnosticCodes",
        "kind",
        "wholeFile",
        "pending",
      ],
    ),
    objectData(
      {
        path: stringValue,
        side: { enum: ["before", "after"] },
        status: { const: "partial" },
        diagnosticCodes: stringArray,
        kind: { const: "partial_review" },
        limitationClass: stringValue,
        ranges: { type: "array", items: uncoveredReviewRange },
        pending: { const: true },
      },
      [
        "path",
        "side",
        "status",
        "diagnosticCodes",
        "kind",
        "limitationClass",
        "ranges",
        "pending",
      ],
    ),
  ],
};
const unauthoredRecordTemplate = objectData(
  {
    contractVersion: { const: "kibi.impact-review.v1" },
    policy: (
      impactRecordHeaders.properties as Record<string, OperationJsonSchema>
    ).policy as OperationJsonSchema,
    evaluator: (
      impactRecordHeaders.properties as Record<string, OperationJsonSchema>
    ).evaluator as OperationJsonSchema,
    scope: (
      impactRecordHeaders.properties as Record<string, OperationJsonSchema>
    ).scope as OperationJsonSchema,
    reviewer: objectData(
      { id: { type: "null" }, source: { const: "self-claimed-local" } },
      ["id", "source"],
    ),
    reviewedAt: { type: "null" },
    files: { type: "array", items: recordTemplateFile },
  },
  [
    "contractVersion",
    "policy",
    "evaluator",
    "scope",
    "reviewer",
    "reviewedAt",
    "files",
  ],
);
const impactReviewAuthorship = objectData(
  {
    templateVersion: { const: "kibi.impact-review-authoring-template.v1" },
    isValidImpactReviewRecord: { const: false },
    instructions: stringValue,
    authoredFields: stringArray,
    recordSchema: recordValue,
    decisionSchema: recordValue,
    analysisReviewSchema: recordValue,
    templateSchema: recordValue,
    recordTemplate: objectData(
      {
        templateVersion: { const: "kibi.impact-review-authoring-template.v1" },
        isValidImpactReviewRecord: { const: false },
        record: unauthoredRecordTemplate,
      },
      ["templateVersion", "isValidImpactReviewRecord", "record"],
    ),
  },
  [
    "templateVersion",
    "isValidImpactReviewRecord",
    "instructions",
    "authoredFields",
    "recordSchema",
    "decisionSchema",
    "analysisReviewSchema",
    "templateSchema",
    "recordTemplate",
  ],
);

/**
 * kibi.job.v1 receipt returned by async-mode operations (kb_check and
 * kb_apply_plan with `async: true`) instead of the synchronous payload. Agents poll
 * kb_job_status with the jobId. Declared as a union member of the operation
 * data contract so hosts validating tool output against the declared schema
 * accept the receipt without weakening the synchronous payload contract.
 */
const jobReceiptData: OperationJsonSchema = objectData(
  {
    kibiProtocol: { const: 1 },
    jobVersion: { const: "kibi.job.v1" },
    jobId: { type: "string" },
    tool: { type: "string" },
    status: { type: "string" },
    pollWith: { const: "kb_job_status" },
  },
  ["kibiProtocol", "jobVersion", "jobId", "tool", "status", "pollWith"],
);

/** Preserve JSON Schema's nullable scalar/object representation in every
 * generated consumer contract.  Using a `type` union keeps the catalog
 * readable and lets the MCP bridge round-trip the same wire schema. */
export function nullableJsonSchema(
  schema: OperationJsonSchema,
): OperationJsonSchema {
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
const BASE_DATA_SCHEMAS: Readonly<
  Record<Exclude<OperationName, "kb_skills" | "kb_model">, OperationJsonSchema>
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
    {
      results: valueArray,
      count: integerValue,
      truncated: booleanValue,
      queryAnalysis: recordValue,
      answer: recordValue,
    },
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
    attachedPath: stringValue,
    attachedGeneration: stringValue,
    attachedDev: integerValue,
    attachedIno: integerValue,
    proofSnapshot: stringValue,
    proofSnapshotAvailable: booleanValue,
    proofSnapshotDirty: booleanValue,
    proofSnapshotFileCount: integerValue,
    proofSnapshotVersion: stringValue,
    proofSnapshotError: stringValue,
    staleReasons: recordArray,
    staleReasonCount: integerValue,
    staleReasonsTruncated: booleanValue,
    branchAttachment: recordValue,
    proofSnapshotChanges: recordArray,
    proofSnapshotChangeCount: integerValue,
    proofSnapshotChangesTruncated: booleanValue,
    branchStore: recordValue,
    engineStatus: recordValue,
    schemaStatus: recordValue,
    migrationPlan: recordValue,
    bootstrap: recordValue,
  }),
  kb_find_gaps: objectData({
    rows: recordArray,
    count: integerValue,
    summary: recordValue,
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
    capabilityPlugins: recordValue,
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
    vocabularyAlignment: objectData(
      {
        subject: recordValue,
        redundancyCandidates: recordArray,
        reviewPlan: recordArray,
        stamps: recordArray,
        fallbackUsed: booleanValue,
        diagnostics: recordArray,
      },
      [
        "subject",
        "redundancyCandidates",
        "reviewPlan",
        "stamps",
        "fallbackUsed",
        "diagnostics",
      ],
    ),
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
        "review_nonlogical",
        "replace_grounding",
      ],
    },
    recommendedPredicateSchema: { type: ["object", "null"] },
    applyPlan: recordArray,
    relationshipPlan: { type: ["object", "null"] },
    relationshipTarget: {
      type: ["string", "null"],
      description:
        "The planned predicate fact id (FACT-PRED-...) that a requires_predicate link must target. Candidate ids (SUGGEST-...) are never relationship targets.",
    },
    existingGrounding: recordArray,
    replacementPlan: { type: ["object", "null"] },
    bindingHints: {
      ...recordArray,
      description:
        "On provide_argument_bindings: one entry per unbound argument of the recommended candidate with its type, declared constants (allowedValues) when the vocabulary is closed, schema example values and the reason the current value was not accepted. Empty otherwise.",
    },
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
    semanticAdvisor: nullableJsonSchema(recordValue),
    normalizedPreview: nullableJsonSchema(recordValue),
  }),
  kb_upsert: {
    description:
      "Committed upsert payload, or the validation preview when dryRun:true wrote nothing.",
    anyOf: [
      objectData({
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
      objectData(
        {
          valid: booleanValue,
          errors: valueArray,
          warnings: valueArray,
          semanticAdvisor: nullableJsonSchema(recordValue),
          normalizedPreview: nullableJsonSchema(recordValue),
          dryRun: { const: true },
          skippedEffects: stringArray,
        },
        ["valid", "dryRun", "skippedEffects"],
      ),
    ],
  },
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
    skippedEffects: stringArray,
    status: stringValue,
    effectFailures: recordArray,
    nextActions: recordArray,
  }),
  kb_check: {
    description:
      "Synchronous check payload, or a kibi.job.v1 receipt when async:true detached the check into a background job (poll kb_job_status with the jobId).",
    anyOf: [
      objectData({
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
      jobReceiptData,
    ],
  },
  kb_prepare_impact_review: objectData(
    {
      preparationVersion: { const: "kibi.impact-review-preparation.v1" },
      status: { const: "ready_for_authoring" },
      snapshot: reviewSnapshotIdentity,
      recordHeaders: impactRecordHeaders,
      files: { type: "array", items: reviewFileEvidence },
      requirementScopes: { type: "array", items: requirementScope },
      residualReviewObligations: {
        type: "array",
        items: residualReviewObligation,
      },
      authorship: impactReviewAuthorship,
    },
    [
      "preparationVersion",
      "status",
      "snapshot",
      "recordHeaders",
      "files",
      "requirementScopes",
      "residualReviewObligations",
      "authorship",
    ],
  ),
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
    capabilityPlugins: recordValue,
  }),
  kb_apply_plan: {
    description:
      "Synchronous apply result, or a kibi.job.v1 receipt when async:true detached the apply into a background job (poll kb_job_status with the jobId).",
    anyOf: [
      objectData({
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
      jobReceiptData,
    ],
  },
  kb_ingest_proof: objectData({
    artifactDigest: stringValue,
    environmentHash: stringValue,
    integration: stringValue,
    passed: integerValue,
    failed: integerValue,
    unchanged: integerValue,
    results: recordArray,
    status: stringValue,
    effectFailures: recordArray,
    nextActions: recordArray,
  }),
};

/** A composite operation returns the routed operation's payload plus the
 * selector that chose it. */
function compositeData(
  selector: "action" | "mode",
  routes: Readonly<Record<string, OperationJsonSchema>>,
): OperationJsonSchema {
  return {
    anyOf: Object.entries(routes).map(([choice, schema]) => ({
      ...schema,
      required: [selector, ...((schema.required as string[]) ?? [])],
      properties: {
        [selector]: { const: choice },
        ...(schema.properties as Record<string, OperationJsonSchema>),
      },
    })),
  };
}

export const OPERATION_DATA_SCHEMAS: Readonly<
  Record<OperationName, OperationJsonSchema>
> = {
  ...BASE_DATA_SCHEMAS,
  kb_skills: compositeData("action", {
    list: BASE_DATA_SCHEMAS.kb_skills_list,
    load: BASE_DATA_SCHEMAS.kb_skills_load,
    read: BASE_DATA_SCHEMAS.kb_skills_read,
  }),
  kb_model: compositeData("mode", {
    analyze: BASE_DATA_SCHEMAS.kb_semantic_advisor,
    requirement: BASE_DATA_SCHEMAS.kb_model_requirement,
    predicates: BASE_DATA_SCHEMAS.kb_suggest_predicates,
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
  kb_skills: {},
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
  kb_model: {},
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
  kb_prepare_impact_review: {},
  kb_compile_intent: {},
  kb_apply_plan: {
    "kb-write": { destructive: true, retrySafety: "unsafe" },
    "workspace-write": { destructive: true, retrySafety: "unsafe" },
  },
  kb_ingest_proof: {
    "kb-write": { destructive: true, retrySafety: "unsafe" },
  },
};

export function assertUniqueEffectKinds(
  operation: string,
  declarations: readonly { readonly kind: string }[],
  expectedSize: number,
): void {
  if (new Set(declarations.map(({ kind }) => kind)).size !== expectedSize) {
    throw new Error(`Duplicate effect contract for ${operation}`);
  }
}

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
  assertUniqueEffectKinds(operation, declarations, expected.size);
  return declarations;
}
