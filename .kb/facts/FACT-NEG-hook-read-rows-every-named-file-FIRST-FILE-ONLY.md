---
title: 'Forbidden: a shell read describes only its first linked file'
status: active
fact_kind: property_value
subject_key: kibi.host.read_rows
property_key: named_linked_files_left_undescribed
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:27:39.820Z'
id: FACT-NEG-hook-read-rows-every-named-file-FIRST-FILE-ONLY
type: fact
---
A a shell command that names two linked files, when only the first file gets rows leaves the agent without the rule, or floods it.
