---
title: Kibi-managed git hooks and block marker
status: open
priority: must
firmness: firm
semantic_text: 'A Kibi-managed hook block shall open with # BEGIN kibi-managed. A Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit.'
semantic_clauses:
  - 'A Kibi-managed hook block shall open with # BEGIN kibi-managed.'
  - A Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T22:40:19.016Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 784ec80077e1eef81e0ccb20d820605520361fc552be887baf5dedaf97da2c7a
semantic_inventory:
  - claim_key: CLAIM-BD8967BCDC356469
    claim_text: 'A Kibi-managed hook block shall open with # BEGIN kibi-managed'
    role: normative
    status: modeled
    span:
      start: 0
      end: 62
  - claim_key: CLAIM-3CDE819547F73291
    claim_text: A Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit
    role: normative
    status: modeled
    span:
      start: 64
      end: 150
logic_claims:
  - CLAIM-BD8967BCDC356469
  - CLAIM-3CDE819547F73291
id: REQ-git-hook-managed-names
type: req
---
A Kibi-managed hook block shall open with # BEGIN kibi-managed. A Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit.

## Context

packages/cli/src/commands/init-helpers.ts names the hooks REQ-git-hook-effective-install installs into the effective hooks directory and the line that opens Kibi's managed block, so a re-install replaces only that block. Both are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"