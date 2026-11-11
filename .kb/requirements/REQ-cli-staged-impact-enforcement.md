---
id: REQ-cli-staged-impact-enforcement
title: CLI staged check enforces Kibi impact evidence for behavior edits
status: open
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/src/traceability/staged-diagnostics.ts
priority: must
tags:
  - cli
  - check
  - traceability
links:
  - type: specified_by
    target: SCEN-cli-staged-impact-enforcement
  - type: verified_by
    target: TEST-cli-staged-impact-enforcement
semantic_text: The staged check must block behavior-changing source edits unless the staged change set includes Kibi impact evidence or a fresh symbols manifest refresh.
logic_claims:
  - CLAIM-91A5F8025E089BCC
semantic_clauses:
  - The staged check must block behavior-changing source edits unless the staged change set includes Kibi impact evidence or a fresh symbols manifest refresh
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f7370ae0ddcda1eb8f126ec719a36a117b997a432b40b8664dc684909c53501b
semantic_inventory:
  - claim_key: CLAIM-91A5F8025E089BCC
    claim_text: The staged check must block behavior-changing source edits unless the staged change set includes Kibi impact evidence or a fresh symbols manifest refresh
    role: exception
    status: modeled
    span:
      start: 0
      end: 153
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving entity context that was inferred (not recorded in history) in the KB gold-standard review (context batch 9, inferred): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---

The staged check must block behavior-changing source edits unless the staged change set includes Kibi impact evidence or a fresh symbols manifest refresh.

## Why
Behavior can change in code while the KB stays silent. Blocking a staged behavior edit that has no impact evidence keeps the two from drifting apart at commit time. Inferred from: README "Memory is enforceable"; the staged-check docs and the requirements that refine it.
