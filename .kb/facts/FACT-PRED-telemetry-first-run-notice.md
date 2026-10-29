---
title: 'Predicate: conditional_behavior(kibi_usage_telemetry,first_recording_run,print_opt_out_notice)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_usage_telemetry
  - first_recording_run
  - print_opt_out_notice
canonical_key: conditional_behavior(kibi_usage_telemetry,first_recording_run,print_opt_out_notice)
polarity: assert
claim_key: CLAIM-5CE2F792D0C02825
claim_text: The first run that records telemetry shall print a one-time notice that names how to turn it off
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-10-29T09:39:33.175Z'
id: FACT-PRED-telemetry-first-run-notice
type: fact
---
The first run that records telemetry shall print a one-time notice that names how to turn it off. Grounds one clause of REQ-kibi-anonymous-usage-telemetry as a conditional behavior of anonymous usage telemetry.