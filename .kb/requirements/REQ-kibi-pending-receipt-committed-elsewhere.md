---
title: A pending receipt whose file another local branch committed is retired
status: open
priority: must
required_evidence: tested
semantic_text: kibi sync must retire a pending-source receipt whose file is absent from the checkout but committed on another local branch, instead of failing. A receipt whose absent file no local branch has committed must still fail the sync as missing.
semantic_clauses:
  - kibi sync must retire a pending-source receipt whose file is absent from the checkout but committed on another local branch, instead of failing.
  - A receipt whose absent file no local branch has committed must still fail the sync as missing.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 374dd05bbfb097d21d27d710833e8b84fec1c8fb83f51f4f0923b69e9b656395
semantic_inventory:
  - claim_key: CLAIM-5A641BD70C6A5BE4
    claim_text: kibi sync must retire a pending-source receipt whose file is absent from the checkout but committed on another local branch, instead of failing
    role: normative
    status: modeled
    span:
      start: 0
      end: 143
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-A78AACC4AD06D93F
    claim_text: A receipt whose absent file no local branch has committed must still fail the sync as missing
    role: normative
    status: modeled
    span:
      start: 145
      end: 238
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5A641BD70C6A5BE4
  - CLAIM-A78AACC4AD06D93F
tags:
  - git
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T17:30:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-15: approved this requirement statement as written.'
id: REQ-kibi-pending-receipt-committed-elsewhere
type: req
---
kibi sync must retire a pending-source receipt whose file is absent from the checkout but committed on another local branch, instead of failing. A receipt whose absent file no local branch has committed must still fail the sync as missing.

## Context

After pending-source receipts recorded their branch, a receipt was retired once the current branch tracked its file. A file written on main and committed on a feature branch with no sync there kept its receipt, and back on main, where the file is absent, sync failed with "Pending source is missing". Sync now checks whether a local branch has committed the missing file and retires the receipt if so; a file no local branch holds still fails as missing.

## Source

> Maintainer, in review on 2026-11-15: approved this requirement statement as written.