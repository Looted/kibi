---
"kibi-cli": patch
"kibi-mcp": patch
---

MCP tool descriptions now say when to pick a tool over its neighbours: `kb_status`, `kb_find_gaps`, `kb_coverage` and `kb_graph` point to each other and to `kb_check`, `kb_query` and `kb_search`. `kb_model`, `kb_compile_intent`, `kb_plan_bootstrap` and `kb_prepare_impact_review` now say which job each one is for. Every input of `kb_find_gaps`, `kb_coverage` and `kb_graph` now has a description, including defaults, how filters combine, and when traversal stops. The `scope` input of `kb_prepare_impact_review` now shows its two accepted shapes; before, MCP clients saw it as an untyped value.
