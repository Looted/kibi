---
title: kb_search takes a question in place of a missing query
status: open
priority: must
required_evidence: tested
tags:
  - mcp
  - validation
  - search
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-26, approving the kb_search question alias statement (issue 894) as worded: "Approve as worded" (decision card, 10:51Z). Requested as: "Please just start a thread and address it." Issue 894: in the Nov 26 benchmark pilot 7 of 91 kb_search calls sent question instead of query and failed.'
  recorded_at: '2026-11-26T11:04:33.372Z'
rationale: Agents that call kb_search before its schema is in their prompt send question, and each refused call cost a round trip in which some hosts print the whole input schema (about 5,200 characters in the Nov 26 pilot, 7 of 91 calls).
semantic_text: kb_search must accept question in place of query on MCP and on the CLI JSON route when the input has no query.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 25f58dc0801292ec116b22394ea1c37aac0eb75d277d2223916148035c7b3b51
semantic_inventory:
  - claim_key: CLAIM-BE650ABBB3E59D62
    claim_text: kb_search must accept question in place of query on MCP and on the CLI JSON route when the input has no query
    role: normative
    status: modeled
    span:
      start: 0
      end: 109
logic_claims:
  - CLAIM-BE650ABBB3E59D62
id: REQ-kb-search-question-alias
type: req
---
kb_search must accept question in place of query on MCP and on the CLI JSON route when the input has no query.

## Context

Agents that call kb_search before its schema is in their prompt send question, and each refused call cost a round trip in which some hosts print the whole input schema (about 5,200 characters in the Nov 26 pilot, 7 of 91 calls).

## Source

> Maintainer decision, 2026-11-26: "Approve as worded" for the statement above (issue 894).
