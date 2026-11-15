---
title: MCP relationship preflight rejects invalid relationship targets
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: mcp.kb_upsert
canonical_key: req.req_mcp_relationship_preflight
id: FACT-SUBJ-REQ-MCP-RELATIONSHIP-PREFLIGHT
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kb_upsert write operation as exposed over MCP and the CLI: its preflight of relationship targets and proposition ledgers, the claim key it returns for a stored fact, and the error envelopes that tell the caller what one resend needs. It is the write path, not the checks run afterwards.
