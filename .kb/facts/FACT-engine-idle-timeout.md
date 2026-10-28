---
title: The engine daemon shall stop after 600000 milliseconds idle
status: active
fact_kind: property_value
subject_key: kibi.engine.protocol
claim_key: CLAIM-28EA5B8DC7DE84A7
claim_text: The engine daemon shall stop after 600000 milliseconds idle
text_ref: REQ-engine-protocol-settings
property_key: idle_timeout_ms
operator: eq
value_type: int
value_int: 600000
origin:
  kind: agent
  recorded_at: '2026-10-28T19:03:37.410Z'
id: FACT-engine-idle-timeout
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.