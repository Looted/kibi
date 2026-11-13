---
title: A must requirement written after the upgrade states its positive behaviour, and feasibility refuses it
status: active
priority: must
expects: success
tags:
  - kb
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-13T04:00:00.000Z'
id: SCEN-kb-must-positive-scenario
type: scenario
---
**Scenario: a new must requirement on a subject another requirement already constrains**

**GIVEN** a knowledge base upgraded to schema 17, a must requirement recorded before the upgrade that the remaining call quota must be greater than 0, and a new must requirement, never modeled, that a free-tier client can call with no calls remaining, whose claim names the call quota subject
**WHEN** an agent runs `kibi check`
**THEN** the old requirement passes must-positive-scenario because the upgrade recorded it, and the new one is reported until a scenario that expects success specifies it and assumes a fact on the call quota subject
**AND** once that scenario assumes the quota is used up, must-positive-scenario passes and scenario-feasibility refuses the scenario, naming the quota requirement.
