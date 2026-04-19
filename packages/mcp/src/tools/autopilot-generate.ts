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
  classifyActivationState,
  discoverSources as discoverActivationSources,
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
    activationReason: string;
    applyBlocked: boolean;
    discoverySummary: Record<string, unknown>;
    candidates: Array<Record<string, unknown>>;
    suppressedCandidates: Array<Record<string, unknown>>;
    payoffSummary: Record<string, unknown>;
  };
}

interface CandidateRecord extends Record<string, unknown> {
  confidence?: number;
  sourcePath?: string;
  applyPlan?: unknown;
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

function activationReasonFor(state: ActivationState): string {
  switch (state) {
    case "vendored_only":
      return "Workspace appears to contain vendored Kibi sources only; no local candidates generated.";
    case "root_partial":
      return "Workspace root is partially configured; discovery completed using available sources.";
    case "root_active_seeded":
      return "KB attached and discovery completed for a seeded workspace.";
    case "root_active_thin":
      return "KB attached and discovery completed for a thin workspace.";
    default:
      return "Workspace root is not fully initialized; discovery completed using the resolved workspace root.";
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
  const activationState = await classifyActivationState(workspaceRoot, prolog);
  const activationDiscovery = discoverActivationSources(workspaceRoot, activationState);
  const discovery = splitDiscoveredSources(
    workspaceRoot,
    activationDiscovery.candidates,
  );

  const allowGeneration =
    activationState === "root_uninitialized" || activationState === "root_partial";

  if (!allowGeneration) {
    return {
      content: [
        {
          type: "text",
          text: "Autopilot generated 0 candidate(s).",
        },
      ],
      structuredContent: {
        activationState,
        activationReason: activationReasonFor(activationState),
        applyBlocked: true,
        discoverySummary: {
          markdownFiles: discovery.markdownFiles.length,
          manifestFiles: discovery.manifestFiles.length,
          vendored: activationDiscovery.summary.vendored ?? [],
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
  const suppressed: CandidateRecord[] = [];
  // Helpers
  function normalizeTitle(entityType: string, title: string) {
    return `${entityType}::${String(title).trim().toLowerCase().replace(/\s+/g, " ")}`;
  }

  for (const c of allCandidates) {
    const record: CandidateRecord = { ...c };
    const entityType = String(c.entityType || "");
    const title = String(c.title || "");
    const sourceKind = String(c.sourceKind || "");
    const sourcePath = String(c.sourcePath || "");
    const textRef = extractTextRefFromApplyPlan(c.applyPlan);

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
      suppressed.push({ reason: "entity_exists", candidate: record });
      continue;
    }

    // duplicate_title: same entityType + normalized title
    const titleKey = normalizeTitle(entityType, title);
    const existing = seenByKey.get(titleKey);
    if (existing) {
      // keep the higher confidence one
      const existingConf = Number(existing.confidence ?? 0);
      const thisConf = Number(c.confidence ?? 0);
      if (thisConf > existingConf) {
        // move existing to suppressed
        suppressed.push({ reason: "duplicate_title", candidate: existing });
        seenByKey.set(titleKey, record);
      } else if (thisConf < existingConf) {
        suppressed.push({ reason: "duplicate_title", candidate: record });
      } else {
        // tie-break by lexicographically smallest sourcePath:textRef
        const existingRef = `${String(existing.sourcePath ?? "")}::${extractTextRefFromApplyPlan(existing.applyPlan)}`;
        const thisRef = `${sourcePath}::${textRef}`;
        if (thisRef < existingRef) {
          suppressed.push({ reason: "duplicate_title", candidate: existing });
          seenByKey.set(titleKey, record);
        } else {
          suppressed.push({ reason: "duplicate_title", candidate: record });
        }
      }
      continue;
    }

    // shadowed_by_typed_source: if this candidate is generic and a typed_markdown exists with same normalized title, prefer typed
    if (sourceKind === "generic_markdown") {
      // search for typed candidate in typedMarkdownCandidates manifestCandidates
      const conflict = [...typedMarkdownCandidates, ...manifestCandidates].find((t) => normalizeTitle(String(t.entityType), String(t.title)) === titleKey);
      if (conflict) {
        // typed candidate wins
        suppressed.push({ reason: "shadowed_by_typed_source", candidate: record });
        continue;
      }
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
      activationReason: activationReasonFor(activationState),
      applyBlocked: false,
      discoverySummary: {
        markdownFiles: discovery.markdownFiles.length,
        manifestFiles: discovery.manifestFiles.length,
        vendored: activationDiscovery.summary.vendored ?? [],
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
