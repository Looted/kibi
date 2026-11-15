---
title: 'kibi check rule selection'
status: active
fact_kind: subject
subject_key: kibi.check.rule_selection
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: FACT-SUBJ-kibi-check-rule-selection
type: fact
---

Which rules a kibi check run evaluates and which findings fail it: a plain check runs canonical and advisory rules and skips migration rules, repository configuration cannot disable a canonical rule, and only canonical findings fail.
