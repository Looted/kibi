---
id: FACT-CLI-COMMAND-SET-CORE
title: Core CLI Command Set
status: active
created_at: 2026-02-20T14:25:00Z
updated_at: 2026-04-24T00:00:00Z
tags: [cli, commands]
fact_kind: property_value
subject_key: kibi.cli.surface
property_key: core_command_set
operator: eq
value_type: string
value_string: init,sync,query,check,gc,doctor
polarity: require
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The baseline command set is init, sync, query, check, gc, and doctor.
