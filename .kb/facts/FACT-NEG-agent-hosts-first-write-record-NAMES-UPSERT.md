---
title: A host capture template that sends the first write of a rule to kb_upsert
status: active
fact_kind: property_value
subject_key: kibi.agent_hosts_decision_guard
property_key: first_write_guidance_not_naming_kb_record
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:17.485Z'
id: FACT-NEG-agent-hosts-first-write-record-NAMES-UPSERT
type: fact
---
A capture template or skill that still sent the first write of a rule to kb_upsert on one host would leave kb_record unused there while every other host uses it.
