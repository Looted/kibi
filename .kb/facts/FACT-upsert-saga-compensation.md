---
title: Upsert rollback is a declared compensation-list saga (MutationSaga; source, shards, coordinates; reverse-order single pass; source rollback failures aggregate)
status: active
fact_kind: meta
tags:
  - refactor
  - rollback
id: FACT-upsert-saga-compensation
type: fact
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
Upsert used to track its rollback by hand in local variables, and a failed rollback of the authored source was silently swallowed. Declaring the steps as a saga undoes them exactly once in reverse order, and now reports that failure. Source: commit "declare upsert rollback as a compensation-list saga".
