---
title: kibi init records the level the person chooses, test by default
status: active
expects: success
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:49:38.203Z'
id: SCEN-kibi-init-level-choice
type: scenario
---
Given kibi init at a terminal, when the person answers remember, then remember is recorded in kibi.level, an empty answer records test, and an answer that names no level is asked again; given kibi init without a terminal, --level is recorded, else test, and nobody is asked. The kibi-bootstrap skill has the agent ask the person before it runs kibi init --level.
