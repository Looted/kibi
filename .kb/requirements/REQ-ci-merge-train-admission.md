---
title: The merge train admits only boarded, green, same-repository pull requests
status: open
priority: should
required_evidence: tested
tags:
  - ci
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."'
  approved_by: maintainer
  recorded_at: '2026-11-17T11:40:38.422Z'
rationale: 'Boarding replaces the merge button and nothing else: each pull request keeps passing its own CI and proof before it may land, so batching never weakens a pull request''s gates. A fork''s head cannot be pushed to or trusted with the train''s token, and a draft is not ready to land.'
semantic_text: The merge train admits a pull request only when it carries the train label, is not a draft, comes from this repository, and its required checks passed on its current head.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fd44ce9f28d7a5df654bfc84986352dbc1c36fc2c72b4494b3ef4f2bbbe722da
semantic_inventory:
  - claim_key: CLAIM-9AEC523CE3EDC026
    claim_text: The merge train admits a pull request only when it carries the train label, is not a draft, comes from this repository, and its required checks passed on its current head
    role: normative
    status: modeled
    span:
      start: 0
      end: 170
logic_claims:
  - CLAIM-9AEC523CE3EDC026
id: REQ-ci-merge-train-admission
type: req
---
The merge train admits a pull request only when it carries the train label, is not a draft, comes from this repository, and its required checks passed on its current head.

## Context

Boarding replaces the merge button and nothing else: each pull request keeps passing its own CI and proof before it may land, so batching never weakens a pull request's gates. A fork's head cannot be pushed to or trusted with the train's token, and a draft is not ready to land.

## Source

> Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."
