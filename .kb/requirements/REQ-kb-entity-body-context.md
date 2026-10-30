---
title: Entity bodies carry context separate from checked meaning
status: open
required_evidence: tested
priority: must
tags:
  - kb
  - bodies
  - migration
semantic_text: Kibi must report a current entity whose body states no context as an entity-context-missing violation. Kibi must apply the body context check only to requirements, scenarios, tests, ADRs, observation facts and meta facts. Kibi must honor the review:context-missing tag only for entity ids the schema 8 migration recorded. Kibi must preserve every entity body byte for byte in schema migrations.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: af0ba717df5c7e4a228b56eda48923e16afde9414f200f011127f6219377ee26
semantic_inventory:
  - claim_key: CLAIM-98DBBD0BF8225EC5
    claim_text: Kibi must report a current entity whose body states no context as an entity-context-missing violation
    role: normative
    status: modeled
    span:
      start: 0
      end: 101
  - claim_key: CLAIM-885778C6E96DB6AB
    claim_text: Kibi must apply the body context check only to requirements, scenarios, tests, ADRs, observation facts and meta facts
    role: normative
    status: modeled
    span:
      start: 103
      end: 220
  - claim_key: CLAIM-CED9C3EB5D2EE0F9
    claim_text: Kibi must honor the review:context-missing tag only for entity ids the schema 8 migration recorded
    role: normative
    status: modeled
    span:
      start: 222
      end: 320
  - claim_key: CLAIM-3DBD5E66B2FCF8D9
    claim_text: Kibi must preserve every entity body byte for byte in schema migrations
    role: normative
    status: modeled
    span:
      start: 322
      end: 393
logic_claims:
  - CLAIM-98DBBD0BF8225EC5
  - CLAIM-885778C6E96DB6AB
  - CLAIM-CED9C3EB5D2EE0F9
  - CLAIM-3DBD5E66B2FCF8D9
origin:
  kind: agent
  recorded_at: '2026-10-06T18:33:08.826Z'
id: REQ-kb-entity-body-context
type: req
---
Kibi must report a current entity whose body states no context as an entity-context-missing violation. Kibi must apply the body context check only to requirements, scenarios, tests, ADRs, observation facts and meta facts. Kibi must honor the review:context-missing tag only for entity ids the schema 8 migration recorded. Kibi must preserve every entity body byte for byte in schema migrations.

## Context
Thin entity bodies lost knowledge that front matter cannot hold, and past schema migrations depended on the body as the only record of authored meaning. In a test project most requirements were a bare claim sentence with no reason, requester or source. The reason for the 12-word threshold and the 0.8 similarity limit was not stated beyond keeping filler out; legacy entities are tagged review:context-missing instead of being given invented context.

Meta facts carry prose that people read, so the check also runs on them. On 2026-10-30 the checked-types rule was reworded to list meta facts.

## Source
> Piotr approved a strict rollout with a migration.

KB body depth assessment and implementation spec, 2026-10-06.
