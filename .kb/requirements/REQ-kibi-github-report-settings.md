---
title: GitHub report and badge settings
status: open
priority: must
firmness: firm
semantic_text: The Kibi badge workflow shall be written to .github/workflows/kibi-badge.yml. The GitHub Pages report folder shall be kibi-report. The Kibi badge alt text shall be Kibi requirement health. The placeholder repository owner shall be OWNER. The placeholder repository name shall be REPOSITORY.
semantic_clauses:
  - The Kibi badge workflow shall be written to .github/workflows/kibi-badge.yml.
  - The GitHub Pages report folder shall be kibi-report.
  - The Kibi badge alt text shall be Kibi requirement health.
  - The placeholder repository owner shall be OWNER.
  - The placeholder repository name shall be REPOSITORY.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:18:25.917Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d332103e91e30a5d832914138b09df272973310daadc130625d93d4500ebfdbc
semantic_inventory:
  - claim_key: CLAIM-8B3298DD4D426818
    claim_text: The Kibi badge workflow shall be written to .github/workflows/kibi-badge.yml
    role: normative
    status: modeled
    span:
      start: 0
      end: 76
  - claim_key: CLAIM-084B49566DFE62A9
    claim_text: The GitHub Pages report folder shall be kibi-report
    role: normative
    status: modeled
    span:
      start: 78
      end: 129
  - claim_key: CLAIM-FE6DF54E668EEA7E
    claim_text: The Kibi badge alt text shall be Kibi requirement health
    role: normative
    status: modeled
    span:
      start: 131
      end: 187
  - claim_key: CLAIM-BA364427D4A651C8
    claim_text: The placeholder repository owner shall be OWNER
    role: normative
    status: modeled
    span:
      start: 189
      end: 236
  - claim_key: CLAIM-3CE88F3B9079CA71
    claim_text: The placeholder repository name shall be REPOSITORY
    role: normative
    status: modeled
    span:
      start: 238
      end: 289
logic_claims:
  - CLAIM-8B3298DD4D426818
  - CLAIM-084B49566DFE62A9
  - CLAIM-FE6DF54E668EEA7E
  - CLAIM-BA364427D4A651C8
  - CLAIM-3CE88F3B9079CA71
id: REQ-kibi-github-report-settings
type: req
---
The Kibi badge workflow shall be written to .github/workflows/kibi-badge.yml. The GitHub Pages report folder shall be kibi-report. The Kibi badge alt text shall be Kibi requirement health. The placeholder repository owner shall be OWNER. The placeholder repository name shall be REPOSITORY.

## Context

packages/cli/src/commands/github-init.ts wires the GitHub report REQ-kibi-github-report-integration describes. The workflow path, Pages folder, badge alt text and owner and repository placeholders are stated here so each is proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"