---
title: kibi --help lists first sentences and leaves out the narrow routes, which still run
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
id: SCEN-cli-help-command-summaries
type: scenario
---
Given the kibi CLI, when a person runs kibi --help, then each command is listed with the first sentence of its description and the narrow routes (skills-list, skills-load, skills-read, semantic-advisor, model-requirement, suggest-predicates, validate-upsert) are not listed; those commands still run, and kibi <command> --help prints the full description.