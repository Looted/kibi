---
title: The Playwright reporter names each case with a native_id, and ingest refuses a native case without one
status: open
semantic_text: The Playwright proof reporter must give each case a native_id made of its spec location and its describe and test titles. Proof ingest must refuse an individually observed case that has no native_id.
semantic_clauses:
  - The Playwright proof reporter must give each case a native_id made of its spec location and its describe and test titles
  - Proof ingest must refuse an individually observed case that has no native_id
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1388d83489ea47dc0082c71fb4c22df84ed0f122e2b6bba3816b049d287bd592
semantic_inventory:
  - claim_key: CLAIM-F7B15F6D1C0D7CAD
    claim_text: The Playwright proof reporter must give each case a native_id made of its spec location and its describe and test titles
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-CABB9FC23F373AE6
    claim_text: Proof ingest must refuse an individually observed case that has no native_id
    role: normative
    status: modeled
    span:
      start: 122
      end: 198
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-F7B15F6D1C0D7CAD
  - CLAIM-CABB9FC23F373AE6
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-11, approving the wording fixes and new requirements of the second KB gold-standard review: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-11T17:35:22.916Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - proof
  - producers
  - playwright
id: REQ-kibi-playwright-native-id
type: req
---
The Playwright proof reporter must give each case a native_id made of its spec location and its describe and test titles. Proof ingest must refuse an individually observed case that has no native_id.

## Context

Proof ingest binds each individually observed case to its proof binding by native_id. Before the reporter named each case, kibi prove refused every Playwright result with "native_case result has no native_id", which this PR found while proving Kibi's own tests.

## Source

> Maintainer decision, 2026-11-11, approving the wording fixes and new requirements of the second KB gold-standard review: "Ok"
