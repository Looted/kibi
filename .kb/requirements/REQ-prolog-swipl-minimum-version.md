---
title: Kibi accepts SWI-Prolog 9 or newer
status: open
priority: must
firmness: firm
semantic_text: The minimum SWI-Prolog major version shall be 9.
semantic_clauses:
  - The minimum SWI-Prolog major version shall be 9.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:35:14.048Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: abc0a5a3067a5908f3d524883cce1df5ae04745b806660902627a78ad9abc49d
semantic_inventory:
  - claim_key: CLAIM-FFF27D6BB2C61251
    claim_text: The minimum SWI-Prolog major version shall be 9
    role: normative
    status: modeled
    span:
      start: 0
      end: 47
logic_claims:
  - CLAIM-FFF27D6BB2C61251
id: REQ-prolog-swipl-minimum-version
type: req
---
The minimum SWI-Prolog major version shall be 9.

## Context

MINIMUM_SWIPL_MAJOR in packages/cli/src/prolog/swipl-resolver.ts is the version floor REQ-prolog-bundled-runtime applies when it rejects a swipl on PATH older than 9.0. It is stated here as a number so it is proved against the constant; the resolution order stays in REQ-prolog-bundled-runtime.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"