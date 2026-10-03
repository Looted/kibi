---
title: kb_upsert dryRun writes nothing and reports both write effects skipped
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.mcp.tool_schema
  - upsert_dry_run
  - writes_nothing_reports_write_effects_skipped
canonical_key: logical_requirement_rule(kibi.mcp.tool_schema,upsert_dry_run,writes_nothing_reports_write_effects_skipped)
polarity: assert
claim_key: CLAIM-E585A68D91DF9E33
claim_text: kb_upsert with dryRun true must write nothing and report both write effects as skipped in place of kb_validate_upsert
text_ref: .kb/requirements/REQ-kibi-mcp-tool-consolidation.md
tags:
  - lane:ontology
  - parity
id: FACT-MCP-UPSERT-DRY-RUN-NO-WRITE
type: fact
---
