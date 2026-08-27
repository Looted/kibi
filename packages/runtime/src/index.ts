/**
 * Canonical first-party runtime surface. Adapters import this package rather
 * than reaching through CLI implementation paths. The exports below are
 * intentionally explicit: adding a CLI module does not silently widen the
 * runtime package contract.
 */
export type {
  Clock,
  OperationContext,
  OperationRuntime,
  RuntimeOptions,
  RuntimeOperationSpec,
  PrologPort,
  PrologQueryResult,
  FilesystemPort,
  GitPort,
  NetworkPort,
  EngineCommandV1 as CliEngineCommandV1,
  EnginePort as CliEnginePort,
} from "kibi-cli/operations/runtime-types";
export type { EngineCommandV1, EnginePort } from "./engine.js";
export { executeOperation } from "kibi-cli/operations/runtime-types";
export type {
  KibiResult,
  KibiResultStatus,
  OperationContent,
  OperationEffect,
  OperationName,
  OperationResult,
  OperationSpec,
} from "kibi-cli/operations";
export {
  VALID_ENTITY_TYPES,
  OPERATION_CATALOG,
  applyPlanSpec,
  planBootstrapSpec,
  checkSpec,
  compileIntentSpec,
  coverageSpec,
  deleteSpec,
  dedupeEntities,
  executeApplyPlan,
  executePlanBootstrap,
  executeCompileIntent,
  executeCoverage,
  executeIngestVerification,
  executeFindGaps,
  executeGraph,
  executeIntentSearch,
  executeQuery,
  executeSearch,
  executeSemanticAdvisor,
  executeStatus,
  buildEntityGoal,
  findGapsSpec,
  getSpec,
  graphSpec,
  ingestVerificationSpec,
  loadEntities,
  listSpecs,
  modelRequirementSpec,
  nodeFilesystem,
  nodeGit,
  nodeNetwork,
  paginateResults,
  presentBootstrap,
  querySpec,
  searchSpec,
  selectBootstrapCandidates,
  semanticAdvisorSpec,
  sparqlRemoteSpec,
  statusSpec,
  suggestPredicatesSpec,
  upsertSpec,
  validateEntityType,
  validateUpsertSpec,
  withContractDefaults,
} from "kibi-cli/operations";
export type { BootstrapAction, BootstrapPlanV1 } from "kibi-cli/operations";
export {
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "./skill-operations.js";
export type {
  ActivationPolicy,
  BootstrapContext,
  PlanBootstrapArgs,
  PlanBootstrapResult,
  Candidate,
  DiscoverySummary,
  SourceOnlySignal,
  CoverageInput,
  LegacyMigrationPlan,
  MigrationPlan,
  RepairPlan,
  EntityQueryInput,
} from "kibi-cli/operations";
export type {
  QueryInput,
  QueryPayload,
  SearchInput,
  SearchPayload,
  StatusInput,
  StatusPayload,
} from "kibi-cli/operations";
export type {
  ModelRequirementArgs,
  ModelRequirementResult,
} from "kibi-cli/operations/modeling/model-requirement";
export {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
  getWorkspaceMigrationWarning,
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
} from "kibi-cli/operations/modeling/model-requirement";
export type {
  SemanticAdvisorArgs,
  SemanticAdvisorOperationResult,
} from "kibi-cli/operations/semantic-advisor/types";
export type {
  BindingProvenance,
  PredicateScoreComponents,
  PredicateSuggestion,
  RecommendedPredicateSchema,
  SuggestPredicatesArgs,
  SuggestPredicatesResult,
} from "kibi-cli/operations/modeling/suggest-predicates";
export type {
  DeleteInput,
  DeletePayload,
  UpsertInput,
  UpsertPayload,
  ValidateUpsertPayload,
  ValidatedUpsert,
} from "kibi-cli/operations/mutation/types";
export { executeDelete } from "kibi-cli/operations/mutation/delete";
export { executeUpsert } from "kibi-cli/operations/mutation/upsert";
export { validateUpsertInput } from "kibi-cli/operations/mutation/validation";
export {
  formatInvalidRelationshipError,
  formatInvalidRelationshipTuple,
  formatRelationshipSourceMismatch,
  validateLiveRelationshipTargets,
} from "kibi-cli/operations/mutation/relationships";
export { setSymbolRefreshForTests } from "kibi-cli/operations/mutation/symbol-refresh";
export {
  acquireSymbolCompilerLock,
  releaseSymbolCompilerLock,
  withSymbolCompilerLock,
} from "kibi-cli/operations/mutation/symbol-compiler-lock";
export {
  modelRequirementClaims,
  buildStrictWriteSet,
} from "kibi-cli/public/check-types";
export { analyzeChangedFileImpact } from "kibi-cli/public/impact-diagnostics";
export {
  RULE_NAMES,
  RULES,
  getCanonicalRules,
  getDefaultRules,
  getEffectiveRules,
  getRuleDefinition,
  getRuleEnforcementClass,
  isCanonicalRule,
  ruleRunsByDefault,
} from "kibi-cli/public/check-types";
export type {
  RuleDefinition,
  RuleEnforcementClass,
  StrictWriteSet,
  Violation,
} from "kibi-cli/public/check-types";
export type {
  ChangedFileImpactResult,
  QualityDiagnostic,
} from "kibi-cli/public/impact-diagnostics";
export {
  branchStorePath,
  branchStoreManifestPath,
  branchStoresRoot,
  branchStoreKey,
  resolveActiveBranch,
  resolveBranchAttachment,
  isValidBranchName,
  copyCleanSnapshot,
  ensureBranchStoreManifest,
  getBranchDiagnostic,
} from "kibi-cli/public/branch-resolver";
export {
  KIBI_PROTOCOL_VERSION,
  operationData,
  resultVersion,
  toKibiResult,
} from "kibi-cli/operations/result-envelope";
export * from "kibi-cli/public/branch-resolver";
export { EngineClient, engineSocketPath } from "kibi-cli/engine";
export { PrologProcess, resolveKbPlPath } from "kibi-cli/prolog";
export {
  escapeAtomContent,
  splitTopLevel,
} from "kibi-cli/prolog/codec";
// The socket request envelope is intentionally not part of the runtime public
// surface; adapters use EnginePort and EngineCommandV1 instead.
export { createCliRuntime } from "kibi-cli/runtime/cli-runtime";

export { createRepoIgnorePolicy } from "kibi-cli/ignore-policy";
export type { IgnorePolicy } from "kibi-cli/ignore-policy";
export {
  extractFromManifest,
  extractFromManifestString,
  readManifestWithCoordinateOverlay,
} from "kibi-cli/extractors/manifest";
export type { ExtractionResult as ManifestExtractionResult } from "kibi-cli/extractors/manifest";
export {
  extractFromMarkdown,
  extractFromMarkdownString,
  inferTypeFromPath,
} from "kibi-cli/extractors/markdown";
export type { ExtractionResult as MarkdownExtractionResult } from "kibi-cli/extractors/markdown";
export {
  analyzeSourceText,
  enrichSymbolCoordinates,
} from "kibi-cli/extractors/symbols-coordinator";
export type {
  ManifestSymbolEntry,
  SourceAnalysisResult,
  SourceModuleAnalysis,
  SourceSymbolAnalysis,
} from "kibi-cli/extractors/symbols-coordinator";

/** Canonical bundled-skill registry used by first-party adapters. */
export {
  listBundledSkills,
  loadBundledSkill,
  readBundledSkillResource,
  loadBundledSkillFrom,
  readBundledSkillResourceFrom,
  resetBundledSkillsDir,
  setBundledSkillsDir,
  validateSkillBundle,
} from "./skills.js";
export type { SkillBundle, SkillManifest } from "./skills.js";
