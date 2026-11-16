---
title: Restated twin facts are reported as duplicates
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T10:52:43.948Z'
id: SCEN-NEG-check-restated-twin-facts-REPORTED
type: scenario
---
Given the same two requirements and facts, kibi check must not report the twins as one claim minted twice once restates links the requirements; before the link it does.

packages/cli/tests/consumer/restated-twin-facts.test.ts checks both sides.