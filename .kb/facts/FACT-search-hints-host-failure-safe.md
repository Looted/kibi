---
title: Gives no hints and a diagnostic when the provider fails
status: active
fact_kind: property_value
subject_key: kibi.search.hints
property_key: fails_open_with_diagnostic
operator: eq
value_type: bool
value_bool: true
canonical_key: kibi.search.hints.fails_open_with_diagnostic.eq.true
claim_key: CLAIM-73FFF7BAEB1625ED
claim_text: A search hints provider that fails, times out or returns an invalid result must give no hints and a diagnostic, and the search must still answer
text_ref: packages/cli/src/search-hints.ts
origin:
  kind: agent
  recorded_at: '2026-10-29T19:21:35.973Z'
id: FACT-search-hints-host-failure-safe
type: fact
---
