---
title: Kibi check reviews a requirement that too many symbols, scenarios, tests or current dependents hang off
status: open
semantic_text: Kibi check must report a current requirement as a non-blocking broad_requirement_review when more than 8 symbols implement it, more than 6 scenarios or 8 tests are linked to it, or more than 5 current requirements depend on it. A requirement tagged umbrella or epic must not be reported. A closed, superseded or deprecated dependent must not count.
semantic_clauses:
  - Kibi check must report a current requirement as a non-blocking broad_requirement_review when more than 8 symbols implement it, more than 6 scenarios or 8 tests are linked to it, or more than 5 current requirements depend on it
  - A requirement tagged umbrella or epic must not be reported
  - A closed, superseded or deprecated dependent must not count
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6fd6e539e7e1d6557e05b36524bf832d4d7900d63d83228625f17cac8b47a7f1
semantic_inventory:
  - claim_key: CLAIM-66128C43F4186C4F
    claim_text: Kibi check must report a current requirement as a non-blocking broad_requirement_review when more than 8 symbols implement it, more than 6 scenarios or 8 tests are linked to it, or more than 5 current requirements depend on it
    role: normative
    status: modeled
    span:
      start: 0
      end: 226
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-E40BAFBE7C0AD601
    claim_text: A requirement tagged umbrella or epic must not be reported
    role: normative
    status: modeled
    span:
      start: 228
      end: 286
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-558A2EBBB934DF01
    claim_text: A closed, superseded or deprecated dependent must not count
    role: normative
    status: modeled
    span:
      start: 288
      end: 347
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-66128C43F4186C4F
  - CLAIM-E40BAFBE7C0AD601
  - CLAIM-558A2EBBB934DF01
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-11, approving the wording fixes and new requirements of the second KB gold-standard review: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-11T17:35:17.191Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - check
  - quality
  - review
id: REQ-kibi-broad-requirement-review
type: req
---
Kibi check must report a current requirement as a non-blocking broad_requirement_review when more than 8 symbols implement it, more than 6 scenarios or 8 tests are linked to it, or more than 5 current requirements depend on it. A requirement tagged umbrella or epic must not be reported. A closed, superseded or deprecated dependent must not count.

## Context

This review keeps each requirement to one behavior, so its evidence points at the code and tests behind that behavior. It drove every split of Kibi's own broad requirements in the gold-standard review; recording it makes that standard visible to other projects. A real feature parent stays whole with an umbrella or epic tag, and dependency links from closed requirements are history, not fan-out.

## Source

> Maintainer decision, 2026-11-11, approving the wording fixes and new requirements of the second KB gold-standard review: "Ok"
