---
title: kb_record writes one kb_upsert payload
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb-record
  - write-path
origin:
  kind: agent
  ref: 'Maintainer request: a stated rule is recorded with one kb_record call, translated into one kb_upsert payload, that returns the commit gate''s verdict; facts and other modeling stay on kb_upsert.'
  recorded_at: '2026-11-17T06:46:18.702Z'
rationale: A second write path would drift from kb_upsert's validation and let in a rule a hand-written payload is refused for; one payload through kb_upsert keeps a single set of checks for every write.
semantic_text: kb_record must translate its input into exactly one kb_upsert payload, never setting origin.approved_by, and must write only by running that payload through kb_upsert. For the same knowledge base, the entities, relationships and verdict a kb_record call produces must be identical to those of kb_upsert with that payload followed by kb_check with changed:true for the same files. kb_record with dryRun:true must return that payload and kb_upsert's dry-run result for it, and write nothing.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d8e6024828442359d07458edfe4c784ce3c5db47c08c2b64fa160a689a6eff17
semantic_inventory:
  - claim_key: CLAIM-723E6046F01283D2
    claim_text: kb_record must translate its input into exactly one kb_upsert payload, never setting origin.approved_by, and must write only by running that payload through kb_upsert
    role: normative
    status: modeled
    span:
      start: 0
      end: 166
    subjects:
      - kibi.kb_record
  - claim_key: CLAIM-86092A9F29ED09E9
    claim_text: For the same knowledge base, the entities, relationships and verdict a kb_record call produces must be identical to those of kb_upsert with that payload followed by kb_check with changed:true for the same files. kb_record with dryRun:true must return that payload and kb_upsert's dry-run result for it, and write nothing
    role: normative
    status: modeled
    span:
      start: 168
      end: 488
    subjects:
      - kibi.kb_record
logic_claims:
  - CLAIM-723E6046F01283D2
  - CLAIM-86092A9F29ED09E9
id: REQ-kb-record-upsert-equivalence
type: req
---
kb_record must translate its input into exactly one kb_upsert payload, never setting origin.approved_by, and must write only by running that payload through kb_upsert. For the same knowledge base, the entities, relationships and verdict a kb_record call produces must be identical to those of kb_upsert with that payload followed by kb_check with changed:true for the same files. kb_record with dryRun:true must return that payload and kb_upsert's dry-run result for it, and write nothing.

## Context

A second write path would drift from kb_upsert's validation and let in a rule a hand-written payload is refused for; one payload through kb_upsert keeps a single set of checks for every write.

## Source

> Maintainer request: a stated rule is recorded with one kb_record call, translated into one kb_upsert payload, that returns the commit gate's verdict; facts and other modeling stay on kb_upsert.
