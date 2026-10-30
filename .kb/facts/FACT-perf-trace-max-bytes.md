---
title: A performance trace shall be at most 524288 bytes
status: active
fact_kind: property_value
subject_key: kibi.perf_trace.limits
claim_key: CLAIM-3620E377E6B7BEAF
claim_text: A performance trace shall be at most 524288 bytes
text_ref: REQ-kibi-perf-trace-limits
property_key: max_bytes
operator: eq
value_type: int
value_int: 524288
origin:
  kind: agent
  recorded_at: '2026-10-28T17:17:00.799Z'
id: FACT-perf-trace-max-bytes
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.