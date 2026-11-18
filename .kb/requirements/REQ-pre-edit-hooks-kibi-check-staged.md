---
title: The pre-edit hooks and kibi check --staged must guard code that implements a firm requirement…
status: open
firmness: default
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-18, "Approve all"): "The pre-edit hooks and kibi check --staged must guard code that implements a firm requirement unless its status is superseded, deprecated, rejected, obsolete, retired, archived or removed, or a current requirement supersedes it."'
  recorded_at: '2026-11-17T19:22:32.274Z'
rationale: A replaced requirement must be closed, so reading closed as current without the supersedes edge gated code against the old rule and left an honest changes review with no way out.
semantic_text: The pre-edit hooks and kibi check --staged must guard code that implements a firm requirement unless its status is superseded, deprecated, rejected, obsolete, retired, archived or removed, or a current requirement supersedes it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d60f2d9c18ccfc27f08cc18b095877d7b2cee16c6565b08f85412f19b2581c3e
semantic_inventory:
  - claim_key: CLAIM-9676600D466FFEBB
    claim_text: The pre-edit hooks and kibi check --staged must guard code that implements a firm requirement unless its status is superseded, deprecated, rejected, obsolete, retired, archived or removed, or a current requirement supersedes it
    role: exception
    status: modeled
    span:
      start: 0
      end: 227
    subjects:
      - kibi.firm_edit_review
logic_claims:
  - CLAIM-9676600D466FFEBB
id: REQ-pre-edit-hooks-kibi-check-staged
type: req
required_evidence: tested
---
The pre-edit hooks and kibi check --staged must guard code that implements a firm requirement unless its status is superseded, deprecated, rejected, obsolete, retired, archived or removed, or a current requirement supersedes it.

## Context

The hooks asked before an edit of a closed firm requirement's code while the commit gate let the same edit through, and a closed requirement is done and still governs. A replaced requirement must be closed too, so a closed requirement that a current requirement supersedes guards nothing: otherwise the old rule blocks edits that its successor allows.
