---
title: kb_upsert judges a write against an authored file sync cannot compile
status: open
semantic_text: A kb_upsert of an entity that the store lacks but an authored file declares must check the write against the front matter of that file as the stored state. A kb_upsert that would leave an authored file uncompilable must be refused with the file and the extraction error.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a5b01cbbd512f1832dc7e3422a9fc701dde9392baddfe12ed9e763e304f155ae
semantic_inventory:
  - claim_key: CLAIM-79311696D567A10D
    claim_text: A kb_upsert of an entity that the store lacks but an authored file declares must check the write against the front matter of that file as the stored state
    role: normative
    status: modeled
    span:
      start: 0
      end: 154
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-C7EE1BD318612D61
    claim_text: A kb_upsert that would leave an authored file uncompilable must be refused with the file and the extraction error
    role: normative
    status: modeled
    span:
      start: 156
      end: 269
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-79311696D567A10D
  - CLAIM-C7EE1BD318612D61
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:33:51.851Z'
priority: must
required_evidence: tested
tags:
  - sync
  - upsert
  - status
  - check
id: REQ-kibi-uncompiled-source-upsert-guard
type: req
---
A kb_upsert of an entity that the store lacks but an authored file declares must check the write against the front matter of that file as the stored state. A kb_upsert that would leave an authored file uncompilable must be refused with the file and the extraction error.

## Context

An upsert that finds such a file applies the stored-ledger guard to its front matter, writes into that same file, and says so in a warning.

In a test project, a requirement file that `kibi sync` could not extract was invisible: `kb_status` reported the KB fresh, and a `kb_upsert` of `{status: closed}` on that id took the create path while the writer merged into the existing file and kept its pinned `semantic_text`. The proposition-complete guard never ran because the store had no stored requirement, and the next `kibi sync` failed.

## Why this changed

Split from REQ-kibi-uncompiled-source-visibility, which held two behaviors: how kb_check and kb_status report an authored file sync cannot compile, and how kb_upsert treats such a file. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
