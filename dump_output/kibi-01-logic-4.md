# Pack: kibi-01-logic (Part 4)


This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
packages/
  mcp/
    src/
      tools/
        derive.ts
        impact.ts
        list-types.ts
        prolog-list.ts
        query-relationships.ts
        query.ts
        symbols.ts
        upsert.ts
      types/
        js-yaml.d.ts
      workspace.ts
    tsconfig.json
  vscode/
    .vscodeignore
    icon.png
    icon.svg
    README.md
```

# Files

## File: packages/mcp/src/tools/derive.ts
````typescript
import type { PrologProcess } from "@kibi/cli/src/prolog.js";
import { parseAtomList, parsePairList } from "./prolog-list.js";

export type DeriveRule =
  | "transitively_implements"
  | "transitively_depends"
  | "impacted_by_change"
  | "affected_symbols"
  | "coverage_gap"
  | "untested_symbols"
  | "stale"
  | "orphaned"
  | "conflicting"
  | "deprecated_still_used"
  | "current_adr"
  | "adr_chain"
  | "superseded_by"
  | "domain_contradictions";

export interface DeriveArgs {
  rule: DeriveRule;
  params?: Record<string, unknown>;
}

type DeriveRow = Record<string, unknown>;

export interface DeriveResult {
  content: Array<{ type: string; text: string }>;
  structuredContent: {
    rule: DeriveRule;
    params: Record<string, unknown>;
    count: number;
    rows: DeriveRow[];
    provenance: {
      predicate: string;
      deterministic: true;
    };
  };
}

const RULES: DeriveRule[] = [
  "transitively_implements",
  "transitively_depends",
  "impacted_by_change",
  "affected_symbols",
  "coverage_gap",
  "untested_symbols",
  "stale",
  "orphaned",
  "conflicting",
  "deprecated_still_used",
  "current_adr",
  "adr_chain",
  "superseded_by",
  "domain_contradictions",
];

export async function handleKbDerive(
  prolog: PrologProcess,
  args: DeriveArgs,
): Promise<DeriveResult> {
  const params = args.params ?? {};
  const { rule } = args;

  if (!RULES.includes(rule)) {
    throw new Error(`Unsupported rule '${rule}'`);
  }

  let rows: DeriveRow[] = [];
  switch (rule) {
    case "transitively_implements":
      rows = await deriveTransitivelyImplements(prolog, params);
      break;
    case "transitively_depends":
      rows = await deriveTransitivelyDepends(prolog, params);
      break;
    case "impacted_by_change":
      rows = await deriveImpactedByChange(prolog, params);
      break;
    case "affected_symbols":
      rows = await deriveAffectedSymbols(prolog, params);
      break;
    case "coverage_gap":
      rows = await deriveCoverageGap(prolog, params);
      break;
    case "untested_symbols":
      rows = await deriveUntestedSymbols(prolog);
      break;
    case "stale":
      rows = await deriveStale(prolog, params);
      break;
    case "orphaned":
      rows = await deriveOrphaned(prolog, params);
      break;
    case "conflicting":
      rows = await deriveConflicting(prolog, params);
      break;
    case "deprecated_still_used":
      rows = await deriveDeprecatedStillUsed(prolog, params);
      break;
    case "current_adr":
      rows = await deriveCurrentAdr(prolog);
      break;
    case "adr_chain":
      rows = await deriveAdrChain(prolog, params);
      break;
    case "superseded_by":
      rows = await deriveSupersededBy(prolog, params);
      break;
    case "domain_contradictions":
      rows = await deriveDomainContradictions(prolog);
      break;
  }

  return {
    content: [
      {
        type: "text",
        text: `Derived ${rows.length} row(s) for rule '${rule}'.`,
      },
    ],
    structuredContent: {
      rule,
      params,
      count: rows.length,
      rows,
      provenance: {
        predicate: rule,
        deterministic: true,
      },
    },
  };
}

async function deriveTransitivelyImplements(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const symbolFilter = asOptionalString(params.symbol);
  const reqFilter = asOptionalString(params.req);
  const cond = makeConjunction([
    symbolFilter ? `Symbol='${escapeAtom(symbolFilter)}'` : "",
    reqFilter ? `Req='${escapeAtom(reqFilter)}'` : "",
  ]);

  const goal = `setof([Symbol,Req], (transitively_implements(Symbol, Req)${cond}), Rows)`;
  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([symbol, req]) => ({ symbol, req }));
}

async function deriveTransitivelyDepends(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const req1Filter = asOptionalString(params.req1);
  const req2Filter = asOptionalString(params.req2);
  const cond = makeConjunction([
    req1Filter ? `Req1='${escapeAtom(req1Filter)}'` : "",
    req2Filter ? `Req2='${escapeAtom(req2Filter)}'` : "",
  ]);

  const goal = `setof([Req1,Req2], (transitively_depends(Req1, Req2)${cond}), Rows)`;
  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([req1, req2]) => ({ req1, req2 }));
}

async function deriveImpactedByChange(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const changed = asRequiredString(
    params.changed,
    "params.changed is required",
  );
  const goal = `setof(Entity, impacted_by_change(Entity, '${escapeAtom(changed)}'), Rows)`;
  const entities = await queryAtomRows(prolog, goal, "Rows");
  return entities.map((entity) => ({ changed, entity }));
}

async function deriveAffectedSymbols(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const req = asRequiredString(params.req, "params.req is required");
  const goal = `affected_symbols('${escapeAtom(req)}', Symbols)`;
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings.Symbols) {
    return [];
  }

  const symbols = parseAtomList(result.bindings.Symbols);
  return symbols.map((symbol) => ({ req, symbol }));
}

async function deriveCoverageGap(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const reqFilter = asOptionalString(params.req);
  const cond = reqFilter ? `Req='${escapeAtom(reqFilter)}'` : "";
  const goal = `setof([Req,Reason], (coverage_gap(Req, Reason)${makeConjunction([cond])}), Rows)`;
  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([req, reason]) => ({ req, reason }));
}

async function deriveUntestedSymbols(
  prolog: PrologProcess,
): Promise<DeriveRow[]> {
  const result = await prolog.query("untested_symbols(Symbols)");
  if (!result.success || !result.bindings.Symbols) {
    return [];
  }

  const symbols = parseAtomList(result.bindings.Symbols);
  return symbols.map((symbol) => ({ symbol }));
}

async function deriveStale(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const maxAgeDays = Number(params.max_age_days ?? params.maxAgeDays);
  if (!Number.isFinite(maxAgeDays)) {
    throw new Error("params.max_age_days is required and must be numeric");
  }

  const entityFilter = asOptionalString(params.entity);
  const cond = entityFilter ? `Entity='${escapeAtom(entityFilter)}'` : "";
  const goal = `setof(Entity, (stale(Entity, ${maxAgeDays})${makeConjunction([cond])}), Rows)`;
  const entities = await queryAtomRows(prolog, goal, "Rows");
  return entities.map((entity) => ({ entity, max_age_days: maxAgeDays }));
}

async function deriveOrphaned(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const symbolFilter = asOptionalString(params.symbol);
  const cond = symbolFilter ? `Symbol='${escapeAtom(symbolFilter)}'` : "";
  const goal = `setof(Symbol, (orphaned(Symbol)${makeConjunction([cond])}), Rows)`;
  const symbols = await queryAtomRows(prolog, goal, "Rows");
  return symbols.map((symbol) => ({ symbol }));
}

async function deriveConflicting(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const adr1Filter = asOptionalString(params.adr1);
  const adr2Filter = asOptionalString(params.adr2);
  const cond = makeConjunction([
    adr1Filter ? `Adr1='${escapeAtom(adr1Filter)}'` : "",
    adr2Filter ? `Adr2='${escapeAtom(adr2Filter)}'` : "",
  ]);
  const goal = `setof([Adr1,Adr2], (conflicting(Adr1, Adr2)${cond}), Rows)`;
  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([adr1, adr2]) => ({ adr1, adr2 }));
}

async function deriveDeprecatedStillUsed(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const adrFilter = asOptionalString(params.adr);
  const goal = adrFilter
    ? `deprecated_still_used('${escapeAtom(adrFilter)}', Symbols)`
    : "setof([Adr,Symbols], deprecated_still_used(Adr, Symbols), Rows)";

  if (adrFilter) {
    const result = await prolog.query(goal);
    if (!result.success || !result.bindings.Symbols) {
      return [];
    }
    return [
      { adr: adrFilter, symbols: parseAtomList(result.bindings.Symbols) },
    ];
  }

  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([adr, symbolsRaw]) => ({
    adr,
    symbols: parseAtomList(symbolsRaw),
  }));
}

async function queryAtomRows(
  prolog: PrologProcess,
  goal: string,
  bindingName: string,
): Promise<string[]> {
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings[bindingName]) {
    return [];
  }

  return parseAtomList(result.bindings[bindingName]);
}

async function queryPairRows(
  prolog: PrologProcess,
  goal: string,
  bindingName: string,
): Promise<Array<[string, string]>> {
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings[bindingName]) {
    return [];
  }

  return parsePairList(result.bindings[bindingName]);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(message);
  }
  return value;
}

function makeConjunction(parts: string[]): string {
  const filtered = parts.filter((part) => part.length > 0);
  if (filtered.length === 0) {
    return "";
  }
  return `, ${filtered.join(", ")}`;
}

function escapeAtom(value: string): string {
  return value.replace(/'/g, "\\'");
}

async function deriveCurrentAdr(prolog: PrologProcess): Promise<DeriveRow[]> {
  // Query for all current ADRs and their titles
  const result = await prolog.query(
    "setof([Id,TitleAtom], (kb_entity(Id, adr, Props), memberchk(title=Title, Props), normalize_term_atom(Title, TitleAtom), current_adr(Id)), Rows)",
  );

  if (!result.success || !result.bindings.Rows) {
    return [];
  }

  const pairs = parsePairList(result.bindings.Rows);
  return pairs.map(([id, title]) => ({ id, title }));
}

async function deriveAdrChain(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const adr = asRequiredString(params.adr, "params.adr is required");

  // Query for the full chain including status
  const result = await prolog.query(
    `findall([Id,TitleAtom,StatusAtom], (kb_entity(Id, adr, Props), memberchk(title=Title, Props), normalize_term_atom(Title, TitleAtom), memberchk(status=Status, Props), normalize_term_atom(Status, StatusAtom), adr_chain('${escapeAtom(adr)}', Chain), member(Id, Chain)), Rows)`,
  );

  if (!result.success || !result.bindings.Rows) {
    return [];
  }

  // Parse triplets and include status
  const triplets = parseTripleList(result.bindings.Rows);
  return triplets.map(([id, title, status]) => ({ id, title, status }));
}

async function deriveSupersededBy(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const adr = asRequiredString(params.adr, "params.adr is required");

  // Query for direct supersession
  const result = await prolog.query(
    `superseded_by('${escapeAtom(adr)}', NewAdr), kb_entity(NewAdr, adr, Props), memberchk(title=Title, Props), normalize_term_atom(Title, TitleAtom)`,
  );

  if (
    !result.success ||
    !result.bindings.NewAdr ||
    !result.bindings.TitleAtom
  ) {
    return [];
  }

  const newAdr = String(result.bindings.NewAdr).replace(/^'|'$/g, "");
  const newAdrTitle = String(result.bindings.TitleAtom).replace(/^'|'$/g, "");

  return [
    {
      adr,
      successor_id: newAdr,
      successor_title: newAdrTitle,
    },
  ];
}

function parseTripleList(raw: string): [string, string, string][] {
  const match = raw.match(/\[(.*)\]/);
  if (!match) {
    return [];
  }

  const content = match[1].trim();
  if (!content) {
    return [];
  }

  // Parse triplets: [[a,b,c],[x,y,z],...]
  const triplets: [string, string, string][] = [];
  const tripletRegex = /\[([^,]+),([^,]+),([^\]]+)\]/g;
  let tripletMatch: RegExpExecArray | null;
  do {
    tripletMatch = tripletRegex.exec(content);
    if (tripletMatch !== null) {
      triplets.push([
        tripletMatch[1].trim().replace(/^'|'$/g, ""),
        tripletMatch[2].trim().replace(/^'|'$/g, ""),
        tripletMatch[3].trim().replace(/^'|'$/g, ""),
      ]);
    }
  } while (tripletMatch !== null);

  return triplets;
}

async function deriveDomainContradictions(
  prolog: PrologProcess,
): Promise<DeriveRow[]> {
  const result = await prolog.query(
    "setof([ReqA,ReqB,Reason], contradicting_reqs(ReqA, ReqB, Reason), Rows)",
  );

  if (!result.success || !result.bindings.Rows) {
    return [];
  }

  const rows = parseTripleList(result.bindings.Rows);
  return rows.map(([reqA, reqB, reason]) => ({ reqA, reqB, reason }));
}
````

## File: packages/mcp/src/tools/impact.ts
````typescript
import type { PrologProcess } from "@kibi/cli/src/prolog.js";
import { parseAtomList } from "./prolog-list.js";

export interface ImpactArgs {
  entity: string;
}

export interface ImpactResult {
  content: Array<{ type: string; text: string }>;
  structuredContent: {
    entity: string;
    impacted: Array<{ id: string; type: string }>;
    count: number;
    provenance: {
      predicate: "impacted_by_change";
      deterministic: true;
    };
  };
}

export async function handleKbImpact(
  prolog: PrologProcess,
  args: ImpactArgs,
): Promise<ImpactResult> {
  if (!args.entity || typeof args.entity !== "string") {
    throw new Error("'entity' is required");
  }

  const goal = `setof(Id, (impacted_by_change(Id, '${escapeAtom(args.entity)}'), Id \\= '${escapeAtom(args.entity)}'), Impacted)`;
  const impactedIds = await queryAtoms(prolog, goal, "Impacted");

  const impacted: Array<{ id: string; type: string }> = [];
  for (const id of impactedIds) {
    const type = await getEntityType(prolog, id);
    impacted.push({ id, type: type ?? "unknown" });
  }

  impacted.sort((a, b) => {
    if (a.type === b.type) {
      return a.id.localeCompare(b.id);
    }
    return a.type.localeCompare(b.type);
  });

  return {
    content: [
      {
        type: "text",
        text: `Impact analysis for '${args.entity}': ${impacted.length} impacted entity(s).`,
      },
    ],
    structuredContent: {
      entity: args.entity,
      impacted,
      count: impacted.length,
      provenance: {
        predicate: "impacted_by_change",
        deterministic: true,
      },
    },
  };
}

async function queryAtoms(
  prolog: PrologProcess,
  goal: string,
  bindingName: string,
): Promise<string[]> {
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings[bindingName]) {
    return [];
  }
  return parseAtomList(result.bindings[bindingName]);
}

async function getEntityType(
  prolog: PrologProcess,
  id: string,
): Promise<string | null> {
  const result = await prolog.query(`kb_entity('${escapeAtom(id)}', Type, _)`);
  if (!result.success || !result.bindings.Type) {
    return null;
  }

  return result.bindings.Type;
}

function escapeAtom(value: string): string {
  return value.replace(/'/g, "\\'");
}
````

## File: packages/mcp/src/tools/list-types.ts
````typescript
export interface ListEntityTypesResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: { types: string[] };
}

export interface ListRelationshipTypesResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: { types: string[] };
}

/**
 * Handle kb_list_entity_types tool calls
 * Returns the static list of supported KB entity type names (req, scenario, test, adr, flag, event, symbol, fact).
 */
export async function handleKbListEntityTypes(): Promise<ListEntityTypesResult> {
  return {
    content: [
      {
        type: "text",
        text: "Available entity types: req, scenario, test, adr, flag, event, symbol, fact",
      },
    ],
    structuredContent: {
      types: [
        "req",
        "scenario",
        "test",
        "adr",
        "flag",
        "event",
        "symbol",
        "fact",
      ],
    },
  };
}

/**
 * Handle kb_list_relationship_types tool calls
 * Returns the static list of supported KB relationship type names (depends_on, specified_by, verified_by, etc.).
 */
export async function handleKbListRelationshipTypes(): Promise<ListRelationshipTypesResult> {
  return {
    content: [
      {
        type: "text",
        text: "Available relationship types: depends_on, specified_by, verified_by, validates, implements, covered_by, constrained_by, constrains, requires_property, guards, publishes, consumes, supersedes, relates_to",
      },
    ],
    structuredContent: {
      types: [
        "depends_on",
        "specified_by",
        "verified_by",
        "validates",
        "implements",
        "covered_by",
        "constrained_by",
        "constrains",
        "requires_property",
        "guards",
        "publishes",
        "consumes",
        "supersedes",
        "relates_to",
      ],
    },
  };
}
````

## File: packages/mcp/src/tools/prolog-list.ts
````typescript
export function parseAtomList(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }

  const content = unwrapList(trimmed);
  if (content.length === 0) {
    return [];
  }

  return splitTopLevel(content, ",")
    .map((token) => stripQuotes(token.trim()))
    .filter((token) => token.length > 0);
}

export function parsePairList(raw: string): Array<[string, string]> {
  const rows = parseListRows(raw);
  const pairs: Array<[string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevel(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 2) {
      pairs.push([parts[0], parts[1]]);
    }
  }

  return pairs;
}

export function parseTriples(raw: string): Array<[string, string, string]> {
  const rows = parseListRows(raw);
  const triples: Array<[string, string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevel(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 3) {
      triples.push([parts[0], parts[1], parts[2]]);
    }
  }

  return triples;
}

function parseListRows(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }

  const content = unwrapList(trimmed);
  if (content.length === 0) {
    return [];
  }

  const rows: string[] = [];
  let depth = 0;
  let current = "";

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === "[") {
      depth++;
      if (depth > 1) {
        current += ch;
      }
      continue;
    }

    if (ch === "]") {
      depth--;
      if (depth === 0) {
        rows.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "," && depth === 0) {
      continue;
    }

    current += ch;
  }

  return rows;
}

function unwrapList(value: string): string {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : "";

    if (ch === '"' && !inSingleQuotes && prev !== "\\") {
      inDoubleQuotes = !inDoubleQuotes;
      current += ch;
      continue;
    }

    if (ch === "'" && !inDoubleQuotes && prev !== "\\") {
      inSingleQuotes = !inSingleQuotes;
      current += ch;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && (ch === "[" || ch === "(")) {
      depth++;
      current += ch;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && (ch === "]" || ch === ")")) {
      depth--;
      current += ch;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && depth === 0 && ch === delimiter) {
      if (current.length > 0) {
        parts.push(current);
      }
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}

function stripQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
}
````

## File: packages/mcp/src/tools/query-relationships.ts
````typescript
import type { PrologProcess } from "@kibi/cli/src/prolog.js";

export interface QueryRelationshipsArgs {
  from?: string;
  to?: string;
  type?: string;
}

export interface Relationship {
  relType: string;
  from: string;
  to: string;
}

export interface QueryRelationshipsResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    relationships: Relationship[];
    count: number;
  };
}

const VALID_REL_TYPES = [
  "depends_on",
  "specified_by",
  "verified_by",
  "validates",
  "implements",
  "covered_by",
  "constrained_by",
  "constrains",
  "requires_property",
  "guards",
  "publishes",
  "consumes",
  "supersedes",
  "relates_to",
];

/**
 * Handle kb_query_relationships tool calls.
 * Queries the kb_relationship/3 predicate which has arity (Type, From, To).
 *
 * Note: kb_relationship/3 requires RelType to be bound (atom_concat/3 in Prolog
 * does not work with an unbound first argument). When no type filter is given,
 * we iterate over all known type values.
 */
export async function handleKbQueryRelationships(
  prolog: PrologProcess,
  args: QueryRelationshipsArgs,
): Promise<QueryRelationshipsResult> {
  const { from, to, type } = args;

  if (type && !VALID_REL_TYPES.includes(type)) {
    throw new Error(
      `Invalid relationship type '${type}'. Valid types: ${VALID_REL_TYPES.join(", ")}`,
    );
  }

  // When type is specified we run one query; otherwise iterate all known types
  // (kb_relationship/3 requires the type to be bound due to atom_concat/3 in Prolog).
  const typesToQuery = type ? [type] : VALID_REL_TYPES;

  const allRelationships: Relationship[] = [];

  for (const relType of typesToQuery) {
    // We collect what we actually need based on which args are bound.
    // When both from and to are specified, we just need to check existence.
    // Otherwise collect the unbound sides.
    let goal: string;

    if (from && to) {
      // Check if the specific triple exists
      goal = `(kb_relationship('${relType}', '${from}', '${to}') -> Results = [['${from}','${to}']] ; Results = [])`;
    } else if (from) {
      goal = `findall(To, kb_relationship('${relType}', '${from}', To), Results)`;
    } else if (to) {
      goal = `findall(From, kb_relationship('${relType}', From, '${to}'), Results)`;
    } else {
      goal = `findall([From,To], kb_relationship('${relType}', From, To), Results)`;
    }

    const queryResult = await prolog.query(goal);

    if (!queryResult.success) {
      throw new Error(queryResult.error || "Relationship query failed");
    }

    if (queryResult.bindings.Results) {
      const raw = queryResult.bindings.Results as string;

      if (from && to) {
        // Results is either [[from,to]] or []
        const pairs = parsePairResults(raw);
        for (const [pairFrom, pairTo] of pairs) {
          allRelationships.push({ relType, from: pairFrom, to: pairTo });
        }
      } else if (from) {
        // Results is [To, To, ...]
        const ids = parseIdList(raw);
        for (const toId of ids) {
          allRelationships.push({ relType, from, to: toId });
        }
      } else if (to) {
        // Results is [From, From, ...]
        const ids = parseIdList(raw);
        for (const fromId of ids) {
          allRelationships.push({ relType, from: fromId, to });
        }
      } else {
        // Results is [[From,To], ...]
        const pairs = parsePairResults(raw);
        for (const [pairFrom, pairTo] of pairs) {
          allRelationships.push({ relType, from: pairFrom, to: pairTo });
        }
      }
    }
  }

  const text =
    allRelationships.length === 0
      ? "No relationships found."
      : `Found ${allRelationships.length} relationship(s): ${allRelationships
          .map((r) => `${r.from} -[${r.relType}]-> ${r.to}`)
          .join(", ")}`;

  return {
    content: [{ type: "text", text }],
    structuredContent: {
      relationships: allRelationships,
      count: allRelationships.length,
    },
  };
}

/**
 * Parse a flat Prolog list of atoms "[A,B,C]" into a string array.
 */
function parseIdList(raw: string): string[] {
  const cleaned = raw.trim();
  if (cleaned === "[]" || cleaned === "") return [];
  const inner = cleaned.replace(/^\[/, "").replace(/\]$/, "");
  return inner
    .split(",")
    .map((s) => s.trim().replace(/^'|'$/g, "").replace(/^"|"$/g, ""))
    .filter(Boolean);
}

/**
 * Parse Prolog findall result "[[From,To],...]" into [from, to] pairs.
 */
function parsePairResults(raw: string): Array<[string, string]> {
  const cleaned = raw.trim();
  if (cleaned === "[]" || cleaned === "") return [];

  const inner = cleaned.replace(/^\[/, "").replace(/\]$/, "");
  const pairs: Array<[string, string]> = [];

  let depth = 0;
  let current = "";

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "[") {
      depth++;
      current += ch;
    } else if (ch === "]") {
      depth--;
      current += ch;
      if (depth === 0) {
        const pair = parsePair(current.trim());
        if (pair) pairs.push(pair);
        current = "";
      }
    } else if (ch === "," && depth === 0) {
      // top-level separator between pairs — skip
    } else {
      current += ch;
    }
  }

  return pairs;
}

function parsePair(pairStr: string): [string, string] | null {
  // expect "[From,To]"
  const inner = pairStr.replace(/^\[/, "").replace(/\]$/, "").trim();
  const parts = inner
    .split(",")
    .map((s) => s.trim().replace(/^'|'$/g, "").replace(/^"|"$/g, ""));
  if (parts.length < 2) return null;
  return [parts[0], parts[1]];
}
````

## File: packages/mcp/src/tools/query.ts
````typescript
import type { PrologProcess } from "@kibi/cli/src/prolog.js";

export interface QueryArgs {
  type?: string;
  id?: string;
  tags?: string[];
  sourceFile?: string;
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    entities: Record<string, unknown>[];
    count: number;
  };
}

export const VALID_ENTITY_TYPES = [
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
];

/**
 * Handle kb.query tool calls
 * Reuses query logic from CLI command
 */
export async function handleKbQuery(
  prolog: PrologProcess,
  args: QueryArgs,
): Promise<QueryResult> {
  const { type, id, tags, sourceFile, limit = 100, offset = 0 } = args;

  try {
    let results: Record<string, unknown>[] = [];

    // Validate type if provided
    if (type) {
      if (!VALID_ENTITY_TYPES.includes(type)) {
        throw new Error(
          `Invalid type '${type}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
        );
      }
    }

    // Build Prolog query
    let goal: string;

    if (sourceFile) {
      const safeSource = sourceFile.replace(/'/g, "\\'");
      if (type) {
        goal = `findall([Id,'${type}',Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, '${type}', Props)), Results)`;
      } else {
        goal = `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
      }
    } else if (id && type) {
      goal = `kb_entity('${id}', '${type}', Props), Id = '${id}', Type = '${type}', Result = [Id, Type, Props]`;
    } else if (id) {
      goal = `findall(['${id}',Type,Props], kb_entity('${id}', Type, Props), Results)`;
    } else if (tags && tags.length > 0) {
      const tagList = `[${tags.map((t) => `'${t}'`).join(",")}]`;
      if (type) {
        goal = `findall([Id,'${type}',Props], (kb_entity(Id, '${type}', Props), memberchk(tags=Tags, Props), member(Tag, Tags), member(Tag, ${tagList})), Results)`;
      } else {
        goal = `findall([Id,Type,Props], (kb_entity(Id, Type, Props), memberchk(tags=Tags, Props), member(Tag, Tags), member(Tag, ${tagList})), Results)`;
      }
    } else if (type) {
      goal = `findall([Id,'${type}',Props], kb_entity(Id, '${type}', Props), Results)`;
    } else {
      goal = "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
    }

    const queryResult = await prolog.query(goal);

    if (queryResult.success) {
      if (id && type) {
        // Single entity query
        if (queryResult.bindings.Result) {
          const entity = parseEntityFromBinding(queryResult.bindings.Result);
          results = [entity];
        }
      } else {
        // Multiple entities query
        if (queryResult.bindings.Results) {
          const entitiesData = parseListOfLists(queryResult.bindings.Results);

          for (const data of entitiesData) {
            const entity = parseEntityFromList(data);
            results.push(entity);
          }
        }
      }
    } else {
      throw new Error(queryResult.error || "Query failed with unknown error");
    }

    // Apply pagination
    const paginated = results.slice(offset, offset + limit);

    // Build human-readable text with entity IDs and titles
    let text: string;
    if (results.length === 0) {
      text = `No entities found${type ? ` of type '${type}'` : ""}.`;
    } else {
      const details = paginated
        .map((e) => {
          const id = (e.id as string).replace(/^file:\/\/.*\//, "");
          const title = e.title as string;
          const status = e.status as string;
          return `${id} (${title}, status=${status})`;
        })
        .join(", ");
      text = `Found ${results.length} entities${type ? ` of type '${type}'` : ""}. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${details}`;
    }

    // Return MCP structured response
    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
      structuredContent: {
        entities: paginated,
        count: results.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Query execution failed: ${message}`);
  }
}

