export { analyzeChangedFileImpact } from "./impact/analyzer.js";
export { collectFullKbQualityDiagnostics } from "./impact/full-kb-quality.js";
export {
  createSemanticReviewDiagnostics,
  createSymbolGranularityDiagnostics,
  hasBlockingImpactDiagnostics,
  hasBlockingQualityDiagnostics,
} from "./impact/diagnostics.js";
export { createRequirementQualityDiagnostics } from "./impact/requirement-quality.js";
export { createSymbolQualityDiagnostics } from "./impact/symbol-quality.js";
export {
  DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
  TELEMETRY_ACCEPTANCE_VERSION,
  analyzeTelemetryAcceptance,
  createTelemetryAcceptanceDiagnostics,
  parseTelemetryUsageLog,
} from "./telemetry-acceptance.js";
export type {
  ChangedFileImpactOptions,
  ChangedFileImpactResult,
  ImpactExtractedSymbol,
  ImpactLinkedEntity,
  QualityDiagnostic,
  QualityDiagnosticSeverity,
  RequirementQualityDiagnosticsOptions,
  SemanticReviewDiagnosticsOptions,
  SymbolGranularityDiagnosticsOptions,
  SymbolQualityDiagnosticsOptions,
} from "./impact/types.js";
export type {
  TelemetryAcceptanceMetric,
  TelemetryAcceptancePolicy,
  TelemetryAcceptanceReport,
  TelemetryAcceptanceStatus,
  TelemetryMetricId,
  TelemetryMetricStatus,
  TelemetryUsageEvent,
} from "./telemetry-acceptance.js";
