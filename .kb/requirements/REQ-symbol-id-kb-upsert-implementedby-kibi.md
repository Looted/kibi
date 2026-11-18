---
title: A symbol id that kb_upsert implementedBy or a kibi check --staged type-shape payload mints for a…
status: open
firmness: default
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-18, "Approve all"): "A symbol id that kb_upsert implementedBy or a kibi check --staged type-shape payload mints for a new symbol record must not be the id of an existing entity or of another record minted for the same call."'
  recorded_at: '2026-11-17T18:54:23.112Z'
rationale: Two files exporting the same name were offered the same record id, so pasting the second record silently moved the first file's record and the gate looped.
semantic_text: A symbol id that kb_upsert implementedBy or a kibi check --staged type-shape payload mints for a new symbol record must not be the id of an existing entity or of another record minted for the same call.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6728329e41329cd6598be0abf9b4e4ad076b9578306e4e807d03522c7969dd96
semantic_inventory:
  - claim_key: CLAIM-C8CB7C5E2584EEA0
    claim_text: A symbol id that kb_upsert implementedBy or a kibi check --staged type-shape payload mints for a new symbol record must not be the id of an existing entity or of another record minted for the same call
    role: normative
    status: modeled
    span:
      start: 0
      end: 201
    subjects:
      - mcp.kb_upsert
logic_claims:
  - CLAIM-C8CB7C5E2584EEA0
id: REQ-symbol-id-kb-upsert-implementedby-kibi
type: req
required_evidence: tested
---
A symbol id that kb_upsert implementedBy or a kibi check --staged type-shape payload mints for a new symbol record must not be the id of an existing entity or of another record minted for the same call.

## Context

Two files exporting the same name were offered the same record id, so pasting the second record silently moved the first file's record and the gate looped.
