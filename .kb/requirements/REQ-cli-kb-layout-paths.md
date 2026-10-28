---
title: KB folder layout
status: open
priority: must
firmness: firm
semantic_text: The KB folder shall be .kb. The derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations. The KB manifest version shall be 1.
semantic_clauses:
  - The KB folder shall be .kb.
  - The derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations.
  - The KB manifest version shall be 1.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T19:00:58.724Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1be4e667543ed607403a9235b352fe4878e294cc75cfcc2f8dc396a11ad53d40
semantic_inventory:
  - claim_key: CLAIM-918401B32051F8C1
    claim_text: The KB folder shall be .kb
    role: normative
    status: modeled
    span:
      start: 0
      end: 26
  - claim_key: CLAIM-E2AE94CB45988C06
    claim_text: The derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations
    role: normative
    status: modeled
    span:
      start: 28
      end: 133
  - claim_key: CLAIM-BB1499C9D00BD828
    claim_text: The KB manifest version shall be 1
    role: normative
    status: modeled
    span:
      start: 135
      end: 169
logic_claims:
  - CLAIM-918401B32051F8C1
  - CLAIM-E2AE94CB45988C06
  - CLAIM-BB1499C9D00BD828
id: REQ-cli-kb-layout-paths
type: req
---
The KB folder shall be .kb. The derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations. The KB manifest version shall be 1.

## Context

REQ-cli-init-canonical has kibi init write the canonical KB layout. Its folder, the subfolders that hold derived state rather than authored entities, and the manifest version are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"