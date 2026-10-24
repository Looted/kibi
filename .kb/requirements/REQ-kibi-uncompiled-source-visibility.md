---
title: Authored sources sync cannot compile block kb_check, keep kb_status stale and guard kb_upsert
status: open
required_evidence: tested
priority: must
tags:
  - sync
  - upsert
  - status
  - check
semantic_text: The kb_check operation must report a blocking violation that names each authored source kibi sync cannot extract and its extraction error. The kb_status operation must not report the KB as fresh while an authored source that kibi sync cannot extract remains. A kb_upsert of an entity that the store lacks but an authored file declares must check the write against the front matter of that file as the stored state. A kb_upsert that would leave an authored file uncompilable must be refused with the file and the extraction error.
rationale: An entity whose file kibi sync cannot compile is invisible to store-backed tools, so writes to it skipped the stored-ledger guard.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 017e20ae557e8b564ad0bfc4514886f1e7d52cadff3b3892bb08c68953fbb973
semantic_inventory:
  - claim_key: CLAIM-D1ECF79429CD6E71
    claim_text: The kb_check operation must report a blocking violation that names each authored source kibi sync cannot extract and its extraction error
    role: normative
    span:
      start: 0
      end: 137
    status: modeled
  - claim_key: CLAIM-61B8FDEE869872E7
    claim_text: The kb_status operation must not report the KB as fresh while an authored source that kibi sync cannot extract remains
    role: normative
    span:
      start: 139
      end: 257
    status: modeled
  - claim_key: CLAIM-79311696D567A10D
    claim_text: A kb_upsert of an entity that the store lacks but an authored file declares must check the write against the front matter of that file as the stored state
    role: normative
    span:
      start: 259
      end: 413
    status: modeled
  - claim_key: CLAIM-C7EE1BD318612D61
    claim_text: A kb_upsert that would leave an authored file uncompilable must be refused with the file and the extraction error
    role: normative
    span:
      start: 415
      end: 528
    status: modeled
logic_claims:
  - CLAIM-D1ECF79429CD6E71
  - CLAIM-61B8FDEE869872E7
  - CLAIM-79311696D567A10D
  - CLAIM-C7EE1BD318612D61
origin:
  kind: agent
  recorded_at: '2026-10-14T08:54:48.966Z'
id: REQ-kibi-uncompiled-source-visibility
type: req
---
The kb_check operation must report a blocking violation that names each authored source kibi sync cannot extract and its extraction error. The kb_status operation must not report the KB as fresh while an authored source that kibi sync cannot extract remains. A kb_upsert of an entity that the store lacks but an authored file declares must check the write against the front matter of that file as the stored state. A kb_upsert that would leave an authored file uncompilable must be refused with the file and the extraction error.

`kb_check` reports the file under `source-relationship-parity`; `kb_status` reports it as the stale reason `source_extraction_failed` until the file compiles. An upsert that finds such a file applies the stored-ledger guard to its front matter, writes into that same file, and says so in a warning.

## Context

In a test project, a requirement file that `kibi sync` could not extract was invisible: `kb_status` reported the KB fresh, and a `kb_upsert` of `{status: closed}` on that id took the create path while the writer merged into the existing file and kept its pinned `semantic_text`. The proposition-complete guard never ran because the store had no stored requirement, and the next `kibi sync` failed.

## Source

> an authored `.kb/` file that sync cannot extract must not be invisible: it should surface as a blocking `kb_check` violation (or an existing rule, if one fits) naming the file and the extraction error, and `kb_status` should not call the KB clean while it exists.
>
> `kb_upsert` on an id whose authored file exists but is not in the store must not silently take the create path. Preferred: read the existing file's front matter as the stored state for `assertStoredRequirementBoundary` (and for whatever else decides create vs update), so the … guard applies; if the file cannot be parsed/validated, refuse with a message naming the file and the extraction error and how to fix it.
