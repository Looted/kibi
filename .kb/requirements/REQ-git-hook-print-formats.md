---
title: Kibi hook command print formats
status: open
priority: must
firmness: firm
tags:
  - proof
semantic_text: A Kibi hook command print format shall be shell, lefthook, husky or pre-commit.
semantic_clauses:
  - A Kibi hook command print format shall be shell, lefthook, husky or pre-commit.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T19:42:53.638Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8d96f075a6386b051e871068d870a8737bbe5b0a6e45d14fcdecc7e2b81e6068
semantic_inventory:
  - claim_key: CLAIM-325D4EB22241A28E
    claim_text: A Kibi hook command print format shall be shell, lefthook, husky or pre-commit
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
logic_claims:
  - CLAIM-325D4EB22241A28E
id: REQ-git-hook-print-formats
type: req
---
A Kibi hook command print format shall be shell, lefthook, husky or pre-commit.

## Context

REQ-git-hook-manager-integration has kibi init --print-hook print Kibi's hook commands for each supported hook manager. The formats it prints are stated here so they are proved against HOOK_SNIPPET_FORMATS in packages/cli/src/commands/hook-managers.ts.

## Source

Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"
