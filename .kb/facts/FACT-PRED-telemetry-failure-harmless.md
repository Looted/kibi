---
title: 'Predicate: not conditional_behavior(kibi_usage_telemetry,telemetry_send_fails,change_command_output_or_exit_code)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_usage_telemetry
  - telemetry_send_fails
  - change_command_output_or_exit_code
canonical_key: conditional_behavior(kibi_usage_telemetry,telemetry_send_fails,change_command_output_or_exit_code)
polarity: deny
claim_key: CLAIM-3EDC3389D69BBE83
claim_text: A telemetry failure shall not change a command's output or exit code
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-10-29T09:39:34.392Z'
id: FACT-PRED-telemetry-failure-harmless
type: fact
---
A telemetry failure shall not change a command's output or exit code. Grounds one clause of REQ-kibi-anonymous-usage-telemetry as a conditional behavior of anonymous usage telemetry.