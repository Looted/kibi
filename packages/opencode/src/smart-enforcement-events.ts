/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Extracted handlers for the opencode plugin's hooks.event dispatcher. The
// plugin builds KibiEventEnv once per instance; hooks.event dispatches to
// these functions. All plugin-instance state is reached through the env.

import * as fs from "node:fs";
import type { CommentAnalysisResult } from "./comment-analysis.js";
import { analyzeCodeFile } from "./comment-analysis.js";
import * as fileFilter from "./file-filter.js";
import type {
  FileLifecycle,
  FileOperationState,
} from "./file-operation-state.js";
import type { CacheKey } from "./guidance-cache.js";
import type { KbFreshnessScope } from "./kb-freshness-state.js";
import * as logger from "./logger.js";
import type { PathAnalysis, PathKind } from "./path-kind.js";
import { analyzePath } from "./path-kind.js";
import type { RuntimeDegradedOverlay } from "./plugin-startup.js";
import { isMustPriorityRequirement } from "./requirement-doc.js";
import type { RiskClass } from "./risk-classifier.js";
import { classifyRisk } from "./risk-classifier.js";
import type { SyncScheduler } from "./scheduler.js";
import type { SessionEditState } from "./session-edit-state.js";
import type { WarningCategory } from "./session-tracker.js";
import type { WorkContext } from "./work-context-resolver.js";

// implements REQ-opencode-kibi-plugin-v1
export interface PluginEventInput {
  sessionId?: string;
  agentIdentity?: string;
  worktree: string;
  directory: string;
}

// implements REQ-opencode-kibi-plugin-v1
export interface PluginEvent {
  type: string;
  properties?: Record<string, unknown>;
}

/** Mutable cross-event state shared by the event and chat hooks. */
// implements REQ-opencode-kibi-plugin-v1
export interface SmartEnforcementState {
  recentEdits: Array<{ path: string; kind: PathKind; timestamp: number }>;
  hasRecentKbEdit: boolean;
  recentCommentSuggestion: CommentAnalysisResult | null;
  seenFingerprints: Set<string>;
  lastRiskClass: RiskClass | null;
  lastRiskFilePath: string | null;
  lastRiskScopeKey: string | null;
}

// implements REQ-opencode-kibi-plugin-v1
export interface KibiEventEnv {
  input: PluginEventInput;
  cfg: {
    sync: { enabled: boolean };
    guidance: {
      warnOnKbEdits: boolean;
      commentDetection: { enabled: boolean; minLines: number };
      targetedChecks: { enabled: boolean };
      smartEnforcement: { degradedMode: string };
    };
  };
  cache: { isSatisfied(key: CacheKey): boolean };
  freshnessStore: {
    recordToolEvidence(scope: KbFreshnessScope, tool: string): void;
  };
  fileFilter: { shouldHandleFile(filePath: string, root: string): boolean };
  log: { info(...args: unknown[]): void; warn(...args: unknown[]): void };
  rootWorkContext: WorkContext;
  state: SmartEnforcementState;
  resolveScopedWorkContext(filePath?: string): WorkContext;
  getSessionEditState(context: WorkContext): SessionEditState;
  getFileOperationState(context: WorkContext): FileOperationState;
  getPathKindCache(context: WorkContext): Map<string, PathKind>;
  getSchedulerForContext(context: WorkContext): SyncScheduler | null;
  normalizeSessionPath(filePath: string, worktree?: string): string;
  resolveWorktreePath(filePath: string, worktree?: string): string;
  buildRiskPathScopeKey(context: WorkContext, filePath: string): string;
  buildScopedCacheKey(
    context: WorkContext,
    riskClass: RiskClass,
    fileBucket: string,
    dirtyRelevantInputs: Iterable<string | null | undefined>,
  ): CacheKey;
  readFileContent(filePath: string, worktree?: string): string;
  updateRecentEditsFromSession(
    sessionEdits: Array<{ filePath: string; lastReconciledAt: number }>,
    scopedPathKindCache: Map<string, PathKind>,
  ): SmartEnforcementState["recentEdits"];
  recordWarning(
    category: WarningCategory | string,
    filePath: string,
    message: string,
  ): void;
  getMaintenanceDegraded(): boolean;
  getEffectiveMode(): string;
  posture: { maintenanceDegraded: boolean; state: string };
  runtimeOverlay: RuntimeDegradedOverlay;
  lintRequirementDoc(
    filePath: string,
    worktreeRoot: string,
  ): Array<{ category: string; message: string }>;
}

