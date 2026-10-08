---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kb_model` mode `predicates` no longer accepts argument bindings that only repeat a field name, such as `before_event: "before_event"`, or a bare stop word such as `action: "be"`. Those values used to complete a predicate and produce a write plan for a meaningless fact; the argument now stays unbound. When bindings are missing, the response lists each unbound argument with its type and example values so agents can bind from the claim text instead of guessing.

`classifyBinding` treats a value equal to its own or another argument name (after snake-case normalization) as a placeholder unless the claim itself names it, and treats trivial verbs, articles and filler words as placeholders; `true`, `false`, the schema's declared `argument_constants` and a subject given through `subjectHint` are still accepted. On `provide_argument_bindings`, `structuredContent.bindingHints` gives `argument`, `position`, `type`, optional `description`, `allowedValues` for a closed vocabulary, `examples` from the constants and the schema's examples, the refused `currentValue` with its `provenance`, and a `reason`; the text summary lists them too. The kibi-usage skill (2.7.0) and `docs/mcp-reference.md` describe the rule.
