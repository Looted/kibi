---
title: Retired requirements stop governing and leave nothing current behind
status: open
priority: must
required_evidence: tested
tags:
  - kb
  - lifecycle
  - retired-status
  - migration
semantic_text: Kibi must report a requirement with status retired and no retired_reason as a retired-reason-missing violation. Kibi must report a current fact, scenario or test that only retired requirements own as a retired-owner-only violation. Kibi must exclude a retired requirement from the governing requirements of a search answer. Kibi migrate must plan a suggested retired status as a review action.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 43f9d41c64866eeade98baba23727038e022b6e5e54b31d2791227e04a13fd26
semantic_inventory:
  - claim_key: CLAIM-FBB393637D677454
    claim_text: Kibi must report a requirement with status retired and no retired_reason as a retired-reason-missing violation
    role: normative
    status: modeled
    span:
      start: 0
      end: 110
    payload_hash: 892f4373f282ee0f9d6081c58aa2564ff580c5c39e545b98f909b5b561ab8b30
    reason: Grounded by FACT-kb-requirement-retired-status-reason-missing-reported via requires_property.
  - claim_key: CLAIM-270E59F6B51C481D
    claim_text: Kibi must report a current fact, scenario or test that only retired requirements own as a retired-owner-only violation
    role: normative
    status: modeled
    span:
      start: 112
      end: 230
    payload_hash: 892f4373f282ee0f9d6081c58aa2564ff580c5c39e545b98f909b5b561ab8b30
    reason: Grounded by FACT-kb-requirement-retired-status-retired-only-dependents-reported via requires_property.
  - claim_key: CLAIM-76FE427987CB725B
    claim_text: Kibi must exclude a retired requirement from the governing requirements of a search answer
    role: normative
    status: modeled
    span:
      start: 232
      end: 322
    payload_hash: 892f4373f282ee0f9d6081c58aa2564ff580c5c39e545b98f909b5b561ab8b30
    reason: Grounded by FACT-kb-requirement-retired-status-not-governing via requires_property.
  - claim_key: CLAIM-85F5EF006162712C
    claim_text: Kibi migrate must plan a suggested retired status as a review action
    role: normative
    status: modeled
    span:
      start: 324
      end: 392
    payload_hash: 892f4373f282ee0f9d6081c58aa2564ff580c5c39e545b98f909b5b561ab8b30
    reason: Grounded by FACT-kb-requirement-retired-status-suggestion-is-review via requires_property.
logic_claims:
  - CLAIM-FBB393637D677454
  - CLAIM-270E59F6B51C481D
  - CLAIM-76FE427987CB725B
  - CLAIM-85F5EF006162712C
origin:
  kind: agent
  recorded_at: '2026-11-11T17:30:54.178Z'
id: REQ-kb-requirement-retired-status
type: req
---
Kibi must report a requirement with status retired and no retired_reason as a retired-reason-missing violation. Kibi must report a current fact, scenario or test that only retired requirements own as a retired-owner-only violation. Kibi must exclude a retired requirement from the governing requirements of a search answer. Kibi migrate must plan a suggested retired status as a review action.

## Context
A review of Kibi's own knowledge base found that `closed` meant two things for a requirement: done and still valid, or retired. REQ-core-audit-logging was retired on 2026-10-30, when branch storage stopped writing audit.log, yet `kb_search` still returned it as the governing requirement for audit logging, reached through a fact nothing else owned. The maintainer asked for a retired status distinct from `closed`, with a required reason the way `proof_exempt` has one, a check for the facts, scenarios and tests a retired requirement leaves behind, and a migration that suggests the status for closed requirements that already say they were retired. Kibi never retires a requirement on its own, because whether intent is gone is a person's call.

## Source
> Requirements need a retired status distinct from closed. For requirements, `closed` means two different things: implemented and still valid, or retired, the behavior no longer exists.

GitHub issue 695 in Looted/kibi, 2026-11-11.
