---
title: kb_check and kb_status report authored files sync cannot compile
status: open
semantic_text: The kb_check operation must report a blocking violation that names each authored source kibi sync cannot extract and its extraction error. The kb_status operation must not report the KB as fresh while an authored source that kibi sync cannot extract remains.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5a713c590dda95bf5326f87c1348d9ff1f608b1a8588e4246bb68e63089f83a7
semantic_inventory:
  - claim_key: CLAIM-D1ECF79429CD6E71
    claim_text: The kb_check operation must report a blocking violation that names each authored source kibi sync cannot extract and its extraction error
    role: normative
    status: modeled
    span:
      start: 0
      end: 137
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-61B8FDEE869872E7
    claim_text: The kb_status operation must not report the KB as fresh while an authored source that kibi sync cannot extract remains
    role: normative
    status: modeled
    span:
      start: 139
      end: 257
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-D1ECF79429CD6E71
  - CLAIM-61B8FDEE869872E7
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:32:35.891Z'
priority: must
required_evidence: tested
tags:
  - sync
  - upsert
  - status
  - check
id: REQ-kibi-uncompiled-source-reported
type: req
---
The kb_check operation must report a blocking violation that names each authored source kibi sync cannot extract and its extraction error. The kb_status operation must not report the KB as fresh while an authored source that kibi sync cannot extract remains.

## Context

`kb_check` reports the file under `source-relationship-parity`; `kb_status` reports it as the stale reason `source_extraction_failed` until the file compiles.

In a test project, a requirement file that `kibi sync` could not extract was invisible: `kb_status` reported the KB fresh, and a `kb_upsert` of `{status: closed}` on that id took the create path while the writer merged into the existing file and kept its pinned `semantic_text`. The proposition-complete guard never ran because the store had no stored requirement, and the next `kibi sync` failed.

## Why this changed

Split from REQ-kibi-uncompiled-source-visibility, which held two behaviors: how kb_check and kb_status report an authored file sync cannot compile, and how kb_upsert treats such a file. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
