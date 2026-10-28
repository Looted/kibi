---
title: The legacy KB first step is kibi migrate --yes
status: open
priority: must
firmness: firm
semantic_text: The legacy KB migration command shall be kibi migrate --yes.
semantic_clauses:
  - The legacy KB migration command shall be kibi migrate --yes.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T11:15:40.523Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 355e201edca353a2fc09f4de9e0f060b176842cbf7f6c3d70dbc80498aac1027
semantic_inventory:
  - claim_key: CLAIM-B6CB9B3266E2A0A1
    claim_text: The legacy KB migration command shall be kibi migrate --yes
    role: normative
    status: modeled
    span:
      start: 0
      end: 59
logic_claims:
  - CLAIM-B6CB9B3266E2A0A1
id: REQ-legacy-kb-migrate-command
type: req
---
The legacy KB migration command shall be kibi migrate --yes.

## Context

LEGACY_KB_MIGRATION_COMMAND in packages/cli/src/utils/config.ts is the command REQ-legacy-kb-first-step-migrate has every surface name first when it finds a legacy KB. It is stated here so the exact command is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"