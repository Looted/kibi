import {
  escapeAtom,
  normalizeEntityId,
  parseAtomList,
  parsePairList,
} from "./prolog/codec.js";
import type { PrologPort } from "./public/operations/runtime-types.js";

/**
 * Negative-path facts: a scenario that expects rejection or error assumes
 * them and no requirement grounds a claim on them. Each one describes a
 * situation that must not happen, so its title, read alone, states the
 * opposite of what the requirement it guards says. Search, its hints and its
 * answer mark them and rank them below what they guard.
 */
export type NegativePathFacts = ReadonlyMap<string, readonly string[]>;

/** The prefix a rendered negative-path fact's title carries. */
export const NEGATIVE_PATH_PREFIX = "Forbidden: ";

/** The marker a search row, hint or answer entry carries for one. */
export type NegativePathMarker = Readonly<{
  /** Always "forbidden": the fact describes a situation that must not happen. */
  polarity: "forbidden";
  /** Current requirements whose rejecting scenarios assume the fact. */
  guards: readonly string[];
}>;

export function negativePathFactsGoal(ids: readonly string[]): string {
  const idList = ids.map((id) => `'${escapeAtom(id)}'`).join(",");
  return `kb_negative_path_facts([${idList}], Rows)`;
}

/**
 * The negative-path facts among `ids`, each with the requirements it guards.
 * An engine that cannot answer (an older core) leaves every fact unmarked
 * rather than failing the search.
 */
export async function queryNegativePathFacts(
  prolog: Pick<PrologPort, "query">,
  ids: readonly string[],
): Promise<Map<string, readonly string[]>> {
  const facts = new Map<string, readonly string[]>();
  const unique = [...new Set(ids)].filter((id) => id !== "");
  if (unique.length === 0) return facts;
  let result: Awaited<ReturnType<PrologPort["query"]>>;
  try {
    result = await prolog.query(negativePathFactsGoal(unique));
  } catch {
    return facts;
  }
  if (!result.success) return facts;
  for (const [id, guards] of parsePairList(String(result.bindings.Rows)))
    facts.set(normalizeEntityId(id), parseAtomList(guards));
  return facts;
}

/** The title with the forbidden-situation prefix, added once. */
export function negativePathTitle(title: string): string {
  return title.startsWith(NEGATIVE_PATH_PREFIX)
    ? title
    : `${NEGATIVE_PATH_PREFIX}${title}`;
}

export function negativePathMarker(
  guards: readonly string[],
): NegativePathMarker {
  return { polarity: "forbidden", guards: [...guards] };
}
