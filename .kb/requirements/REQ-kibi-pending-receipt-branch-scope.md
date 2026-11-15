---
title: Pending-source receipts belong to the branch that wrote them
status: open
priority: must
required_evidence: tested
semantic_text: A pending-source receipt must record the branch it was written on, and kibi sync must skip a receipt from another branch whose file is absent instead of failing. A present untracked file, and a receipt that names no branch, must still be checked whichever branch is checked out.
semantic_clauses:
  - A pending-source receipt must record the branch it was written on, and kibi sync must skip a receipt from another branch whose file is absent instead of failing.
  - A present untracked file, and a receipt that names no branch, must still be checked whichever branch is checked out.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4d29c25550ad3f4454ae82f5f67b2a97e46830f92452b0149154fdb52de15571
semantic_inventory:
  - claim_key: CLAIM-7936082F20766982
    claim_text: A pending-source receipt must record the branch it was written on, and kibi sync must skip a receipt from another branch whose file is absent instead of failing
    role: normative
    status: modeled
    span:
      start: 0
      end: 160
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-39DD75C9F169541A
    claim_text: A present untracked file, and a receipt that names no branch, must still be checked whichever branch is checked out
    role: normative
    status: modeled
    span:
      start: 162
      end: 277
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-7936082F20766982
  - CLAIM-39DD75C9F169541A
tags:
  - git
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-15: approved this requirement statement; the quantifier words were then reworded without changing its meaning.'
id: REQ-kibi-pending-receipt-branch-scope
type: req
---
A pending-source receipt must record the branch it was written on, and kibi sync must skip a receipt from another branch whose file is absent instead of failing. A present untracked file, and a receipt that names no branch, must still be checked whichever branch is checked out.

## Context

kb_upsert writes a pending-source receipt for every untracked file it creates, so sync compiles the file before Git tracks it. The receipts lived in one workspace folder that a git checkout leaves alone. After an entity file was committed on one branch and another branch was checked out, that branch's sync failed with "Pending source is missing" until kibi branch recover --apply rebuilt it. Receipts now record their branch, and each branch reads only its own receipts and the older ones that name none.

## Source

> Maintainer, in review on 2026-11-15: approved this requirement statement; the quantifier words were then reworded without changing its meaning.