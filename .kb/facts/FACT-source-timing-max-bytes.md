---
title: A source analysis timing trace shall keep at most 524288 bytes
status: active
fact_kind: property_value
subject_key: kibi.source_analysis.timing_limits
claim_key: CLAIM-B83A4C1A65B84520
claim_text: A source analysis timing trace shall keep at most 524288 bytes
text_ref: REQ-source-analysis-timing-limits
property_key: max_timing_bytes
operator: eq
value_type: int
value_int: 524288
origin:
  kind: agent
  recorded_at: '2026-10-29T10:51:37.839Z'
id: FACT-source-timing-max-bytes
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.