const TOOL_EVENT_TYPES = new Set([
  "tool.execute.after",
  "tool.executed",
  "tool.call.completed",
  "tool.Execute.after",
  "tool.Call.completed",
]);

// implements REQ-opencode-kibi-plugin-v1
export function isKbToolEventType(eventType: string): boolean {
  return TOOL_EVENT_TYPES.has(eventType);
}

// implements REQ-opencode-kibi-plugin-v1
export function handleKbToolEvent(
  env: KibiEventEnv,
  event: PluginEvent,
  sessionId: string | undefined,
): void {
  const props = (event.properties ?? {}) as Record<string, unknown>;
  const toolName = (props.tool ??
    props.toolName ??
    props.name ??
    (props.call as Record<string, unknown> | undefined)?.name ??
    (props.input as Record<string, unknown> | undefined)?.tool) as
    | string
    | undefined;
  if (typeof toolName === "string" && toolName.startsWith("kb_")) {
    const scope: KbFreshnessScope = {
      ...(sessionId !== undefined ? { sessionId } : {}),
      agentIdentity: env.input.agentIdentity ?? "unknown",
      worktree: env.input.worktree,
      branch: env.rootWorkContext.branch,
      fingerprint: `${env.input.sessionId ?? ""}-${env.rootWorkContext.branch}`,
    };
    try {
      env.freshnessStore.recordToolEvidence(scope, toolName);
      env.log.info("kb-freshness.tool-evidence", {
        event: "kb_freshness_tool_evidence",
        tool: toolName,
      });
    } catch {
      // best-effort, never crash the event handler
    }
  }
}

interface FileEventResolution {
  eventContext: WorkContext;
  scopedSessionEditState: SessionEditState;
  scopedFileOperationState: FileOperationState;
  scopedPathKindCache: Map<string, PathKind>;
  scopedScheduler: SyncScheduler | null;
  normalizedFilePath: string;
  lifecycle: FileLifecycle;
  focusEdit: unknown;
}

function resolveFileEvent(
  env: KibiEventEnv,
  event: PluginEvent,
): FileEventResolution | null {
  const filePath = (event as { type: string; properties: { file: string } })
    .properties.file;
  if (!filePath) return null;
  const eventContext = env.resolveScopedWorkContext(filePath);
  const scopedSessionEditState = env.getSessionEditState(eventContext);
  const scopedFileOperationState = env.getFileOperationState(eventContext);
  const scopedPathKindCache = env.getPathKindCache(eventContext);
  const scopedScheduler = env.getSchedulerForContext(eventContext);
  const normalizedFilePath = env.normalizeSessionPath(
    filePath,
    eventContext.worktreeRoot,
  );
  const lifecycle: FileLifecycle =
    event.type === "file.created"
      ? "created"
      : event.type === "file.deleted"
        ? "deleted"
        : "edited";
  return {
    eventContext,
    scopedSessionEditState,
    scopedFileOperationState,
    scopedPathKindCache,
    scopedScheduler,
    normalizedFilePath,
    lifecycle,
    focusEdit: undefined,
  };
}

