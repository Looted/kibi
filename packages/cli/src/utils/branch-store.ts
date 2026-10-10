/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk
*/

import {
  type Dirent,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import * as path from "node:path";
import {
  classifyStoreLockHolder,
  readStoreLockOwner,
} from "../prolog/store-lock.js";
import {
  branchStoreManifestMatches,
  branchStorePath,
  legacyBranchStorePath,
} from "./branch-store-locator.js";
import { ENTITY_LANES, KB_ROOT } from "./kb-paths.js";

/** Stale-reason code of a branch store that was never compiled. */
export const BRANCH_STORE_NOT_COMPILED = "branch_store_not_compiled";
/** The kb_check rule that reports it. */
export const BRANCH_STORE_NOT_COMPILED_RULE = "branch-store-not-compiled";

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
  const journal = readStoreLockOwner(storePath);
  if (journal === null) return null;
  const owner = journal.owner;
  // Same boot-id-aware classification as the janitor and the attach
  // takeover, so all three surfaces reach the same verdict on a journal.
  if (classifyStoreLockHolder(owner) !== "dead") return null;
  return {
    code: "store_lock_stale",
    path: journal.journalPath,
    entityIds: [],
    detail: `Branch store lock journal records holder pid ${owner.pid} for ${owner.workspaceRoot ?? "unknown"}, which is no longer running.`,
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

/** Directories under .kb/ that hold authored, Git-tracked entity sources. */
const AUTHORED_SOURCE_DIRECTORIES: ReadonlyArray<
  readonly [directory: string, extension: string]
> = [
  ...ENTITY_LANES.map((lane) => [lane, ".md"] as const),
  ["adrs", ".md"],
  ["relationships", ".yaml"],
];

function countFiles(directory: string, extension: string): number {
  let count = 0;
  let entries: Dirent[];
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(directory, entry.name), extension);
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      count += 1;
    }
  }
  return count;
}

/**
 * The number of authored source files under `.kb/`: entity Markdown in the
 * entity lanes plus relationship shards. Filesystem only, like
 * inspectBranchStore, so a status read never compiles anything.
 */
// implements REQ-cli-status-pre-first-sync
export function countAuthoredKbSources(workspaceRoot: string): number {
  const kbRoot = path.join(workspaceRoot, KB_ROOT);
  return AUTHORED_SOURCE_DIRECTORIES.reduce(
    (total, [directory, extension]) =>
      total + countFiles(path.join(kbRoot, directory), extension),
    0,
  );
}

export type BranchStoreCompilation = Readonly<{
  /** True once a sync (or any write) has committed into the store. */
  compiled: boolean;
  /** The journal CURRENT pointer (`generation-<id>:<sequence>`), if any. */
  generation: string | null;
}>;

/**
 * Whether the branch store holds a compilation. A missing store holds none;
 * a journaled store whose CURRENT sequence is still 0 and whose journal holds
 * no graph data was created (by `kibi branch ensure` or by an engine
 * attaching to a new branch) but nothing was ever committed into it, so it is
 * empty. A legacy kb.rdf store counts as compiled.
 */
// implements REQ-cli-status-pre-first-sync
export function branchStoreCompilation(
  inspection: BranchStoreInspection,
): BranchStoreCompilation {
  if (inspection.state === "missing") {
    return { compiled: false, generation: null };
  }
  const currentPath = path.join(inspection.path, "CURRENT");
  let current = "";
  try {
    current = existsSync(currentPath)
      ? readFileSync(currentPath, "utf8").trim()
      : "";
  } catch {
    current = "";
  }
  if (current === "") {
    // A healthy store without CURRENT is a legacy kb.rdf store.
    return { compiled: inspection.state === "healthy", generation: null };
  }
  const sequence = Number(current.split(":").at(-1));
  return {
    compiled:
      (Number.isFinite(sequence) && sequence > 0) ||
      journalHoldsGraphData(inspection.path),
    generation: current,
  };
}

/**
 * Whether the journal directory holds persisted graph data. An empty store
 * has only `rdf/lock`; a store migrated from a legacy kb.rdf holds the
 * imported graph under a fresh `generation-…:0` pointer, so it is compiled
 * although its sequence is still 0.
 */
function journalHoldsGraphData(storePath: string): boolean {
  try {
    return readdirSync(path.join(storePath, "rdf")).some(
      (entry) => entry !== "lock" && !entry.startsWith("."),
    );
  } catch {
    return false;
  }
}

/**
 * The single blocking reason for a branch whose store was never compiled
 * while `.kb/` holds authored sources: Kibi stores are per branch and never
 * copied, so a fresh branch (no post-checkout hook) starts empty. Every
 * check against that store would report each authored relationship as
 * missing; the one fix is `kibi sync`.
 */
// implements REQ-cli-status-pre-first-sync
export function uncompiledBranchStoreReason(
  workspaceRoot: string,
  inspection: BranchStoreInspection,
  branch: string,
): Record<string, unknown> | null {
  if (inspection.state !== "healthy" && inspection.state !== "missing") {
    return null;
  }
  const compilation = branchStoreCompilation(inspection);
  if (compilation.compiled) return null;
  const authoredSources = countAuthoredKbSources(workspaceRoot);
  if (authoredSources === 0) return null;
  const storeState =
    inspection.state === "missing"
      ? "does not exist yet"
      : `is empty (${compilation.generation ?? "no generation"}: nothing compiled)`;
  return {
    code: BRANCH_STORE_NOT_COMPILED,
    path: inspection.path,
    entityIds: [],
    detail: `The KB store for branch ${branch} ${storeState}, while .kb/ holds ${authoredSources} authored source file(s). Kibi compiles one store per branch and never copies another branch's, so every query and check reads an empty KB until this branch is compiled.`,
    remediation: { command_argv: ["kibi", "sync"], applyRequired: false },
    blocking: true,
    authoredSources,
    ...(compilation.generation !== null
      ? { generation: compilation.generation }
      : {}),
  };
}
