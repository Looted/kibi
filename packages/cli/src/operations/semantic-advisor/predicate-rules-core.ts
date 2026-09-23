/**
 * Single source of truth: re-export builtin ontology rule tables so CLI
 * coverage/tests cannot drift from kibi-plugin-builtin.
 */
// implements REQ-capability-plugin-builtin-parity-v1
import { CORE_PREDICATE_RULES as BUILTIN_CORE_PREDICATE_RULES } from "kibi-plugin-builtin";

export const CORE_PREDICATE_RULES = BUILTIN_CORE_PREDICATE_RULES;
