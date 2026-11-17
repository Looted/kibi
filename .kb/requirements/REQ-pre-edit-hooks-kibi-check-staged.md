---
title: The pre-edit hooks and kibi check --staged must guard code that implements a firm requirement…
status: open
firmness: default
origin:
  kind: agent
  recorded_at: '2026-11-17T19:22:32.274Z'
rationale: The hooks asked before an edit of a closed firm requirement's code while the commit gate let the same edit through, and a closed requirement is done and still governs.
semantic_text: The pre-edit hooks and kibi check --staged must guard code that implements a firm requirement unless its status is superseded, deprecated, rejected, obsolete, retired, archived or removed.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c8d50f92ed8decc61e11118a367d37b884dde115069e072842aaadd62deec533
semantic_inventory:
  - claim_key: CLAIM-CD84D562BC937B35
    claim_text: The pre-edit hooks and kibi check --staged must guard code that implements a firm requirement unless its status is superseded, deprecated, rejected, obsolete, retired, archived or removed
    role: exception
    status: modeled
    span:
      start: 0
      end: 187
    subjects:
      - kibi.firm_edit_review
logic_claims:
  - CLAIM-CD84D562BC937B35
id: REQ-pre-edit-hooks-kibi-check-staged
type: req
required_evidence: tested
---
The pre-edit hooks and kibi check --staged must guard code that implements a firm requirement unless its status is superseded, deprecated, rejected, obsolete, retired, archived or removed.

## Context

The hooks asked before an edit of a closed firm requirement's code while the commit gate let the same edit through, and a closed requirement is done and still governs.
