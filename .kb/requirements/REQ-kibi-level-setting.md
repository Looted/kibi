---
title: The project's Kibi level is read from package.json or .kb/setup.json, is remember or test, and only kibi init writes it
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: Kibi must read the project's Kibi level from kibi.level in the root package.json, or from .kb/setup.json when the project has no root package.json. The Kibi level must be remember or test, and must be test when it is not set. No MCP tool and no CLI JSON route may write the Kibi level.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Making them opt-out: "Can we do opt-out (ask the user during init/onboarding, make sure the agent asks if running init/onboarding via prompt)." Approving the Kibi level statements, statement 3 of 13: "Approve all as written".'
  recorded_at: '2026-11-25T09:46:19.167Z'
rationale: The maintainer chose levels as presets of how much Kibi forces the agent, opt-out with test as the default, asked of the person at init. The level is the person's choice, so no tool an agent calls writes it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8721dfb4bcd3bdffee27c2e8e6947121fcd0c27a66cf6c969ee5aab3cc6f9561
semantic_inventory:
  - claim_key: CLAIM-9F5F39218ECF3B41
    claim_text: Kibi must read the project's Kibi level from kibi.level in the root package.json, or from .kb/setup.json when the project has no root package.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 146
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-level-setting-c01 via requires_property.
  - claim_key: CLAIM-4C5739DDE6D9BDA9
    claim_text: The Kibi level must be remember or test, and must be test when it is not set
    role: normative
    status: modeled
    span:
      start: 148
      end: 224
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-level-setting-c02 via requires_property.
  - claim_key: CLAIM-CF6C9654752223ED
    claim_text: No MCP tool and no CLI JSON route may write the Kibi level
    role: descriptive
    status: modeled
    span:
      start: 226
      end: 284
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-level-setting-c03 via requires_property.
logic_claims:
  - CLAIM-9F5F39218ECF3B41
  - CLAIM-4C5739DDE6D9BDA9
  - CLAIM-CF6C9654752223ED
id: REQ-kibi-level-setting
type: req
---
Kibi must read the project's Kibi level from kibi.level in the root package.json, or from .kb/setup.json when the project has no root package.json. The Kibi level must be remember or test, and must be test when it is not set. No MCP tool and no CLI JSON route may write the Kibi level.

## Context

The maintainer chose levels as presets of how much Kibi forces the agent, opt-out with test as the default, asked of the person at init. The level is the person's choice, so no tool an agent calls writes it.
