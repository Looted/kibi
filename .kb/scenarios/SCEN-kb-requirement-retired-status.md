---
title: A retired requirement stops governing and its leftovers are reported
status: active
priority: must
tags:
  - kb
  - lifecycle
  - retired-status
origin:
  kind: agent
  recorded_at: '2026-11-11T17:31:14.005Z'
id: SCEN-kb-requirement-retired-status
type: scenario
---
**Scenario: retiring a requirement whose behavior is gone**

**GIVEN** a requirement with `status: retired` and a `retired_reason`, a fact only it grounds, a fact it shares with a closed requirement, and a second retired requirement without a reason
**WHEN** an agent runs `kibi sync`, `kibi check` and `kb_search` for the retired behavior
**THEN** `kibi check` reports the unshared fact under `retired-owner-only` and the unexplained requirement under `retired-reason-missing`, and nothing else under those rules
**AND** the search answer does not list either retired requirement as governing.

This is the case behind the rule: a requirement retired on 2026-10-30 kept being served as governing because `closed` was its only way to stop.