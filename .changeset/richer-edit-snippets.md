---
"kibi-claude": minor
"kibi-agent-core": minor
---

When you edit a file that implements a requirement, the Claude Code hook now also says what that requirement must keep true and the decision behind it, not just its ID. The extra lines come from the requirement's linked facts and ADR, so agents see the constraint before they change the code.

- Edit snippets add "`<REQ>` must keep true: …" (up to two facts linked via `constrains`, `requires_property`, `requires_predicate` or `requires_rule`) and "Decision: `<ADR>`" for the lead requirement.
- `readEntitySummary` returns frontmatter `links` (plain entries read as `relates_to`; `type` and `target` in either order) merged with the entity's records in `.kb/relationships` shards, so grounding stored only in shards still reaches the snippet.
- A superseded, deprecated or retired lead requirement gets no "must keep true" or "Decision" lines, so retired policy is not shown as current.
- Session and discovery hints point at `kb_search` questions and its answer layer instead of asking for `rankingMode: "intent-v1"`, which is now the default.
