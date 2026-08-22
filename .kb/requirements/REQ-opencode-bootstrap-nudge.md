---
id: REQ-opencode-bootstrap-nudge
title: OpenCode Bootstrap Nudge
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/src/init-kibi-capability.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - bootstrap
links:
  - type: specified_by
    target: SCEN-opencode-bootstrap-nudge
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
semantic_text: The plugin must assist with repository knowledge onboarding.\n\nIt must detect uninitialized or weakly seeded repositories that declare Kibi intent.\n\nIt must route the agent to the canonical kibi-bootstrap skill and the kb_plan_bootstrap plan/apply contract for initial inference and seed.\n\nIt must escalate to the user or operator if environmental setup or repair is required.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2489310f027debcedfd20ee1a9c5e222a7ab584f2e5db7e4c6eda0d28d920e5e
semantic_inventory:
  - claim_key: CLAIM-7A9EABE008983B73
    claim_text: The plugin must assist with repository knowledge onboarding.\n\nIt must detect uninitialized or weakly seeded repositories that declare Kibi intent.\n\nIt must route the agent to the canonical kibi-bootstrap skill and the kb_plan_bootstrap plan/apply contract for initial inference and seed.\n\nIt must escalate to the user or operator if environmental setup or repair is required
    role: normative
    status: modeled
    span:
      start: 0
      end: 380
    reason: Grounded by a strict property_value fact linked via requires_property.
logic_claims:
  - CLAIM-7A9EABE008983B73
type: req
---
When OpenCode observes an uninitialized or thin repository, it reads typed bootstrap status and routes the agent to the canonical kibi-bootstrap skill. The agent answers only questions returned by the planner, reviews the exact kb_plan_bootstrap plan, applies that unchanged approved plan through kb_apply_plan, and runs typed check and status afterward.
