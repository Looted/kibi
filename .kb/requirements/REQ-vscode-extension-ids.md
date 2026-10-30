---
title: VS Code extension view and command ids
status: open
priority: must
firmness: firm
semantic_text: The Kibi sidebar container id shall be kibi-sidebar. The Kibi tree view id shall be kibi-knowledge-base. The refresh tree command shall be kibi.refreshTree. The focus knowledge base command shall be kibi.focusKnowledgeBase.
semantic_clauses:
  - The Kibi sidebar container id shall be kibi-sidebar.
  - The Kibi tree view id shall be kibi-knowledge-base.
  - The refresh tree command shall be kibi.refreshTree.
  - The focus knowledge base command shall be kibi.focusKnowledgeBase.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T17:06:19.566Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3daea29920c01fa1cc9cb8b976e6f4681437359d117804a7164cd65d1b659e03
semantic_inventory:
  - claim_key: CLAIM-2DBB602BF36E069A
    claim_text: The Kibi sidebar container id shall be kibi-sidebar
    role: normative
    status: modeled
    span:
      start: 0
      end: 51
  - claim_key: CLAIM-6982FAB41ED5CC2D
    claim_text: The Kibi tree view id shall be kibi-knowledge-base
    role: normative
    status: modeled
    span:
      start: 53
      end: 103
  - claim_key: CLAIM-45F18ABBE214D338
    claim_text: The refresh tree command shall be kibi.refreshTree
    role: normative
    status: modeled
    span:
      start: 105
      end: 155
  - claim_key: CLAIM-30F20EE8B641CB90
    claim_text: The focus knowledge base command shall be kibi.focusKnowledgeBase
    role: normative
    status: modeled
    span:
      start: 157
      end: 222
logic_claims:
  - CLAIM-2DBB602BF36E069A
  - CLAIM-6982FAB41ED5CC2D
  - CLAIM-45F18ABBE214D338
  - CLAIM-30F20EE8B641CB90
id: REQ-vscode-extension-ids
type: req
---
The Kibi sidebar container id shall be kibi-sidebar. The Kibi tree view id shall be kibi-knowledge-base. The refresh tree command shall be kibi.refreshTree. The focus knowledge base command shall be kibi.focusKnowledgeBase.

## Context

packages/vscode/src/extensionIds.ts names the sidebar and tree REQ-vscode-sidebar-kb-tree contributes. Each id is stated here so it is proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"