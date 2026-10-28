---
title: Kibi's CI keeps a system SWI-Prolog job
status: open
priority: must
firmness: firm
semantic_text: The ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system.
semantic_clauses:
  - The ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:37:06.876Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5f8177b4523474b89bf35b491d215d732264e69cc73d6eb59b2b718ff64502a7
semantic_inventory:
  - claim_key: CLAIM-DF4E3136C1465174
    claim_text: The ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system
    role: normative
    status: modeled
    span:
      start: 0
      end: 77
logic_claims:
  - CLAIM-DF4E3136C1465174
id: REQ-prolog-ci-system-swipl-job
type: req
---
The ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system.

## Context

REQ-prolog-bundled-ci says Kibi's own CI must keep one job that runs a system SWI-Prolog selected with KIBI_SWIPL=system. That job is ci-integration in .github/workflows/ci.yml, which sets KIBI_SWIPL to system for every step; this requirement states that setting so it is proved against the workflow file.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"