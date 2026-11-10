---
title: Kibi packages are versioned through Changesets on develop
status: open
semantic_text: All Kibi npm packages must share consistent semantic versioning. All release steps must be automated via Changesets. Version bumps and changelog updates must happen on develop or feature branches using bun run version-packages. If KB query is unstable, agents must consult documentation/requirements/REQ-020.md and ADRs for release policy.
semantic_clauses:
  - All Kibi npm packages must share consistent semantic versioning.
  - All release steps must be automated via Changesets.
  - Version bumps and changelog updates must happen on develop or feature branches using bun run version-packages.
  - If KB query is unstable, agents must consult documentation/requirements/REQ-020.md and ADRs for release policy.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7610b76f8b39d0b3cf38607d73a8db82f6e9b73470f657756f519a6a158ba53b
semantic_inventory:
  - claim_key: CLAIM-D3C7AC23296BED7E
    claim_text: All Kibi npm packages must share consistent semantic versioning
    role: normative
    status: modeled
    span:
      start: 0
      end: 63
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-C174E132C461E804
    claim_text: All release steps must be automated via Changesets
    role: normative
    status: modeled
    span:
      start: 65
      end: 115
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-8A94470D1E4C9378
    claim_text: Version bumps and changelog updates must happen on develop or feature branches using bun run version-packages
    role: normative
    status: modeled
    span:
      start: 117
      end: 226
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-891E2F67460FDB62
    claim_text: If KB query is unstable, agents must consult documentation/requirements/REQ-020.md and ADRs for release policy
    role: condition
    status: modeled
    span:
      start: 228
      end: 338
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-D3C7AC23296BED7E
  - CLAIM-C174E132C461E804
  - CLAIM-8A94470D1E4C9378
  - CLAIM-891E2F67460FDB62
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:52:38.894Z'
firmness: default
required_evidence: tested
tags:
  - release
  - automation
  - changesets
id: REQ-kibi-release-versioning-on-develop
type: req
---
All Kibi npm packages must share consistent semantic versioning. All release steps must be automated via Changesets. Version bumps and changelog updates must happen on develop or feature branches using bun run version-packages. If KB query is unstable, agents must consult documentation/requirements/REQ-020.md and ADRs for release policy.

## Context

Every version bump and changelog entry is reviewed on develop before a release reaches master.



## Why this changed

Split from REQ-020, which held two behaviors: versioning through Changesets on develop, and master CI that only publishes. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
