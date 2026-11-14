---
title: A refused .kb/ read zeroes the cell
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - skillopt_cell_score
  - host_refused_kb_read
  - isolation_points_lost_only
canonical_key: conditional_behavior(skillopt_cell_score,host_refused_kb_read,isolation_points_lost_only)
polarity: deny
tags:
  - negative-path
  - skillopt
origin:
  kind: agent
  recorded_at: '2026-11-13T19:10:00.000Z'
id: FACT-NEG-skillopt-refused-kb-read-ZEROES-CELL
type: fact
---
A read of a `.kb/` path that the host refused is scored as `direct_kb_access` and the cell scores 0.