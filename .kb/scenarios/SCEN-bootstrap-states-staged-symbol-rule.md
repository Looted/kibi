---
title: The installed bootstrap skill states the rule and reports the total
status: active
expects: success
tags:
  - bootstrap
  - skills
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-bootstrap-states-staged-symbol-rule
type: scenario
---
Given an installed Kibi, when an agent loads the kibi-bootstrap skill, then its close-out step reads symbolDebt.total from kb_check, states that kibi check --staged judges a commit only on the declarations it adds or changes, and its report includes the unrecorded-declaration total labelled not blocking.

documentation/tests/e2e/packed/check-symbol-debt.test.ts exercises it through the installed CLI.