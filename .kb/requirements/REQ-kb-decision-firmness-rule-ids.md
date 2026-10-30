---
title: Decision firmness check rules
status: open
priority: must
firmness: firm
semantic_text: The decision firmness rules shall be decision-firm-unreferenced, decision-firm-superseded, decision-firm-edited, supersedes-reason-missing and supersedes-reason-acknowledged. The default decision firmness shall be default. Decision firmness shall start at KB schema version 9.
semantic_clauses:
  - The decision firmness rules shall be decision-firm-unreferenced, decision-firm-superseded, decision-firm-edited, supersedes-reason-missing and supersedes-reason-acknowledged.
  - The default decision firmness shall be default.
  - Decision firmness shall start at KB schema version 9.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T11:02:35.465Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d0366780851da6745f3b37a5f4a650ce0bdd133d483810392277662c203f8f76
semantic_inventory:
  - claim_key: CLAIM-502D34B19FE18089
    claim_text: The decision firmness rules shall be decision-firm-unreferenced, decision-firm-superseded, decision-firm-edited, supersedes-reason-missing and supersedes-reason-acknowledged
    role: normative
    status: modeled
    span:
      start: 0
      end: 173
  - claim_key: CLAIM-E9F95F387651D7C8
    claim_text: The default decision firmness shall be default
    role: normative
    status: modeled
    span:
      start: 175
      end: 221
  - claim_key: CLAIM-0061976CDD089FC0
    claim_text: Decision firmness shall start at KB schema version 9
    role: normative
    status: modeled
    span:
      start: 223
      end: 275
logic_claims:
  - CLAIM-502D34B19FE18089
  - CLAIM-E9F95F387651D7C8
  - CLAIM-0061976CDD089FC0
id: REQ-kb-decision-firmness-rule-ids
type: req
---
The decision firmness rules shall be decision-firm-unreferenced, decision-firm-superseded, decision-firm-edited, supersedes-reason-missing and supersedes-reason-acknowledged. The default decision firmness shall be default. Decision firmness shall start at KB schema version 9.

## Context

REQ-kb-decision-firmness reports firmness problems under a closed set of kb_check rules, treats a requirement without firmness as the default value, and arrived with KB schema 9. Each is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"