---
title: kibi signoff lists firm-edit receipts as the agent's judgment
status: open
priority: must
required_evidence: tested
tags:
  - firmness
  - signoff
semantic_text: kibi signoff must list every firm-edit receipt in the change as judged by the agent, not approved by the person.
semantic_clauses:
  - kibi signoff must list every firm-edit receipt in the change as judged by the agent, not approved by the person.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-16): "kibi signoff must list every firm-edit receipt in the change as judged by the agent, not approved by the person."'
  recorded_at: '2026-11-16T07:00:13.935Z'
rationale: A receipt clears the commit gate on the agent's word, so the person must see every one at signoff and not mistake it for their own approval.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fd7052500c3dcd2af09fac892fbbcd894e682252b06449c3589c5c9b40a889e9
semantic_inventory:
  - claim_key: CLAIM-B83211A01BF62C6D
    claim_text: kibi signoff must list every firm-edit receipt in the change as judged by the agent, not approved by the person
    role: normative
    status: modeled
    span:
      start: 0
      end: 111
logic_claims:
  - CLAIM-B83211A01BF62C6D
id: REQ-kibi-signoff-firm-edit-receipts
type: req
---
kibi signoff must list every firm-edit receipt in the change as judged by the agent, not approved by the person.

## Context

Receipts let an agent move past a firm rule without asking, so signoff is where the person sees those calls. Each one is shown with its requirement, symbol, verdict and note, and labelled as the agent's judgment, so it is never read as the person's approval.

## Source

Maintainer-approved statement (2026-11-16): "kibi signoff must list every firm-edit receipt in the change as judged by the agent, not approved by the person."