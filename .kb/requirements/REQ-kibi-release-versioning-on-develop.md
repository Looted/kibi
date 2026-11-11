---
title: Kibi npm package releases are versioned through Changesets on develop
status: open
semantic_text: All Kibi npm packages must share consistent semantic versioning. All release steps must be automated via Changesets. Version bumps and changelog updates must happen on develop or feature branches using bun run version-packages.
semantic_clauses:
  - All Kibi npm packages must share consistent semantic versioning
  - All release steps must be automated via Changesets
  - Version bumps and changelog updates must happen on develop or feature branches using bun run version-packages
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4860eed7cff44cb4fbf7b7ec682b03ae06fcff6cda920c23dcaaf5f69b011e1e
semantic_inventory:
  - claim_key: CLAIM-D3C7AC23296BED7E
    claim_text: All Kibi npm packages must share consistent semantic versioning
    role: normative
    status: modeled
    span:
      start: 0
      end: 63
  - claim_key: CLAIM-C174E132C461E804
    claim_text: All release steps must be automated via Changesets
    role: normative
    status: modeled
    span:
      start: 65
      end: 115
  - claim_key: CLAIM-8A94470D1E4C9378
    claim_text: Version bumps and changelog updates must happen on develop or feature branches using bun run version-packages
    role: normative
    status: modeled
    span:
      start: 117
      end: 226
logic_claims:
  - CLAIM-D3C7AC23296BED7E
  - CLAIM-C174E132C461E804
  - CLAIM-8A94470D1E4C9378
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok" Maintainer decision, 2026-11-11, approving the wording fixes of the second KB gold-standard review: "Ok"'
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
All Kibi npm packages must share consistent semantic versioning. All release steps must be automated via Changesets. Version bumps and changelog updates must happen on develop or feature branches using bun run version-packages.

## Context

Every version bump and changelog entry is reviewed on develop before a release reaches master.



## Why this changed

Split from REQ-020, which held two behaviors: versioning through Changesets on develop, and master CI that only publishes. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
