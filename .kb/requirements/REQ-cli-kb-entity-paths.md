---
title: Canonical knowledge base entity paths
status: open
priority: must
firmness: firm
semantic_text: A canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols. A legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events. The canonical requirements path shall be .kb/requirements. The canonical scenarios path shall be .kb/scenarios. The canonical tests path shall be .kb/tests. The canonical adr path shall be .kb/adr. The canonical flags path shall be .kb/flags. The canonical events path shall be .kb/events. The canonical facts path shall be .kb/facts. The canonical symbols path shall be .kb/symbols.yaml.
semantic_clauses:
  - A canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols.
  - A legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events.
  - The canonical requirements path shall be .kb/requirements.
  - The canonical scenarios path shall be .kb/scenarios.
  - The canonical tests path shall be .kb/tests.
  - The canonical adr path shall be .kb/adr.
  - The canonical flags path shall be .kb/flags.
  - The canonical events path shall be .kb/events.
  - The canonical facts path shall be .kb/facts.
  - The canonical symbols path shall be .kb/symbols.yaml.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T22:33:34.395Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: dffd000080b1a9269b34db93c586f1fa362b91a35cb107a3a98ff1a18f57ad4a
semantic_inventory:
  - claim_key: CLAIM-B46994FD5C740451
    claim_text: A canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols
    role: normative
    status: modeled
    span:
      start: 0
      end: 108
  - claim_key: CLAIM-8AED0D5240EEEB02
    claim_text: A legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events
    role: normative
    status: modeled
    span:
      start: 110
      end: 203
  - claim_key: CLAIM-190E61DE4B8E049B
    claim_text: The canonical requirements path shall be .kb/requirements
    role: normative
    status: modeled
    span:
      start: 205
      end: 262
  - claim_key: CLAIM-2A79EAA4A7A13052
    claim_text: The canonical scenarios path shall be .kb/scenarios
    role: normative
    status: modeled
    span:
      start: 264
      end: 315
  - claim_key: CLAIM-719326D8135CC69E
    claim_text: The canonical tests path shall be .kb/tests
    role: normative
    status: modeled
    span:
      start: 317
      end: 360
  - claim_key: CLAIM-12E7D2D9935076B8
    claim_text: The canonical adr path shall be .kb/adr
    role: normative
    status: modeled
    span:
      start: 362
      end: 401
  - claim_key: CLAIM-9CE36E58447F43A6
    claim_text: The canonical flags path shall be .kb/flags
    role: normative
    status: modeled
    span:
      start: 403
      end: 446
  - claim_key: CLAIM-19C78FD7561E9C07
    claim_text: The canonical events path shall be .kb/events
    role: normative
    status: modeled
    span:
      start: 448
      end: 493
  - claim_key: CLAIM-39F74AD8BD77527F
    claim_text: The canonical facts path shall be .kb/facts
    role: normative
    status: modeled
    span:
      start: 495
      end: 538
  - claim_key: CLAIM-E1C731AC3734E4DE
    claim_text: The canonical symbols path shall be .kb/symbols.yaml
    role: normative
    status: modeled
    span:
      start: 540
      end: 592
logic_claims:
  - CLAIM-B46994FD5C740451
  - CLAIM-8AED0D5240EEEB02
  - CLAIM-190E61DE4B8E049B
  - CLAIM-2A79EAA4A7A13052
  - CLAIM-719326D8135CC69E
  - CLAIM-12E7D2D9935076B8
  - CLAIM-9CE36E58447F43A6
  - CLAIM-19C78FD7561E9C07
  - CLAIM-39F74AD8BD77527F
  - CLAIM-E1C731AC3734E4DE
id: REQ-cli-kb-entity-paths
type: req
---
A canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols. A legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events. The canonical requirements path shall be .kb/requirements. The canonical scenarios path shall be .kb/scenarios. The canonical tests path shall be .kb/tests. The canonical adr path shall be .kb/adr. The canonical flags path shall be .kb/flags. The canonical events path shall be .kb/events. The canonical facts path shall be .kb/facts. The canonical symbols path shall be .kb/symbols.yaml.

## Context

packages/cli/src/utils/kb-paths.ts fixes the canonical layout REQ-cli-kb-layout-paths describes: one directory per entity lane under .kb and one symbols manifest. The lanes an older config named are listed too. Each path and lane is stated here so the layout is proved against the path tables.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"