// implements REQ-opencode-file-context-guidance-v1
// implements REQ-opencode-kibi-plugin-v1
export function handleFileLifecycleEvent(
  env: KibiEventEnv,
  event: PluginEvent,
): void {
  const resolution = resolveFileEvent(env, event);
  if (!resolution) return;
  const {
    eventContext,
    scopedSessionEditState,
    scopedFileOperationState,
    scopedPathKindCache,
    scopedScheduler,
    normalizedFilePath,
    lifecycle,
  } = resolution;

  scopedFileOperationState.recordLifecycle(
    filePathOf(resolution),
    resolution.lifecycle,
    Date.now(),
  );
  scopedFileOperationState.normalizePath(filePathOf(resolution));

  const pathAnalysis = analyzePath(
    normalizedFilePath,
    eventContext.worktreeRoot,
  );

  if (lifecycle === "deleted") {
    handleDeletedFile(env, {
      eventContext,
      scopedSessionEditState,
      scopedPathKindCache,
      scopedScheduler,
      normalizedFilePath,
      pathKind: pathAnalysis.kind,
    });
    return;
  }

  scopedSessionEditState.recordEventHint(
    normalizedFilePath,
    pathAnalysis.kind,
    Date.now(),
  );
  scopedSessionEditState.reconcilePath(normalizedFilePath);
  scopedPathKindCache.set(normalizedFilePath, pathAnalysis.kind);
  const sessionEdits = scopedSessionEditState.getSessionEdits();
  const focusEdit = scopedSessionEditState.getFocusEdit();

  if (
    env.cfg.sync.enabled &&
    scopedScheduler &&
    env.fileFilter.shouldHandleFile(
      normalizedFilePath,
      eventContext.worktreeRoot,
    )
  ) {
    scopedScheduler.scheduleSync(
      lifecycle === "created" ? "file.created" : "file.edited",
      normalizedFilePath,
    );
  }

  const fileContent = env.readFileContent(
    normalizedFilePath,
    eventContext.worktreeRoot,
  );

  const hasMustPriority =
    pathAnalysis.kind === "requirement"
      ? isMustPriorityRequirement(normalizedFilePath, eventContext.worktreeRoot)
      : false;

  let precomputedSuggestion: CommentAnalysisResult | null = null;
  if (
    pathAnalysis.kind === "code" &&
    env.cfg.guidance.commentDetection.enabled
  ) {
    precomputedSuggestion = analyzeCodeFile(
      env.resolveWorktreePath(normalizedFilePath, eventContext.worktreeRoot),
      {
        minLines: env.cfg.guidance.commentDetection.minLines,
      },
    );
  }

  const { riskClass } = classifyRisk({
    pathKind: pathAnalysis.kind,
    isUnderKb: pathAnalysis.isUnderKb,
    hasMustPriority,
    hasDurableComment: !!precomputedSuggestion,
    fileContent,
  });

  const effectiveRiskClass: RiskClass =
    riskClass === "safe_docs_only" && precomputedSuggestion
      ? "traceability_candidate"
      : riskClass;
  env.state.lastRiskClass = effectiveRiskClass;
  env.state.lastRiskFilePath = normalizedFilePath;
  env.state.lastRiskScopeKey = env.buildRiskPathScopeKey(
    eventContext,
    normalizedFilePath,
  );

  env.log.info("smart-enforcement.risk", {
    event: "smart_enforcement_risk",
    file: normalizedFilePath,
    path_kind: pathAnalysis.kind,
    risk_class: effectiveRiskClass,
    posture_state: eventContext.posture,
    maintenance_state: env.getMaintenanceDegraded()
      ? "maintenance_degraded"
      : "maintenance_available",
    under_kb: pathAnalysis.isUnderKb,
    has_must_priority: hasMustPriority,
    posture: eventContext.posture,
    reason_code: effectiveRiskClass,
    effective_mode: env.getEffectiveMode(),
    static_degraded: env.posture.maintenanceDegraded,
    runtime_degraded: env.runtimeOverlay.degraded,
    merged_degraded: env.getMaintenanceDegraded(),
    overlay_cause: env.runtimeOverlay.primaryCause ?? null,
  });

  const targetedChecksBlocked =
    env.getMaintenanceDegraded() ||
    env.runtimeOverlay.primaryCause === "sync_disabled" ||
    env.runtimeOverlay.primaryCause === "scheduler_unavailable" ||
    env.runtimeOverlay.primaryCause === "scheduler_sync_failed" ||
    env.runtimeOverlay.primaryCause === "scheduler_check_failed";

  scheduleTargetedChecksForRisk(env, {
    eventContext,
    scopedScheduler,
    normalizedFilePath,
    pathKind: pathAnalysis.kind,
    effectiveRiskClass,
    targetedChecksBlocked,
  });

  env.updateRecentEditsFromSession(sessionEdits, scopedPathKindCache);

  if (
    effectiveRiskClass === "safe_docs_only" ||
    effectiveRiskClass === "safe_test_only"
  ) {
    env.state.recentCommentSuggestion = null;
    return;
  }

  const cacheKey = env.buildScopedCacheKey(
    eventContext,
    effectiveRiskClass,
    fileBucketOf(pathAnalysis.kind),
    [normalizedFilePath, pathAnalysis.kind, effectiveRiskClass],
  );

  // Always process manual_kb_edit before cache check — critical safety signal
  if (effectiveRiskClass === "manual_kb_edit") {
    handleManualKbEdit(env, normalizedFilePath);
    return;
  }

  // Always emit requirement lint warnings before cache check — safety signals
  if (effectiveRiskClass === "req_policy_candidate") {
    const lintWarnings = env.lintRequirementDoc(
      normalizedFilePath,
      eventContext.worktreeRoot,
    );
    for (const warning of lintWarnings) {
      env.recordWarning(warning.category, normalizedFilePath, warning.message);
    }
  }

  if (env.cache.isSatisfied(cacheKey)) {
    env.log.info("smart-enforcement.cache", {
      event: "smart_enforcement_cache",
      cache_hit: true,
      cache_state: "hit",
      file: normalizedFilePath,
      risk_class: effectiveRiskClass,
      posture: eventContext.posture,
      posture_state: eventContext.posture,
    });
    return;
  }

  env.log.info("smart-enforcement.cache", {
    event: "smart_enforcement_cache",
    cache_hit: false,
    cache_state: "miss",
    file: normalizedFilePath,
    risk_class: effectiveRiskClass,
    posture: eventContext.posture,
    posture_state: eventContext.posture,
  });

  if (effectiveRiskClass === "req_policy_candidate") {
    handleReqPolicyCandidate(env, {
      eventContext,
      scopedScheduler,
      normalizedFilePath,
      hasMustPriority,
    });
    return;
  }

  if (effectiveRiskClass === "kb_doc_structural") {
    warnDegradedFor(
      env,
      "kb_doc_structural",
      normalizedFilePath,
      eventContext.posture,
    );
    return;
  }

  if (
    effectiveRiskClass === "behavior_candidate" ||
    effectiveRiskClass === "traceability_candidate"
  ) {
    emitBehaviorSuggestions(env, {
      eventContext,
      normalizedFilePath,
      pathKind: pathAnalysis.kind,
      commentDetectionEnabled: env.cfg.guidance.commentDetection.enabled,
      precomputedSuggestion,
    });
  }
}

