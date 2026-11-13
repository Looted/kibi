---
"kibi-runtime": minor
"kibi-cli": minor
"kibi-codex": minor
"kibi-claude": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

The bundled skills now teach agents to keep a knowledge base well formed while they work, not only to pass `kibi check`.

- `kibi-usage` adds "Requirement size and ownership": one requirement states one behavior, a broad requirement is split by behavior and never by sentence, `implements` goes on the function that decides the behavior and not on wrappers or adapters that forward to it, a symbol implements at most two requirements, and an agent checks a requirement's fan-out before adding a link instead of picking whichever requirement has room. An `umbrella` tag is kept for real feature-level rules and never added to clear a finding. Reasons come from the person or from history the agent can cite, and an inferred reason stays labelled as inferred. Context names the current owner after a split. A new `resources/kb-quality.md` gives the cleanup order, split, relink and reason recipes, and the review questions zero findings does not answer. The description now names KB quality work and the review findings so hosts load the skill for it.
- `kibi-traceability` adds "Ownership precision" with the same owner and fan-out rules, and says to read the unfiltered `kb_check` after link work.
- `kibi-commit-review` says which requirement a symbol the staged gate lists belongs to, and runs the unfiltered check before committing, so a commit does not push a requirement over the broad review threshold.
- `kibi-decisions` says a general request such as "clean up the KB" approves no specific statement, reason or retirement, and describes batch approvals.

This release ships `kibi-usage` 2.46.1, `kibi-decisions` 1.9.0, `kibi-traceability` 2.4.0 and `kibi-commit-review` 1.5.0; the other changesets of this release describe their skill changes without version numbers.
