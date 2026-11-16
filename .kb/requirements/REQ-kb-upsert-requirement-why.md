---
title: A requirement kb_upsert records its why as rationale and Context
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - mcp
  - kb_upsert
  - rationale
origin:
  kind: agent
  ref: 'Maintainer review of the capture path, item ''Capture that passes, with one why'': the capture template, filled as given, wrote a requirement that kb_check still blocked, and the reason the person gave was not recorded.'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:11:57.393Z'
rationale: Filled exactly as the hooks gave it, the capture template wrote a requirement that kb_check then blocked for a missing Context section, and the reason the person gave for the rule was lost on the way.
semantic_text: kb_upsert of a requirement must accept a why field and record it as the requirement's rationale and as the Context section of its body, with the origin.ref text as the Source section when the body has none. A requirement kb_upsert that sends a statement body without semantic_text must record the body's statement as its semantic_text.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3db7e64df7fd29020f61048ac927e7b3d9bf857c3138823fd152b3b44135334e
semantic_inventory:
  - claim_key: CLAIM-3B13B7C509DA73CF
    claim_text: kb_upsert of a requirement must accept a why field and record it as the requirement's rationale and as the Context section of its body, with the origin.ref text as the Source section when the body has none
    role: normative
    status: modeled
    span:
      start: 0
      end: 205
  - claim_key: CLAIM-3C290C7B6FC628C4
    claim_text: A requirement kb_upsert that sends a statement body without semantic_text must record the body's statement as its semantic_text
    role: normative
    status: modeled
    span:
      start: 207
      end: 334
logic_claims:
  - CLAIM-3B13B7C509DA73CF
  - CLAIM-3C290C7B6FC628C4
id: REQ-kb-upsert-requirement-why
type: req
---
kb_upsert of a requirement must accept a why field and record it as the requirement's rationale and as the Context section of its body, with the origin.ref text as the Source section when the body has none. A requirement kb_upsert that sends a statement body without semantic_text must record the body's statement as its semantic_text.

## Context

Filled exactly as the hooks gave it, the capture template wrote a requirement that kb_check then blocked for a missing Context section, and the reason the person gave for the rule was lost on the way.

## Source

> Maintainer review of the capture path, item 'Capture that passes, with one why': the capture template, filled as given, wrote a requirement that kb_check still blocked, and the reason the person gave was not recorded.
