---
title: kibi migrate suggests the subject an unanchored claim is about and writes it only once approved
status: active
priority: must
tags:
  - kb
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-12T20:00:00.000Z'
id: SCEN-kb-domain-subject-layer-migration
type: scenario
---
**Scenario: the migration suggests, a person approves**

**GIVEN** a current requirement whose unmodeled claim names no subject, and a defined subject its words match better than any other
**WHEN** an agent runs `kibi migrate --format json` and then `kibi migrate --apply-safe` without approving the suggestion
**THEN** the plan lists one `claim_subject_anchor_suggest` review action naming that subject, and the requirement file stays unchanged
**AND** once the action is approved by id, the claim's inventory entry gains `subjects: [<that subject>]`, no other line changes, and `claim-subject-missing` no longer reports the requirement.
