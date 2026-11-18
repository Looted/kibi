---
title: Symbol coverage reports a symbol whose source file is gone
status: open
priority: must
required_evidence: tested
semantic_text: kb_coverage by symbol reports a production symbol whose sourceFile no longer exists in the workspace as uncovered, with the source_missing gap, even when its requirement and test links are complete.
semantic_clauses:
  - kb_coverage by symbol reports a production symbol whose sourceFile no longer exists in the workspace as uncovered, with the source_missing gap, even when its requirement and test links are complete.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 98575f7ab6ec4f1ac12aafaedcaede8b2d5f435965f1d3c07b5a5a61ce9816a7
semantic_inventory:
  - claim_key: CLAIM-059B685E540C1159
    claim_text: kb_coverage by symbol reports a production symbol whose sourceFile no longer exists in the workspace as uncovered, with the source_missing gap, even when its requirement and test links are complete
    role: normative
    status: modeled
    span:
      start: 0
      end: 197
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-059B685E540C1159
tags:
  - coverage
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-15: approved this requirement statement as written.'
id: REQ-kibi-symbol-coverage-source-missing
type: req
---
kb_coverage by symbol reports a production symbol whose sourceFile no longer exists in the workspace as uncovered, with the source_missing gap, even when its requirement and test links are complete.

## Context

kb_coverage by symbol counted a production symbol as fully covered whenever its implements and covered_by links were complete, without looking at the file it names. After a source file was deleted or moved, the symbol kept reading as fully covered until someone noticed kb_status's indexed_source_missing reason, so a review agent relying on coverage would miss the stale link. Coverage now judges the file the same way kb_status does.

## Source

> Maintainer, in review on 2026-11-15: approved this requirement statement as written.