---
title: A performance trace shall hold at most 5000 events
status: active
fact_kind: property_value
subject_key: kibi.perf_trace.limits
claim_key: CLAIM-55F3786ECA1A6DD0
claim_text: A performance trace shall hold at most 5000 events
text_ref: REQ-kibi-perf-trace-limits
property_key: max_events
operator: eq
value_type: int
value_int: 5000
origin:
  kind: agent
  recorded_at: '2026-10-28T17:17:01.833Z'
id: FACT-perf-trace-max-events
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.