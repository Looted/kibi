---
title: A state_machine proof would accept a waypoint that one path bypasses
status: active
fact_kind: property_value
subject_key: kibi.source_proof
property_key: state_machine_waypoint_misdecisions
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:43.430Z'
id: FACT-CASE-kibi-source-proof-kinds-bypassed-waypoint
type: fact
---
The attempt the model checker must refuse: a required-waypoint claim for a pair of states where one path does not pass through the waypoint.