---
id: REQ-mcp-init-kibi-autopilot-v1
title: Historical MCP onboarding lifecycle (superseded)
status: superseded
created_at: 2026-04-19T00:00:00.000Z
updated_at: 2026-05-05T00:00:00.000Z
source: documentation/requirements/REQ-mcp-init-kibi-autopilot-v1.md
priority: must
owner: opencode-team
tags:
  - mcp
  - autopilot
  - init-kibi
  - bootstrap
links:
  - type: specified_by
    target: SCEN-mcp-init-kibi-autopilot-v1
  - type: verified_by
    target: TEST-mcp-init-kibi-autopilot-v1
  - type: relates_to
    target: REQ-opencode-kibi-plugin-v1
  - type: relates_to
    target: REQ-opencode-agent-mcp-only
semantic_text: The historical MCP onboarding requirement is superseded by the canonical kibi-bootstrap plan/apply lifecycle.\n\nThe current lifecycle uses kb_plan_bootstrap for bounded, read-only initial inference and returns an exact hash-bound BootstrapPlanV1 with diagnostics and snapshot bindings.\n\nWhen context is incomplete, the planner returns bounded needs_context questions; when the repository is seeded, normal Kibi work continues instead of replaying bootstrap.\n\nWrites require explicit approval of the returned plan and proceed only through kb_apply_plan followed by kb_check and kb_status. Direct kb_upsert is not a bootstrap workflow.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ebada23205d21e616d13ef46f0a0b344348399f4ae295ccb1b6844ce889f33cd
semantic_inventory:
  - claim_key: CLAIM-AC8ACF0ACFB6413F
    claim_text: The historical MCP onboarding requirement is superseded by the canonical kibi-bootstrap plan/apply lifecycle.\n\nThe current lifecycle uses kb_plan_bootstrap for bounded, read-only initial inference and returns an exact hash-bound BootstrapPlanV1 with diagnostics and snapshot bindings.\n\nWhen context is incomplete, the planner returns bounded needs_context questions
    role: descriptive
    status: missing
    span:
      start: 0
      end: 369
  - claim_key: CLAIM-5097B1AE216B46B3
    claim_text: when the repository is seeded, normal Kibi work continues instead of replaying bootstrap.\n\nWrites require explicit approval of the returned plan and proceed only through kb_apply_plan followed by kb_check and kb_status
    role: condition
    status: ontology_gap
    span:
      start: 371
      end: 591
  - claim_key: CLAIM-B2D8473F266E8ED5
    claim_text: Direct kb_upsert is not a bootstrap workflow
    role: descriptive
    status: missing
    span:
      start: 593
      end: 637
logic_claims:
  - CLAIM-AC8ACF0ACFB6413F
  - CLAIM-5097B1AE216B46B3
  - CLAIM-B2D8473F266E8ED5
type: req
---

The Kibi MCP server must provide an interactive bootstrap workflow for the `/init-kibi` slash command to onboard new repositories through bounded discovery and read-only candidate synthesis.

1. **Interactive Bootstrap Onboarding**: The `/init-kibi` workflow is defined as an interactive onboarding process. The agent must ask at most 4 bounded questions to gather declared context: project summary, primary source of truth, priority root (for monorepos), and verification/config anchors.
2. **Read-Only Candidate Synthesis**: The `kb_autopilot_generate` tool must be strictly read-only. It may auto-create only safe deterministic entities and metadata (for example `symbol`, explicit `fact`, `adr`, and discovery metadata). `REQ`/`SCEN`/`TEST` authoring must be routed to the agent through `recommendedActions`, not auto-created from source-only evidence.
3. **Declared Context vs. Verified Evidence**: The contract must distinguish between "declared context" (provided by the user via interactive questions) and "verified evidence" (discovered in the codebase). Synthesis should prioritize evidence but ground it in declared intent.
4. **Agent-Managed Preview and Approval**: Agent-managed writes to the KB may only occur after the user has previewed and approved the proposed candidates. The MCP server must not apply changes autonomously.
5. **Sequential Application**: Approved candidates must be applied using standard public MCP tools (`kb_upsert`) sequentially. After application, the agent must run `kb_check` to verify KB integrity.
6. **No Pre-requisite Structure**: Bootstrap must not require existing `.kb/config.json`, `documentation/**`, or `symbols.yaml` to be present or structured to provide a useful onboarding experience.
7. **MCP-Only Guidance**: All agent-facing bootstrap instructions must use MCP tools and sanctioned slash commands. Guidance must never suggest direct `kibi` CLI commands for maintenance.
