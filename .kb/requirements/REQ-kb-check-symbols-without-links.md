---
title: kb_check lists changed symbols without repeating their links
status: open
firmness: default
priority: should
required_evidence: tested
tags:
  - check
  - mcp
  - cost
semantic_text: In kb_check, extractedSymbols must not repeat the entities each symbol links to, since linkedEntities lists them.
origin:
  kind: agent
  ref: 'Maintainer approval, 2026-11-24, of the statement as worded: "All approved."'
  approved_by: maintainer
  recorded_at: '2026-11-24T19:21:38.411Z'
semantic_inventory:
  - claim_key: CLAIM-E7A2D50944EB90E9
    claim_text: In kb_check, extractedSymbols must not repeat the entities each symbol links to, since linkedEntities lists them
    role: normative
    status: modeled
    span:
      start: 0
      end: 112
logic_claims:
  - CLAIM-E7A2D50944EB90E9
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fe063c5f1c52e18092ea32e93074dc9513a4421fe0b827021622310beb3d31ea
rationale: Each extractedSymbols entry listed linkedEntityIds, the same links linkedEntities already lists with the symbol they come from; on a check of packages/cli/src/public/operations/check-format-shared.ts the two lists matched for all 19 symbols.
id: REQ-kb-check-symbols-without-links
type: req
---
In kb_check, extractedSymbols must not repeat the entities each symbol links to, since linkedEntities lists them.

## Context

Each extractedSymbols entry listed linkedEntityIds, the same links linkedEntities already lists with the symbol they come from; on a check of packages/cli/src/public/operations/check-format-shared.ts the two lists matched for all 19 symbols.

## Source

> All approved.

Maintainer reply, 2026-11-24, to the four statements proposed for the second benchmark cost change.
