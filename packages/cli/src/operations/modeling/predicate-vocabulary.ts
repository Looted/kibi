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

/**
 * Closed argument vocabularies for predicate schemas.
 *
 * A `predicate_schema` may declare, per argument name, the constants that
 * argument accepts (`argument_constants`) and legacy spellings that map onto
 * one of them (`argument_aliases`). Arguments without an entry stay open.
 * Declaring constants is what makes paraphrased claims converge: two facts
 * can only share a ground term when they use the same atoms.
 */

// implements REQ-kibi-predicate-argument-constants
export type PredicateVocabulary = Readonly<{
  constants: Readonly<Record<string, readonly string[]>>;
  aliases: Readonly<Record<string, Readonly<Record<string, string>>>>;
}>;

// implements REQ-kibi-predicate-argument-constants
export type ArgumentRewrite = Readonly<{
  index: number;
  argumentName: string;
  from: string;
  to: string;
}>;

// implements REQ-kibi-predicate-argument-constants
export type UndeclaredArgument = Readonly<{
  index: number;
  argumentName: string;
  value: string;
  allowed: readonly string[];
}>;

// implements REQ-kibi-predicate-argument-constants
export type ArgumentConformance = Readonly<{
  /** Alias spellings with their declared canonical constant. */
  rewrites: readonly ArgumentRewrite[];
  /** Values that are neither a declared constant nor an alias. */
  undeclared: readonly UndeclaredArgument[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * The record's own value for `key`. Argument names are free text, so a name
 * such as `constructor` must not read an Object.prototype member.
 */
function own<T>(
  record: Readonly<Record<string, T>>,
  key: string,
): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** Structured fields arrive as objects from Markdown or as JSON strings from Prolog. */
function structuredField(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

/**
 * Read a schema's vocabulary. Malformed entries are ignored here; use
 * {@link predicateVocabularyErrors} to report them.
 */
// implements REQ-kibi-predicate-argument-constants
export function predicateVocabularyFromEntity(
  entity: Readonly<Record<string, unknown>>,
): PredicateVocabulary {
  const rawConstants = structuredField(entity.argument_constants);
  const rawAliases = structuredField(entity.argument_aliases);
  // Object.fromEntries keeps every name an own key, `__proto__` included.
  const constants = Object.fromEntries(
    Object.entries(isRecord(rawConstants) ? rawConstants : {}).flatMap(
      ([name, values]) => {
        if (!Array.isArray(values)) return [];
        const strings = values.filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        );
        return strings.length > 0 ? [[name, [...new Set(strings)]]] : [];
      },
    ),
  ) as Record<string, string[]>;
  const aliases = Object.fromEntries(
    Object.entries(isRecord(rawAliases) ? rawAliases : {}).flatMap(
      ([name, mapping]) => {
        if (!isRecord(mapping)) return [];
        const entries = Object.entries(mapping).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string" && entry[1].length > 0,
        );
        return entries.length > 0 ? [[name, Object.fromEntries(entries)]] : [];
      },
    ),
  ) as Record<string, Record<string, string>>;
  return { constants, aliases };
}

/**
 * Cross-field errors in a predicate schema's vocabulary: every key must be an
 * argument name, aliases need declared constants for their argument, alias
 * targets must be declared, and an alias may not shadow a constant.
 */
// implements REQ-kibi-predicate-argument-constants
export function predicateVocabularyErrors(
  entity: Readonly<Record<string, unknown>>,
): string[] {
  const errors: string[] = [];
  const rawConstants = structuredField(entity.argument_constants);
  const rawAliases = structuredField(entity.argument_aliases);
  if (rawConstants === undefined && rawAliases === undefined) return errors;
  if (entity.fact_kind !== "predicate_schema") {
    errors.push(
      "argument_constants and argument_aliases are only valid on fact_kind predicate_schema",
    );
    return errors;
  }
  const argumentNames = Array.isArray(entity.argument_names)
    ? entity.argument_names.filter(
        (name): name is string => typeof name === "string",
      )
    : [];
  if (rawConstants !== undefined && !isRecord(rawConstants)) {
    errors.push("argument_constants must map argument names to constant lists");
  }
  if (rawAliases !== undefined && !isRecord(rawAliases)) {
    errors.push(
      "argument_aliases must map argument names to alias-to-constant objects",
    );
  }
  const vocabulary = predicateVocabularyFromEntity(entity);
  if (isRecord(rawConstants)) {
    for (const [name, values] of Object.entries(rawConstants)) {
      if (!argumentNames.includes(name)) {
        errors.push(
          `argument_constants.${name} is not one of argument_names (${argumentNames.join(", ")})`,
        );
      }
      if (
        !Array.isArray(values) ||
        values.length === 0 ||
        values.some((value) => typeof value !== "string" || value === "")
      ) {
        errors.push(
          `argument_constants.${name} must be a non-empty list of non-empty strings`,
        );
      }
    }
  }
  if (isRecord(rawAliases)) {
    for (const [name, mapping] of Object.entries(rawAliases)) {
      if (!argumentNames.includes(name)) {
        errors.push(
          `argument_aliases.${name} is not one of argument_names (${argumentNames.join(", ")})`,
        );
        continue;
      }
      const declared = own(vocabulary.constants, name);
      if (declared === undefined) {
        errors.push(
          `argument_aliases.${name} requires argument_constants.${name} to declare the canonical constants`,
        );
        continue;
      }
      if (!isRecord(mapping)) {
        errors.push(
          `argument_aliases.${name} must map alias spellings to constants`,
        );
        continue;
      }
      for (const [alias, target] of Object.entries(mapping)) {
        // A non-string target is never among the declared string constants.
        if (!(declared as readonly unknown[]).includes(target)) {
          errors.push(
            `argument_aliases.${name}.${alias} must name a declared constant of ${name}`,
          );
        }
        if (declared.includes(alias)) {
          errors.push(
            `argument_aliases.${name}.${alias} shadows a declared constant; remove the alias`,
          );
        }
      }
    }
  }
  return errors;
}

/**
 * Compare predicate arguments with a schema vocabulary. Open arguments always
 * conform; an alias is reported as a rewrite, anything else not declared is
 * reported as undeclared.
 */
// implements REQ-kibi-predicate-argument-constants
export function predicateArgumentConformance(
  argumentNames: readonly string[],
  args: readonly string[],
  vocabulary: PredicateVocabulary,
): ArgumentConformance {
  const rewrites: ArgumentRewrite[] = [];
  const undeclared: UndeclaredArgument[] = [];
  args.forEach((value, index) => {
    const argumentName = argumentNames[index];
    if (argumentName === undefined) return;
    const allowed = own(vocabulary.constants, argumentName);
    if (allowed === undefined || allowed.includes(value)) return;
    const mapping = own(vocabulary.aliases, argumentName);
    // An absent alias (undefined) is never among the declared constants.
    const canonical = (
      mapping === undefined ? undefined : own(mapping, value)
    ) as string;
    if (allowed.includes(canonical)) {
      rewrites.push({ index, argumentName, from: value, to: canonical });
      return;
    }
    undeclared.push({ index, argumentName, value, allowed });
  });
  return { rewrites, undeclared };
}

/** Arguments with every alias replaced by its declared constant. */
// implements REQ-kibi-predicate-argument-constants
export function applyArgumentRewrites(
  args: readonly string[],
  rewrites: readonly ArgumentRewrite[],
): string[] {
  const next = [...args];
  for (const rewrite of rewrites) next[rewrite.index] = rewrite.to;
  return next;
}

/** Canonical key convention shared with predicate apply plans. */
// implements REQ-kibi-predicate-argument-constants
export function predicateCanonicalKey(
  predicateName: string,
  args: readonly string[],
): string {
  return `${predicateName}(${args.join(",")})`;
}
