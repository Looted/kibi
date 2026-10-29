---
title: Vocabulary alignment thresholds
status: open
priority: must
firmness: firm
semantic_text: The built-in aligner reuse threshold shall be 0.4. The Jev aligner shall rank at most 5 candidates. An aligner asking for a new key shall answer new_subject.
semantic_clauses:
  - The built-in aligner reuse threshold shall be 0.4.
  - The Jev aligner shall rank at most 5 candidates.
  - An aligner asking for a new key shall answer new_subject.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:54:19.987Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cb4ab57aeaff4090b74ae92b0956cce36bacb795d7e1e6ce43e8f13461fece96
semantic_inventory:
  - claim_key: CLAIM-B60C7E27A934B7C2
    claim_text: The built-in aligner reuse threshold shall be 0.4
    role: normative
    status: modeled
    span:
      start: 0
      end: 49
  - claim_key: CLAIM-382F0321CFF46157
    claim_text: The Jev aligner shall rank at most 5 candidates
    role: normative
    status: modeled
    span:
      start: 51
      end: 98
  - claim_key: CLAIM-63A2B31CFFA715AD
    claim_text: An aligner asking for a new key shall answer new_subject
    role: normative
    status: modeled
    span:
      start: 100
      end: 156
logic_claims:
  - CLAIM-B60C7E27A934B7C2
  - CLAIM-382F0321CFF46157
  - CLAIM-63A2B31CFFA715AD
id: REQ-kibi-vocabulary-alignment-limits
type: req
---
The built-in aligner reuse threshold shall be 0.4. The Jev aligner shall rank at most 5 candidates. An aligner asking for a new key shall answer new_subject.

## Context

The vocabulary aligners REQ-kibi-vocabulary-alignment-capability defines live in packages/plugin-builtin, packages/plugin-jev and packages/plugin-sdk. Their reuse threshold, ranking depth and new-key choice are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"