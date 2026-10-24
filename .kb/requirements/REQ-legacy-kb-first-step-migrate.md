---
title: kb_status names kibi migrate --yes first on a legacy KB, as kibi doctor does
status: open
required_evidence: tested
priority: must
tags:
  - bootstrap
  - migration
  - status
  - doctor
semantic_text: On a workspace with a legacy .kb/config.json and no .kb/manifest.json, kb_status must name kibi migrate --yes as the required bootstrap next action. kb_status must not name kibi init as the first step on such a workspace.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 38c545b5b28d843902361da69658d178247f51b7cb87dbb02f1121a053c14fbc
semantic_inventory:
  - claim_key: CLAIM-B2091FBE30CF1239
    claim_text: On a workspace with a legacy .kb/config.json and no .kb/manifest.json, kb_status must name kibi migrate --yes as the required bootstrap next action. kb_status must not name kibi init as the first step on such a workspace
    role: normative
    status: modeled
    span:
      start: 0
      end: 220
logic_claims:
  - CLAIM-B2091FBE30CF1239
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:50.866Z'
id: REQ-legacy-kb-first-step-migrate
type: req
---
On a workspace with a legacy .kb/config.json and no .kb/manifest.json, kb_status must name kibi migrate --yes as the required bootstrap next action. kb_status must not name kibi init as the first step on such a workspace.

## Context

On a legacy KB (a `.kb/config.json` and no manifest), `kibi doctor` said to run `kibi migrate --yes` and not `kibi init`, while `kb_status.bootstrap.nextAction` said `kibi init` was required first. `kibi init` on a legacy layout claims the latest schema and skips the legacy migration steps, so the agent got two contradictory first steps. Seen in a test project during a real legacy-KB migration. Reported by the project owner.

Bootstrap activation now recognizes the legacy layout and returns the same command and note `kibi doctor` prints; `kb_status` names it as the required next action and `kb_plan_bootstrap` stays blocked until the migration ran.

## Source

> When the KB needs migration, `kb_status` (and the bootstrap activation it reuses) names `kibi migrate --yes` first, consistent with doctor.
