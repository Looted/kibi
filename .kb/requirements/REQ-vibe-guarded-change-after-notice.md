---
title: The Vibe hook tells the agent to ask the person after a change of the Kibi level or a lowered required_evidence
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: After an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Vibe hook must tell the agent to ask the person.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statements 11 and 12 of 13: "Approve all as written". Rewording statements 11 and 12 to what each host''s hook can do: "Reword to match each host".'
  recorded_at: '2026-11-25T14:05:49.766Z'
rationale: The Kibi level and how much evidence a requirement needs are the person's decisions, and agents lowered a requirement's floor by themselves to clear a floor finding (10 of 42 benchmark sessions with one did this). Approved statements 11 (the level) and 12 (required_evidence) are recorded by the hook that enforces them, one requirement per kind of hook, with the approved wording for each host. Vibe has no pre-tool hook, so it tells the agent after the change.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1876dd0627d2e314d1f8a93d74ca4b23704178830225e84b10049074fdd8c252
semantic_inventory:
  - claim_key: CLAIM-DEC3C367E38662E2
    claim_text: After an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Vibe hook must tell the agent to ask the person
    role: normative
    status: modeled
    span:
      start: 0
      end: 186
    subjects:
      - kibi.agent_hooks.guarded_change
    reason: Grounded by FACT-PROP-vibe-guarded-change-after-notice-c01 via requires_property.
logic_claims:
  - CLAIM-DEC3C367E38662E2
id: REQ-vibe-guarded-change-after-notice
type: req
---
After an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Vibe hook must tell the agent to ask the person.

## Context

The Kibi level and how much evidence a requirement needs are the person's decisions, and agents lowered a requirement's floor by themselves to clear a floor finding (10 of 42 benchmark sessions with one did this). Approved statements 11 (the level) and 12 (required_evidence) are recorded by the hook that enforces them, one requirement per kind of hook, with the approved wording for each host. Vibe has no pre-tool hook, so it tells the agent after the change.

## Why this changed

REQ-agent-hosts-level-ask and REQ-agent-hosts-required-evidence-lowering-ask each named every host, so one requirement was implemented by the code of seven hosts. They are recorded by the kind of hook instead: one for the hooks that prompt the person, one for the hooks that tell the agent to ask first, and one for the Vibe hook that tells the agent after the change. Each covers both a change of the Kibi level and a lowered required_evidence, with the approved wording for its hosts.
