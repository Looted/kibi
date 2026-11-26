---
title: kibi init's AGENTS.md section carries the session brief's change steps
status: open
priority: should
firmness: default
required_evidence: tested
semantic_text: The managed Kibi section that kibi init writes into AGENTS.md must carry the session brief's change steps word for word.
tags:
  - agent-hosts
  - session-brief
  - agent-instructions
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-26, on the question "Approve the new rule that AGENTS.md carries the session brief''s steps word for word?": "Approve it"'
  approved_by: maintainer
  recorded_at: '2026-11-26T12:00:00.000Z'
rationale: 'Agents act on the text a session already holds and seldom load a Kibi skill: across the benchmark rounds 17 of 343 Kibi sessions opened one, and none before the first edit. AGENTS.md is the one channel every fresh clone and every host reads, so building its Kibi section from the session brief''s own lines gives an agent without the Kibi plugin the same change steps and keeps the two texts from drifting apart.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 34b232edbde20982046927d6a203af4eadbbfc7ed0cefa278d83cf371f3626fc
semantic_inventory:
  - claim_key: CLAIM-A8E1C7EC9FFAF401
    claim_text: The managed Kibi section that kibi init writes into AGENTS.md must carry the session brief's change steps word for word
    role: normative
    status: modeled
    span:
      start: 0
      end: 119
    subjects:
      - kibi.init.agent_instructions
      - kibi.session_brief
logic_claims:
  - CLAIM-A8E1C7EC9FFAF401
id: REQ-init-agent-instructions-carry-brief
type: req
approval_ref: Maintainer approved this requirement on 2026-11-26
---
The managed Kibi section that kibi init writes into AGENTS.md must carry the session brief's change steps word for word.

## Context

Agents act on the text a session already holds and seldom load a Kibi skill: across the benchmark rounds 17 of 343 Kibi sessions opened one, and none before the first edit. AGENTS.md is the one channel every fresh clone and every host reads, so building its Kibi section from the session brief's own lines gives an agent without the Kibi plugin the same change steps and keeps the two texts from drifting apart.
