---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Bootstrap plans now name what to compare for intent claims they cannot model, not only for the claims they plan. A claim left as "Intent claim needs authoring" next to a prose-only current requirement on the same topic gets a `conflict-review:` diagnostic naming that requirement, with an instruction to compare the two when the claim is compiled with `kb_compile_intent` and to report the verdict through `conflictReviews`; the knowledge-source summary and `recommendedActions` count those claims. The pre-commit hook (`kibi check --staged`) now blocks an entity document the commit adds or edits without the body context that full `kibi check` requires (`entity-context-missing`), so a commit can no longer carry an entity `kb_upsert` warned about.

Migration: commits that add or edit a requirement, scenario, test, ADR or observation fact without body context are now refused by the hook. Entities that already lacked context at the last commit, and entities the schema 8 migration acknowledged in `.kb/manifest.json`, are not blocked, so migration commits and edits to legacy entities keep passing; add a `## Context` section (requirements) or a prose body to new entities.

A `kb_upsert` refused for a coarse symbol link now returns a coded error (`SYMBOL_GRANULARITY_VIOLATION`) in the MCP error envelope and the CLI JSON route, with the same message; before, only a dry run carried a code. The candidates in that message, and in the hook's `symbol_granularity_violation`, list functions, methods and accessors before properties. `kb_status` `schemaStatus.warning` on a legacy KB without a manifest now says to run `kibi migrate --yes`, matching `bootstrap.nextAction` and `kibi doctor`.