function filePathOf(resolution: FileEventResolution): string {
  return resolution.normalizedFilePath;
}

function fileBucketOf(kind: PathKind): string {
  return kind;
}

function handleDeletedFile(
  env: KibiEventEnv,
  args: {
    eventContext: WorkContext;
    scopedSessionEditState: SessionEditState;
    scopedPathKindCache: Map<string, PathKind>;
    scopedScheduler: SyncScheduler | null;
    normalizedFilePath: string;
    pathKind: PathKind;
  },
): void {
  const {
    eventContext,
    scopedSessionEditState,
    scopedPathKindCache,
    scopedScheduler,
    normalizedFilePath,
    pathKind,
  } = args;
  // Preserve last known semantic risk if path was already tracked during session
  const lastKnownKind = scopedPathKindCache.get(normalizedFilePath);
  if (lastKnownKind) {
    // Path was tracked — preserve last known semantic risk for reminder routing
    scopedPathKindCache.set(normalizedFilePath, pathKind);
  } else {
    // Not tracked — classify only for reminder routing.
    scopedPathKindCache.set(normalizedFilePath, pathKind);
  }
  scopedSessionEditState.recordEventHint(
    normalizedFilePath,
    pathKind,
    Date.now(),
  );
  scopedSessionEditState.reconcilePath(normalizedFilePath);
  const sessionEdits = scopedSessionEditState.getSessionEdits();
  env.updateRecentEditsFromSession(sessionEdits, scopedPathKindCache);
  // Schedule background sync for deleted files that pass shouldHandleFile
  if (
    env.cfg.sync.enabled &&
    scopedScheduler &&
    env.fileFilter.shouldHandleFile(
      normalizedFilePath,
      eventContext.worktreeRoot,
    )
  ) {
    scopedScheduler.scheduleSync("file.deleted", normalizedFilePath);
  }
}

