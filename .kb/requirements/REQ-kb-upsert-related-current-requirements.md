---
title: A requirement kb_upsert lists current requirements on the same terms
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - mcp
  - kb_upsert
  - supersession
origin:
  kind: agent
  ref: 'Maintainer review of the capture path, item ''Capture that passes, with one why'': the capture template, filled as given, wrote a requirement that kb_check still blocked, and the reason the person gave was not recorded.'
  recorded_at: '2026-11-16T16:13:08.470Z'
rationale: A new rule often restates or replaces a recorded one; listing the current requirements on the same terms at write time lets the agent supersede the old one instead of leaving a stale twin next to it.
semantic_text: A requirement kb_upsert must list in its result at most five other current requirements whose title or statement shares most of its terms, each with its id and statement.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2b6bc703e472535b64cb24845f3625002a085738ac7860113bd66dce905c5d38
semantic_inventory:
  - claim_key: CLAIM-318577AE3ADA2EF5
    claim_text: A requirement kb_upsert must list in its result at most five other current requirements whose title or statement shares most of its terms, each with its id and statement
    role: normative
    status: modeled
    span:
      start: 0
      end: 169
logic_claims:
  - CLAIM-318577AE3ADA2EF5
id: REQ-kb-upsert-related-current-requirements
type: req
---
A requirement kb_upsert must list in its result at most five other current requirements whose title or statement shares most of its terms, each with its id and statement.

## Context

A new rule often restates or replaces a recorded one; listing the current requirements on the same terms at write time lets the agent supersede the old one instead of leaving a stale twin next to it.

## Source

> Maintainer review of the capture path, item 'Capture that passes, with one why': the capture template, filled as given, wrote a requirement that kb_check still blocked, and the reason the person gave was not recorded.
