---
title: The staged check and impact review run only release-qualified source analyzers whose installed files match their approval, inside a host-owned deadline
status: open
semantic_text: The staged check and impact review must run only release-qualified source analyzers whose installed files match their approval. The host must own the analysis deadline and give providers a shorter budget.
semantic_clauses:
  - The staged check and impact review must run only release-qualified source analyzers whose installed files match their approval
  - The host must own the analysis deadline and give providers a shorter budget
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0e292e9e37e185c701bafe608c6aacea467e0f894951a88b429bd879e18b2c33
semantic_inventory:
  - claim_key: CLAIM-E89600919BAC8630
    claim_text: The staged check and impact review must run only release-qualified source analyzers whose installed files match their approval
    role: normative
    status: modeled
    span:
      start: 0
      end: 126
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B11CB7B0358602B6
    claim_text: The host must own the analysis deadline and give providers a shorter budget
    role: normative
    status: modeled
    span:
      start: 128
      end: 203
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-E89600919BAC8630
  - CLAIM-B11CB7B0358602B6
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:31:19.408Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - source-analysis
  - staged-check
  - impact-review
  - plugins
id: REQ-kibi-approved-source-analyzers
type: req
---
The staged check and impact review must run only release-qualified source analyzers whose installed files match their approval. The host must own the analysis deadline and give providers a shorter budget.

## Context

Each release pins the executable closure of every approved analyzer by file hash, package identity and dependency versions. Before a plugin entrypoint executes, the staged check and impact review verify that closure, so an unlisted package or an installed file edited after release is refused instead of deciding whether a change is covered. A normal sync or check with a declared plugin is outside this gate. The host keeps the overall deadline and hands each provider a strictly shorter budget, so a slow provider times out before the host does.

Carved out of REQ-source-analysis-v2, which keeps the source analysis v2 result contract (completeness status, UTF-16 ranges, authored identity); this child names which analyzers the staged check and impact review may run and who owns their deadline.

## Source

> Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"