function scheduleTargetedChecksForRisk(
  env: KibiEventEnv,
  args: {
    eventContext: WorkContext;
    scopedScheduler: SyncScheduler | null;
    normalizedFilePath: string;
    pathKind: PathKind;
    effectiveRiskClass: RiskClass;
    targetedChecksBlocked: boolean;
  },
): void {
  const {
    eventContext,
    scopedScheduler,
    normalizedFilePath,
    pathKind,
    effectiveRiskClass,
    targetedChecksBlocked,
  } = args;
  if (
    !targetedChecksBlocked &&
    env.cfg.sync.enabled &&
    scopedScheduler &&
    env.cfg.guidance.targetedChecks.enabled
  ) {
    const traceabilityRules =
      effectiveRiskClass === "traceability_candidate"
        ? ["symbol-traceability"]
        : null;
    const kbStructuralRules =
      effectiveRiskClass === "kb_doc_structural" &&
      env.fileFilter.shouldHandleFile(
        normalizedFilePath,
        eventContext.worktreeRoot,
      )
        ? [
            "required-fields",
            "no-dangling-refs",
            ...(pathKind === "fact" ? ["strict-fact-shape"] : []),
            ...(pathKind === "requirement" ? ["strict-req-fact-pairing"] : []),
          ]
        : null;

    const checkRules = traceabilityRules ?? kbStructuralRules;
    if (checkRules) {
      env.log.info("smart-enforcement.targeted-checks", {
        event: "smart_enforcement_targeted_checks",
        file: normalizedFilePath,
        risk_class: effectiveRiskClass,
        posture: eventContext.posture,
        posture_state: eventContext.posture,
        guidance_action: "targeted_checks",
        effective_mode: env.getEffectiveMode(),
        rules: checkRules,
        static_degraded: env.posture.maintenanceDegraded,
        runtime_degraded: env.runtimeOverlay.degraded,
        merged_degraded: env.getMaintenanceDegraded(),
        overlay_cause: env.runtimeOverlay.primaryCause ?? null,
      });
      env.log.info(`kibi-opencode: scheduling sync for ${normalizedFilePath}`);
      scopedScheduler.scheduleSync(
        effectiveRiskClass === "traceability_candidate"
          ? "smart-enforcement.traceability"
          : "smart-enforcement.kb-doc",
        normalizedFilePath,
        checkRules,
      );
    }
  }
}

function handleManualKbEdit(
  env: KibiEventEnv,
  normalizedFilePath: string,
): void {
  env.state.hasRecentKbEdit = true;
  if (env.cfg.guidance.warnOnKbEdits) {
    env.log.warn(`kibi-opencode: .kb edit detected for ${normalizedFilePath}`);
    env.recordWarning(
      "kb-edit",
      normalizedFilePath,
      `Manual .kb edit: ${normalizedFilePath}`,
    );
  }
}

function lintRequirementPolicy(
  env: KibiEventEnv,
  normalizedFilePath: string,
  worktreeRoot: string,
): void {
  const lintWarnings = env.lintRequirementDoc(normalizedFilePath, worktreeRoot);
  for (const warning of lintWarnings) {
    env.recordWarning(warning.category, normalizedFilePath, warning.message);
  }
}

function warnDegradedFor(
  env: KibiEventEnv,
  riskClass: string,
  normalizedFilePath: string,
  posture: unknown,
): void {
  if (!env.getMaintenanceDegraded()) return;
  const logFn =
    env.cfg.guidance.smartEnforcement.degradedMode === "warn-once"
      ? env.log.warn
      : env.log.info;
  logFn("smart-enforcement.degraded", {
    event: "smart_enforcement_degraded",
    file: normalizedFilePath,
    risk_class: riskClass,
    posture,
    posture_state: posture,
    maintenance_state: env.getMaintenanceDegraded()
      ? "maintenance_degraded"
      : "maintenance_available",
    reason: env.runtimeOverlay.primaryCause ?? "non_authoritative_posture",
    reason_code: env.runtimeOverlay.primaryCause ?? "non_authoritative_posture",
    static_degraded: false,
    runtime_degraded: env.runtimeOverlay.degraded,
    merged_degraded: env.getMaintenanceDegraded(),
    overlay_cause: env.runtimeOverlay.primaryCause ?? null,
    effective_mode: env.getEffectiveMode(),
  });
}

