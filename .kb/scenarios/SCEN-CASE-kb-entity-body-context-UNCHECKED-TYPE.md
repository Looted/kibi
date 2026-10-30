---
title: Symbols and subject or property value facts are never reported for missing body context
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:59:34.667Z'
id: SCEN-CASE-kb-entity-body-context-UNCHECKED-TYPE
type: scenario
---
Given a symbol, a subject fact and a property value fact with empty bodies, next to a meta fact with an empty body, when the entity context check runs, then it reports only the meta fact and refuses to treat the other types as needing context.

This covers the value outside the set, a checked entity type other than requirements, scenarios, tests, ADRs, observation facts and meta facts. packages/cli/tests/public/entity-context.test.ts "types outside the checked set are never reported, even with an empty body" exercises it.
