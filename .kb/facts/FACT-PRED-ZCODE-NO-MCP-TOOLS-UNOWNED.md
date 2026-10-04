---
title: ZCode MCP exposes no tools in unowned roots
status: active
tags:
  - zcode
  - ontology
fact_kind: predicate
claim_key: CLAIM-A0E2B1D45E38797C
claim_text: When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools
claim_span_start: 992
claim_span_end: 1103
predicate_namespace: kibi_zcode
predicate_name: conditional_behavior
predicate_args:
  - kibi_zcode_adapter
  - no_owned_kb_manifest
  - expose_mcp_tools
canonical_key: conditional_behavior(kibi_zcode_adapter,no_owned_kb_manifest,expose_mcp_tools)
polarity: deny
id: FACT-PRED-ZCODE-NO-MCP-TOOLS-UNOWNED
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools