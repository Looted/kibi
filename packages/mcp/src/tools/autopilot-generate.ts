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
import type { PrologProcess } from "kibi-cli/prolog";
import path from "node:path";
import {
  type Candidate,
  buildTypedMarkdownCandidates,
  buildSymbolManifestCandidates,
} from "./autopilot-candidates.js";
import {
  discoverSources as discoverActivationSources,
  resolveActivationPolicy,
  type ActivationMode,
  type ActivationState,
} from "./autopilot-discovery.js";
import { loadEntities } from "./entity-query.js";
import { resolveWorkspaceRoot } from "../workspace.js";

export interface AutopilotGenerateArgs {
  includeGenericMarkdown?: boolean;
  minConfidence?: number;
  maxCandidates?: number;
  entityTypes?: Array<
    "req" | "scenario" | "test" | "adr" | "fact" | "symbol"
  >;
}

export interface AutopilotGenerateResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    activationState: string;
    activationMode: string;
    activationReason: string;
    applyBlocked: boolean;
    handoffMessage?: string;
    discoverySummary: Record<string, unknown>;
    candidates: Array<Record<string, unknown>>;
    suppressedCandidates: Array<Record<string, unknown>>;
    payoffSummary: Record<string, unknown>;
  };
}

interface CandidateRecord extends Record<string, unknown> {
  candidateId?: string;
  entityType?: string;
  confidence?: number;
  sourcePath?: string;
  sourceKind?: string;
  applyPlan?: unknown;
}

interface SuppressedCandidateRecord extends Record<string, unknown> {
  candidateId: string;
  reason: string;
  sourcePath: string;
  entityType: string;
}

function extractTextRefFromApplyPlan(applyPlan: unknown): string {
  if (!Array.isArray(applyPlan) || applyPlan.length === 0) return "";
  const first = applyPlan[0];
  if (!first || typeof first !== "object") return "";
  const firstRecord = first as Record<string, unknown>;
  const properties = firstRecord.properties;
  if (!properties || typeof properties !== "object") return "";
  const propsRecord = properties as Record<string, unknown>;
  const textRef = propsRecord.text_ref;
  return typeof textRef === "string" ? textRef : "";
}

function toSuppressedCandidate(
  reason: string,
  candidate: CandidateRecord,
): SuppressedCandidateRecord {
  return {
    candidateId: String(candidate.candidateId ?? ""),
    reason,
    sourcePath: String(candidate.sourcePath ?? ""),
    entityType: String(candidate.entityType ?? ""),
  };
}

function blockedActivationMessage(
  activationMode: ActivationMode,
  activationReason: string,
  handoffMessage?: string,
): string {
  switch (activationMode) {
    case "vendored_blocked":
      return `Autopilot bootstrap blocked: ${activationReason}`;
    case "attached_thin_handoff":
    case "attached_seeded_handoff":
      return handoffMessage
        ? `Autopilot handoff: ${handoffMessage}`
        : `Autopilot handoff: ${activationReason}`;
    default:
      return `Autopilot bootstrap blocked: ${activationReason}`;
  }
}

function splitDiscoveredSources(workspaceRoot: string, candidates: string[]) {
  const markdownFiles: string[] = [];
  const manifestFiles: string[] = [];

  for (const relativePath of candidates) {
    const absolutePath = path.resolve(workspaceRoot, relativePath);
    if (/symbols\.ya?ml$/i.test(relativePath)) {
      manifestFiles.push(absolutePath);
      continue;
    }
    if (/\.md$/i.test(relativePath)) {
      markdownFiles.push(absolutePath);
    }
  }

  return { markdownFiles, manifestFiles };
}

