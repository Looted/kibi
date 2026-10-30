---
title: Kibi signoff writes its views under .kb/briefs/signoff
status: open
priority: must
firmness: firm
semantic_text: The Kibi signoff brief directory shall be .kb/briefs/signoff. The Kibi signoff chat view shall show at most 15 rows.
semantic_clauses:
  - The Kibi signoff brief directory shall be .kb/briefs/signoff.
  - The Kibi signoff chat view shall show at most 15 rows.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:15:00.670Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1575f3b7691ea7a7293b01f66ebe316c394755b90c6a58e1a163042ad0084bf8
semantic_inventory:
  - claim_key: CLAIM-8A91574A1C034AB5
    claim_text: The Kibi signoff brief directory shall be .kb/briefs/signoff
    role: normative
    status: modeled
    span:
      start: 0
      end: 60
  - claim_key: CLAIM-D2526E4DB4D51D99
    claim_text: The Kibi signoff chat view shall show at most 15 rows
    role: normative
    status: modeled
    span:
      start: 62
      end: 115
logic_claims:
  - CLAIM-8A91574A1C034AB5
  - CLAIM-D2526E4DB4D51D99
id: REQ-kibi-signoff-brief-location
type: req
---
The Kibi signoff brief directory shall be .kb/briefs/signoff. The Kibi signoff chat view shall show at most 15 rows.

## Context

SIGNOFF_BRIEF_DIR in packages/cli/src/signoff/model.ts is the directory REQ-kibi-signoff-views names for the latest JSON, Markdown and HTML views, and SIGNOFF_MARKDOWN_LIMIT in packages/cli/src/signoff/markdown.ts is how many rows the chat view shows before leaving the rest to the HTML view. Both are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"