/**
 * Single source of truth: re-export builtin ontology rule tables so CLI
 * coverage/tests cannot drift from kibi-plugin-builtin.
 */
// implements REQ-capability-plugin-builtin-parity-v1
import {
  LAUNCHER_PREDICATE_RULES as BUILTIN_LAUNCHER_PREDICATE_RULES,
  exactLauncherPredicateArgs as builtinExactLauncherPredicateArgs,
} from "kibi-plugin-builtin";

export const LAUNCHER_PREDICATE_RULES = BUILTIN_LAUNCHER_PREDICATE_RULES;
export const exactLauncherPredicateArgs = builtinExactLauncherPredicateArgs;
