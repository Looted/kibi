---
title: 'Property: rendering_policy(opencode.kibi_plugin.guidance_rendering) = folded_single_block_per_plugin_v1'
status: active
tags:
  - lane:strict
  - property-value
text_ref: .kb/requirements/REQ-opencode-file-context-guidance-v1.md
fact_kind: property_value
subject_key: opencode.kibi_plugin.guidance_rendering
property_key: rendering_policy
operator: eq
value_string: folded_single_block_per_plugin_v1
claim_key: CLAIM-743E93E78B372864
claim_text: 'E2E guidance must be folded into the standard single-block prompt behavior defined in REQ-opencode-kibi-plugin-v1.\n**Non-Blocking**: Guidance is advisory and must never block the agent''s workflow.\n\n**Bootstrap**: Repositories without Kibi initialized should use `kibi-bootstrap` to run `kb_plan_bootstrap` for initial setup.\n**Briefing**: Agents should use `kb_briefing_generate` to discover contextual briefings for the current edit fingerprint'
value_type: string
id: FACT-PROP-FCG-SINGLE-BLOCK
type: fact
---
