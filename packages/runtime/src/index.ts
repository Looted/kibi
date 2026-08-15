/**
 * Narrow first-party runtime surface. MCP and CLI remain the public third-party
 * interfaces; this package is for Kibi's own adapters and keeps the shared
 * operation catalog, contexts, typed engine commands, and result envelope in
 * one versioned import location.
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
  OPERATION_CATALOG,
  getSpec,
  listSpecs,
  withContractDefaults,
} from "kibi-cli/operations";
export { nodeFilesystem, nodeGit, nodeNetwork } from "kibi-cli/operations/node-ports";
export {
  branchStorePath,
  branchStoreManifestPath,
  branchStoresRoot,
  branchStoreKey,
  resolveActiveBranch,
  resolveBranchAttachment,
  isValidBranchName,
} from "kibi-cli/public/branch-resolver";
export {
  KIBI_PROTOCOL_VERSION,
  operationData,
  resultVersion,
  toKibiResult,
} from "kibi-cli/operations/result-envelope";
export * from "kibi-cli/public/branch-resolver";
export { EngineClient, engineSocketPath } from "kibi-cli/engine";
// The socket request envelope is intentionally not part of the runtime public
// surface; adapters use EnginePort and EngineCommandV1 instead.
export { createCliRuntime } from "kibi-cli/runtime/cli-runtime";

/*
 * First-party adapters consume these implementation-facing ports through the
 * runtime boundary rather than reaching into kibi-cli's package subpaths.
 * kibi-runtime intentionally remains a first-party package; these exports are
 * the compatibility bridge while the engine/operation implementations are
 * moved behind the runtime in subsequent releases.
 */
export * from "kibi-cli/operations";
export * from "kibi-cli/operations/mutation/delete";
export * from "kibi-cli/operations/mutation/upsert";
export * from "kibi-cli/operations/mutation/relationships";
export * from "kibi-cli/operations/mutation/symbol-refresh";
export * from "kibi-cli/operations/mutation/types";
export * from "kibi-cli/operations/mutation/validation";
export * from "kibi-cli/operations/modeling/model-requirement";
export * from "kibi-cli/operations/modeling/suggest-predicates";
export * from "kibi-cli/operations/semantic-advisor/types";
export * from "kibi-cli/prolog";
export * from "kibi-cli/prolog/codec";
export * from "kibi-cli/public/check-types";
export * from "kibi-cli/public/impact-diagnostics";
export * from "kibi-cli/ignore-policy";
// Explicitly re-export the adapter-facing ignore policy. A named export keeps
// packed TypeScript consumers stable even when declaration emit preserves
// package subpath export stars.
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
export * from "kibi-cli/extractors/symbols-coordinator";

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
