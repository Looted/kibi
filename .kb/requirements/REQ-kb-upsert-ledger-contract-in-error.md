---
title: The missing-ledger upsert error carries the contract one resend needs
status: open
required_evidence: tested
priority: must
tags:
  - kb
  - upsert
firmness: default
semantic_text: Kibi kb_upsert must include in a proposition-complete ingestion error the inventory contract the semantic advisor derives for the payload prose.
semantic_clauses:
  - Kibi kb_upsert must include in a proposition-complete ingestion error the inventory contract the semantic advisor derives for the payload prose
logic_claims:
  - CLAIM-FD4324D942EFB26C
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7b14637f587e8141ec7ee86131d4c3d4aff4a72cb983fef6a9a428c3031f9672
semantic_inventory:
  - claim_key: CLAIM-FD4324D942EFB26C
    claim_text: Kibi kb_upsert must include in a proposition-complete ingestion error the inventory contract the semantic advisor derives for the payload prose
    role: normative
    status: modeled
    span:
      start: 0
      end: 143
origin:
  kind: agent
  recorded_at: '2026-10-14T17:11:15.771Z'
id: REQ-kb-upsert-ledger-contract-in-error
type: req
---
Kibi kb_upsert must include in a proposition-complete ingestion error the inventory contract the semantic advisor derives for the payload prose.

## Context

In a benchmark on Kibi's own repository, kb_upsert refused requirement writes whose semantic_text changed without an updated inventory ledger, and each refusal sent the agent to kb_model for a contract the upsert had already derived to check the payload. The ledger rule stays as it is (omitted propositions are still refused, and ambiguity and ontology gaps stay explicit); the error now hands back the derived contract so one resend is enough. Requested by the project owner after the benchmark report.
