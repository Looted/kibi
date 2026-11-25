---
title: A requirement write lists every later kb_check step up front, for the project's Kibi level
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb_upsert
  - next-actions
  - decision-capture
  - levels
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 1 of 8: ''Approve all''. Maintainer decision, 2026-11-25, approving the Kibi level statements, statement 7 of 13, which replaces this requirement''s text ("When kb_upsert or kb_record writes a requirement below its evidence floor, its nextActions must also include a pair-review step for each current requirement on its claims'' subjects, a kb_model step for its unmodeled claims, and a failure-side scenario that the same test validates."): "Approve all as written".'
  recorded_at: '2026-11-25T09:42:10.813Z'
rationale: 'In the crowded-store benchmark, long Kibi sessions ran as a staircase: after each fix kb_check reported the next gap (pair review, evidence floor, happy path only), and each one became another question to the person.'
semantic_text: When kb_upsert or kb_record writes a requirement with unmodeled claims, its nextActions must include a kb_model step for those claims and a pair-review step for each current requirement on its claims' subjects, at every level. When the requirement is below its evidence floor at level test, its nextActions must also include a failure-side scenario that the same test validates. At level remember, a requirement write's nextActions must not ask for a scenario, a test or a proof.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5dc012fe2ed5d710d115c07bed14c9909c45be2b5c59bdcb04e6a01f6749c5c0
semantic_inventory:
  - claim_key: CLAIM-580DB1193B4C8588
    claim_text: When kb_upsert or kb_record writes a requirement with unmodeled claims, its nextActions must include a kb_model step for those claims and a pair-review step for each current requirement on its claims' subjects, at every level
    role: condition
    status: modeled
    span:
      start: 0
      end: 225
    subjects:
      - mcp.kb_upsert
    reason: Grounded by FACT-kb-upsert-capture-every-step-up-front via requires_property.
  - claim_key: CLAIM-3B61CEE66A4FD2A6
    claim_text: When the requirement is below its evidence floor at level test, its nextActions must also include a failure-side scenario that the same test validates
    role: condition
    status: modeled
    span:
      start: 227
      end: 377
    subjects:
      - mcp.kb_upsert
    reason: Grounded by FACT-kb-upsert-capture-failure-scenario-at-test via requires_property.
  - claim_key: CLAIM-55C40C803E898D01
    claim_text: At level remember, a requirement write's nextActions must not ask for a scenario, a test or a proof
    role: normative
    status: modeled
    span:
      start: 379
      end: 478
    subjects:
      - mcp.kb_upsert
    reason: Grounded by FACT-kb-upsert-capture-no-verification-at-remember via requires_property.
logic_claims:
  - CLAIM-580DB1193B4C8588
  - CLAIM-3B61CEE66A4FD2A6
  - CLAIM-55C40C803E898D01
id: REQ-kb-upsert-capture-every-step-up-front
type: req
---
When kb_upsert or kb_record writes a requirement with unmodeled claims, its nextActions must include a kb_model step for those claims and a pair-review step for each current requirement on its claims' subjects, at every level. When the requirement is below its evidence floor at level test, its nextActions must also include a failure-side scenario that the same test validates. At level remember, a requirement write's nextActions must not ask for a scenario, a test or a proof.

## Context

In the crowded-store benchmark, long Kibi sessions ran as a staircase: after each fix kb_check reported the next gap (pair review, evidence floor, happy path only), and each one became another question to the person. With Kibi levels (2026-11-25), the modeling and pair-review steps belong to the knowledge layer every level runs, while the scenario, test and proof steps belong to level test.

## Source

> Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 1 of 8: 'Approve all'. Maintainer decision, 2026-11-25, approving the Kibi level statements, statement 7 of 13, which replaces this requirement's text ("When kb_upsert or kb_record writes a requirement below its evidence floor, its nextActions must also include a pair-review step for each current requirement on its claims' subjects, a kb_model step for its unmodeled claims, and a failure-side scenario that the same test validates."): "Approve all as written".
