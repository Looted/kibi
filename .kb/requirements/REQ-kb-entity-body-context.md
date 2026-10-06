---
title: Entity bodies carry context separate from checked meaning
status: open
priority: must
tags:
  - kb
  - bodies
  - migration
semantic_text: Kibi must block a current requirement, scenario, test, ADR or observation fact whose Markdown body carries no context beyond its title, while leaving symbols, flags, events and other fact kinds exempt.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 19ced2d09a913cf5146d9641501b69d78fa9c6329a6f1c376a774a32d794d6e4
semantic_inventory:
  - claim_key: CLAIM-82643E2529EEC7D9
    claim_text: Kibi must block a current requirement, scenario, test, ADR or observation fact whose Markdown body carries no context beyond its title, while leaving symbols, flags, events and other fact kinds exempt
    role: exception
    status: ontology_gap
    span:
      start: 0
      end: 200
logic_claims:
  - CLAIM-82643E2529EEC7D9
origin:
  kind: agent
  recorded_at: '2026-10-06T18:33:08.826Z'
id: REQ-kb-entity-body-context
type: req
---
Kibi must block a current requirement, scenario, test, ADR or observation fact whose Markdown body carries no context beyond its title, while leaving symbols, flags, events and other fact kinds exempt.

## Context
Thin entity bodies lost knowledge that front matter cannot hold, and past schema migrations depended on the body as the only record of authored meaning. In a test project most requirements were a bare claim sentence with no reason, requester or source. The reason for the 12-word threshold and the 0.8 similarity limit was not stated beyond keeping filler out; legacy entities are tagged review:context-missing instead of being given invented context.

## Source
> Piotr approved a strict rollout with a migration.

KB body depth assessment and implementation spec, 2026-10-06.
