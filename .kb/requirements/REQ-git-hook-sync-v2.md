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
---
`kibi init` must install the `post-checkout` and `post-merge` Git hooks by default. Those hooks must synchronize the branch-local KB with the working tree after checkout and merge.