/**
 * Parse a Prolog list of lists into a JavaScript array.
 * Input: "[[a,b,c],[d,e,f]]"
 * Output: [["a", "b", "c"], ["d", "e", "f"]]
 */
export function parseListOfLists(listStr: string): string[][] {
  const cleaned = listStr.trim().replace(/^\[/, "").replace(/\]$/, "");

  if (cleaned === "") {
    return [];
  }

  const results: string[][] = [];
  let depth = 0;
  let current = "";
  let currentList: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (char === "[") {
      depth++;
      if (depth > 1) current += char;
    } else if (char === "]") {
      depth--;
      if (depth === 0) {
        if (current) {
          currentList.push(current.trim());
          current = "";
        }
        if (currentList.length > 0) {
          results.push(currentList);
          currentList = [];
        }
      } else {
        current += char;
      }
    } else if (char === "," && depth === 1) {
      if (current) {
        currentList.push(current.trim());
        current = "";
      }
    } else if (char === "," && depth === 0) {
      // Skip comma between lists
    } else {
      current += char;
    }
  }

  return results;
}

/**
 * Parse a single entity from Prolog binding format.
 * Input: "[abc123, req, [id=abc123, title=\"Test\", ...]]"
 */
export function parseEntityFromBinding(
  bindingStr: string,
): Record<string, unknown> {
  const cleaned = bindingStr.trim().replace(/^\[/, "").replace(/\]$/, "");
  const parts = splitTopLevel(cleaned, ",");

  if (parts.length < 3) {
    return {};
  }

  const id = parts[0].trim();
  const type = parts[1].trim();
  const propsStr = parts.slice(2).join(",").trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

/**
 * Parse entity from array returned by parseListOfLists.
 * Input: ["abc123", "req", "[id=abc123, title=\"Test\", ...]"]
 */
export function parseEntityFromList(data: string[]): Record<string, unknown> {
  if (data.length < 3) {
    return {};
  }

  const id = data[0].trim();
  const type = data[1].trim();
  const propsStr = data[2].trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

/**
 * Parse Prolog property list into JavaScript object.
 */
export function parsePropertyList(propsStr: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  let cleaned = propsStr.trim();
  if (cleaned.startsWith("[")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith("]")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  const pairs = splitTopLevel(cleaned, ",");

  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;

    const key = pair.substring(0, eqIndex).trim();
    const value = pair.substring(eqIndex + 1).trim();

    if (key === "..." || value === "..." || value === "...|...") {
      continue;
    }

    const parsed = parsePrologValue(value);
    props[key] = parsed;
  }

  return props;
}

/**
 * Parse a single Prolog value, handling typed literals and URIs.
 */
export function parsePrologValue(valueInput: string): unknown {
  const value = valueInput.trim();

  // Handle typed literal: ^^("value", type)
  if (value.startsWith("^^(")) {
    const innerStart = value.indexOf("(") + 1;
    let depth = 1;
    let innerEnd = innerStart;
    for (let i = innerStart; i < value.length; i++) {
      if (value[i] === "(") depth++;
      if (value[i] === ")") {
        depth--;
        if (depth === 0) {
          innerEnd = i;
          break;
        }
      }
    }
    const innerContent = value.substring(innerStart, innerEnd);

    const parts = splitTopLevel(innerContent, ",");
    if (parts.length >= 2) {
      let literalValue = parts[0].trim();

      if (literalValue.startsWith('"') && literalValue.endsWith('"')) {
        literalValue = literalValue.substring(1, literalValue.length - 1);
      }

      // Handle array notation
      if (literalValue.startsWith("[") && literalValue.endsWith("]")) {
        const listContent = literalValue.substring(1, literalValue.length - 1);
        if (listContent === "") {
          return [];
        }
        return splitTopLevel(listContent, ",").map((item) => item.trim());
      }

      return literalValue;
    }
  }

  // Handle URI
  if (value.startsWith("file:///")) {
    const lastSlash = value.lastIndexOf("/");
    if (lastSlash !== -1) {
      return value.substring(lastSlash + 1);
    }
    return value;
  }

  // Handle quoted string
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.substring(1, value.length - 1);
  }

  // Handle quoted atom
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.substring(1, value.length - 1);
  }

  // Handle list
  if (value.startsWith("[") && value.endsWith("]")) {
    const listContent = value.substring(1, value.length - 1);
    if (listContent === "") {
      return [];
    }
    const items = splitTopLevel(listContent, ",").map((item) => {
      return parsePrologValue(item.trim());
    });
    return items;
  }

  return value;
}