export async function handleKbAutopilotGenerate( // implements REQ-mcp-init-kibi-autopilot-v1
  _prolog: PrologProcess,
  args: AutopilotGenerateArgs,
): Promise<AutopilotGenerateResult> {
  const {
    includeGenericMarkdown = true,
    minConfidence = 0.8,
    maxCandidates = 50,
    entityTypes,
  } = args;
  // Minimal discovery + candidate assembly implementation
  const prolog = _prolog;

  // Gather existing entity ids to suppress duplicates
  let existingIds = new Set<string>();
  try {
    const entities = await loadEntities(prolog, {});
    for (const e of entities) {
      const id = String(e.id ?? "");
      if (id) existingIds.add(id);
    }
  } catch (error) {
    // If we can't list entities, proceed with empty set
    existingIds = new Set<string>();
  }

  const workspaceRoot = resolveWorkspaceRoot();
  const activation = await resolveActivationPolicy(workspaceRoot, prolog);
  const activationState = activation.activationState;
  const activationDiscovery = discoverActivationSources(workspaceRoot, activation);
  const discovery = splitDiscoveredSources(
    workspaceRoot,
    activationDiscovery.candidates,
  );

  if (!activation.allowCandidateGeneration) {
    return {
      content: [
        {
          type: "text",
          text: blockedActivationMessage(
            activation.activationMode,
            activation.reason,
            activation.handoffMessage,
          ),
        },
      ],
      structuredContent: {
        activationState,
        activationMode: activation.activationMode,
        activationReason: activation.reason,
        applyBlocked: activation.applyBlocked,
        ...(activation.handoffMessage
          ? { handoffMessage: activation.handoffMessage }
          : {}),
        discoverySummary: {
          markdownFiles: discovery.markdownFiles.length,
          manifestFiles: discovery.manifestFiles.length,
          vendored: activationDiscovery.summary.vendored ?? [],
          activationMode: activationDiscovery.summary.activationMode,
          ...(activationDiscovery.summary.handoffMessage
            ? { handoffMessage: activationDiscovery.summary.handoffMessage }
            : {}),
        },
        candidates: [],
        suppressedCandidates: [],
        payoffSummary: {
          current: {},
          projectedIfAllApplied: {},
          delta: {},
        },
      },
    };
  }

  const typedMarkdownCandidates = buildTypedMarkdownCandidates(discovery, {
    ids: existingIds,
    workspaceRoot,
  });
  const manifestCandidates = buildSymbolManifestCandidates(discovery, {
    ids: existingIds,
    workspaceRoot,
  });
  // Lazy import to avoid circulars if any
  // buildGenericMarkdownCandidates is added in autopilot-candidates
  let genericCandidates: Candidate[] = [];
  if (includeGenericMarkdown) {
    try {
      // Import from same module file
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ac = await import("./autopilot-candidates.js");
      if (typeof ac.buildGenericMarkdownCandidates === "function") {
        genericCandidates = ac.buildGenericMarkdownCandidates(
          discovery,
          {
            ids: existingIds,
            workspaceRoot,
          },
          minConfidence,
        ) as Candidate[];
      }
    } catch (err) {
      // ignore import failures and proceed with typed candidates only
      genericCandidates = [];
    }
  }

  // Merge and filter candidates by requested entityTypes and minConfidence
  let allCandidates = [...typedMarkdownCandidates, ...manifestCandidates, ...genericCandidates];
  if (entityTypes && entityTypes.length > 0) {
    const allowed = new Set(entityTypes as string[]);
    allCandidates = allCandidates.filter((c) => allowed.has(c.entityType));
  }
  allCandidates = allCandidates.filter((c) => c.confidence >= minConfidence);

  // Limit and deterministic sort (confidence desc, sourcePath asc)
  allCandidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (a.sourcePath < b.sourcePath) return -1;
    if (a.sourcePath > b.sourcePath) return 1;
    return 0;
  });
  allCandidates = allCandidates.slice(0, maxCandidates);

  // Dedupe logic
  const seenByKey = new Map<string, CandidateRecord>();
  const suppressed: SuppressedCandidateRecord[] = [];
  // Helpers
  function normalizeTitle(entityType: string, title: string) {
    return `${entityType}::${String(title).trim().toLowerCase().replace(/\s+/g, " ")}`;
  }

  const typedTitleKeys = new Set(
    typedMarkdownCandidates.map((candidate) =>
      normalizeTitle(
        String(candidate.entityType || ""),
        String(candidate.title || ""),
      ),
    ),
  );

  for (const c of allCandidates) {
    const record: CandidateRecord = { ...c };
    const entityType = String(c.entityType || "");
    const title = String(c.title || "");
    const sourceKind = String(c.sourceKind || "");
    const sourcePath = String(c.sourcePath || "");
    const textRef = extractTextRefFromApplyPlan(c.applyPlan);
    const titleKey = normalizeTitle(entityType, title);

    // entity_exists: exact entity ID present in KB
    const upsert = Array.isArray(c.applyPlan) ? c.applyPlan[0] : null;
    let upsertId = "";
    if (upsert && typeof upsert === "object") {
      const upsertRecord = upsert as Record<string, unknown>;
      const directId = upsertRecord.id;
      if (typeof directId === "string" && directId.length > 0) {
        upsertId = directId;
      } else {
        const properties = upsertRecord.properties;
        if (properties && typeof properties === "object") {
          const nestedId = (properties as Record<string, unknown>).id;
          if (typeof nestedId === "string" && nestedId.length > 0) {
            upsertId = nestedId;
          }
        }
      }
    }
    if (existingIds.has(upsertId)) {
      suppressed.push(toSuppressedCandidate("entity_exists", record));
      continue;
    }

    if (sourceKind === "generic_markdown" && typedTitleKeys.has(titleKey)) {
      suppressed.push(toSuppressedCandidate("shadowed_by_typed_source", record));
      continue;
    }

    // duplicate_title: same entityType + normalized title
    const existing = seenByKey.get(titleKey);
    if (existing) {
      // keep the higher confidence one
      const existingConf = Number(existing.confidence ?? 0);
      const thisConf = Number(c.confidence ?? 0);
      if (thisConf > existingConf) {
        // move existing to suppressed
        suppressed.push(toSuppressedCandidate("duplicate_title", existing));
        seenByKey.set(titleKey, record);
      } else if (thisConf < existingConf) {
        suppressed.push(toSuppressedCandidate("duplicate_title", record));
      } else {
        // tie-break by lexicographically smallest sourcePath:textRef
        const existingRef = `${String(existing.sourcePath ?? "")}::${extractTextRefFromApplyPlan(existing.applyPlan)}`;
        const thisRef = `${sourcePath}::${textRef}`;
        if (thisRef < existingRef) {
          suppressed.push(toSuppressedCandidate("duplicate_title", existing));
          seenByKey.set(titleKey, record);
        } else {
          suppressed.push(toSuppressedCandidate("duplicate_title", record));
        }
      }
      continue;
    }

    seenByKey.set(titleKey, record);
  }

  const candidateRecords: CandidateRecord[] = Array.from(seenByKey.values());

  return {
    content: [
      {
        type: "text",
        text: `Autopilot generated ${allCandidates.length} candidate(s).`,
      },
    ],
    structuredContent: {
      activationState,
      activationMode: activation.activationMode,
      activationReason: activation.reason,
      applyBlocked: activation.applyBlocked,
      ...(activation.handoffMessage
        ? { handoffMessage: activation.handoffMessage }
        : {}),
      discoverySummary: {
        markdownFiles: discovery.markdownFiles.length,
        manifestFiles: discovery.manifestFiles.length,
        vendored: activationDiscovery.summary.vendored ?? [],
        activationMode: activationDiscovery.summary.activationMode,
      },
      candidates: candidateRecords,
      suppressedCandidates: suppressed,
      payoffSummary: (() => {
        // current counts by type
        const current: Record<string, number> = {};
        try {
          // compute from existingIds via loadEntities would be expensive; fall back to empty
        } catch (e) {
          // noop
        }
        // projected if all applied
        const projected: Record<string, number> = { ...current };
        for (const r of candidateRecords) {
          const t = String(r.entityType || "unknown");
          projected[t] = (projected[t] || 0) + 1;
        }

        const delta: Record<string, number> = {};
        for (const k of Object.keys(projected)) {
          const projectedValue = projected[k] ?? 0;
          const currentValue = current[k] ?? 0;
          delta[k] = projectedValue - currentValue;
        }
        return { current, projectedIfAllApplied: projected, delta };
      })(),
    },
  };
}
