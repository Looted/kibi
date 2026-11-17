---
title: A minted symbol id is one another record already holds
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: minted_symbol_ids_already_held
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T19:07:14.266Z'
id: FACT-NEG-symbol-id-minting-VIOLATED
type: fact
---
A symbol id minted for a new record is the id of an existing entity or of another record minted in the same call.