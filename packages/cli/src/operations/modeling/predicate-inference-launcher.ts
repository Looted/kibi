import { exactLauncherPredicateArgs } from "../semantic-advisor/predicate-rules-launcher.js";

/**
 * Infer launcher arguments only for the exact reviewed semantic-rule corpus.
 *
 * General launcher prose may still retrieve a schema, but it must request
 * reviewed argument bindings instead of manufacturing a ground predicate from
 * lexical guesses. Keeping this boundary here makes every launcher schema
 * share the semantic advisor's canonical argument values.
 */
export function inferLauncherArgs(
  predicateName: string,
  text: string,
  _subject: string,
): string[] | null {
  const args = exactLauncherPredicateArgs(predicateName, text);
  return args === null ? null : [...args];
}
