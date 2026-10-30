---
title: A search without a limit returns at most ten ranked rows
status: active
tags:
  - lane:ontology
  - search
  - search-lane
text_ref: .kb/requirements/REQ-mcp-structured-text-per-host.md
fact_kind: property_value
subject_key: kibi.discovery.search
property_key: ranked_rows_returned_without_limit
operator: lte
value_type: int
value_int: 10
claim_key: CLAIM-97FC48AA9C1EA797
claim_text: A kb_search without a limit must return at most 10 ranked rows
origin:
  kind: agent
  recorded_at: '2026-10-11T20:32:13.554Z'
id: FACT-SEARCH-DEFAULT-LIMIT-TEN
type: fact
---
`kb_search` and `kibi search` return at most 10 ranked rows when the caller gives no `limit`; `count` still reports the size of the whole ranking and `truncated` says whether more pages remain, so a caller that needs more raises `limit` or pages with `offset`.

## Context

Search-lane round 1 (G5): with the answer layer on, 20 default rows made the A2/A5 answers 62-66 KB; the answer layer already names the governing requirements, so the ranked list is a shorter companion by default.