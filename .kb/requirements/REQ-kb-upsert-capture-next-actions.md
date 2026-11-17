---
title: A requirement kb_upsert returns what kb_check still needs as nextActions
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - mcp
  - kb_upsert
  - next-actions
origin:
  kind: agent
  ref: 'Maintainer review of the capture path, item ''Capture that passes, with one why'': the capture template, filled as given, wrote a requirement that kb_check still blocked, and the reason the person gave was not recorded.'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:12:27.836Z'
rationale: Warnings after a write read as advice an agent can skip, while kb_check then blocked the same requirement; the work that is left has to come back as calls the agent can run as they are.
semantic_text: A requirement kb_upsert must return each step that kb_check would still block the requirement on and that the call could not complete (subjects for an unmodeled claim, a missing Context section, a test for its evidence floor or for an implementing symbol without coverage) as a nextActions entry that names the operation and carries a ready input, instead of a warning.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bc9d9c7a6018f3cbdaeff712e4fe6513798ada9550529a8bbf96b09f7a8cb0cc
semantic_inventory:
  - claim_key: CLAIM-E8337E63A8D7863F
    claim_text: A requirement kb_upsert must return each step that kb_check would still block the requirement on and that the call could not complete (subjects for an unmodeled claim, a missing Context section, a test for its evidence floor or for an implementing symbol without coverage) as a nextActions entry that names the operation and carries a ready input, instead of a warning
    role: normative
    status: modeled
    span:
      start: 0
      end: 368
logic_claims:
  - CLAIM-E8337E63A8D7863F
id: REQ-kb-upsert-capture-next-actions
type: req
---
A requirement kb_upsert must return each step that kb_check would still block the requirement on and that the call could not complete (subjects for an unmodeled claim, a missing Context section, a test for its evidence floor or for an implementing symbol without coverage) as a nextActions entry that names the operation and carries a ready input, instead of a warning.

## Context

Warnings after a write read as advice an agent can skip, while kb_check then blocked the same requirement; the work that is left has to come back as calls the agent can run as they are.

## Source

> Maintainer review of the capture path, item 'Capture that passes, with one why': the capture template, filled as given, wrote a requirement that kb_check still blocked, and the reason the person gave was not recorded.
