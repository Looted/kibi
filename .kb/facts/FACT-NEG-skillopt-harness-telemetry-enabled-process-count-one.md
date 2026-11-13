---
title: One SkillOpt harness child process runs with telemetry on
status: active
fact_kind: property_value
subject_key: kibi.skillopt.harness_child_processes
property_key: telemetry_enabled_process_count
canonical_key: kibi.skillopt.harness_child_processes:telemetry_enabled_process_count:eq:1
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
  - skillopt
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-13T10:00:00.000Z'
id: FACT-NEG-skillopt-harness-telemetry-enabled-process-count-one
type: fact
---
With `KIBI_TELEMETRY=1` in the operator's environment, one harness child (a fixture CLI run or a bounded child process) runs with telemetry on.