---
title: The engine shall give Prolog 1000 milliseconds to exit
status: active
fact_kind: property_value
subject_key: kibi.engine.timing
claim_key: CLAIM-9393D46F1A874F0D
claim_text: The engine shall give Prolog 1000 milliseconds to exit
text_ref: REQ-engine-timing-settings
property_key: exit_grace_ms
operator: eq
value_type: int
value_int: 1000
origin:
  kind: agent
  recorded_at: '2026-10-28T20:45:44.092Z'
id: FACT-engine-exit-grace
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.