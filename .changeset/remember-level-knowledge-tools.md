---
"kibi-mcp": minor
---

At Kibi level `remember`, the MCP server's `full` tool profile now lists only the knowledge tools: `kb_query`, `kb_search`, `kb_status`, `kb_skills`, `kb_graph`, `kb_model`, `kb_upsert`, `kb_record`, `kb_delete`, `kb_check`, `kb_review_firm_edit` and `kb_apply_plan`. It adds `kb_plan_bootstrap` and `kb_compile_intent` while the knowledge base is empty, and `kb_prepare_impact_review` and `kb_author_impact_review` while the project has an impact policy (`.kibi/impact-policy.json`). The server instructions name `kb_find_gaps`, `kb_coverage` and the hidden planning tools as project CLI commands, which still run them. At level `test` nothing changes.

Before this change a remember session listed 18 tools. Now it lists 12, which is about 58,000 characters of tool definitions fewer for hosts that load every schema up front. The server decides the list, so it is the same in every host and for any MCP client.
