---
title: The Claude Code and Antigravity hooks ask the person before a change of the Kibi level or a lowered required_evidence
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: Before an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Claude Code pre-edit hook must ask the person. Before such a change, the Antigravity pre-edit hook must ask the person.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statements 11 and 12 of 13: "Approve all as written". Rewording statements 11 and 12 to what each host''s hook can do: "Reword to match each host".'
  recorded_at: '2026-11-25T14:05:45.376Z'
rationale: The Kibi level and how much evidence a requirement needs are the person's decisions, and agents lowered a requirement's floor by themselves to clear a floor finding (10 of 42 benchmark sessions with one did this). Approved statements 11 (the level) and 12 (required_evidence) are recorded by the hook that enforces them, one requirement per kind of hook, with the approved wording for each host. Claude Code and Antigravity can show the person a permission prompt, so they ask.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1043a3d436e0998e227e92e875a0b3cedf577f3c312816d3a68765d4fd2c4da3
semantic_inventory:
  - claim_key: CLAIM-B584716FDF3B393D
    claim_text: Before an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Claude Code pre-edit hook must ask the person
    role: normative
    status: modeled
    span:
      start: 0
      end: 185
    subjects:
      - kibi.agent_hooks.guarded_change
    reason: Grounded by FACT-PROP-agent-hosts-guarded-change-prompt-c01 via requires_property.
  - claim_key: CLAIM-EBDB7DA50325C92F
    claim_text: Before such a change, the Antigravity pre-edit hook must ask the person
    role: normative
    status: modeled
    span:
      start: 187
      end: 258
    subjects:
      - kibi.agent_hooks.guarded_change
    reason: Grounded by FACT-PROP-agent-hosts-guarded-change-prompt-c02 via requires_property.
logic_claims:
  - CLAIM-B584716FDF3B393D
  - CLAIM-EBDB7DA50325C92F
id: REQ-agent-hosts-guarded-change-prompt
type: req
---
Before an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Claude Code pre-edit hook must ask the person. Before such a change, the Antigravity pre-edit hook must ask the person.

## Context

The Kibi level and how much evidence a requirement needs are the person's decisions, and agents lowered a requirement's floor by themselves to clear a floor finding (10 of 42 benchmark sessions with one did this). Approved statements 11 (the level) and 12 (required_evidence) are recorded by the hook that enforces them, one requirement per kind of hook, with the approved wording for each host. Claude Code and Antigravity can show the person a permission prompt, so they ask.

## Why this changed

REQ-agent-hosts-level-ask and REQ-agent-hosts-required-evidence-lowering-ask each named every host, so one requirement was implemented by the code of seven hosts. They are recorded by the kind of hook instead: one for the hooks that prompt the person, one for the hooks that tell the agent to ask first, and one for the Vibe hook that tells the agent after the change. Each covers both a change of the Kibi level and a lowered required_evidence, with the approved wording for its hosts.
