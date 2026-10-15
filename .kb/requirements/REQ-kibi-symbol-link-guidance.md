---
title: Symbol links are judged when written, and coverage and upsert errors name the missing step
status: open
priority: must
tags:
  - symbol
  - traceability
  - upsert
  - coverage
semantic_text: kb_upsert must refuse a coarse symbol link when it is written, judging a links-only update against the stored symbol's source file, as the staged hook and kibi check do. When a production symbol already has covered_by, the symbol-coverage finding must name the test, the implemented requirement and the verified_by link that would connect them. A kb_upsert dry run that finds the payload invalid must return an error envelope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2c44b7665cd8e8dfcba6e1e1b80eaf4b94400a42cbbf6a6ee1f33285a5ddd924
semantic_inventory:
  - claim_key: CLAIM-D7C2AC800EF4659C
    claim_text: kb_upsert must refuse a coarse symbol link when it is written, judging a links-only update against the stored symbol's source file, as the staged hook and kibi check do
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 168
  - claim_key: CLAIM-80A7581718779308
    claim_text: When a production symbol already has covered_by, the symbol-coverage finding must name the test, the implemented requirement and the verified_by link that would connect them
    role: condition
    status: missing
    span:
      start: 170
      end: 343
  - claim_key: CLAIM-8D02B7037EC3F669
    claim_text: A kb_upsert dry run that finds the payload invalid must return an error envelope
    role: normative
    status: ontology_gap
    span:
      start: 345
      end: 425
logic_claims:
  - CLAIM-D7C2AC800EF4659C
  - CLAIM-80A7581718779308
  - CLAIM-8D02B7037EC3F669
origin:
  kind: agent
  recorded_at: '2026-10-15T15:56:05.004Z'
id: REQ-kibi-symbol-link-guidance
type: req
---
kb_upsert must refuse a coarse symbol link when it is written, judging a links-only update against the stored symbol's source file, as the staged hook and kibi check do. When a production symbol already has covered_by, the symbol-coverage finding must name the test, the implemented requirement and the verified_by link that would connect them. A kb_upsert dry run that finds the payload invalid must return an error envelope.

## Context

An agent linking existing class-level symbols got no warning from kb_upsert: a payload that only adds `implements` and `covered_by` names no `sourceFile`, so the write-time granularity check skipped it, and a class whose title matched a declaration was accepted although its public methods are the granular symbols. The pre-commit hook then rejected the commit with `symbol_granularity_violation`, after the debt was already in the KB. On the same symbols, `symbol-coverage` said to add `covered_by` although it was there; the real gap was that the test did not verify the requirement. Small messages misled as well: an invalid dry run reported `status: success`, an invalid test status listed every entity type's values, and a missing grounding fact was reported as a fact without a `claim_key`.

## Source

> A coarse link is reported when it is written, the coverage finding names the missing link, and dry-run and validation messages say what is wrong.