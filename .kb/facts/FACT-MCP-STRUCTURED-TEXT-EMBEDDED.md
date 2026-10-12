---
title: A discovery result sent to any other host carries the data JSON before the summary unless the override says otherwise
status: active
tags:
  - lane:ontology
  - mcp
  - search-lane
text_ref: .kb/requirements/REQ-mcp-structured-text-per-host.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.mcp.tool_schema,discovery_result_sent_to_other_host,data_json_before_summary_unless_env_overrides)
claim_key: CLAIM-7B233B2A76D2D2E2
claim_text: A discovery tool result sent to any other host must carry the data JSON before the text summary unless KIBI_MCP_STRUCTURED_TEXT says otherwise
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.mcp.tool_schema
  - discovery_result_sent_to_other_host
  - data_json_before_summary_unless_env_overrides
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T20:32:07.796Z'
id: FACT-MCP-STRUCTURED-TEXT-EMBEDDED
type: fact
---
For every host not known to show `structuredContent`, a discovery tool result keeps the `data` JSON in front of its text summary, so hosts that hide `structuredContent` still see the machine-readable answer. `KIBI_MCP_STRUCTURED_TEXT=omit` or `embed` overrides the host-based choice on any host.

## Context

Search-lane round 1 (G5/G15). The copy stays the default for unknown hosts because only Claude Code was verified to show `structuredContent`; the override lets an operator correct the choice for another host without a release.