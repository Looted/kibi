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

import * as fs from "node:fs";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  posix,
  relative,
} from "node:path";
import ignore from "ignore";
import type {
  CheckPolicyMarkerRule,
  CheckPolicyOwnershipRule,
} from "kibi-plugin-sdk";

import {
  type ActiveCheckPolicy,
  type CheckPolicyLoadError,
  readActiveCheckPolicies,
} from "../../plugins/check-policies.js";
import { parseListOfLists, parsePrologValue } from "../../prolog/codec.js";
import type { Violation } from "../../utils/rule-registry.js";
import { loadEntitiesPaged } from "./discovery-entities.js";
import type { PrologPort } from "./runtime-types.js";

/** Symbols in a policy's file set must implement a qualifying requirement. */
// implements REQ-capability-check-policy
export const POLICY_OWNERSHIP_RULE = "policy-ownership";
/** Files implementing a pattern must keep the pattern's declared markers. */
// implements REQ-capability-check-policy
export const POLICY_MARKERS_RULE = "policy-markers";

const POLICY_RULES = [POLICY_OWNERSHIP_RULE, POLICY_MARKERS_RULE] as const;

// implements REQ-capability-check-policy
export type PolicySymbol = Readonly<{
  id: string;
  title: string;
  sourceFile: string;
  tags: readonly string[];
}>;

// implements REQ-capability-check-policy
export type PolicyPredicateFact = Readonly<{
  id: string;
  name: string;
  args: readonly string[];
  polarity: string;
}>;

// implements REQ-capability-check-policy
export type CheckPolicyEvaluationInput = Readonly<{
  policies: readonly ActiveCheckPolicy[];
  loadErrors: readonly CheckPolicyLoadError[];
  /** Production symbols (no `executable_for`) that carry a sourceFile. */
  symbols: readonly PolicySymbol[];
  /** `[symbol, requirement]` implements edges. */
  implementsEdges: readonly (readonly [string, string])[];
  currentRequirements: ReadonlySet<string>;
  /** `[requirement, fact]` requires_predicate edges. */
  requiresPredicateEdges: readonly (readonly [string, string])[];
  predicateFacts: readonly PolicyPredicateFact[];
  /** Workspace-relative file contents, or undefined when unreadable. */
  readFile: (path: string) => string | undefined;
}>;

