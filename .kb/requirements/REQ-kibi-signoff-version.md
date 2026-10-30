---
title: Kibi signoff document version
status: open
priority: must
firmness: firm
semantic_text: The Kibi signoff version shall be kibi.signoff.v1.
semantic_clauses:
  - The Kibi signoff version shall be kibi.signoff.v1.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T17:53:08.610Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 53cdd7ef1a8e7a870752f3115de9ac2c5587744088565d9f7b3061a3b9b37e3b
semantic_inventory:
  - claim_key: CLAIM-D7B7229A0D10B31B
    claim_text: The Kibi signoff version shall be kibi.signoff.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 49
logic_claims:
  - CLAIM-D7B7229A0D10B31B
id: REQ-kibi-signoff-version
type: req
---
The Kibi signoff version shall be kibi.signoff.v1.

## Context

SIGNOFF_VERSION in packages/cli/src/signoff/model.ts versions the signoff model REQ-kibi-signoff-views renders. It is stated here so the version is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"