---
title: A refused shell command naming .kb/ is forgiven
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - skillopt_cell_score
  - completed_kb_read_or_kb_command_or_kb_write
  - critical_failure
canonical_key: conditional_behavior(skillopt_cell_score,completed_kb_read_or_kb_command_or_kb_write,critical_failure)
polarity: deny
tags:
  - negative-path
  - skillopt
origin:
  kind: agent
  recorded_at: '2026-11-13T19:10:00.000Z'
id: FACT-NEG-skillopt-kb-access-REFUSED-COMMAND-FORGIVEN
type: fact
---
A shell command naming `.kb/` that failed is treated as a refused read, so it costs only the isolation points.