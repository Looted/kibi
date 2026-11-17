---
title: Each workflow that gates develop reports one aggregate required check
status: open
priority: should
required_evidence: tested
tags:
  - ci
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-17, approving the merge train quick-fix statements: "Ok, also approve for the requirements."'
  approved_by: maintainer
  recorded_at: '2026-11-17T10:51:26.821Z'
rationale: develop had no required checks, so a pull request could merge with CI or proof red, and two develop commits failed their push proof while merges continued. Requiring raw job names breaks whenever a job is renamed or a matrix changes, and a skipped job counts as passing; one aggregate job per workflow that fails on any failed, skipped or cancelled job gives the ruleset two stable checks that mean every job passed.
semantic_text: Each CI workflow that gates develop reports one required check that passes only when every other job in that workflow succeeded.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aee98ebfaf8706643a17b1db6976310ada8615672472e6f3424439d90861f563
semantic_inventory:
  - claim_key: CLAIM-EAB2D3A12E0E42FF
    claim_text: Each CI workflow that gates develop reports one required check that passes only when every other job in that workflow succeeded
    role: normative
    status: modeled
    span:
      start: 0
      end: 127
logic_claims:
  - CLAIM-EAB2D3A12E0E42FF
id: REQ-ci-required-check-aggregate
type: req
---
Each CI workflow that gates develop reports one required check that passes only when every other job in that workflow succeeded.

## Context

develop had no required checks, so a pull request could merge with CI or proof red, and two develop commits failed their push proof while merges continued. Requiring raw job names breaks whenever a job is renamed or a matrix changes, and a skipped job counts as passing; one aggregate job per workflow that fails on any failed, skipped or cancelled job gives the ruleset two stable checks that mean every job passed.

## Source

> Maintainer decision, 2026-11-17, approving the merge train quick-fix statements: "Ok, also approve for the requirements."
