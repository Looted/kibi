---
id: REQ-opencode-file-context-guidance-v1
title: 'OpenCode Kibi Plugin: File-Context Guidance (Lifecycle and E2E Evidence)'
status: open
created_at: 2026-05-04T10:00:00.000Z
updated_at: 2026-05-04T10:00:00.000Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - guidance
  - lifecycle
  - e2e
links:
  - type: specified_by
    target: SCEN-opencode-file-context-guidance-v1
  - type: verified_by
    target: TEST-opencode-file-context-guidance-v1
  - type: relates_to
    target: REQ-opencode-kibi-plugin-v1
semantic_text: |-
  The OpenCode Kibi Plugin must provide proactive, contextual guidance based on host-side file lifecycle events (create, edit, delete) and established E2E evidence.

  The plugin must monitor file lifecycle events and provide advisory-only reminders:
  **Scope**: Lifecycle reminders are only eligible in `root_active` or `hybrid_root_plus_vendored` postures.
  **Modifier Pattern**: Lifecycle events are treated as modifiers layered on top of existing semantic risk classification, not as a standalone `RiskClass`.
  **Created/Edited**: When a file is created or edited, if it matches known symbol patterns or risky paths, the plugin must nudge the agent toward Kibi discovery.
  **Deleted**: When a file is deleted, the plugin must inject a safety check reminding the agent to verify if the file implements any requirements or is linked to scenarios/tests.
  **Suppression**: Guidance must be suppressed after the first occurrence per path per session to minimize prompt noise.

  The plugin must distinguish between authoritative E2E evidence and heuristic cues:
  **Authoritative Evidence**: Exact E2E evidence requires a `covered_by -> TEST-*` relationship to an E2E-marked test entity.
  **E2E Entity Definition**: A test entity is considered E2E if it has `tags: [e2e]` or a `source` path under an `/e2e/` directory.
  **Heuristic Cues**: Heuristic E2E reminders may be used for exact path mentions in code but must remain soft-worded and clearly labeled as advisory.
  **Package Umbrella Exclusion**: Generic package-level umbrella test documents are insufficient to count as exact E2E evidence for a specific file or symbol.

  **Current-Host Only**: Guidance is based on host-side event monitoring; the plugin must not attempt first-read interception or modify file content returned by tools.
  **Single-Block Policy**: All lifecycle and E2E guidance must be folded into the standard single-block prompt behavior defined in REQ-opencode-kibi-plugin-v1.
  **Non-Blocking**: Guidance is advisory and must never block the agent's workflow.

  **Bootstrap**: Repositories without Kibi initialized should use `kibi-bootstrap` to run `kb_plan_bootstrap` for initial setup.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b93751427b484b902157bdce49cfea63fa20b958c8645ab790bbd1f35254ab5a
