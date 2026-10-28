---
title: The engine daemon shall check for idleness every 30000 milliseconds
status: active
fact_kind: property_value
subject_key: kibi.engine.timing
claim_key: CLAIM-6F3C9F99EC24CC90
claim_text: The engine daemon shall check for idleness every 30000 milliseconds
text_ref: REQ-engine-timing-settings
property_key: idle_check_ms
operator: eq
value_type: int
value_int: 30000
origin:
  kind: agent
  recorded_at: '2026-10-28T20:45:42.853Z'
id: FACT-engine-idle-check
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.