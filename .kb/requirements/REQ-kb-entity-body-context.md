---
title: Entity bodies carry context separate from checked meaning
status: open
priority: must
tags:
  - kb
  - bodies
  - migration
semantic_text: Kibi must report a current entity whose body states no context as an entity-context-missing violation. Kibi must apply the body context check only to requirements, scenarios, tests, ADRs and observation facts. Kibi must honor the review:context-missing tag only for entity ids the schema 8 migration recorded. Kibi must preserve every entity body byte for byte in schema migrations.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ff673bc1d1f514f95efccc3c4afe418ef9acb611afca32dc27313aa0d1936789
semantic_inventory:
  - claim_key: CLAIM-98DBBD0BF8225EC5
    claim_text: Kibi must report a current entity whose body states no context as an entity-context-missing violation
    role: normative
    status: modeled
    span:
      start: 0
      end: 101
  - claim_key: CLAIM-98DD9E4473424319
    claim_text: Kibi must apply the body context check only to requirements, scenarios, tests, ADRs and observation facts
    role: normative
    status: modeled
    span:
      start: 103
      end: 208
  - claim_key: CLAIM-CED9C3EB5D2EE0F9
    claim_text: Kibi must honor the review:context-missing tag only for entity ids the schema 8 migration recorded
    role: normative
    status: modeled
    span:
      start: 210
      end: 308
  - claim_key: CLAIM-3DBD5E66B2FCF8D9
    claim_text: Kibi must preserve every entity body byte for byte in schema migrations
    role: normative
    status: modeled
    span:
      start: 310
      end: 381
logic_claims:
  - CLAIM-98DBBD0BF8225EC5
  - CLAIM-98DD9E4473424319
  - CLAIM-CED9C3EB5D2EE0F9
  - CLAIM-3DBD5E66B2FCF8D9
origin:
  kind: agent
  recorded_at: '2026-10-06T18:33:08.826Z'
id: REQ-kb-entity-body-context
type: req
---
Kibi must report a current entity whose body states no context as an entity-context-missing violation. Kibi must apply the body context check only to requirements, scenarios, tests, ADRs and observation facts. Kibi must honor the review:context-missing tag only for entity ids the schema 8 migration recorded. Kibi must preserve every entity body byte for byte in schema migrations.

## Context
Thin entity bodies lost knowledge that front matter cannot hold, and past schema migrations depended on the body as the only record of authored meaning. In a test project most requirements were a bare claim sentence with no reason, requester or source. The reason for the 12-word threshold and the 0.8 similarity limit was not stated beyond keeping filler out; legacy entities are tagged review:context-missing instead of being given invented context.

## Source
> Piotr approved a strict rollout with a migration.

KB body depth assessment and implementation spec, 2026-10-06.
