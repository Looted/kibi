---
title: Generic Markdown candidates are kept out when intent claims are declared and the caller did not ask for them
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:24.101Z'
id: SCEN-NEG-bootstrap-discovered-candidate-budget-GENERIC-MARKDOWN
type: scenario
---
Given a repository with generic Markdown requirement lines and a bootstrap context that declares intent claims, when the planner runs without includeGenericMarkdown, then no generic Markdown candidate is planned; setting the flag brings them back.

This is the failure side of the discovered candidate budget: generic Markdown must not crowd out declared intent by default. packages/cli/tests/operations/bootstrap.test.ts "declared intent claims turn generic Markdown off unless the caller sets it" exercises it.
