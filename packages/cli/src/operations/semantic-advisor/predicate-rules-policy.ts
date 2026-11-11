/**
 * Single source of truth: re-export builtin ontology rule tables so CLI
 * coverage/tests cannot drift from kibi-plugin-builtin.
 */
import { POLICY_PREDICATE_RULES as BUILTIN_POLICY_PREDICATE_RULES } from "kibi-plugin-builtin";

export const POLICY_PREDICATE_RULES = BUILTIN_POLICY_PREDICATE_RULES;
