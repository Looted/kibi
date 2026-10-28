---
title: The failed source extraction code shall be source_extraction_failed
status: active
fact_kind: property_value
subject_key: kibi.sync.extraction_failure
claim_key: CLAIM-0874142625D2A148
claim_text: The failed source extraction code shall be source_extraction_failed
text_ref: REQ-uncompiled-source-code
property_key: failure_code
operator: eq
value_type: string
value_string: source_extraction_failed
origin:
  kind: agent
  recorded_at: '2026-10-28T19:08:20.824Z'
id: FACT-source-extraction-failed
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.