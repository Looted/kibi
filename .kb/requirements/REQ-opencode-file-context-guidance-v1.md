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
semantic_text: The plugin must monitor file lifecycle events and provide advisory-only reminders. When a file is created or edited and matches known symbol patterns or risky paths, the plugin must nudge the agent to record or update requirements. When a file is deleted, the plugin must inject a safety check reminding the agent to verify whether the file implements any requirement. Guidance must be suppressed after the first occurrence per path per session. The plugin must distinguish authoritative E2E evidence from heuristic cues. Exact E2E evidence requires a covered_by relationship to an E2E-marked test entity. A test entity is E2E if it has tags including e2e or a source path under an e2e directory. Guidance is advisory and must never block the agent workflow. Repositories without Kibi initialized must use kibi-bootstrap to run kb_plan_bootstrap.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 145b8014724beb4b7ffce16acb27e9a81425311eedc39354dba4dbdacf4599bb
semantic_inventory:
  - claim_key: CLAIM-62E414D2C0D36026
    claim_text: The plugin must monitor file lifecycle events and provide advisory-only reminders
    role: normative
    status: modeled
    span:
      start: 0
      end: 81
  - claim_key: CLAIM-5163A79F19580DA7
    claim_text: When a file is created or edited and matches known symbol patterns or risky paths, the plugin must nudge the agent to record or update requirements
    role: condition
    status: modeled
    span:
      start: 83
      end: 230
  - claim_key: CLAIM-05B85025CCAEE762
    claim_text: When a file is deleted, the plugin must inject a safety check reminding the agent to verify whether the file implements any requirement
    role: condition
    status: modeled
    span:
      start: 232
      end: 367
  - claim_key: CLAIM-59CFC9A6FC5AAA80
    claim_text: Guidance must be suppressed after the first occurrence per path per session
    role: normative
    status: modeled
    span:
      start: 369
      end: 444
  - claim_key: CLAIM-5A457AC0CDB7D365
    claim_text: The plugin must distinguish authoritative E2E evidence from heuristic cues
    role: normative
    status: modeled
    span:
      start: 446
      end: 520
  - claim_key: CLAIM-C0CD98E94B98147E
    claim_text: Exact E2E evidence requires a covered_by relationship to an E2E-marked test entity
    role: normative
    status: modeled
    span:
      start: 522
      end: 604
  - claim_key: CLAIM-55BC4568B874114B
    claim_text: A test entity is E2E if it has tags including e2e or a source path under an e2e directory
    role: normative
    status: modeled
    span:
      start: 606
      end: 695
  - claim_key: CLAIM-665DE56DC8FDA4AD
    claim_text: Guidance is advisory and must never block the agent workflow
    role: normative
    status: modeled
    span:
      start: 697
      end: 757
  - claim_key: CLAIM-8EDBB59AFBE25BAF
    claim_text: Repositories without Kibi initialized must use kibi-bootstrap to run kb_plan_bootstrap
    role: normative
    status: modeled
    span:
      start: 759
      end: 845
logic_claims:
  - CLAIM-62E414D2C0D36026
  - CLAIM-5163A79F19580DA7
  - CLAIM-05B85025CCAEE762
  - CLAIM-59CFC9A6FC5AAA80
  - CLAIM-5A457AC0CDB7D365
  - CLAIM-C0CD98E94B98147E
  - CLAIM-55BC4568B874114B
  - CLAIM-665DE56DC8FDA4AD
  - CLAIM-8EDBB59AFBE25BAF
type: req
semantic_clauses:
  - The plugin must monitor file lifecycle events and provide advisory-only reminders
  - When a file is created or edited and matches known symbol patterns or risky paths, the plugin must nudge the agent to record or update requirements
  - When a file is deleted, the plugin must inject a safety check reminding the agent to verify whether the file implements any requirement
  - Guidance must be suppressed after the first occurrence per path per session
  - The plugin must distinguish authoritative E2E evidence from heuristic cues
  - Exact E2E evidence requires a covered_by relationship to an E2E-marked test entity
  - A test entity is E2E if it has tags including e2e or a source path under an e2e directory
  - Guidance is advisory and must never block the agent workflow
  - Repositories without Kibi initialized must use kibi-bootstrap to run kb_plan_bootstrap
---
The OpenCode Kibi Plugin provides advisory file-lifecycle guidance and uses established end-to-end evidence. It distinguishes authoritative test relationships from heuristic cues, folds reminders into one non-blocking prompt block, and routes initial repository inference through kibi-bootstrap and the plan/apply contract.
