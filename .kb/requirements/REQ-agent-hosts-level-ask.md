---
title: Each host's hook has the person decide an edit that changes the Kibi level
status: closed
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: Before an edit that changes the Kibi level, the Claude Code pre-edit hook must ask the person. Before such an edit, the Antigravity pre-edit hook must ask the person. Before such an edit, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first. Before such an edit, the OpenCode hook must stop the edit once so the agent asks. After such an edit, the Vibe hook must tell the agent to ask the person.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statement 11 of 13: "Approve all as written". Rewording statements 11 and 12 to what each host''s hook can do: "Reword to match each host".'
  recorded_at: '2026-11-25T13:38:32.794Z'
rationale: 'The Kibi level is the person''s choice of how hard Kibi holds the agent, so the agent may not change it alone. Each host''s hook does what it can: a permission prompt where the host has one, otherwise a notice that has the agent ask.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 98ef56414dc6c0f07d9175faaa3817e15dbf5ddcab7102473b90962b0efb6fbc
semantic_inventory:
  - claim_key: CLAIM-F013996B8D3A1E87
    claim_text: Before an edit that changes the Kibi level, the Claude Code pre-edit hook must ask the person
    role: normative
    status: missing
    span:
      start: 0
      end: 93
    subjects:
      - kibi.agent_hooks.level_ask
  - claim_key: CLAIM-B983EBEC1094458A
    claim_text: Before such an edit, the Antigravity pre-edit hook must ask the person
    role: normative
    status: missing
    span:
      start: 95
      end: 165
    subjects:
      - kibi.agent_hooks.level_ask
  - claim_key: CLAIM-9A2DE56F99F48E5E
    claim_text: Before such an edit, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first
    role: normative
    status: missing
    span:
      start: 167
      end: 272
    subjects:
      - kibi.agent_hooks.level_ask
  - claim_key: CLAIM-6FD3308F71274A0E
    claim_text: Before such an edit, the OpenCode hook must stop the edit once so the agent asks
    role: normative
    status: missing
    span:
      start: 274
      end: 354
    subjects:
      - kibi.agent_hooks.level_ask
  - claim_key: CLAIM-537DC623278973F0
    claim_text: After such an edit, the Vibe hook must tell the agent to ask the person
    role: normative
    status: missing
    span:
      start: 356
      end: 427
    subjects:
      - kibi.agent_hooks.level_ask
logic_claims:
  - CLAIM-F013996B8D3A1E87
  - CLAIM-B983EBEC1094458A
  - CLAIM-9A2DE56F99F48E5E
  - CLAIM-6FD3308F71274A0E
  - CLAIM-537DC623278973F0
id: REQ-agent-hosts-level-ask
type: req
---
Before an edit that changes the Kibi level, the Claude Code pre-edit hook must ask the person. Before such an edit, the Antigravity pre-edit hook must ask the person. Before such an edit, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first. Before such an edit, the OpenCode hook must stop the edit once so the agent asks. After such an edit, the Vibe hook must tell the agent to ask the person.

## Context

The Kibi level is the person's choice of how hard Kibi holds the agent, so the agent may not change it alone. Each host's hook does what it can: a permission prompt where the host has one, otherwise a notice that has the agent ask.
