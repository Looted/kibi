/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk
*/

import { existsSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";
import {
  branchStoreManifestMatches,
  branchStorePath,
  legacyBranchStorePath,
} from "./branch-store-locator.js";

export type BranchStoreState =
  | "healthy"
  | "missing"
  | "incomplete"
  | "unreadable";

export type BranchStoreInspection = Readonly<{
  state: BranchStoreState;
  path: string;
  errorCode?: string;
  detail?: string;
  recoveryRequired: boolean;
}>;

/**
 * Performs only filesystem checks. It deliberately never starts the engine or
 * attaches Prolog, so callers can still explain a broken branch store.
 */
export function inspectBranchStore(
  workspaceRoot: string,
  branch: string,
): BranchStoreInspection {
  const storePath = branchStorePath(workspaceRoot, branch);
  if (!existsSync(storePath)) {
    const legacyPath = legacyBranchStorePath(workspaceRoot, branch);
    if (existsSync(legacyPath)) {
      return {
        state: "incomplete",
        path: legacyPath,
        errorCode: "legacy_branch_store",
        detail:
          "A literal branch-named store exists; preview and apply the explicit migration before writes.",
        recoveryRequired: true,
      };
    }
    return {
      state: "missing",
      path: storePath,
      errorCode: "branch_store_missing",
      detail: "The branch-local KB directory does not exist.",
      recoveryRequired: false,
    };
  }
  try {
    if (!statSync(storePath).isDirectory()) {
      return {
        state: "unreadable",
        path: storePath,
        errorCode: "branch_store_not_directory",
        detail: "The branch-local KB path is not a directory.",
        recoveryRequired: true,
      };
    }
    if (!branchStoreManifestMatches(storePath, branch)) {
      return {
        state: "unreadable",
        path: storePath,
        errorCode: "branch_store_manifest_mismatch",
        detail:
          "The hashed branch store is missing a valid manifest for the exact Git branch.",
        recoveryRequired: true,
      };
    }
    const markerPath = path.join(storePath, "storage.json");
    const rdfPath = path.join(storePath, "rdf");
    const currentPath = path.join(storePath, "CURRENT");
    const legacyPath = path.join(storePath, "kb.rdf");
    if (existsSync(markerPath)) {
      if (!existsSync(rdfPath) || !statSync(rdfPath).isDirectory()) {
        return {
          state: "incomplete",
          path: storePath,
          errorCode: "branch_store_missing_rdf",
          detail: "The journaled store has no rdf generation directory.",
          recoveryRequired: true,
        };
      }
      if (!existsSync(currentPath)) {
        return {
          state: "incomplete",
          path: storePath,
          errorCode: "sync_metadata_missing",
          detail: "The journaled store has no CURRENT generation pointer.",
          recoveryRequired: true,
        };
      }
      const current = readFileSync(currentPath, "utf8").trim();
      if (!/^generation-[^:\s]+:\d+$/.test(current)) {
        return {
          state: "unreadable",
          path: storePath,
          errorCode: "branch_store_invalid_current",
          detail: "The journaled store CURRENT pointer is malformed.",
          recoveryRequired: true,
        };
      }
      return { state: "healthy", path: storePath, recoveryRequired: false };
    }
    if (existsSync(legacyPath)) {
      const legacy = readFileSync(legacyPath, "utf8");
      if (!/<rdf:RDF(?:\s|>)/.test(legacy)) {
        return {
          state: "unreadable",
          path: storePath,
          errorCode: "branch_store_invalid_legacy_rdf",
          detail: "The legacy kb.rdf file is not RDF/XML.",
          recoveryRequired: true,
        };
      }
      return { state: "healthy", path: storePath, recoveryRequired: false };
    }
    return {
      state: "missing",
      path: storePath,
      errorCode: "sync_metadata_missing",
      detail: "The branch KB has neither journal metadata nor legacy RDF.",
      recoveryRequired: false,
    };
  } catch (error) {
    return {
      state: "unreadable",
      path: storePath,
      errorCode: "branch_store_unreadable",
      detail: error instanceof Error ? error.message : String(error),
      recoveryRequired: true,
    };
  }
}

/**
 * Surface a stale branch-store lock journal: the recorded holder is
 * provably dead (crashed engine, killed prove run). The next attach will
 * auto-heal; the reason exists so operators see the state before it bites.
 */
// implements REQ-core-journaled-engine-persistence
export function storeLockJournalReason(
  storePath: string,
): Record<string, unknown> | null {
  const journalPath = path.join(storePath, ".kibi-lock-owner.json");
  if (!existsSync(journalPath)) return null;
  let owner: {
    pid?: unknown;
    workspaceRoot?: unknown;
    bootId?: unknown;
  };
  try {
    owner = JSON.parse(readFileSync(journalPath, "utf8"));
  } catch {
    return null;
  }
  if (owner === null || typeof owner !== "object") return null;
  const pid = typeof owner.pid === "number" ? owner.pid : undefined;
  if (pid === undefined) return null;
  let alive: boolean;
  try {
    process.kill(pid, 0);
    alive = true;
  } catch (error) {
    alive = (error as NodeJS.ErrnoException | null)?.code === "EPERM";
  }
  if (alive) return null;
  const workspaceRoot =
    typeof owner.workspaceRoot === "string" ? owner.workspaceRoot : "unknown";
  return {
    code: "store_lock_stale",
    path: journalPath,
    entityIds: [],
    detail: `Branch store lock journal records holder pid ${pid} for ${workspaceRoot}, which is no longer running.`,
    remediation: {
      command_argv: ["kibi", "engine", "janitor", "--apply"],
      applyRequired: false,
    },
  };
}

export function branchStoreReason(
  inspection: BranchStoreInspection,
): Record<string, unknown> | null {
  if (inspection.state === "healthy") return null;
  return {
    code: inspection.errorCode ?? `branch_store_${inspection.state}`,
    path: inspection.path,
    entityIds: [],
    detail: inspection.detail ?? "Branch store requires attention.",
    remediation: inspection.recoveryRequired
      ? { command_argv: ["kibi", "branch", "recover"], applyRequired: true }
      : { command_argv: ["kibi", "branch", "ensure"], applyRequired: false },
  };
}
