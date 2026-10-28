---
title: Capability plugin protocol identifiers
status: open
priority: must
firmness: firm
semantic_text: The Kibi plugin API version shall be kibi.plugin.v1. The ontology pack capability id shall be kibi.ontology-pack.v1. The check policy capability id shall be kibi.check-policy.v1.
semantic_clauses:
  - The Kibi plugin API version shall be kibi.plugin.v1.
  - The ontology pack capability id shall be kibi.ontology-pack.v1.
  - The check policy capability id shall be kibi.check-policy.v1.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T13:35:27.571Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: db43ab57a863ed943ba147cef0aaa0112d248fe9267154f32f6947e79eadd6e0
semantic_inventory:
  - claim_key: CLAIM-4B5530044039AD39
    claim_text: The Kibi plugin API version shall be kibi.plugin.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 51
  - claim_key: CLAIM-D3553D92CAA0ACD7
    claim_text: The ontology pack capability id shall be kibi.ontology-pack.v1
    role: normative
    status: modeled
    span:
      start: 53
      end: 115
  - claim_key: CLAIM-DF4B0268FE1A8B50
    claim_text: The check policy capability id shall be kibi.check-policy.v1
    role: normative
    status: modeled
    span:
      start: 117
      end: 177
logic_claims:
  - CLAIM-4B5530044039AD39
  - CLAIM-D3553D92CAA0ACD7
  - CLAIM-DF4B0268FE1A8B50
id: REQ-capability-plugin-protocol-identifiers
type: req
---
The Kibi plugin API version shall be kibi.plugin.v1. The ontology pack capability id shall be kibi.ontology-pack.v1. The check policy capability id shall be kibi.check-policy.v1.

## Context

kibi-plugin-sdk defines the identifiers a capability plugin must use (REQ-capability-plugin-protocol-v1): the plugin API version and the capability ids. They are stated here so each is proved against the SDK constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"