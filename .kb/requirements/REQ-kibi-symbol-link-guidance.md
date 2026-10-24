---
title: Symbol links are judged when written, and coverage and upsert errors name the missing step
status: open
required_evidence: tested
priority: must
tags:
  - symbol
  - traceability
  - upsert
  - coverage
semantic_text: kb_upsert must refuse a coarse symbol link when it is written, judging a links-only update against the stored symbol's source file, as the staged hook and kibi check do. The symbol-coverage finding for a production symbol that already has covered_by must name the test, the implemented requirement and the verified_by link that would connect them. The kb_upsert operation must report a payload it only validated and found invalid as an error envelope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aca11e30806b00c2d28b78a8b3d3a5f671b8fa1abd3a9d07b518337d0b047e7c
semantic_inventory:
  - claim_key: CLAIM-D7C2AC800EF4659C
    claim_text: kb_upsert must refuse a coarse symbol link when it is written, judging a links-only update against the stored symbol's source file, as the staged hook and kibi check do
    role: normative
    status: modeled
    span:
      start: 0
      end: 168
  - claim_key: CLAIM-CB6DA9EE65C6CC03
    claim_text: The symbol-coverage finding for a production symbol that already has covered_by must name the test, the implemented requirement and the verified_by link that would connect them
    role: normative
    status: modeled
    span:
      start: 170
      end: 346
  - claim_key: CLAIM-76FE56010239A24E
    claim_text: The kb_upsert operation must report a payload it only validated and found invalid as an error envelope
    role: normative
    status: modeled
    span:
      start: 348
      end: 450
logic_claims:
  - CLAIM-D7C2AC800EF4659C
  - CLAIM-CB6DA9EE65C6CC03
  - CLAIM-76FE56010239A24E
origin:
  kind: agent
  recorded_at: '2026-10-15T15:56:05.004Z'
id: REQ-kibi-symbol-link-guidance
type: req
---
kb_upsert must refuse a coarse symbol link when it is written, judging a links-only update against the stored symbol's source file, as the staged hook and kibi check do. The symbol-coverage finding for a production symbol that already has covered_by must name the test, the implemented requirement and the verified_by link that would connect them. The kb_upsert operation must report a payload it only validated and found invalid as an error envelope.

## Context

An agent linking existing class-level symbols got no warning from kb_upsert: a payload that only adds `implements` and `covered_by` names no `sourceFile`, so the write-time granularity check skipped it, and a class whose title matched a declaration was accepted although its public methods are the granular symbols. The pre-commit hook then rejected the commit with `symbol_granularity_violation`, after the debt was already in the KB. On the same symbols, `symbol-coverage` said to add `covered_by` although it was there; the real gap was that the test did not verify the requirement. Small messages misled as well: validating an invalid payload without writing reported `status: success`, an invalid test status listed every entity type's values, and a missing grounding fact was reported as a fact without a `claim_key`.

## Source

> A coarse link is reported when it is written, the coverage finding names the missing link, and validation messages say what is wrong.