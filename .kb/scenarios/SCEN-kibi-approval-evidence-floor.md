---
title: An approval sets the tested floor and an implemented unapproved must requirement blocks
status: active
priority: must
tags:
  - check
  - evidence-floor
origin:
  kind: agent
  recorded_at: '2026-11-12T18:20:00.000Z'
id: SCEN-kibi-approval-evidence-floor
type: scenario
---
**Scenario: upgrading a knowledge base to schema 15**

**GIVEN** a schema 14 knowledge base with an agent requirement a person approved and no firmness, one approved with `firmness: default`, and unapproved agent requirements that production code implements: must ones recorded months ago (by `origin.recorded_at`, by an authored `created_at`, or with no date at all), a must one written by `kb_upsert` today and a should one
**WHEN** the maintainer runs `kibi coverage`, `kibi check`, `kibi migrate --yes` and `kibi check` again
**THEN** coverage shows the approved requirement with a tested floor from its approval and the default one without a floor, and kibi check reports nothing before the upgrade
**AND** the upgrade records `required_evidence: asserted` on the approved requirement only and lists the old and undated unapproved must requirements, and kibi check then fails exactly those under `agent-requirement-unapproved-implemented`, with the same verdict after `kibi sync --rebuild` and in a fresh clone
**AND** removing the pin makes kibi check fail the approved requirement under `evidence-floor`.

This is the case a test project hit: approved requirements had no floor and an unapproved one carried shipped code for weeks.
