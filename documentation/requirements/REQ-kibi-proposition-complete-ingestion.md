---
id: REQ-kibi-proposition-complete-ingestion
title: Requirement ingestion is proposition-complete and source-bound
status: open
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-proposition-complete-ingestion.md
priority: must
tags: [requirements, semantic-inventory, ingestion, prolog, sync]
logic_claims:
  - CLAIM-7B8BE5762245E3D2
  - CLAIM-8F21AE06ED7D0517
  - CLAIM-A726E6BF7D36D2A3
  - CLAIM-B779C65EAA6C2BC9
  - CLAIM-F694202A3C339660
  - CLAIM-944B73FD47FD3F8A
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aa3528ebbc8595978c3fc7d6c5d7b33f3f84f42877ad90034fc5214a44b609fd
semantic_inventory:
  - claim_key: CLAIM-7B8BE5762245E3D2
    claim_text: Current requirement writes must reject any omitted assertive proposition
    role: normative
    status: modeled
    span: {start: 0, end: 72}
  - claim_key: CLAIM-8F21AE06ED7D0517
    claim_text: Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span
    role: normative
    status: modeled
    span: {start: 74, end: 163}
  - claim_key: CLAIM-A726E6BF7D36D2A3
    claim_text: Duplicate claim keys or spans must be rejected
    role: normative
    status: modeled
    span: {start: 165, end: 211}
  - claim_key: CLAIM-B779C65EAA6C2BC9
    claim_text: Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency
    role: descriptive
    status: modeled
    span: {start: 213, end: 335}
  - claim_key: CLAIM-F694202A3C339660
    claim_text: Every modeled proposition must have exactly one logical grounding fact with the same claim key
    role: normative
    status: modeled
    span: {start: 337, end: 431}
  - claim_key: CLAIM-944B73FD47FD3F8A
    claim_text: Markdown sync must baseline existing legacy requirements once, then enforce complete ledgers for new or semantically changed requirements
    role: normative
    status: modeled
    span: {start: 433, end: 570}
links:
  - type: specified_by
    target: SCEN-kibi-proposition-complete-ingestion
  - type: requires_predicate
    target: FACT-INGESTION-REJECTS-OMISSION
  - type: requires_predicate
    target: FACT-INGESTION-SOURCE-BOUND
  - type: requires_predicate
    target: FACT-INGESTION-REJECTS-DUPLICATES
  - type: requires_predicate
    target: FACT-INGESTION-UNRESOLVED-NOT-CONSISTENT
  - type: requires_predicate
    target: FACT-INGESTION-ONE-GROUNDING
  - type: requires_predicate
    target: FACT-INGESTION-SYNC-MIGRATION
---

Current requirement writes must reject any omitted assertive proposition. Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span. Duplicate claim keys or spans must be rejected. Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency. Every modeled proposition must have exactly one logical grounding fact with the same claim key. Markdown sync must baseline existing legacy requirements once, then enforce complete ledgers for new or semantically changed requirements.