function handleReqPolicyCandidate(
  env: KibiEventEnv,
  args: {
    eventContext: WorkContext;
    scopedScheduler: SyncScheduler | null;
    normalizedFilePath: string;
    hasMustPriority: boolean;
  },
): void {
  const { eventContext, scopedScheduler, normalizedFilePath, hasMustPriority } =
    args;
  warnDegradedFor(env, "req_policy_candidate", normalizedFilePath, {
    posture: eventContext.posture,
  });

  if (
    !env.getMaintenanceDegraded() &&
    env.cfg.sync.enabled &&
    scopedScheduler &&
    env.fileFilter.shouldHandleFile(
      normalizedFilePath,
      eventContext.worktreeRoot,
    )
  ) {
    let checkRules: string[] | undefined;
    if (env.cfg.guidance.targetedChecks.enabled) {
      if (hasMustPriority && env.getEffectiveMode() === "strict") {
        checkRules = [
          "required-fields",
          "no-dangling-refs",
          "must-priority-coverage",
          "strict-req-fact-pairing",
        ];
        env.log.info(
          `kibi-opencode: must-priority requirement detected, scheduling elevated checks for ${normalizedFilePath}`,
        );
      } else {
        checkRules = [
          "required-fields",
          "no-dangling-refs",
          "strict-req-fact-pairing",
        ];
      }
    }
    env.log.info("smart-enforcement.targeted-checks", {
      event: "smart_enforcement_targeted_checks",
      file: normalizedFilePath,
      risk_class: "req_policy_candidate",
      posture: eventContext.posture,
      posture_state: eventContext.posture,
      guidance_action: "targeted_checks",
      effective_mode: env.getEffectiveMode(),
      rules: checkRules ?? [],
      static_degraded: env.posture.maintenanceDegraded,
      runtime_degraded: env.runtimeOverlay.degraded,
      merged_degraded: env.getMaintenanceDegraded(),
      overlay_cause: env.runtimeOverlay.primaryCause ?? null,
    });
    scopedScheduler.scheduleSync("file.edited", normalizedFilePath, checkRules);
  }
}

function emitBehaviorSuggestions(
  env: KibiEventEnv,
  args: {
    eventContext: WorkContext;
    normalizedFilePath: string;
    pathKind: PathKind;
    commentDetectionEnabled: boolean;
    precomputedSuggestion: CommentAnalysisResult | null;
  },
): void {
  const { eventContext, normalizedFilePath, pathKind, precomputedSuggestion } =
    args;
  const inspectingCodeComments =
    pathKind === "code" && env.cfg.guidance.commentDetection.enabled;
  const suggestion = nextRecentCommentSuggestion(
    inspectingCodeComments,
    precomputedSuggestion,
  );
  env.state.recentCommentSuggestion = suggestion;
  if (suggestion) {
    const dedupeKey = `${env.buildRiskPathScopeKey(eventContext, normalizedFilePath)}:${suggestion.suggestionType}:${suggestion.fingerprint}`;
    if (!env.state.seenFingerprints.has(dedupeKey)) {
      env.state.seenFingerprints.add(dedupeKey);

      const warningCategory: string =
        suggestion.suggestionType === "fact"
          ? "long-comment-missed-fact"
          : suggestion.suggestionType === "adr"
            ? "long-comment-missed-adr"
            : "missing-traceability";

      env.log.warn(
        `kibi-opencode: detected durable ${suggestion.suggestionType} knowledge in ${normalizedFilePath}`,
      );
      env.recordWarning(
        warningCategory,
        normalizedFilePath,
        `Consider routing this ${suggestion.suggestionType} knowledge to Kibi instead of inline comments: ${suggestion.reasoning}`,
      );
    }
  }
}

function nextRecentCommentSuggestion<T>(
  inspectingCodeComments: boolean,
  suggestion: T | null | undefined,
): T | null {
  if (inspectingCodeComments && suggestion) return suggestion;
  return null;
}
