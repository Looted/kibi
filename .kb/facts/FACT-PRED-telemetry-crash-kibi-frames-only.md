---
title: 'Predicate: conditional_behavior(telemetry_event,kibi_fault_event,carry_only_kibi_package_frames)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - kibi_fault_event
  - carry_only_kibi_package_frames
canonical_key: conditional_behavior(telemetry_event,kibi_fault_event,carry_only_kibi_package_frames)
polarity: assert
claim_key: CLAIM-AA19A95F6762621C
claim_text: A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T14:22:32.674Z'
id: FACT-PRED-telemetry-crash-kibi-frames-only
type: fact
---
A telemetry event for a Kibi fault shall carry only stack frames from Kibi's own packages. Grounds one clause of REQ-kibi-telemetry-agent-signals as a conditional behavior of telemetry events.