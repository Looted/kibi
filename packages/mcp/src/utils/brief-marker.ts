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
import fs from "node:fs";
import path from "node:path";
import { resolveWorkspaceRoot } from "../workspace.js";

export interface BriefMarkerRelationship {
  from: string;
  to: string;
  type: string;
}

export interface BriefMarkerPayload {
  sessionId: string;
  timestamp: number;
  branch: string;
  operation: "upsert" | "delete";
  entityIds: string[];
  relationships: BriefMarkerRelationship[];
}

interface WriteBriefPendingMarkerArgs {
  sessionId?: string;
  operation: "upsert" | "delete";
  entityIds: string[];
  relationships?: BriefMarkerRelationship[];
}

// implements REQ-opencode-kibi-briefing-v2
export function writeBriefPendingMarker(
  args: WriteBriefPendingMarkerArgs,
): BriefMarkerPayload {
  const workspaceRoot = resolveWorkspaceRoot();
  const pendingDir = path.join(workspaceRoot, ".kb", "briefs", "pending");
  fs.mkdirSync(pendingDir, { recursive: true });

  const sessionId = normalizeSessionId(args.sessionId);
  const existing = loadExistingMarker(pendingDir, sessionId);
  const timestamp = existing?.payload.timestamp ?? Date.now();

  const payload: BriefMarkerPayload = {
    sessionId,
    timestamp,
    branch: resolveMarkerBranch(workspaceRoot),
    operation: args.operation,
    entityIds: mergeUniqueStrings(existing?.payload.entityIds ?? [], args.entityIds),
    relationships: mergeRelationships(
      existing?.payload.relationships ?? [],
      args.relationships ?? [],
    ),
  };

  const filePath =
    existing?.filePath ??
    path.join(pendingDir, `${sanitizeSessionId(sessionId)}-${timestamp}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

function loadExistingMarker(
  pendingDir: string,
  sessionId: string,
): { filePath: string; payload: BriefMarkerPayload } | null {
  const prefix = `${sanitizeSessionId(sessionId)}-`;
  const matches = fs
    .readdirSync(pendingDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .sort();

  const latest = matches.at(-1);
  if (!latest) {
    return null;
  }

  const filePath = path.join(pendingDir, latest);
  const raw = fs.readFileSync(filePath, "utf8");
  return {
    filePath,
    payload: JSON.parse(raw) as BriefMarkerPayload,
  };
}

function normalizeSessionId(sessionId: string | undefined): string {
  const normalized = sessionId?.trim();
  return normalized && normalized.length > 0 ? normalized : "unknown";
}

function sanitizeSessionId(sessionId: string): string {
  return sessionId.replace(/[\\/:*?"<>|]+/g, "_");
}

function resolveMarkerBranch(workspaceRoot: string): string {
  const envBranch = process.env.KIBI_BRANCH?.trim();
  if (envBranch) {
    return envBranch;
  }

  const branchesDir = path.join(workspaceRoot, ".kb", "branches");
  if (!fs.existsSync(branchesDir)) {
    return "unknown";
  }

  const branches = fs
    .readdirSync(branchesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return branches.length === 1 ? (branches[0] ?? "unknown") : "unknown";
}

function mergeUniqueStrings(existing: string[], incoming: string[]): string[] {
  const merged = new Set<string>();

  for (const value of existing) {
    if (value) {
      merged.add(value);
    }
  }
  for (const value of incoming) {
    if (value) {
      merged.add(value);
    }
  }

  return [...merged];
}

function mergeRelationships(
  existing: BriefMarkerRelationship[],
  incoming: BriefMarkerRelationship[],
): BriefMarkerRelationship[] {
  const merged = new Map<string, BriefMarkerRelationship>();

  for (const relationship of [...existing, ...incoming]) {
    if (!relationship.from || !relationship.to || !relationship.type) {
      continue;
    }
    merged.set(
      `${relationship.type}\u0000${relationship.from}\u0000${relationship.to}`,
      relationship,
    );
  }

  return [...merged.values()];
}
