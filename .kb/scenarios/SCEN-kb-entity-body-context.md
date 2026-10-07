---
title: Context-less entity is blocked and acknowledged legacy is not
status: active
priority: must
tags:
  - kb
  - bodies
origin:
  kind: agent
  recorded_at: '2026-10-06T18:33:05.793Z'
id: SCEN-kb-entity-body-context
type: scenario
---
**Scenario: body context is checked per entity type**

Given a current requirement whose body repeats its statement with no Context section, and a scenario whose prose restates its title, when an agent runs `kibi check`, then both are reported by `entity-context-missing` with a hint to add a `## Context` section or prose that says why, who asked and the source. When the same entities carry the tag `review:context-missing` they are not violations and are counted by `entity-context-acknowledged`. Symbols, flags, events and strict-lane facts are never reported.

Assumptions: the schema 8 migration has run, so legacy entities are tagged and bodies are byte-identical to their pre-migration form. The requester's reason is unknown for those entities, so no context is invented for them.
