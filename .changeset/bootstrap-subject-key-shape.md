---
"kibi-cli": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Bootstrap plans no longer write subject keys that Kibi's own `subject-key-shape` rule flags. Declare the component a knowledge source or an intent claim is about (`component: "recorder"`) and the plan uses keys such as `recorder.beginning_to_record_while_idle`; a claim Kibi cannot place is reported in the plan diagnostics and left as an authoring follow-up instead. Intent claims can also carry the `rationale` the source or the human gave, which becomes the requirement's `rationale` and `## Context`.

`bootstrapContext.knowledgeSources[].component`, `intentClaims[].component` and `intentClaims[].rationale` are new optional fields bound into the plan hash only when declared. Subject keys keep an already dotted subject, use a one-word subject as the component with the constrained property as the aspect, and otherwise prefix the declared component; repository Markdown takes its component from the file or directory name. The kibi-bootstrap skill (3.6.0) asks the human for the reason behind a requirement whose source states none, and sets scenario `expects` only when the scenario links `assumes` facts, so draft scenarios tagged `needs-human-review` no longer raise `scenario-feasibility-unknown`. The kibi-usage skill (2.6.0) and `docs/modeling-cheatsheet.md` match.
