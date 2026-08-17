---
title: Authored and compiled relationships remain in parity
status: open
priority: must
tags:
  - relationships
  - validation
  - parity
semantic_text: Kibi check must compare every relationship authored in tracked Markdown, symbol manifests, or canonical relationship shards with compiled RDF and block when an authored edge is missing. Compiled relationships owned by explicit runtime-only source entities are exempt from reverse source ownership only; authored-to-compiled drift is never exempt. The parity rule must honor explicit rule selection and source-discovery failures must remain blocking.
semantic_clauses:
  - Kibi check must compare every relationship authored in tracked Markdown, symbol manifests, or canonical relationship shards with compiled RDF and block when an authored edge is missing.
  - Compiled relationships owned by explicit runtime-only source entities are exempt from reverse source ownership only.
  - authored-to-compiled drift is never exempt.
  - The parity rule must honor explicit rule selection.
  - source-discovery failures must remain blocking.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 854e234fcb1b06ab60c98fe5bff270d545542c65c7d9a9eb17f56f06f56f6d56
logic_claims:
  - CLAIM-29422CD5F6D5A1D0
  - CLAIM-DC162540AEA7A2B4
  - CLAIM-3901918BF8D31ABF
  - CLAIM-183ECDE6E879FD37
  - CLAIM-40AD985B2077AD85
semantic_inventory:
  - claim_key: CLAIM-29422CD5F6D5A1D0
    claim_text: Kibi check must compare every relationship authored in tracked Markdown, symbol manifests, or canonical relationship shards with compiled RDF and block when an authored edge is missing
    role: normative
    status: modeled
    span:
      start: 0
      end: 184
    reason: Grounded by the exact authored source lanes, forward direction, and blocking outcome.
  - claim_key: CLAIM-DC162540AEA7A2B4
    claim_text: Compiled relationships owned by explicit runtime-only source entities are exempt from reverse source ownership only
    role: exception
    status: modeled
    span:
      start: 186
      end: 301
    reason: Grounded by the explicit runtime-source reverse-ownership exemption.
  - claim_key: CLAIM-3901918BF8D31ABF
    claim_text: authored-to-compiled drift is never exempt
    role: exception
    status: modeled
    span:
      start: 303
      end: 345
    reason: Grounded separately as a never-exempt authored-to-compiled policy.
  - claim_key: CLAIM-183ECDE6E879FD37
    claim_text: The parity rule must honor explicit rule selection
    role: normative
    status: modeled
    span:
      start: 347
      end: 397
    reason: Grounded by the scoped check-rule selection policy.
  - claim_key: CLAIM-40AD985B2077AD85
    claim_text: source-discovery failures must remain blocking
    role: normative
    status: modeled
    span:
      start: 402
      end: 448
    reason: Grounded by the blocking source-discovery failure policy.
id: REQ-kibi-source-relationship-parity
type: req
---
Kibi check must compare every relationship authored in tracked Markdown, symbol manifests, or canonical relationship shards with compiled RDF and block when an authored edge is missing. Compiled relationships owned by explicit runtime-only source entities are exempt from reverse source ownership only; authored-to-compiled drift is never exempt. The parity rule must honor explicit rule selection and source-discovery failures must remain blocking.
