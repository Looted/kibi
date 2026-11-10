---
title: Bootstrap plans keep generated claim names short
status: open
required_evidence: tested
priority: must
tags:
  - bootstrap
  - modeling
  - naming
semantic_text: Bootstrap planning must shorten a generated claim name longer than four words or forty characters and report the original name. Bootstrap planning must give different claims different generated names.
semantic_clauses:
  - Bootstrap planning must shorten a generated claim name longer than four words or forty characters and report the original name.
  - Bootstrap planning must give different claims different generated names.
logic_claims:
  - CLAIM-9D686CC4EB946390
  - CLAIM-5548F00AAFF15BD0
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8305f8c502b0b8cfde025d0d88aa6d4a5b286d2b28a234f17297947df5c0db38
semantic_inventory:
  - claim_key: CLAIM-9D686CC4EB946390
    claim_text: Bootstrap planning must shorten a generated claim name longer than four words or forty characters and report the original name
    role: normative
    status: modeled
    span:
      start: 0
      end: 126
  - claim_key: CLAIM-5548F00AAFF15BD0
    claim_text: Bootstrap planning must give different claims different generated names
    role: normative
    status: modeled
    span:
      start: 128
      end: 199
origin:
  ref: 'Maintainer decision, 2026-11-10, approving the supersession reasons recovered from history in the KB gold-standard review (reasons batch 1): "Ok"'
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-10-08T09:14:16.476Z'
id: REQ-bootstrap-claim-name-length
type: req
---
Bootstrap planning must shorten a generated claim name longer than four words or forty characters and report the original name. Bootstrap planning must give different claims different generated names.

## Context

After a bootstrap of a test project with declared components, every generated name had the `component.aspect` shape, but 17 of 93 names had a second segment longer than 40 characters because it was the slug of a whole clause (for example a name ending in `update_in_real_time_when_a_new_request_is_assigned_...`), and two names collided. Later scenarios and facts must repeat the same name, so a clause-length name is not reusable. The plan now keeps the second segment to a short noun phrase, reports the original name so the operator can rename it, and gives different claims different names.

## Source

Onboarding evaluation round 6 analysis (2026-10-08), finding K6b.

## Why this changed
The requirement was renamed before release because it limits generated claim names, not subject-key aspects. Source: the old requirement's Context; PR 373.