/**
 * Split a string by delimiter at the top level (not inside brackets or quotes).
 */
export function splitTopLevel(str: string, delimiter: string): string[] {
  const results: string[] = [];
  let current = "";
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";

    if (char === '"' && prevChar !== "\\") {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes && (char === "[" || char === "(")) {
      depth++;
      current += char;
    } else if (!inQuotes && (char === "]" || char === ")")) {
      depth--;
      current += char;
    } else if (!inQuotes && depth === 0 && char === delimiter) {
      if (current) {
        results.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    results.push(current);
  }

  return results;
}

function stripOuterQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeEntityId(value: string): string {
  if (!value.startsWith("file:///")) {
    return value;
  }

  const idx = value.lastIndexOf("/");
  return idx === -1 ? value : value.slice(idx + 1);
}
````

## File: packages/mcp/src/tools/symbols.ts
````typescript
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveWorkspaceRoot } from "../workspace.js";
import {
  type ManifestSymbolEntry as CliManifestSymbolEntry,
  enrichSymbolCoordinates,
} from "@kibi/cli/src/extractors/symbols-coordinator.js";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";

export interface SymbolsRefreshArgs {
  dryRun?: boolean;
}

export interface SymbolsRefreshResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: {
    refreshed: number;
    failed: number;
    unchanged: number;
    dryRun: boolean;
  };
}

