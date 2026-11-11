---
title: tools/list exposes 16 tools by default; kb_sparql_remote and kb_job_status register only when KIBI_MCP_OPTIONAL_TOOLS names them
status: active
fact_kind: observation
tags:
  - mcp
  - test-fix
id: FACT-mcp-tools-list-count
type: fact
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
The tool count is asserted by tests and contract fixtures, so it's recorded here. The optional tools register only on request, which keeps the default surface at 16. Source: commits "update tools/list count expectation for kb_job_status" and "model truthful consistency…"; PR 329.
