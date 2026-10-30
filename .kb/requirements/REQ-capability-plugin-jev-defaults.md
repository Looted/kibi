---
title: The Jev plugin defaults to jev-latest and caps timeouts at 120000 milliseconds
status: open
priority: must
firmness: firm
semantic_text: The Jev model must default to jev-latest. The maximum Jev timeout shall be 120000 milliseconds.
semantic_clauses:
  - The Jev model must default to jev-latest.
  - The maximum Jev timeout shall be 120000 milliseconds.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T09:36:39.672Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2d38320d3e6971b3fbef4c7cfa767367f369e6a2d349a1623a38e2369a8cc766
semantic_inventory:
  - claim_key: CLAIM-8A4067501CAD35CE
    claim_text: The Jev model must default to jev-latest
    role: normative
    status: modeled
    span:
      start: 0
      end: 40
  - claim_key: CLAIM-85B214C0394CFC7C
    claim_text: The maximum Jev timeout shall be 120000 milliseconds
    role: normative
    status: modeled
    span:
      start: 42
      end: 94
logic_claims:
  - CLAIM-8A4067501CAD35CE
  - CLAIM-85B214C0394CFC7C
id: REQ-capability-plugin-jev-defaults
type: req
---
The Jev model must default to jev-latest. The maximum Jev timeout shall be 120000 milliseconds.

## Context

The Jev plugin exports its default model (JEV_DEFAULT_MODEL) and its timeout ceiling (JEV_MAX_TIMEOUT_MS) from packages/plugin-jev/src/semantic-classifier.ts. These claims were split from REQ-capability-plugin-configuration-v1 so each is proved against the export itself; how configuration is resolved and validated stays there.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"