interface ManifestSymbolEntry {
  id?: string;
  title?: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  sourceEndLine?: number;
  sourceEndColumn?: number;
  coordinatesGeneratedAt?: string;
  [key: string]: unknown;
}

const COMMENT_BLOCK = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb_symbols_refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb_symbols_refresh\` MCP tool to refresh coordinates.
`;

const GENERATED_COORD_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
  "coordinatesGeneratedAt",
] as const;

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

export async function handleKbSymbolsRefresh(
  args: SymbolsRefreshArgs,
): Promise<SymbolsRefreshResult> {
  const dryRun = args.dryRun === true;
  const workspaceRoot = resolveWorkspaceRoot();
  const manifestPath = resolveManifestPath(workspaceRoot);

  const rawContent = readFileSync(manifestPath, "utf8");
  const parsed = parseYAML(rawContent);

  if (!isRecord(parsed) || !Array.isArray(parsed.symbols)) {
    throw new Error(`Invalid symbols manifest at ${manifestPath}`);
  }

  const original = parsed.symbols.map((entry) =>
    isRecord(entry)
      ? ({ ...entry } as ManifestSymbolEntry)
      : ({} as ManifestSymbolEntry),
  );
  const entriesForEnrichment: CliManifestSymbolEntry[] = original.map(
    (entry) => ({
      ...entry,
      id: typeof entry.id === "string" ? entry.id : "",
      title: typeof entry.title === "string" ? entry.title : "",
    }),
  );
  const enriched = await enrichSymbolCoordinates(
    entriesForEnrichment,
    workspaceRoot,
  );
  parsed.symbols = enriched;

  let refreshed = 0;
  let failed = 0;
  let unchanged = 0;

  for (let i = 0; i < original.length; i++) {
    const before = original[i] ?? ({} as ManifestSymbolEntry);
    const after = enriched[i] ?? before;

    const changed = GENERATED_COORD_FIELDS.some(
      (field) => before[field] !== after[field],
    );

    if (changed) {
      refreshed++;
      continue;
    }

    const source =
      typeof after.sourceFile === "string"
        ? after.sourceFile
        : typeof before.sourceFile === "string"
          ? before.sourceFile
          : undefined;

    const eligible = isEligible(source, workspaceRoot);
    if (eligible && !hasGeneratedCoordinates(after)) {
      failed++;
    } else {
      unchanged++;
    }
  }

  const dumped = dumpYAML(parsed, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  const nextContent = `${COMMENT_BLOCK}${dumped}`;

  if (!dryRun && rawContent !== nextContent) {
    writeFileSync(manifestPath, nextContent, "utf8");
  }

  return {
    content: [
      {
        type: "text",
        text: `kb_symbols_refresh ${dryRun ? "(dry run) " : ""}completed for ${path.relative(workspaceRoot, manifestPath)}: refreshed=${refreshed}, unchanged=${unchanged}, failed=${failed}`,
      },
    ],
    structuredContent: {
      refreshed,
      failed,
      unchanged,
      dryRun,
    },
  };
}

export async function refreshCoordinatesForSymbolId(
  symbolId: string,
  workspaceRoot: string = resolveWorkspaceRoot(),
): Promise<{ refreshed: boolean; found: boolean }> {
  const manifestPath = resolveManifestPath(workspaceRoot);
  const rawContent = readFileSync(manifestPath, "utf8");
  const parsed = parseYAML(rawContent);

  if (!isRecord(parsed) || !Array.isArray(parsed.symbols)) {
    return { refreshed: false, found: false };
  }

  const symbols = parsed.symbols.map((entry) =>
    isRecord(entry)
      ? ({ ...entry } as ManifestSymbolEntry)
      : ({} as ManifestSymbolEntry),
  );

  const index = symbols.findIndex((entry) => entry.id === symbolId);
  if (index < 0) {
    return { refreshed: false, found: false };
  }

  const original = symbols[index] ?? {};
  const singleEntry: CliManifestSymbolEntry = {
    ...(original as ManifestSymbolEntry),
    id:
      typeof (original as ManifestSymbolEntry).id === "string"
        ? ((original as ManifestSymbolEntry).id as string)
        : "",
    title:
      typeof (original as ManifestSymbolEntry).title === "string"
        ? ((original as ManifestSymbolEntry).title as string)
        : "",
  };
  const [enriched] = await enrichSymbolCoordinates(
    [singleEntry],
    workspaceRoot,
  );

  symbols[index] = enriched ?? (original as ManifestSymbolEntry);
  parsed.symbols = symbols;

  const refreshed = GENERATED_COORD_FIELDS.some(
    (field) =>
      (original as ManifestSymbolEntry)[field] !== symbols[index][field],
  );

  const dumped = dumpYAML(parsed, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  const nextContent = `${COMMENT_BLOCK}${dumped}`;

  if (rawContent !== nextContent) {
    writeFileSync(manifestPath, nextContent, "utf8");
  }

  return { refreshed, found: true };
}

function resolveManifestPath(workspaceRoot: string): string {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf8")) as {
        symbolsManifest?: string;
      };
      if (config.symbolsManifest) {
        return path.isAbsolute(config.symbolsManifest)
          ? config.symbolsManifest
          : path.resolve(workspaceRoot, config.symbolsManifest);
      }
    } catch {}
  }

  const candidates = [
    path.join(workspaceRoot, "symbols.yaml"),
    path.join(workspaceRoot, "symbols.yml"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function hasGeneratedCoordinates(entry: ManifestSymbolEntry): boolean {
  return (
    typeof entry.sourceLine === "number" &&
    typeof entry.sourceColumn === "number" &&
    typeof entry.sourceEndLine === "number" &&
    typeof entry.sourceEndColumn === "number" &&
    typeof entry.coordinatesGeneratedAt === "string" &&
    entry.coordinatesGeneratedAt.length > 0
  );
}

function isEligible(
  sourceFile: string | undefined,
  workspaceRoot: string,
): boolean {
  if (!sourceFile) return false;

  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  if (!existsSync(absolute)) return false;

  return SOURCE_EXTENSIONS.has(path.extname(absolute).toLowerCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
````

## File: packages/mcp/src/tools/upsert.ts
````typescript
import type { PrologProcess } from "@kibi/cli/src/prolog.js";
import entitySchema from "@kibi/cli/src/schemas/entity.schema.json";
import relationshipSchema from "@kibi/cli/src/schemas/relationship.schema.json";
import Ajv from "ajv";
import { refreshCoordinatesForSymbolId } from "./symbols.js";

export interface UpsertArgs {
  /** Entity type (req, scenario, test, adr, flag, event, symbol, fact) */
  type: string;
  /** Unique entity identifier */
  id: string;
  /** Key-value pairs to store as RDF properties (title, status, source, tags, etc.) */
  properties: Record<string, unknown>;
  /** Optional relationships to create alongside this entity */
  relationships?: Array<Record<string, unknown>>;
}

export interface UpsertResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    created: number;
    updated: number;
    relationships_created: number;
  };
}

const ajv = new Ajv({ strict: false });
const validateEntity = ajv.compile(entitySchema);
const validateRelationship = ajv.compile(relationshipSchema);

/**
 * Handle kb.upsert tool calls
 * Accepts { type, id, properties } — the flat format matching the tool schema.
 * Validates the assembled entity against JSON Schema before Prolog writes.
 */
export async function handleKbUpsert(
  prolog: PrologProcess,
  args: UpsertArgs,
): Promise<UpsertResult> {
  const { type, id, properties, relationships = [] } = args;

  if (!type || !id) {
    throw new Error("'type' and 'id' are required for upsert");
  }

  // Assemble full entity from flat args + properties
  const entity: Record<string, unknown> = {
    id,
    type,
    ...properties,
  };

  // Fill in defaults for optional required fields
  if (!entity.created_at) {
    entity.created_at = new Date().toISOString();
  }
  if (!entity.updated_at) {
    entity.updated_at = new Date().toISOString();
  }
  if (!entity.source) {
    entity.source = "mcp://kibi/upsert";
  }

  const entities = [entity];

  // Validate all entities
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];

    if (!validateEntity(ent)) {
      const errors = validateEntity.errors || [];
      const errorMessages = errors
        .map((e) => `${e.instancePath || "root"}: ${e.message}`)
        .join("; ");
      throw new Error(`Entity validation failed: ${errorMessages}`);
    }
  }

  // Validate all relationships
  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i];
    if (!validateRelationship(rel)) {
      const errors = validateRelationship.errors || [];
      const errorMessages = errors
        .map((e) => `${e.instancePath || "root"}: ${e.message}`)
        .join("; ");
      throw new Error(
        `Relationship validation failed at index ${i}: ${errorMessages}`,
      );
    }
  }

  let created = 0;
  let updated = 0;
  let relationshipsCreated = 0;

  try {
    // Process entities
    for (const entity of entities) {
      const id = entity.id as string;
      const type = entity.type as string;

      // Check if entity exists
      const checkGoal = `kb_entity('${id}', _, _)`;
      const checkResult = await prolog.query(checkGoal);

      const isUpdate = checkResult.success;

      // Build property list for Prolog
      const props = buildPropertyList(entity);

      // Assert entity (upsert)
      if (isUpdate) {
        // Delete old version, then insert new
        const retractGoal = `kb_retract_entity('${id}')`;
        await prolog.query(retractGoal);
        updated++;
      } else {
        created++;
      }

      const assertGoal = `kb_assert_entity(${type}, ${props})`;
      const assertResult = await prolog.query(assertGoal);

      if (!assertResult.success) {
        throw new Error(
          `Failed to assert entity ${id}: ${assertResult.error || "Unknown error"}`,
        );
      }
    }

    // Process relationships
    for (const rel of relationships) {
      const relType = rel.type as string;
      const from = rel.from as string;
      const to = rel.to as string;

      // Build metadata
      const metadata = buildRelationshipMetadata(rel);

      const relGoal = `kb_assert_relationship(${relType}, '${from}', '${to}', ${metadata})`;
      const relResult = await prolog.query(relGoal);

      if (!relResult.success) {
        throw new Error(
          `Failed to assert relationship ${relType} from ${from} to ${to}: ${relResult.error || "Unknown error"}`,
        );
      }

      relationshipsCreated++;
    }

    // Save KB to disk
    await prolog.query("kb_save");

    if (type === "symbol") {
      try {
        await refreshCoordinatesForSymbolId(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (process.env.KIBI_MCP_DEBUG) {
          console.warn(
            `[KIBI-MCP] Symbol coordinate auto-refresh failed for ${id}: ${message}`,
          );
        }
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Upserted ${id} (${created > 0 ? "created" : "updated"}) with ${relationshipsCreated} relationship(s).`,
        },
      ],
      structuredContent: {
        created,
        updated,
        relationships_created: relationshipsCreated,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Upsert execution failed: ${message}`);
  }
}

/**
 * Build Prolog property list from entity object
 * Returns simple Key=Value format without typed literals
 * Example output: "[id='test-1', title=\"Test\", status=active]"
 */
function buildPropertyList(entity: Record<string, unknown>): string {
  const pairs: string[] = [];

  // Defined internally to ensure thread safety and avoid initialization order issues.
  // Using simple arrays instead of Sets is performant enough for small lists and avoids Set allocation overhead.
  const ATOM_FIELDS = ["status", "owner", "priority", "severity"];
  const STRING_FIELDS = [
    "id",
    "title",
    "created_at",
    "updated_at",
    "source",
    "text_ref",
  ];

  for (const [key, value] of Object.entries(entity)) {
    if (key === "type") continue;

    let prologValue: string;

    if (key === "id" && typeof value === "string") {
      prologValue = `'${value}'`;
    } else if (Array.isArray(value)) {
      prologValue = JSON.stringify(value);
    } else if (ATOM_FIELDS.includes(key) && typeof value === "string") {
      prologValue = value;
    } else if (STRING_FIELDS.includes(key) && typeof value === "string") {
      prologValue = `"${escapeQuotes(value)}"`;
    } else if (typeof value === "string") {
      prologValue = `"${escapeQuotes(value)}"`;
    } else if (typeof value === "number") {
      prologValue = String(value);
    } else if (typeof value === "boolean") {
      prologValue = value ? "true" : "false";
    } else {
      prologValue = `"${escapeQuotes(String(value))}"`;
    }

    pairs.push(`${key}=${prologValue}`);
  }

  return `[${pairs.join(", ")}]`;
}

/**
 * Build Prolog metadata list for relationship
 * Returns simple Key=Value format without typed literals
 */
function buildRelationshipMetadata(rel: Record<string, unknown>): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(rel)) {
    if (key === "type" || key === "from" || key === "to") continue;

    let prologValue: string;

    if (typeof value === "string") {
      prologValue = `"${escapeQuotes(value)}"`;
    } else if (typeof value === "number") {
      prologValue = String(value);
    } else {
      prologValue = `"${escapeQuotes(String(value))}"`;
    }

    pairs.push(`${key}=${prologValue}`);
  }

  return `[${pairs.join(", ")}]`;
}

