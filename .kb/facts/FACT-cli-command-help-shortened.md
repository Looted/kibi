---
title: Command help that prints a shortened description
status: active
fact_kind: property_value
subject_key: kibi.cli.surface
property_key: command_help_shortened_description_count
operator: gt
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
id: FACT-cli-command-help-shortened
type: fact
---
Scenario input: kibi <command> --help prints the one-sentence summary instead of the command's full description.