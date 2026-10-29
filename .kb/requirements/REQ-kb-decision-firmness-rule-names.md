---
title: Decision firmness check rule names
status: open
priority: must
firmness: firm
semantic_text: An unreferenced firm decision shall be reported as decision-firm-unreferenced. A superseded firm decision shall be reported as decision-firm-superseded. An edited firm decision shall be reported as decision-firm-edited. A supersedes link without a reason shall be reported as supersedes-reason-missing.
semantic_clauses:
  - An unreferenced firm decision shall be reported as decision-firm-unreferenced.
  - A superseded firm decision shall be reported as decision-firm-superseded.
  - An edited firm decision shall be reported as decision-firm-edited.
  - A supersedes link without a reason shall be reported as supersedes-reason-missing.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:38:12.787Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fcc642571b716c49101405d63cf09e725788b6e6b3516ed13393390872665419
semantic_inventory:
  - claim_key: CLAIM-216BC6F5EBF739D9
    claim_text: An unreferenced firm decision shall be reported as decision-firm-unreferenced
    role: normative
    status: modeled
    span:
      start: 0
      end: 77
  - claim_key: CLAIM-CC13364AF3CAE168
    claim_text: A superseded firm decision shall be reported as decision-firm-superseded
    role: normative
    status: modeled
    span:
      start: 79
      end: 151
  - claim_key: CLAIM-EE136E4E5A388B56
    claim_text: An edited firm decision shall be reported as decision-firm-edited
    role: normative
    status: modeled
    span:
      start: 153
      end: 218
  - claim_key: CLAIM-9256D7CE78D33CD5
    claim_text: A supersedes link without a reason shall be reported as supersedes-reason-missing
    role: normative
    status: modeled
    span:
      start: 220
      end: 301
logic_claims:
  - CLAIM-216BC6F5EBF739D9
  - CLAIM-CC13364AF3CAE168
  - CLAIM-EE136E4E5A388B56
  - CLAIM-9256D7CE78D33CD5
id: REQ-kb-decision-firmness-rule-names
type: req
---
An unreferenced firm decision shall be reported as decision-firm-unreferenced. A superseded firm decision shall be reported as decision-firm-superseded. An edited firm decision shall be reported as decision-firm-edited. A supersedes link without a reason shall be reported as supersedes-reason-missing.

## Context

packages/cli/src/public/operations/decision-firmness.ts reports the findings REQ-kb-decision-firmness defines. Each rule name is stated here so it is proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"