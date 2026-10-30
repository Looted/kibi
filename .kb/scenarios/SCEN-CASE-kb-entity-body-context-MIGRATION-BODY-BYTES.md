---
title: A schema migration that changes a body byte fails the body preservation guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:49.354Z'
id: SCEN-CASE-kb-entity-body-context-MIGRATION-BODY-BYTES
type: scenario
---
Given a workspace whose requirements, scenarios, ADRs and facts have multi-section bodies and need schema 6, 7 and 8 actions, when kibi migrate --yes applies them, then at least eight files change in their front matter while every body stays byte-identical, and any changed body byte fails the guard.

This covers the value past the bound, `gt 0`, of the claim that migrations preserve entity bodies byte for byte. packages/cli/tests/operations/migration/body-preservation.test.ts "schema 6, 7 and 8 actions over multi-section bodies leave every body byte-identical" exercises it.
