---
title: Linking a scenario to an existing requirement keeps its semantic inventory
status: active
tags:
  - upsert
  - semantic-inventory
  - scenarios
expects: success
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: test project onboarding round 3 (advisor roles, relationship upserts, review observations)'
  recorded_at: '2026-10-06T20:44:03.843Z'
id: SCEN-kibi-upsert-preserves-requirement-semantics
type: scenario
---
An agent upserts an existing modeled requirement with only its stored title, a status and a new `specified_by` relationship. The write succeeds and the stored inventory, hash and claim list are unchanged; a payload that changes the title or sends a partial ledger is still validated as sent and refused.
