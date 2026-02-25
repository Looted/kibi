import type { PrologProcess } from "@kibi/cli/prolog";

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