/**
 * Escape double quotes in strings for Prolog
 */
function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"');
}
````

## File: packages/mcp/src/types/js-yaml.d.ts
````typescript
declare module "js-yaml" {
  export function load(input: string): unknown;
  export function dump(
    input: unknown,
    options?: Record<string, unknown>,
  ): string;
}
````

## File: packages/mcp/src/workspace.ts
````typescript
import fs from "node:fs";
import path from "node:path";

const WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
] as const;

const KB_PATH_ENV_KEYS = ["KIBI_KB_PATH", "KB_PATH"] as const;

export function resolveWorkspaceRoot(startDir: string = process.cwd()): string {
  const envRoot = readFirstEnv(WORKSPACE_ENV_KEYS);
  if (envRoot) {
    return path.resolve(envRoot);
  }

  const kbRoot = findUpwards(startDir, ".kb");
  if (kbRoot) {
    return kbRoot;
  }

  const gitRoot = findUpwards(startDir, ".git");
  if (gitRoot) {
    return gitRoot;
  }

  return path.resolve(startDir);
}

export function resolveWorkspaceRootInfo(startDir: string = process.cwd()): {
  root: string;
  reason: "env" | "kb" | "git" | "cwd";
} {
  const envRoot = readFirstEnv(WORKSPACE_ENV_KEYS);
  if (envRoot) {
    return { root: path.resolve(envRoot), reason: "env" };
  }

  const kbRoot = findUpwards(startDir, ".kb");
  if (kbRoot) {
    return { root: kbRoot, reason: "kb" };
  }

  const gitRoot = findUpwards(startDir, ".git");
  if (gitRoot) {
    return { root: gitRoot, reason: "git" };
  }

  return { root: path.resolve(startDir), reason: "cwd" };
}

