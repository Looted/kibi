---
title: 'Forbidden: a broad search or a Glob gets rows'
status: active
fact_kind: property_value
subject_key: kibi.host.read_rows
property_key: search_rows_beyond_qualifying_matches
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:27:57.221Z'
id: FACT-NEG-hook-search-rows-BROAD-SEARCH-ROWS
type: fact
---
A a search whose matches qualify more than 6 requirements, or a Glob, when the hook shows rows for it leaves the agent without the rule, or floods it.
