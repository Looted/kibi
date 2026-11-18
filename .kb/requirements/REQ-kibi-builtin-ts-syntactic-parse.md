---
title: The builtin TypeScript provider decides symbols from each file's own syntax
status: open
priority: must
required_evidence: tested
firmness: firm
semantic_text: The builtin TypeScript provider must decide symbols from each file's own syntax, without loading TypeScript's library declarations or resolving the file's imports.
tags:
  - plugins
  - symbols
  - typescript
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
  ref: 'Measured on Kibi''s own repository, 2026-11-16: symbol coordinate enrichment took 6.2s with ts-morph''s default project, which loads lib declarations and resolves imports, and 4.3s with a syntax-only project, with identical output. Maintainer decision, 2026-11-17, approving this statement as worded ("approve all").'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6b0d75ff26aa98ad14aeefdddf861800c319d019af2e0aca941b64d71d139499
semantic_inventory:
  - claim_key: CLAIM-4DCBC7183589D6C4
    claim_text: The builtin TypeScript provider must decide symbols from each file's own syntax, without loading TypeScript's library declarations or resolving the file's imports
    role: normative
    status: modeled
    span:
      start: 0
      end: 162
logic_claims:
  - CLAIM-4DCBC7183589D6C4
id: REQ-kibi-builtin-ts-syntactic-parse
type: req
---
The builtin TypeScript provider must decide symbols from each file's own syntax, without loading TypeScript's library declarations or resolving the file's imports.

## Why

ts-morph's default project loads TypeScript's lib declarations and follows every import, which deciding a file's exported declarations never needs. On Kibi's own repository symbol coordinate enrichment took 6.2s with the default project and 4.3s with a syntax-only one, with identical output.

## Context

createSyntacticProject builds the ts-morph project with noLib, noResolve and no types; the v1 and v2 extractors, granularity candidates and coordinate enrichment all parse through it. Names exported through a local export list are still found.

## Source

> Measured on Kibi's own repository, 2026-11-16: symbol coordinate enrichment took 6.2s with ts-morph's default project, which loads lib declarations and resolves imports, and 4.3s with a syntax-only project, with identical output. Maintainer decision, 2026-11-17, approving this statement as worded ("approve all").
