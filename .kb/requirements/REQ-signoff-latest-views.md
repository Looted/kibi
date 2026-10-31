---
title: Kibi signoff latest view files
status: open
priority: must
firmness: firm
tags:
  - proof
semantic_text: The latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json. The latest Kibi signoff Markdown view file shall be .kb/briefs/signoff/latest.md. The latest Kibi signoff HTML view file shall be .kb/briefs/signoff/latest.html.
semantic_clauses:
  - The latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json.
  - The latest Kibi signoff Markdown view file shall be .kb/briefs/signoff/latest.md.
  - The latest Kibi signoff HTML view file shall be .kb/briefs/signoff/latest.html.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T19:43:41.295Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 09002f2a04c0e08576d1d1651c1f92fee5a8bf9b3640fe1d52c8a0284fdc555e
semantic_inventory:
  - claim_key: CLAIM-E4E917F697A7045C
    claim_text: The latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
  - claim_key: CLAIM-35056AE430E48351
    claim_text: The latest Kibi signoff Markdown view file shall be .kb/briefs/signoff/latest.md
    role: normative
    status: modeled
    span:
      start: 80
      end: 160
  - claim_key: CLAIM-AA3C3D26C6085FD5
    claim_text: The latest Kibi signoff HTML view file shall be .kb/briefs/signoff/latest.html
    role: normative
    status: modeled
    span:
      start: 162
      end: 240
logic_claims:
  - CLAIM-E4E917F697A7045C
  - CLAIM-35056AE430E48351
  - CLAIM-AA3C3D26C6085FD5
id: REQ-signoff-latest-views
type: req
---
The latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json. The latest Kibi signoff Markdown view file shall be .kb/briefs/signoff/latest.md. The latest Kibi signoff HTML view file shall be .kb/briefs/signoff/latest.html.

## Context

REQ-kibi-signoff-views has kibi signoff write the latest JSON, Markdown and HTML views under the brief directory REQ-kibi-signoff-brief-location names. The file of each view is stated here so it is proved against packages/cli/src/signoff/model.ts.

## Source

Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"