export function resolveKbPath(workspaceRoot: string, branch: string): string {
  const envPath = readFirstEnv(KB_PATH_ENV_KEYS);
  if (envPath) {
    const resolved = path.resolve(envPath);
    if (isBranchPath(resolved)) {
      return resolved;
    }
    return path.join(resolved, "branches", branch);
  }

  return path.join(workspaceRoot, ".kb", "branches", branch);
}

export function resolveEnvFilePath(
  envFileName: string,
  workspaceRoot: string,
): string {
  if (path.isAbsolute(envFileName)) {
    return envFileName;
  }
  return path.resolve(workspaceRoot, envFileName);
}

function readFirstEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

function findUpwards(startDir: string, marker: string): string | null {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, marker);
    if (fs.existsSync(candidate)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function isBranchPath(p: string): boolean {
  const parent = path.basename(path.dirname(p));
  return parent === "branches";
}
````

## File: packages/mcp/tsconfig.json
````json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*", "bin/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
````

## File: packages/vscode/.vscodeignore
````
node_modules
src
tests
dist/**/*.map
dist/**/*.d.ts
tsconfig.json
.git
.gitignore
package-lock.json
bun.lock
*.test.ts
icon.svg
package-vsix.sh
.sisyphus
../**
../../**
````

## File: packages/vscode/icon.svg
````xml
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4A90E2"/>
      <stop offset="50%" stop-color="#357ABD"/>
      <stop offset="100%" stop-color="#1E5A96"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="16" fill="url(#gradient)"/>
  <g fill="white">
    <circle cx="32" cy="32" r="8" opacity="0.9"/>
    <circle cx="64" cy="32" r="8" opacity="0.7"/>
    <circle cx="96" cy="32" r="8" opacity="0.5"/>
    <rect x="24" y="48" width="80" height="8" rx="4" opacity="0.8"/>
    <rect x="24" y="64" width="64" height="6" rx="3" opacity="0.6"/>
    <rect x="24" y="80" width="72" height="6" rx="3" opacity="0.6"/>
    <rect x="24" y="96" width="56" height="6" rx="3" opacity="0.6"/>
  </g>
  <text x="64" y="120" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.8">KB</text>
</svg>
````

## File: packages/vscode/README.md
````markdown
# Kibi VS Code Extension

VS Code extension for Kibi knowledge base system, providing TreeView visualization of knowledge entities and MCP integration.

## Features

- **TreeView Explorer**: Visualize your Kibi knowledge base entities in the VS Code sidebar
- **Entity Types**: Browse Requirements, Scenarios, Tests, ADRs, Flags, Events, and Symbols
- **MCP Integration**: Built-in Model Context Protocol server for AI assistant integration
- **Workspace Detection**: Auto-activates when `.kb` folder is detected

## Installation

### From VSIX Package

1. Download the latest `kibi-vscode-x.x.x.vsix` file
2. Open VS Code Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Run `Extensions: Install from VSIX...`
4. Select the downloaded VSIX file

### Development Installation

```bash
cd /path/to/kibi
bun install
bun run --cwd packages/vscode build
bun run --cwd packages/vscode package
code --install-extension kibi-vscode-*.vsix
```

## Usage

1. Open a workspace containing a `.kb` directory
2. The Kibi Knowledge Base panel will appear in the Explorer sidebar
3. Expand entity categories to view their contents (placeholder in v0.1)
4. Use the refresh button to reload the tree view

## Entity Types

- **📋 Requirements**: System requirements and specifications
- **📝 Scenarios**: Use cases and business scenarios  
- **✅ Tests**: Test definitions and cases
- **📖 ADRs**: Architectural Decision Records
- **🚩 Flags**: Feature flags and configuration
- **📅 Events**: Domain events and system events
- **🔤 Symbols**: Code symbols and references

## Configuration

The extension provides the following configuration settings:

### `kibi.mcp.serverPath`

**Type:** `string`  
**Default:** `""` (empty)

Absolute path to the kibi-mcp executable. Examples:
- `/path/to/kibi/packages/mcp/bin/kibi-mcp` (local clone)
- `/usr/local/bin/kibi-mcp` (global installation)

If left empty, the extension will attempt to auto-detect `kibi-mcp` in your system PATH.

#### Finding the correct path

**Option 1: Check your PATH**
```bash
which kibi-mcp
# or on Windows:
where kibi-mcp
```

**Option 2: Point to your Kibi clone**
If you have the Kibi repository cloned locally:
```bash
# Replace /path/to/kibi with your actual clone path
/path/to/kibi/packages/mcp/bin/kibi-mcp
```

**Option 3: Install globally**
If you've installed Kibi globally, the path might be:
- `~/.local/bin/kibi-mcp`
- `~/.bun/bin/kibi-mcp`
- `/usr/local/bin/kibi-mcp`

### Setting the configuration

1. Open VS Code Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "Kibi"
3. Set **Kibi: Mcp: Server Path** to the absolute path of your kibi-mcp executable

Or edit `settings.json` directly:
```json
{
  "kibi.mcp.serverPath": "/path/to/kibi/packages/mcp/bin/kibi-mcp"
}
```

## MCP Integration

This extension includes MCP (Model Context Protocol) server integration for AI assistant interaction with your knowledge base. The MCP server path is configurable (see Configuration section above) and defaults to auto-detection from your system PATH.

## Current Limitations (v0.1)

- TreeView shows placeholder data only
- No actual data loading from `.kb` files
- Basic scaffolding for future enhancements

## Development

### Build

```bash
bun run --cwd packages/vscode build     # Compile extension bundle
bun run --cwd packages/vscode watch     # Watch mode
```

### Package

```bash
bun run --cwd packages/vscode package   # Create VSIX file
```

### Test

```bash
bun run --cwd packages/vscode test       # Run VS Code package tests
```

### Debugging (Extension Host)

1. Build the extension bundle:

```bash
bun run --cwd packages/vscode build
```

2. In VS Code, run the launch config `Run Kibi VS Code Extension` (F5).
3. In the Extension Development Host window, open `View -> Output` and select `Kibi`.
4. Confirm logs include:
   - `Activating Kibi extension...`
   - `CodeLens indicators initialized.`

### Debugging CodeLens (Installed VSIX)

1. Uninstall older `kibi-vscode` versions.
2. Install a single VSIX from `packages/vscode/`.
3. Reload VS Code.
4. Verify these conditions:
   - `editor.codeLens` is enabled.
   - Active file language is `TypeScript` or `JavaScript`.
   - Workspace root contains `.kb/config.json` and `symbols.yaml`.
   - The file path is listed in `symbols.yaml` under `sourceFile`.
5. Check `Developer: Show Running Extensions` and confirm `kibi-vscode` is active.
6. If lenses still do not appear, capture:
   - `Kibi` output channel logs
   - `Help -> Toggle Developer Tools` console errors

### CodeLens Scope

- CodeLens is currently registered only for `typescript` and `javascript`.
- CodeLens appears only for symbols whose `sourceFile` in `symbols.yaml` resolves to the currently opened file path.

## Contributing

This extension is part of the larger Kibi project. See the main repository for contribution guidelines.

## License

MIT - See LICENSE file for details.
````


---

#### 🔙 PREVIOUS PART: [kibi-01-logic-3.md](file:kibi-01-logic-3.md)

#### ⏭️ NEXT PART: [kibi-01-logic-5.md](file:kibi-01-logic-5.md)

> _End of Part 5_
