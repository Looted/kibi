---
title: Kibi signoff format environment variable
status: open
priority: must
firmness: firm
semantic_text: The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT.
semantic_clauses:
  - The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T11:16:33.851Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7c5edf0fffd74ffd21e8d8fe8dfc18790ec1c0b804c6b2b9ce7c88e88e60a7fc
semantic_inventory:
  - claim_key: CLAIM-1B36DD238864E38E
    claim_text: The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT
    role: normative
    status: modeled
    span:
      start: 0
      end: 73
logic_claims:
  - CLAIM-1B36DD238864E38E
id: REQ-kibi-signoff-format-setting
type: req
---
The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT.

## Context

SIGNOFF_FORMAT_ENV in packages/cli/src/commands/signoff.ts names the variable a host sets to choose the signoff view format instead of REQ-kibi-signoff-views' default unfenced Markdown. It is stated here so the name is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"