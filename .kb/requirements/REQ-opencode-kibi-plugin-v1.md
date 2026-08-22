---
id: REQ-opencode-kibi-plugin-v1
title: 'OpenCode Kibi Plugin v1: Umbrella'
status: open
created_at: 2026-03-13T00:00:00.000Z
updated_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - plugin
links:
  - type: specified_by
    target: SCEN-opencode-kibi-plugin-v1-coverage
  - REQ-opencode-guidance-injection
  - REQ-opencode-background-sync
  - REQ-opencode-sync-feedback
  - REQ-opencode-bootstrap-nudge
  - REQ-opencode-briefing-command
type: req
semantic_text: |-
  The OpenCode Kibi Plugin v1 provides Kibi context and synchronization within the OpenCode environment.

  For repository bootstrap, agent-facing guidance must route to the canonical kibi-bootstrap skill and kb_plan_bootstrap plan/apply contract.

  When risky work needs start-task context, the plugin may guide agents toward /brief-kibi and the public MCP briefing surface via kb_briefing_generate.

  This requirement is an umbrella doc for granular behaviors; detailed specifications remain in their respective requirement documents.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0164a05cbbf39c7a44b1a69af20ec8b1f216b5ef753b8ae21d6637d4d9cc2eda
semantic_inventory:
  - claim_key: CLAIM-467E97BDD611495A
    claim_text: The OpenCode Kibi Plugin v1 provides Kibi context and synchronization within the OpenCode environment
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 101
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-50956285FDEECBA9
    claim_text: For repository bootstrap, agent-facing guidance must route to the canonical kibi-bootstrap skill and kb_plan_bootstrap plan/apply contract
    role: normative
    status: modeled
    span:
      start: 104
      end: 242
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-C43533023974FEBC
    claim_text: When risky work needs start-task context, the plugin may guide agents toward /brief-kibi and the public MCP briefing surface via kb_briefing_generate
    role: condition
    status: ontology_gap
    span:
      start: 245
      end: 394
  - claim_key: CLAIM-D34542A620470C7D
    claim_text: This requirement is an umbrella doc for granular behaviors
    role: descriptive
    status: modeled
    span:
      start: 397
      end: 455
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-0B0C01D653DC9E26
    claim_text: detailed specifications remain in their respective requirement documents
    role: descriptive
    status: modeled
    span:
      start: 457
      end: 529
    reason: Grounded by a strict property_value fact linked via requires_property.
logic_claims:
  - CLAIM-467E97BDD611495A
  - CLAIM-50956285FDEECBA9
  - CLAIM-C43533023974FEBC
  - CLAIM-D34542A620470C7D
  - CLAIM-0B0C01D653DC9E26
---
The OpenCode Kibi Plugin provides Kibi context and synchronization within OpenCode. Agent-facing bootstrap guidance routes to the canonical kibi-bootstrap skill and kb_plan_bootstrap plan/apply contract; other work follows typed status and the canonical usage, freshness, and traceability skills.
