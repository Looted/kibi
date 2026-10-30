---
title: Each telemetry opt-out switch turns telemetry off
status: active
fact_kind: property_value
subject_key: kibi.usage_telemetry
property_key: opt_out_switches_that_disable_telemetry
operator: includes
value_type: set
value_set:
  - 'KIBI_TELEMETRY=0'
  - 'DO_NOT_TRACK=1'
  - 'kibi telemetry disable'
claim_key: CLAIM-3B08B01970785EE6
claim_text: KIBI_TELEMETRY=0, DO_NOT_TRACK=1 and kibi telemetry disable shall each turn telemetry off
tags:
  - lane:ontology
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-10-29T09:39:30.683Z'
id: FACT-PRED-telemetry-opt-out
type: fact
---
KIBI_TELEMETRY=0, DO_NOT_TRACK=1 and kibi telemetry disable shall each turn telemetry off. Grounds one clause of REQ-kibi-anonymous-usage-telemetry as a conditional behavior of anonymous usage telemetry.