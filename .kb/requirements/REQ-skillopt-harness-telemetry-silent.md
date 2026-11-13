---
title: SkillOpt harness processes run with Kibi telemetry turned off
status: open
priority: should
semantic_text: Every process the SkillOpt evaluation harness starts shall run with Kibi telemetry turned off.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fe7b020ede3d84a734906cf99fb0def57ff61947105444cd28d1f0830074a96a
semantic_inventory:
  - claim_key: CLAIM-5D1284F40FCE29D5
    claim_text: Every process the SkillOpt evaluation harness starts shall run with Kibi telemetry turned off
    role: normative
    status: modeled
    span:
      start: 0
      end: 93
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5D1284F40FCE29D5
tags:
  - skillopt
  - telemetry
  - evaluation
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
  approved_by: maintainer
id: REQ-skillopt-harness-telemetry-silent
type: req
required_evidence: tested
---
Every process the SkillOpt evaluation harness starts shall run with Kibi telemetry turned off.

## Context

SkillOpt fixture setup and scoring run the Kibi CLI installed in each fixture. Only the target agent's process had `KIBI_TELEMETRY=0`; fixture setup copied the operator's environment, and an installed CLI reports itself as the release channel. One evaluation container sent 4,246 operation events as release usage in one night, including a 170-rejection loop that was fixture traffic, which made real agent behavior hard to read. `harnessChildEnv` in scripts/skillopt-eval/runtime/telemetry-env.ts turns telemetry off; `fixtureCliEnv` and `runBoundedProcess` apply it to every child they start.

## Source

> Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"