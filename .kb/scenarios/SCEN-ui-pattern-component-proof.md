---
title: A UI pattern requirement is proven by a component test until it gains a layout fact
status: active
tags:
  - proof
  - ui
  - proof-ladder
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:13:33.357Z'
id: SCEN-ui-pattern-component-proof
type: scenario
---
Given a requirement grounded only in ui_pattern and same_pattern facts, specified by a scenario that a unit-scope test verifies with a fresh passing receipt, when the proof ladder runs, then the scenario obligation lists acceptedScopes unit, integration and end_to_end and the passing E2E stage counts that unit test. Given the same requirement after a ui_container fact is linked to it, when the proof ladder runs, then the obligation lists only end_to_end, the unit test is reported as not end-to-end and the requirement shows missing_passing_e2e.
