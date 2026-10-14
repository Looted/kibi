import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { effectiveFirmness } from "../../decision-firmness.js";
import {
  type ExtractedEntity,
  extractFromMarkdown,
} from "../../extractors/markdown.js";
import type { KibiImpactDiagnostic } from "../../traceability/staged-diagnostics.js";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";

/**
 * Kibi's checks compare structure (links, coverage, facts), never code with a
 * requirement's prose. A change to code that implements a requirement can
 * contradict it and still pass every rule, so the check says which
 * requirements the changed code implements and quotes what each one says,
 * instead of letting "no violations" read as "the change keeps them".
 */

const MAX_STATEMENT = 400;
const MAX_NAMED_SYMBOLS = 4;
const RETIRED_STATUS =
  /supersed|deprecat|reject|obsolete|retired|archived|removed|closed/i;

// implements REQ-kb-check-unverified-requirement-statements
export type RequirementStatementDiagnosticsOptions = {
  readonly workspaceRoot: string;
  readonly symbolsByFile: ReadonlyMap<string, readonly ExtractedSymbol[]>;
  /** The requirement entity for an id, or undefined when it is unknown. */
  readonly readRequirement: (id: string) => ExtractedEntity | undefined;
  /** Whether the requirement's document changed in this change. */
  readonly requirementChanged: (requirement: ExtractedEntity) => boolean;
};

function implementedRequirementIds(symbol: ExtractedSymbol): string[] {
  return [
    ...(symbol.relationships ?? [])
      .filter((relationship) => relationship.type === "implements")
      .map((relationship) => relationship.to),
    ...symbol.reqLinks,
  ].filter((id) => id.startsWith("REQ-"));
}

function truncate(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

// implements REQ-kb-check-unverified-requirement-statements
/**
 * One `requirement_statement_unverified` warning per current requirement that
 * a changed behavioral symbol implements, quoting the requirement's statement
 * and firmness. A requirement whose own document changed in the same change
 * is left to the firmness and supersede checks.
 */
export function createRequirementStatementDiagnostics(
  options: RequirementStatementDiagnosticsOptions,
): KibiImpactDiagnostic[] {
  const symbolsByRequirement = new Map<
    string,
    { names: Set<string>; files: Set<string> }
  >();
  for (const symbols of options.symbolsByFile.values()) {
    for (const symbol of symbols) {
      if (symbol.role !== "behavioral" || symbol.hunkRanges.length === 0)
        continue;
      for (const id of implementedRequirementIds(symbol)) {
        const entry = symbolsByRequirement.get(id) ?? {
          names: new Set<string>(),
          files: new Set<string>(),
        };
        entry.names.add(symbol.name);
        entry.files.add(symbol.location.file);
        symbolsByRequirement.set(id, entry);
      }
    }
  }

  const diagnostics: KibiImpactDiagnostic[] = [];
  for (const id of [...symbolsByRequirement.keys()].sort()) {
    const requirement = options.readRequirement(id);
    if (requirement === undefined || requirement.type !== "req") continue;
    if (RETIRED_STATUS.test(requirement.status ?? "")) continue;
    if (options.requirementChanged(requirement)) continue;
    const entry = symbolsByRequirement.get(id);
    if (entry === undefined) continue;
    const firmness = effectiveFirmness(
      "req",
      requirement.firmness,
      requirement.origin,
    );
    const label =
      firmness === "firm"
        ? "firm: ask before changing"
        : (firmness ?? "default");
    const statement = truncate(
      requirement.semantic_text ?? requirement.title,
      MAX_STATEMENT,
    );
    const sorted = [...entry.names].sort();
    const names =
      sorted.length > MAX_NAMED_SYMBOLS
        ? `${sorted.slice(0, MAX_NAMED_SYMBOLS).join(", ")} and ${sorted.length - MAX_NAMED_SYMBOLS} more`
        : sorted.join(", ");
    const verb = sorted.length === 1 ? "implements" : "implement";
    diagnostics.push({
      id: "requirement_statement_unverified",
      severity: "warning",
      blocking: false,
      category: "requirement",
      entityId: id,
      files: [...entry.files].sort(),
      docs: ["docs/symbol-traceability-taxonomy.md"],
      message: `The change edits ${names}, which ${verb} ${id} [${label}]: "${statement}" Kibi compared links and facts, not the code with this statement, so no violation here does not mean the change keeps it.`,
      suggestion:
        firmness === "firm"
          ? `Confirm the changed code still does what ${id} says. If it no longer does, the request conflicts with a rule a person set: stop and ask whether to change ${id}; change it only with their words in origin.ref, and say in the final answer which rule changed.`
          : `Confirm the changed code still does what ${id} says. If it no longer does, the request conflicts with a recorded rule: ask whether to change ${id} before keeping the change, then supersede or update it in the same change with the person's words, and say in the final answer which rule changed.`,
      evidence: {
        requirement: id,
        firmness: firmness ?? "default",
        statement,
        symbols: sorted,
      },
    });
  }
  return diagnostics;
}

// implements REQ-kb-check-unverified-requirement-statements
/**
 * Whether Git reports any change (staged, unstaged or untracked) to a
 * workspace file against HEAD. Outside a repository nothing counts as changed.
 */
export function workspaceFileChanged(
  workspaceRoot: string,
  relativePath: string,
): boolean {
  try {
    const output = execFileSync(
      "git",
      ["status", "--porcelain", "--", relativePath],
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return output.trim() !== "";
  } catch {
    return false;
  }
}

// implements REQ-kb-check-unverified-requirement-statements
/**
 * Read a requirement from its canonical document in the working tree
 * (`.kb/requirements/<id>.md`).
 */
export function readWorkspaceRequirement(
  workspaceRoot: string,
  id: string,
): ExtractedEntity | undefined {
  if (!/^REQ-[A-Za-z0-9._-]+$/.test(id)) return undefined;
  try {
    return extractFromMarkdown(
      path.join(workspaceRoot, ".kb", "requirements", `${id}.md`),
    ).entity;
  } catch {
    return undefined;
  }
}
