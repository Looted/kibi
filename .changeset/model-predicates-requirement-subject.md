---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kb_model` mode `predicates` now takes the predicate's subject from the requirement: when `requirementId` names a requirement that constrains a subject fact, the predicate uses that fact's `subject_key`, so the predicate and the subject fact name one subject and contradiction checks see them together. Demo guesses such as `editor.annotation` are no longer applied to a requirement; a requirement without a subject fact leaves `subject` for the agent to bind. `docs/mcp-reference.md` now says that `structuredContent.<field>` paths are shorthand for `structuredContent.data.<field>` inside the protocol envelope.

Technical summary: `handleKbSuggestPredicates` reads the `subject_key` of every subject fact the requirement `constrains`. With exactly one, it binds the schema's `subject` argument with the new binding provenance `requirement` (applicable like `explicit`); with several, they come first in the subject's `bindingHints[].examples`. `subjectHint` and an explicit `argumentBindings.subject` still win. `inferSubject` takes the requirement context and keeps its keyword heuristics for free text without `requirementId`. The kibi-usage skill (2.8.0) names the `structuredContent.data.bindingHints` path and the requirement-bound subject.
