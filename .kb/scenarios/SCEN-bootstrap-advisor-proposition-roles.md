---
title: Bootstrap plans a conditional claim and an obligation naming a referent as ready requirement candidates
status: active
tags:
  - bootstrap
  - semantic-advisor
  - semantic-inventory
expects: success
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: test project onboarding round 3 (advisor roles, relationship upserts, review observations)'
  recorded_at: '2026-10-06T20:43:39.343Z'
id: SCEN-bootstrap-advisor-proposition-roles
type: scenario
---
Given a source document with a conditional claim and an obligation whose subject uses "refers to" in a relative clause, when the agent plans a bootstrap, both candidates are ready with the advisor's condition and normative roles, `validateBootstrapPayload` accepts them, and applying the plan writes requirements that pass sync and check.
