---
title: Telemetry-enabled SkillOpt harness child process count = 0
status: active
fact_kind: property_value
subject_key: kibi.skillopt.harness_child_processes
property_key: telemetry_enabled_process_count
canonical_key: kibi.skillopt.harness_child_processes:telemetry_enabled_process_count:eq:0
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-5D1284F40FCE29D5
claim_text: Every process the SkillOpt evaluation harness starts shall run with Kibi telemetry turned off
tags:
  - lane:strict
  - fact:property_value
  - skillopt
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-13T10:00:00.000Z'
id: FACT-skillopt-harness-telemetry-enabled-process-count-zero
type: fact
---
No process the SkillOpt evaluation harness starts runs with Kibi telemetry on. Grounds the clause of REQ-skillopt-harness-telemetry-silent as a count of harness child processes with telemetry enabled.