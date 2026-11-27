---
title: At level remember the full profile lists the knowledge tools and the instructions name the hidden ones as CLI commands
status: active
expects: success
tags:
  - levels
  - tool-surface
origin:
  kind: agent
  recorded_at: '2026-11-26T10:32:59.055Z'
id: SCEN-kibi-remember-level-tool-list
type: scenario
---
Given a project at level remember whose knowledge base has entities and no impact policy, when the MCP server starts with the full profile, then it lists kb_query, kb_search, kb_status, kb_skills, kb_graph, kb_model, kb_upsert, kb_record, kb_delete, kb_check, kb_review_firm_edit and kb_apply_plan, and its initialize instructions name kb_find_gaps, kb_coverage, kb_prepare_impact_review, kb_author_impact_review, kb_plan_bootstrap and kb_compile_intent as project CLI commands but not kb_ingest_proof. On an empty knowledge base it also lists kb_plan_bootstrap and kb_compile_intent, and with .kibi/impact-policy.json it also lists the impact-review pair.