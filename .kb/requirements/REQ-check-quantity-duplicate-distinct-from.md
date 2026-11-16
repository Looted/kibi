---
title: distinct_from on a value fact exempts the pair it names
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - quantity-duplicate
semantic_text: Kibi check must not report a pair of value facts when either lists the other's subject and property under distinct_from.
rationale: Some pairs are two quantities that happen to share a value and a file, such as the cap on a timeout and the configured timeout. The person who knows that needs a way to say it once, on the fact, rather than renaming one quantity to dodge the check.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:10:17.247Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: eea079b5a1a76721f6ccc898f587f896fbaa94b47f504fe535f5e3eb479b81eb
semantic_inventory:
  - claim_key: CLAIM-E794733C1F130816
    claim_text: Kibi check must not report a pair of value facts when either lists the other's subject and property under distinct_from
    role: normative
    status: modeled
    span:
      start: 0
      end: 119
logic_claims:
  - CLAIM-E794733C1F130816
id: REQ-check-quantity-duplicate-distinct-from
type: req
---
Kibi check must not report a pair of value facts when either lists the other's subject and property under distinct_from.

## Context

Some pairs are two quantities that happen to share a value and a file, such as the cap on a timeout and the configured timeout. The person who knows that needs a way to say it once, on the fact, rather than renaming one quantity to dodge the check.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"