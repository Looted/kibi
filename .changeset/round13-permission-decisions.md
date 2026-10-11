---
"kibi-cli": minor
"kibi-core": minor
"kibi-runtime": patch
---

Permission statements written with a plain "can", "may" or "are permitted to" ("Coaches can read analysis requests that are not assigned to them.") are now modelled as `permission_rule` facts instead of being rejected as non-normative prose. And an allow and a deny for the same actor, action and resource now contradict: `kb_check` (`domain-contradictions`) and the commit-time check of `kb_upsert` (including `dryRun`) report "Decision conflict on default:permission_rule(coach,read,…)" for the pair.

Technical summary: the predicate applicability gate accepts bare `can`/`may` modals, `is/are (not) allowed/permitted to` and `permitted`; the semantic advisor's normative-assertion detector accepts only the explicit grant forms (`is/are (not) allowed/permitted to`, `permitted`), so descriptive "can" sentences in existing requirements are not reclassified; the `permission_rule` intent cue, catalog keywords and exact-pattern scorer accept `permitted` and plural `are … to` forms. The built-in `permission_rule` schema declares `key_arguments: [actor, action, resource]`, and kibi-core adds a `req_conflict_witness/3` clause: two `requires_predicate` facts of a decision predicate (the built-in `permission_rule`, or a project schema that declares `key_arguments` and a non-key `decision` argument) that agree on every key argument but whose decisions resolve to allow and deny (a deny decision counts as a denial whatever its polarity) are a contradiction. `docs/inference-rules.md` documents the rule.
