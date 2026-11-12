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

import { readFileSync } from "node:fs";
import path from "node:path";
import { contextProse } from "../../entity-body-context.js";
import { resolveKbPlPath } from "../../prolog.js";
import { escapeAtom, toPrologAtom } from "../../prolog/codec.js";
import { readAuthoredEntity } from "./entity-context.js";
import type { PrologPort } from "./runtime-types.js";

/** One subject fact in a domain view, with its definition read from disk. */
export type DomainSubjectFact = Readonly<{
  id: string;
  title: string;
  source: string;
  partOf: readonly string[];
  kindOf: readonly string[];
  /** The fact's body prose; "" when the file has none or cannot be read. */
  definition: string;
}>;

export type DomainRequirementLink = Readonly<{
  subjectKey: string;
  link: "constrains" | "grounds" | "anchor";
  factId?: string;
  claimKey?: string;
}>;

export type DomainRequirement = Readonly<{
  id: string;
  title: string;
  status: string;
  via: readonly DomainRequirementLink[];
}>;

/**
 * Everything that governs one subject: its definition, broader and narrower
 * subjects, the current requirements about it or a narrower subject and how
 * they reach it, the claims on it and the scenarios assuming those claims.
 */
export type SubjectDomain = Readonly<{
  subjectKey: string;
  defined: boolean;
  subjectFacts: readonly DomainSubjectFact[];
  broader: readonly string[];
  ancestors: readonly string[];
  narrower: readonly string[];
  distinctFrom: readonly string[];
  requirements: readonly DomainRequirement[];
  claims: readonly Readonly<{
    id: string;
    factKind: string;
    subjectKey: string;
    title: string;
    requirements: readonly string[];
  }>[];
  scenarios: readonly Readonly<{ id: string; title: string }>[];
}>;

function domainModulePath(): string {
  return path.join(path.dirname(resolveKbPlPath()), "domain_subjects.pl");
}

function parseJson(raw: unknown): unknown {
  if (typeof raw !== "string" || raw === "") return null;
  let parsed: unknown = JSON.parse(raw);
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed;
}

/** The body prose of a subject fact's authored file, or "". */
export function readSubjectDefinition(
  workspaceRoot: string,
  source: string,
): string {
  if (!source.endsWith(".md")) return "";
  try {
    const content = readFileSync(path.resolve(workspaceRoot, source), "utf8");
    const entity = readAuthoredEntity(content, source);
    return entity === null ? "" : contextProse("fact", entity.body).trim();
  } catch {
    return "";
  }
}

/** Read the domain view of one subject key from the attached KB. */
export async function readSubjectDomain(
  prolog: Pick<PrologPort, "query">,
  workspaceRoot: string,
  subjectKey: string,
): Promise<SubjectDomain> {
  const modulePath = escapeAtom(domainModulePath());
  // call/1 defers module resolution until use_module has loaded the module.
  const result = await prolog.query(
    `(use_module('${modulePath}'), call(domain_subjects:subject_domain_json(${toPrologAtom(subjectKey)}, Json)))`,
  );
  if (!result.success) {
    throw new Error(
      `Subject domain query failed: ${result.error ?? "unknown error"}`,
    );
  }
  const parsed = parseJson(result.bindings.Json) as Omit<
    SubjectDomain,
    "subjectFacts"
  > & {
    subjectFacts: readonly Omit<DomainSubjectFact, "definition">[];
  };
  return {
    ...parsed,
    subjectFacts: parsed.subjectFacts.map((fact) => ({
      ...fact,
      definition: readSubjectDefinition(workspaceRoot, fact.source),
    })),
  };
}

/** The longest definition text a summary line quotes. */
const MAX_DEFINITION_QUOTE = 200;

/** The subject's definition for a one-line summary, bounded. */
export function definitionQuote(domain: SubjectDomain): string {
  const definition =
    domain.subjectFacts.find((fact) => fact.definition !== "")?.definition ??
    "";
  const flat = definition.replace(/\s+/g, " ").trim();
  return flat.length > MAX_DEFINITION_QUOTE
    ? `${flat.slice(0, MAX_DEFINITION_QUOTE - 1).trimEnd()}…`
    : flat;
}
