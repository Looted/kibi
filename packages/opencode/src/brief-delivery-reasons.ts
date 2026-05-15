// Inlined from kibi-cli/operational-artifacts to avoid heavy module resolution
function isOperationalArtifactPath(pathLike: string): boolean {
  const normalized = pathLike.replaceAll("\\", "/");
  return /(^|\/)\.sisyphus\//.test(normalized);
}
import type { DeliveryReasons, ReasonItem } from "./idle-brief-store.js";

export type BuildInput = {
  entitiesAdded: string[];
  entitiesModified: string[];
  entitiesRemoved: string[];
  relationshipsChanged: number;
  validationCount: number;
  conflictReasons?: string[];
};

const ORDER: Record<ReasonItem["kind"], number> = {
  conflict_detected: 0,
  validation_issue: 1,
  entity_modified: 2,
  entity_added: 3,
  entity_removed: 4,
  relationship_changed: 5,
};

const TYPE_NAMES: Record<string, string> = {
  REQ: "requirement",
  FACT: "fact",
  TEST: "test",
  SCEN: "scenario",
  SYM: "code traceability",
  ADR: "decision",
  FLAG: "runtime flag",
  EVENT: "event",
};

function prefixName(id: string): string {
  const prefix = id.split("-")[0]?.toUpperCase() ?? id;
  return TYPE_NAMES[prefix] ?? prefix;
}

function mk(kind: ReasonItem["kind"], text: string, entityIds: string[]): ReasonItem {
  return { kind, text, entityIds };
}


function entityItems(kind: "entity_added" | "entity_modified" | "entity_removed", ids: string[]): ReasonItem[] {
  if (!ids.length) return [];
  const verb = kind === "entity_added" ? "Added" : kind === "entity_modified" ? "Updated" : "Removed";
  const grouped = new Map<string, string[]>();
  for (const id of [...ids].sort()) {
    const prefix = id.split("-")[0]?.toUpperCase() ?? id;
    const group = grouped.get(prefix);
    if (group) {
      group.push(id);
    } else {
      grouped.set(prefix, [id]);
    }
  }

  return [...grouped.entries()].map(([, groupedIds]) => {
    const noun = prefixName(groupedIds[0] ?? "");
    const text =
      groupedIds.length === 1
        ? `${verb} ${noun} ${groupedIds[0]}`
        : `${verb} ${groupedIds.length} ${noun}s (${groupedIds.join(", ")})`;
    return mk(kind, text, groupedIds);
  });
}

function toastSummary(items: ReasonItem[]): string {
  const first = items[0]?.text?.trim() ?? "";
  const second = items[1]?.text?.trim() ?? "";
  if (first && second) return `${first}, ${second}`;
  return first || second || "Knowledge updates were recorded in this brief.";
}

function toastWhy(items: ReasonItem[]): string {
  if (items.some((i) => i.kind === "conflict_detected")) return "There is a knowledge conflict to resolve before using the brief.";
  if (items.some((i) => i.kind === "validation_issue")) return "Validation issues need attention before the update is treated as settled.";
  const hasEntities = items.some((i) => i.kind === "entity_added" || i.kind === "entity_modified" || i.kind === "entity_removed");
  const hasRelationships = items.some((i) => i.kind === "relationship_changed");
  if (hasEntities && hasRelationships) return "Requirements and facts were updated.";
  if (hasEntities) return "Entities were updated.";
  if (hasRelationships) return "Relationships were updated.";
  return "Knowledge updates were recorded in this brief.";
}

export function buildDeliveryReasons(input: BuildInput): DeliveryReasons | undefined { // implements REQ-opencode-kibi-briefing-v6
  const items: ReasonItem[] = [];
  if (input.conflictReasons?.length) items.push(mk("conflict_detected", input.conflictReasons[0]?.trim() || "Conflict detected", []));
  if (input.validationCount > 0) items.push(mk("validation_issue", `${input.validationCount} validation issue${input.validationCount === 1 ? "" : "s"} detected`, []));
  items.push(...entityItems("entity_modified", input.entitiesModified));
  items.push(...entityItems("entity_added", input.entitiesAdded));
  items.push(...entityItems("entity_removed", input.entitiesRemoved));
  if (input.relationshipsChanged > 0) items.push(mk("relationship_changed", `Updated ${input.relationshipsChanged} relationships`, []));
  if (!items.length) return undefined;
  items.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  return { version: 1, items, toast: { title: "Kibi Knowledge Update", summary: toastSummary(items), whyItMatters: toastWhy(items) } };
}

function isOperationalItem(item: ReasonItem): boolean {
  if (item.entityIds.length === 0) return false;
  return item.entityIds.every((id) => {
    const dashIdx = id.indexOf("-");
    if (dashIdx < 0) return false;
    const name = id.slice(dashIdx + 1);
    // Entity names with file extensions are likely from operational artifact files
    return /\.[a-zA-Z0-9]+$/.test(name);
  });
}

export function renderToastSummary(reasons: DeliveryReasons): DeliveryReasons["toast"] | undefined { // implements REQ-opencode-kibi-briefing-v6
  const domainItems = reasons.items.filter((i) => !isOperationalItem(i));
  if (domainItems.length === 0) {
    return undefined; // suppress: specific-or-silent policy
  }
  return {
    title: "Kibi Knowledge Update",
    summary: toastSummary(domainItems),
    whyItMatters: toastWhy(domainItems),
  };
}

export function renderFullBriefReasons(reasons: DeliveryReasons): string { // implements REQ-opencode-kibi-briefing-v6
  return ["## What changed", ...reasons.items.map((r) => `- ${r.text}`), "", "## Why it matters", reasons.toast.whyItMatters].join("\n");
}
