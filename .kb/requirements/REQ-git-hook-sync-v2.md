---
title: Install and run Git hooks for branch-local KB synchronization
status: open
priority: must
tags:
  - git
  - hooks
  - sync
  - exact-branch
semantic_text: '`kibi init` must install the `post-checkout` and `post-merge` Git hooks by default. Those hooks must synchronize the branch-local KB with the working tree after checkout and merge.'
semantic_clauses:
  - '`kibi init` must install the `post-checkout` and `post-merge` Git hooks by default.'
  - Those hooks must synchronize the branch-local KB with the working tree after checkout and merge.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 39951529b5b58ea373bcf9c252522519b10da9fe8417d2e54054334a29c92338
logic_claims:
  - CLAIM-57A1D330DEA165C0
  - CLAIM-38C827B85B91D638
semantic_inventory:
  - claim_key: CLAIM-57A1D330DEA165C0
    claim_text: '`kibi init` must install the `post-checkout` and `post-merge` Git hooks by default'
    role: normative
    status: modeled
    span:
      start: 0
      end: 82
    reason: Grounded with the reviewed Git hook installation predicate.
  - claim_key: CLAIM-38C827B85B91D638
    claim_text: Those hooks must synchronize the branch-local KB with the working tree after checkout and merge
    role: normative
    status: modeled
    span:
      start: 84
      end: 179
    reason: Grounded with the reviewed Git hook synchronization predicate.
id: REQ-git-hook-sync-v2
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the supersession reasons recovered from history in the KB gold-standard review (reasons batch 1): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---
`kibi init` must install the `post-checkout` and `post-merge` Git hooks by default. Those hooks must synchronize the branch-local KB with the working tree after checkout and merge.

## Why this changed
REQ-008 tied hook sync to brief.md precedence and to copying the default branch's store. Briefs were removed and branch stores became exact per branch, so only the hook installation and sync behavior remain. Source: commits "remove briefs functionality" and "enforce exact branch relationship parity", Aug 17.
