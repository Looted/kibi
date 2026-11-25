---
title: Signoff shows the Kibi level and lists a level change and each lowered required_evidence as decisions for the person
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: Signoff must show the project's Kibi level. Signoff must list a change to the Kibi level, and each requirement whose required_evidence was lowered, in the reviewed range as decisions for the person.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statement 13 of 13: "Approve all as written".'
  recorded_at: '2026-11-25T13:38:06.068Z'
rationale: A change of the level or a lowered floor that got past the hooks still reaches the person at signoff, where they decide whether to keep it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0f0330989b1bbca87901bd7180e06ebc117566dff63f786ec85b98d27e6f9dbd
semantic_inventory:
  - claim_key: CLAIM-DAD1DA9CB65AA8AF
    claim_text: Signoff must show the project's Kibi level
    role: normative
    status: modeled
    span:
      start: 0
      end: 42
    subjects:
      - kibi.signoff_views.level
    reason: Grounded by FACT-PROP-kibi-signoff-level-c01 via requires_property.
  - claim_key: CLAIM-A9F51CF4301F708D
    claim_text: Signoff must list a change to the Kibi level, and each requirement whose required_evidence was lowered, in the reviewed range as decisions for the person
    role: normative
    status: modeled
    span:
      start: 44
      end: 197
    subjects:
      - kibi.signoff_views.decisions
    reason: Grounded by FACT-PROP-kibi-signoff-level-c02-count via requires_property.
logic_claims:
  - CLAIM-DAD1DA9CB65AA8AF
  - CLAIM-A9F51CF4301F708D
id: REQ-kibi-signoff-level
type: req
---
Signoff must show the project's Kibi level. Signoff must list a change to the Kibi level, and each requirement whose required_evidence was lowered, in the reviewed range as decisions for the person.

## Context

A change of the level or a lowered floor that got past the hooks still reaches the person at signoff, where they decide whether to keep it.
