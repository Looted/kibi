---
title: A source analysis shall keep at most 5000 timing events
status: active
fact_kind: property_value
subject_key: kibi.source_analysis.timing_limits
claim_key: CLAIM-D49D2FEFA9168696
claim_text: A source analysis shall keep at most 5000 timing events
text_ref: REQ-source-analysis-timing-limits
property_key: max_timing_events
operator: eq
value_type: int
value_int: 5000
origin:
  kind: agent
  recorded_at: '2026-10-29T10:51:36.587Z'
id: FACT-source-timing-max-events
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.