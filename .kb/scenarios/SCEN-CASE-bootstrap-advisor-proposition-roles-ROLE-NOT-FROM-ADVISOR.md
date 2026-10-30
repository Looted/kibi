---
title: An obligation that reads like a definition keeps the advisor's normative role in a bootstrap candidate
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:40.718Z'
id: SCEN-CASE-bootstrap-advisor-proposition-roles-ROLE-NOT-FROM-ADVISOR
type: scenario
---
Given declared intent claims where one obligation uses the definition verb "refers to" inside a relative clause and one is conditional, so a role guessed from the wording would differ from the advisor's, when the bootstrap planner plans them, then each requirement candidate's semantic inventory carries the advisor's role (normative and condition), the payloads pass validateBootstrapPayload and nothing is suppressed, so no candidate records a role the advisor did not give.

The test case "plans conditional claims and obligations naming a referent with the advisor's roles" in packages/cli/tests/operations/bootstrap-intent-claims.test.ts exercises it. It covers the value past the bound, `gt 0`, of inventory roles not taken from the advisor.