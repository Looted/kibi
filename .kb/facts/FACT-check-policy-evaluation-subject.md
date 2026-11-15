---
title: Check policy evaluation
status: active
tags:
  - strict-lane
  - plugins
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:12:44.343Z'
fact_kind: subject
subject_key: check_policy.evaluation
id: FACT-check-policy-evaluation-subject
type: fact
---

How kb_check reads and enforces activated check policies: plugin-provided rule sets read as JSON data without importing plugin code, with the check blocking when a policy cannot be read. It is the evaluation of those policies, not the built-in check rules.
