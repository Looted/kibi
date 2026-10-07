---
title: A scenario with its prose in properties gets a usable error
status: active
priority: must
tags:
  - upsert
  - validation
  - skills
expects: success
origin:
  kind: agent
  recorded_at: '2026-10-07T12:28:25.919Z'
id: SCEN-upsert-unknown-field-guidance
type: scenario
---
Given an agent upserts a scenario whose prose sits in a body property, when validation rejects it, then the error names 'body' and says scenario prose belongs in document.body; when several unknown properties are present, all of them are named. Given the scenario example in the kibi-bootstrap skill, when it is validated as an upsert, then it passes and its document body has enough context for kibi check.

The case comes from an evaluation run where 95 scenario writes failed before the agent found document.body.