semantic_inventory:
  - claim_key: CLAIM-B8855563D9C3460A
    claim_text: The OpenCode Kibi Plugin must provide proactive, contextual guidance based on host-side file lifecycle events (create, edit, delete) and established E2E evidence
    role: normative
    status: modeled
    span:
      start: 0
      end: 161
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-62E414D2C0D36026
    claim_text: The plugin must monitor file lifecycle events and provide advisory-only reminders
    role: normative
    status: ontology_gap
    span:
      start: 164
      end: 245
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-F5829888B7CA8EE6
    claim_text: '**Scope**: Lifecycle reminders are only eligible in `root_active` or `hybrid_root_plus_vendored` postures'
    role: descriptive
    status: modeled
    span:
      start: 247
      end: 352
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-5F2E185D038B0B36
    claim_text: '**Modifier Pattern**: Lifecycle events are treated as modifiers layered on top of existing semantic risk classification, not as a standalone `RiskClass`'
    role: descriptive
    status: modeled
    span:
      start: 354
      end: 506
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-1792CB8762EF466F
    claim_text: '**Created/Edited**: When a file is created or edited, if it matches known symbol patterns or risky paths, the plugin must nudge the agent toward Kibi discovery'
    role: normative
    status: ontology_gap
    span:
      start: 508
      end: 667
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-9D1D37CF83BEA9A7
    claim_text: '**Deleted**: When a file is deleted, the plugin must inject a safety check reminding the agent to verify if the file implements any requirements or is linked to scenarios/tests'
    role: normative
    status: ontology_gap
    span:
      start: 669
      end: 845
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-7510EC9B66FFBB25
    claim_text: '**Suppression**: Guidance must be suppressed after the first occurrence per path per session to minimize prompt noise'
    role: normative
    status: ontology_gap
    span:
      start: 847
      end: 964
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-01CCD99E5420D145
    claim_text: The plugin must distinguish between authoritative E2E evidence and heuristic cues
    role: normative
    status: ontology_gap
    span:
      start: 967
      end: 1048
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-5CC889053D4646A0
    claim_text: '**Authoritative Evidence**: Exact E2E evidence requires a `covered_by -> TEST-*` relationship to an E2E-marked test entity'
    role: normative
    status: ontology_gap
    span:
      start: 1050
      end: 1172
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-9D8D8FBE409A0C77
    claim_text: '**E2E Entity Definition**: A test entity is considered E2E if it has `tags: [e2e]` or a `source` path under an `/e2e/` directory'
    role: normative
    status: ontology_gap
    span:
      start: 1174
      end: 1302
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-50F2EB84DDCC0A7B
    claim_text: '**Heuristic Cues**: Heuristic E2E reminders may be used for exact path mentions in code but must remain soft-worded and clearly labeled as advisory'
    role: normative
    status: modeled
    span:
      start: 1304
      end: 1451
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-93B8B2AAD1506737
    claim_text: '**Package Umbrella Exclusion**: Generic package-level umbrella test documents are insufficient to count as exact E2E evidence for a specific file or symbol'
    role: descriptive
    status: modeled
    span:
      start: 1453
      end: 1608
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-B51B083D785F5441
    claim_text: '**Current-Host Only**: Guidance is based on host-side event monitoring'
    role: descriptive
    status: modeled
    span:
      start: 1611
      end: 1681
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-1DD6E7F6784123C1
    claim_text: the plugin must not attempt first-read interception or modify file content returned by tools
    role: normative
    status: modeled
    span:
      start: 1683
      end: 1775
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-C738CEA7FF0DF90A
    claim_text: '**Single-Block Policy**: All lifecycle and E2E guidance must be folded into the standard single-block prompt behavior defined in REQ-opencode-kibi-plugin-v1'
    role: normative
    status: modeled
    span:
      start: 1777
      end: 1933
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-DDDFDE01C4368243
    claim_text: '**Non-Blocking**: Guidance is advisory and must never block the agent''s workflow'
    role: normative
    status: ontology_gap
    span:
      start: 1935
      end: 2015
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-5F48A278E6ECF1D1
    claim_text: '**Bootstrap**: Repositories without Kibi initialized should use `kibi-bootstrap` to run `kb_plan_bootstrap` for initial setup'
    role: normative
    status: ontology_gap
    span:
      start: 2018
      end: 2143
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-B8855563D9C3460A
  - CLAIM-62E414D2C0D36026
  - CLAIM-F5829888B7CA8EE6
  - CLAIM-5F2E185D038B0B36
  - CLAIM-1792CB8762EF466F
  - CLAIM-9D1D37CF83BEA9A7
  - CLAIM-7510EC9B66FFBB25
  - CLAIM-01CCD99E5420D145
  - CLAIM-5CC889053D4646A0
  - CLAIM-9D8D8FBE409A0C77
  - CLAIM-50F2EB84DDCC0A7B
  - CLAIM-93B8B2AAD1506737
  - CLAIM-B51B083D785F5441
  - CLAIM-1DD6E7F6784123C1
  - CLAIM-C738CEA7FF0DF90A
  - CLAIM-DDDFDE01C4368243
  - CLAIM-5F48A278E6ECF1D1
type: req
semantic_clauses:
  - The OpenCode Kibi Plugin must provide proactive, contextual guidance based on host-side file lifecycle events (create, edit, delete) and established E2E evidence
  - The plugin must monitor file lifecycle events and provide advisory-only reminders
  - '**Scope**: Lifecycle reminders are only eligible in `root_active` or `hybrid_root_plus_vendored` postures'
  - '**Modifier Pattern**: Lifecycle events are treated as modifiers layered on top of existing semantic risk classification, not as a standalone `RiskClass`'
  - '**Created/Edited**: When a file is created or edited, if it matches known symbol patterns or risky paths, the plugin must nudge the agent toward Kibi discovery'
  - '**Deleted**: When a file is deleted, the plugin must inject a safety check reminding the agent to verify if the file implements any requirements or is linked to scenarios/tests'
  - '**Suppression**: Guidance must be suppressed after the first occurrence per path per session to minimize prompt noise'
  - The plugin must distinguish between authoritative E2E evidence and heuristic cues
  - '**Authoritative Evidence**: Exact E2E evidence requires a `covered_by -> TEST-*` relationship to an E2E-marked test entity'
  - '**E2E Entity Definition**: A test entity is considered E2E if it has `tags: [e2e]` or a `source` path under an `/e2e/` directory'
  - '**Heuristic Cues**: Heuristic E2E reminders may be used for exact path mentions in code but must remain soft-worded and clearly labeled as advisory'
  - '**Package Umbrella Exclusion**: Generic package-level umbrella test documents are insufficient to count as exact E2E evidence for a specific file or symbol'
  - '**Current-Host Only**: Guidance is based on host-side event monitoring'
  - the plugin must not attempt first-read interception or modify file content returned by tools
  - '**Single-Block Policy**: All lifecycle and E2E guidance must be folded into the standard single-block prompt behavior defined in REQ-opencode-kibi-plugin-v1'
  - '**Non-Blocking**: Guidance is advisory and must never block the agent''s workflow'
  - '**Bootstrap**: Repositories without Kibi initialized should use `kibi-bootstrap` to run `kb_plan_bootstrap` for initial setup'
---
The OpenCode Kibi Plugin provides advisory file-lifecycle guidance and uses established end-to-end evidence. It distinguishes authoritative test relationships from heuristic cues, folds reminders into one non-blocking prompt block, and routes initial repository inference through kibi-bootstrap and the plan/apply contract.
