---
title: Discovery results reach each MCP host once and kb_search pages at ten rows by default
status: open
required_evidence: tested
tags:
  - mcp
  - search
  - search-lane
priority: must
semantic_text: A discovery tool result sent to a host that shows structuredContent must carry the text summary alone without a copy of the data JSON. A discovery tool result sent to any other host must carry the data JSON before the text summary unless KIBI_MCP_STRUCTURED_TEXT says otherwise. A kb_search without a limit must return at most 10 ranked rows.
logic_claims:
  - CLAIM-D65CD1D40555402F
  - CLAIM-7B233B2A76D2D2E2
  - CLAIM-97FC48AA9C1EA797
semantic_clauses:
  - A discovery tool result sent to a host that shows structuredContent must carry the text summary alone without a copy of the data JSON.
  - A discovery tool result sent to any other host must carry the data JSON before the text summary unless KIBI_MCP_STRUCTURED_TEXT says otherwise.
  - A kb_search without a limit must return at most 10 ranked rows.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: Search-lane round 1 measured every kb_search answer on the test project at about twice its payload because the text part repeated the data JSON that Claude Code already shows from structuredContent, and the 20-row default made the two largest answers 62-66 KB; the host-aware text and the ten-row default cut both without hiding the answer from hosts that only read text.
semantic_source_hash: d81e4aa2553fda7e1224052a3a893bec7942222f69a88f147516613d23b8ac21
semantic_inventory:
  - claim_key: CLAIM-D65CD1D40555402F
    claim_text: A discovery tool result sent to a host that shows structuredContent must carry the text summary alone without a copy of the data JSON
    role: normative
    span:
      start: 0
      end: 133
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-7B233B2A76D2D2E2
    claim_text: A discovery tool result sent to any other host must carry the data JSON before the text summary unless KIBI_MCP_STRUCTURED_TEXT says otherwise
    role: exception
    span:
      start: 135
      end: 277
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-97FC48AA9C1EA797
    claim_text: A kb_search without a limit must return at most 10 ranked rows
    role: normative
    span:
      start: 279
      end: 341
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
origin:
  kind: agent
  recorded_at: '2026-10-11T20:40:57.789Z'
id: REQ-mcp-structured-text-per-host
type: req
---
# Discovery results reach each MCP host once and kb_search pages at ten rows by default

The MCP tool wrapper embeds a discovery tool's `data` JSON in its text part only for hosts that may hide `structuredContent`. `KIBI_MCP_STRUCTURED_TEXT=embed|omit` decides outright; otherwise the host named by `KIBI_MCP_HOST` (set by the host launchers) or by the client's initialize name decides, and only hosts known to show `structuredContent` (`claude-code`) receive the text summary alone. `kb_search` and `kibi search` return ten ranked rows when the caller gives no `limit`; `count` and `truncated` say when to page or raise it.

## Context

Asked by the project owner through the search-lane fix PRs (fix 6, payload size). Search-lane round 1 on the test project measured every kb_search answer at about twice its payload (G15: the text part was `JSON.stringify(data)` plus the summary) and the two largest answers at 62-66 KB with the 20-row default (G5). Only Claude Code was verified to show `structuredContent` to the agent, so other hosts keep the JSON copy and an operator can override the choice with `KIBI_MCP_STRUCTURED_TEXT`.