---
title: A committed kb_record that returns no gate verdict
status: active
fact_kind: property_value
subject_key: kibi.kb_record
property_key: committed_records_without_gate_verdict
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T06:41:42.715Z'
id: FACT-NEG-kb-record-returns-verdict-NO-VERDICT
type: fact
---
A committed kb_record that returned the write result alone, without the commit gate's verdict and every finding's blocks value, would leave the agent to learn at commit time what the gate refuses.
