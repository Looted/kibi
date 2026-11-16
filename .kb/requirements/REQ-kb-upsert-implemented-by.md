---
title: kb_upsert links implementing code from a requirement write
status: open
priority: must
required_evidence: tested
tags:
  - mutation
  - traceability
  - mcp
semantic_text: kb_upsert of a requirement must accept implementedBy entries that name a source file and a symbol, and record an implements link to the requirement from the symbol each entry resolves to. An implementedBy entry must resolve to exactly one declaration in that file that kb_upsert accepts as a granular symbol link. An entry that resolves to no symbol or to several must be refused with the candidate symbols. An implementedBy entry must never be recorded as a link from a whole file.
semantic_clauses:
  - kb_upsert of a requirement must accept implementedBy entries that name a source file and a symbol, and record an implements link to the requirement from the symbol each entry resolves to.
  - An implementedBy entry must resolve to exactly one declaration in that file that kb_upsert accepts as a granular symbol link.
  - An entry that resolves to no symbol or to several must be refused with the candidate symbols.
  - An implementedBy entry must never be recorded as a link from a whole file.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-16): "kb_upsert of a requirement must accept implementedBy entries that name a source file and a symbol, and record an implements link to the requirement from the symbol each entry resolves to. An implementedBy entry must resolve to exactly one declaration in that file that kb_upsert accepts as a granular symbol link. An entry that resolves to no symbol or to several must be refused with the candidate symbols. An implementedBy entry must never be recorded as a link from a whole file."'
  recorded_at: '2026-11-16T07:14:06.372Z'
rationale: Agents writing a requirement had to send a second kb_upsert per symbol to link the code, and in benchmark runs they often skipped it or linked whole files, which left requirements without implements links.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d2501f927befbac3f606ac3ac45a0c845a7bccca5c48b198bbc4a6d9b8c29195
semantic_inventory:
  - claim_key: CLAIM-17880F690040682E
    claim_text: kb_upsert of a requirement must accept implementedBy entries that name a source file and a symbol, and record an implements link to the requirement from the symbol each entry resolves to
    role: normative
    status: modeled
    span:
      start: 0
      end: 186
  - claim_key: CLAIM-307BAC8645B9F6A2
    claim_text: An implementedBy entry must resolve to exactly one declaration in that file that kb_upsert accepts as a granular symbol link
    role: normative
    status: modeled
    span:
      start: 188
      end: 312
  - claim_key: CLAIM-EA5B2F0A61E16DE6
    claim_text: An entry that resolves to no symbol or to several must be refused with the candidate symbols
    role: normative
    status: modeled
    span:
      start: 314
      end: 406
  - claim_key: CLAIM-8E62FF757DE7638F
    claim_text: An implementedBy entry must never be recorded as a link from a whole file
    role: normative
    status: modeled
    span:
      start: 408
      end: 481
logic_claims:
  - CLAIM-17880F690040682E
  - CLAIM-307BAC8645B9F6A2
  - CLAIM-EA5B2F0A61E16DE6
  - CLAIM-8E62FF757DE7638F
id: REQ-kb-upsert-implemented-by
type: req
---
kb_upsert of a requirement must accept implementedBy entries that name a source file and a symbol, and record an implements link to the requirement from the symbol each entry resolves to. An implementedBy entry must resolve to exactly one declaration in that file that kb_upsert accepts as a granular symbol link. An entry that resolves to no symbol or to several must be refused with the candidate symbols. An implementedBy entry must never be recorded as a link from a whole file.

## Context

Recording a requirement and linking the code that implements it were separate writes, so agents paid an extra round trip per symbol and often stopped after the requirement. implementedBy lets the requirement write name the file and symbol directly. Each entry must resolve to one granular declaration through the same check kb_upsert applies to symbol links, and a miss is refused with the candidates so one resend fixes it. Whole-file links stay impossible, as everywhere else in Kibi.

## Source

Maintainer-approved statement (2026-11-16): "kb_upsert of a requirement must accept implementedBy entries that name a source file and a symbol, and record an implements link to the requirement from the symbol each entry resolves to. An implementedBy entry must resolve to exactly one declaration in that file that kb_upsert accepts as a granular symbol link. An entry that resolves to no symbol or to several must be refused with the candidate symbols. An implementedBy entry must never be recorded as a link from a whole file."