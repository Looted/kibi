---
title: 'Forbidden: a failing embedding provider fails the search'
status: active
fact_kind: property_value
subject_key: kibi.search.meaning
property_key: failing_provider_words_alone
operator: eq
value_type: bool
value_bool: false
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:32.915Z'
id: FACT-NEG-search-meaning-fusion-failing-provider-FAILS
type: fact
---
A provider that fails, times out or returns an invalid result gives no scores, so the search ranks by words alone.