function toPosix(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

/** True for a workspace-relative path that stays inside the workspace. */
function insideWorkspace(path: string): boolean {
  return (
    path !== "" &&
    !path.startsWith("/") &&
    !/^[A-Za-z]:\//.test(path) &&
    path !== ".." &&
    !path.startsWith("../")
  );
}

/**
 * Workspace-relative POSIX path of a symbol sourceFile, or undefined when it
 * points outside the workspace. Policies only govern workspace files.
 */
// implements REQ-capability-check-policy
export function workspaceSourcePath(
  workspaceRoot: string,
  sourceFile: string,
): string | undefined {
  const path = posix.normalize(
    toPosix(
      isAbsolute(sourceFile) ? relative(workspaceRoot, sourceFile) : sourceFile,
    ),
  );
  return insideWorkspace(path) ? path : undefined;
}

function matcher(patterns: readonly string[]): (path: string) => boolean {
  const matcher = ignore().add([...patterns]);
  return (path) => {
    const relative = toPosix(path);
    // ignore() throws on absolute and ../ paths; neither is in a policy's scope.
    return insideWorkspace(relative) && matcher.ignores(relative);
  };
}

function groupBy<T>(
  pairs: readonly (readonly [string, T])[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const [key, value] of pairs) {
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  return grouped;
}

/** Asserted predicate names each current requirement is grounded in. */
function requirementPredicates(
  input: CheckPolicyEvaluationInput,
): Map<string, PolicyPredicateFact[]> {
  const facts = new Map(input.predicateFacts.map((fact) => [fact.id, fact]));
  const grounded = new Map<string, PolicyPredicateFact[]>();
  for (const [req, factId] of input.requiresPredicateEdges) {
    const fact = facts.get(factId);
    if (!input.currentRequirements.has(req) || fact === undefined) continue;
    if (fact.polarity !== "assert") continue;
    grounded.set(req, [...(grounded.get(req) ?? []), fact]);
  }
  return grounded;
}

function ownershipViolations(
  policy: ActiveCheckPolicy,
  rule: CheckPolicyOwnershipRule,
  input: CheckPolicyEvaluationInput,
  grounded: Map<string, PolicyPredicateFact[]>,
  owners: Map<string, string[]>,
): Violation[] {
  const included = matcher(rule.include);
  const excluded = matcher(rule.exclude ?? []);
  const title =
    rule.symbolTitlePattern !== undefined
      ? new RegExp(rule.symbolTitlePattern)
      : undefined;
  const qualifying = new Set(rule.requirePredicates);
  const violations: Violation[] = [];
  for (const symbol of input.symbols) {
    if (!included(symbol.sourceFile) || excluded(symbol.sourceFile)) continue;
    if (title !== undefined && !title.test(symbol.title)) continue;
    if (rule.exemptTag !== undefined && symbol.tags.includes(rule.exemptTag))
      continue;
    const requirements = owners.get(symbol.id) ?? [];
    const owned = requirements.some((req) =>
      (grounded.get(req) ?? []).some((fact) => qualifying.has(fact.name)),
    );
    if (owned) continue;
    violations.push({
      rule: POLICY_OWNERSHIP_RULE,
      entityId: symbol.id,
      description: `${symbol.id} (${symbol.sourceFile}) is in scope of ${policy.packageName} rule '${rule.id}' but implements no current requirement grounded in ${rule.requirePredicates.join(", ")}`,
      suggestion: `${rule.description}. Link the symbol with implements to a requirement that carries one of these predicates via requires_predicate, or create that requirement first${rule.exemptTag !== undefined ? `; tag the symbol '${rule.exemptTag}' only when it is intentionally unconstrained` : ""}.`,
      source: symbol.sourceFile,
      evidence: {
        policy: policy.document.id,
        package: policy.packageName,
        policyRule: rule.id,
        requirePredicates: [...rule.requirePredicates],
        implements: requirements,
      },
    });
  }
  return violations;
}

/** Marker text as declared, plus its kebab-case spelling for snake_case atoms. */
function markerSpellings(marker: string): string[] {
  return [...new Set([marker, marker.replaceAll("_", "-")])];
}

function searchedFiles(
  sourceFile: string,
  rule: CheckPolicyMarkerRule,
): string[] {
  const source = toPosix(sourceFile);
  const directory = dirname(source);
  const stem = basename(source, extname(source));
  const siblings = (rule.siblingExtensions ?? []).map((extension) =>
    toPosix(join(directory, `${stem}${extension}`)),
  );
  return [source, ...siblings.filter((path) => path !== source)];
}

function markerViolations(
  policy: ActiveCheckPolicy,
  rule: CheckPolicyMarkerRule,
  input: CheckPolicyEvaluationInput,
  grounded: Map<string, PolicyPredicateFact[]>,
  owners: Map<string, string[]>,
): Violation[] {
  const markersByPattern = new Map<string, string[]>();
  for (const fact of input.predicateFacts) {
    if (fact.name !== rule.markerPredicate || fact.polarity !== "assert")
      continue;
    const pattern = fact.args[rule.markerPatternArgument];
    const marker = fact.args[rule.markerArgument];
    if (pattern === undefined || marker === undefined) continue;
    markersByPattern.set(pattern, [
      ...(markersByPattern.get(pattern) ?? []),
      marker,
    ]);
  }
  const violations: Violation[] = [];
  // Several symbols in one file (component, props, helpers) share its markers;
  // report each missing marker once per file and requirement.
  const reported = new Set<string>();
  for (const symbol of input.symbols) {
    for (const req of owners.get(symbol.id) ?? []) {
      for (const fact of grounded.get(req) ?? []) {
        if (fact.name !== rule.patternPredicate) continue;
        const pattern = fact.args[rule.patternArgument];
        if (pattern === undefined) continue;
        const files = searchedFiles(symbol.sourceFile, rule);
        const contents = files
          .map((path) => input.readFile(path))
          .filter((content): content is string => content !== undefined);
        for (const marker of [
          ...new Set(markersByPattern.get(pattern) ?? []),
        ]) {
          const present = markerSpellings(marker).some((spelling) =>
            contents.some((content) => content.includes(spelling)),
          );
          const key = JSON.stringify([files[0], req, marker]);
          if (present || reported.has(key)) continue;
          reported.add(key);
          violations.push({
            rule: POLICY_MARKERS_RULE,
            entityId: symbol.id,
            description: `${symbol.id} implements ${req}, which uses pattern '${pattern}', but none of ${files.join(", ")} contains its marker '${marker}'`,
            suggestion: `${rule.description}. Restore the pattern in the implementation, or if the design changed on purpose, supersede ${req} with a requirement naming the new pattern.`,
            source: symbol.sourceFile,
            evidence: {
              policy: policy.document.id,
              package: policy.packageName,
              policyRule: rule.id,
              requirement: req,
              pattern,
              marker,
              searchedFiles: files,
            },
          });
        }
      }
    }
  }
  return violations;
}

function loadErrorViolations(
  errors: readonly CheckPolicyLoadError[],
  rules: ReadonlySet<string>,
): Violation[] {
  const rule = POLICY_RULES.find((name) => rules.has(name));
  if (rule === undefined) return [];
  return errors.map((error) => ({
    rule,
    entityId: error.packageName,
    description: `Check policy from '${error.packageName}' could not be read: ${error.message}`,
    suggestion:
      "Install the activated plugin package in this workspace, or remove its kibi.check-policy.v1 entry from package.json#kibi.plugins. Kibi does not skip an activated policy it cannot read.",
    evidence: { package: error.packageName },
  }));
}

/**
 * Evaluate active check policies against the KB. Pure: all KB data and file
 * reads come in through `input`.
 */
// implements REQ-capability-check-policy
export function evaluateCheckPolicies(
  input: CheckPolicyEvaluationInput,
  rules: ReadonlySet<string>,
): Violation[] {
  const grounded = requirementPredicates(input);
  const owners = groupBy(
    input.implementsEdges.filter(([, req]) =>
      input.currentRequirements.has(req),
    ),
  );
  const violations = loadErrorViolations(input.loadErrors, rules);
  for (const policy of input.policies) {
    if (rules.has(POLICY_OWNERSHIP_RULE)) {
      for (const rule of policy.document.ownership ?? []) {
        violations.push(
          ...ownershipViolations(policy, rule, input, grounded, owners),
        );
      }
    }
    if (rules.has(POLICY_MARKERS_RULE)) {
      for (const rule of policy.document.markers ?? []) {
        violations.push(
          ...markerViolations(policy, rule, input, grounded, owners),
        );
      }
    }
  }
  return violations;
}

async function rows(
  prolog: Pick<PrologPort, "query">,
  goal: string,
  what: string,
): Promise<string[][]> {
  const result = await prolog.query(goal);
  if (!result.success) {
    throw new Error(
      `Unable to read ${what} for check policies: ${result.error ?? "query failed"}`,
    );
  }
  return parseListOfLists(result.bindings.Rows ?? "[]");
}

function atom(value: string | undefined): string {
  return String(parsePrologValue(value ?? ""));
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value !== "") return [value];
  return [];
}

function fileReader(
  workspaceRoot: string,
): (path: string) => string | undefined {
  const cache = new Map<string, string | undefined>();
  return (path) => {
    if (!insideWorkspace(toPosix(path))) return undefined;
    if (!cache.has(path)) {
      try {
        cache.set(path, fs.readFileSync(join(workspaceRoot, path), "utf8"));
      } catch {
        cache.set(path, undefined);
      }
    }
    return cache.get(path);
  };
}

/**
 * Collect policy findings for the selected rules. With no activated check
 * policy this returns at once, so projects without one pay nothing.
 */
// implements REQ-capability-check-policy
export async function collectCheckPolicyViolations(
  prolog: Pick<PrologPort, "query">,
  rules: ReadonlySet<string>,
  workspaceRoot: string,
): Promise<Violation[]> {
  if (!POLICY_RULES.some((rule) => rules.has(rule))) return [];
  const { policies, errors } = readActiveCheckPolicies(workspaceRoot);
  if (policies.length === 0) {
    return loadErrorViolations(errors, rules);
  }
  // One Prolog port serves queries in order; read sequentially.
  const symbolEntities = await loadEntitiesPaged(prolog, "symbol", 200);
  const testSymbols = new Set(
    (
      await rows(
        prolog,
        "findall([S], kb:executable_test_symbol(S), Rows0), sort(Rows0, Rows)",
        "executable test symbols",
      )
    ).map(([id]) => atom(id)),
  );
  const implementsEdges = (
    await rows(
      prolog,
      "findall([S,R], kb_relationship(implements, S, R), Rows)",
      "implements relationships",
    )
  ).map(([from, to]) => [atom(from), atom(to)] as const);
  const requiresPredicateEdges = (
    await rows(
      prolog,
      "findall([R,F], kb_relationship(requires_predicate, R, F), Rows)",
      "requires_predicate relationships",
    )
  ).map(([from, to]) => [atom(from), atom(to)] as const);
  const currentRequirements = new Set(
    (
      await rows(
        prolog,
        "findall([R], kb:current_req(R), Rows)",
        "current requirements",
      )
    ).map(([id]) => atom(id)),
  );
  const predicateFacts = (
    await rows(
      prolog,
      "findall([F,Name,Args,Polarity], kb:predicate_fact(F, _, Name, Args, Polarity), Rows)",
      "predicate facts",
    )
  ).map(([id, name, args, polarity]) => ({
    id: atom(id),
    name: atom(name),
    args: stringList(parsePrologValue(args ?? "[]")),
    polarity: atom(polarity),
  }));

  const symbols: PolicySymbol[] = symbolEntities.flatMap((entity) => {
    const id = String(entity.id ?? "");
    const sourceFile =
      typeof entity.sourceFile === "string"
        ? workspaceSourcePath(workspaceRoot, entity.sourceFile)
        : undefined;
    if (id === "" || testSymbols.has(id) || sourceFile === undefined) return [];
    return [
      {
        id,
        title: String(entity.title ?? id),
        sourceFile,
        tags: stringList(entity.tags),
      },
    ];
  });

  return evaluateCheckPolicies(
    {
      policies,
      loadErrors: errors,
      symbols,
      implementsEdges,
      currentRequirements,
      requiresPredicateEdges,
      predicateFacts,
      readFile: fileReader(workspaceRoot),
    },
    rules,
  );
}
