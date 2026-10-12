---
"kibi-cli": patch
"kibi-plugin-builtin": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Permission grants written the way product owners write them now model as permission rules. `kb_model` (mode predicates) accepted "may", "can", "is allowed to" and "are permitted to" but rejected "must be able to", "are able to", "have permission to" and "are entitled to" with "required semantic cue absent", so a requirement such as "An admin must be able to read any analysis request" ended as an ontology gap even with complete argument bindings. The semantic advisor now also treats "have permission to" and "are entitled to" as normative clauses, and inferred permission bindings drop the leading article and singularise the resource, so "any analysis request" and "analysis requests" bind the same actor, action and resource key that the allow/deny contradiction check compares.

- `predicate-applicability.ts`: the permission_rule cue and the normative-intent gate accept `must/shall/should be able to`, `is/are able to`, `is/are entitled to` and `has/have permission to`, including the common-verb form right after the grant.
- `clauses.ts`: `has/have (no) permission to` and `is/are (not) entitled to` are normative assertions; bare `is/are able to` stays descriptive so stored inventories keep their roles.
- `predicate-inference-1.ts`: grant and prohibition forms of the new cues bind actor, action, resource and decision; actors and resources lose their determiner and resources are singular.
- The builtin semantic classifier's permission signal recognises `permitted`, `able to`, `entitled to` and `permission to`.
- kibi-usage 2.15.1: the deny example shows the singular resource and lists the grant wordings `permission_rule` accepts.
