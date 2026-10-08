---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The ontology-gap observation that `kb_model` mode `predicates` returns can now be written with `kb_upsert` exactly as returned. Before, every such plan was rejected because it linked the observation to the `review:ontology-gap` tag as if the tag were an entity, and it carried a `claim_key` that made a review note look like a semantic claim. The `replace_grounding` plan is now also directly applicable: its requirement step restates the stored title, status and tags, and the response says why the steps must run in order.

The gap observation keeps `claim_text`, `value_string` and `text_ref`, drops `claim_key` and the tag relationship, and adds a `document.body` saying that no predicate schema fits and quoting the claim, so schema 8's `entity-context-missing` passes. Semantic-advisor review observations (`review:ambiguity`, `review:keyword-false-positive`, `review:ontology-gap`, `review:nonlogical`) likewise keep their category in `tags` only and carry a body. `replacementPlan` adds a `rollback` step that restores the retracted link if the last step fails, and its instructions note that `kb_check` reports `logic-coverage` between the retraction and the new link. A new MCP stdio test applies both plans through the real server. The kibi-usage skill (2.7.0) and `docs/mcp-reference.md` describe the shapes, and `docs/mcp-reference.md` and `docs/error-reference.md` explain that the `rdf/lock` left after a session belongs to the shared engine daemon, which exits after 10 idle minutes.
