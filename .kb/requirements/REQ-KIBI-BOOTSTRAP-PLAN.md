---
title: Bootstrap Kibi onboarding and plan/apply safety
status: open
text_ref: .kb/requirements/REQ-KIBI-BOOTSTRAP-PLAN.md
semantic_text: Kibi initialization must attach the exact Git branch and create infrastructure only; An explicit bootstrap request must perform initial inference and seed through kibi-bootstrap, then seeded repositories must hand off to normal Kibi work. Public interfaces must use canonical plan-bootstrap and kb_plan_bootstrap names without legacy aliases. The planner must return a deterministic read-only hash-bound plan with exact branch, KB, workspace, and source evidence bindings and bounded context questions. Status and next actions must classify thin, seeded, degraded, and repair-required states consistently. Applying bootstrap must require explicit approval, execute dependency-ordered actions sequentially through kb_apply_plan, and never permit direct kb_upsert for bootstrap tasks. Partial application must produce a typed repair journal with action-start and post-action checkpoints, reject original-plan replay, and fail closed on changed state. MCP, Cursor, OpenCode, Codex, and CLI adapters must route to the shared planner and canonical skills rather than duplicate workflows. Generic onboarding must direct agents through typed status and canonical kibi-usage, kibi-freshness, kibi-traceability, and kibi-bootstrap skills without manual .kb edits.
logic_claims:
  - CLAIM-BFD7680847E0AD7D
  - CLAIM-AAD92792B8861C87
  - CLAIM-5B1AC90906AE403D
  - CLAIM-0D02947169FC8F33
  - CLAIM-FA953357BC2B9A7B
  - CLAIM-060359AD8D5787D9
  - CLAIM-27EF1946F8E11BF8
  - CLAIM-D08D0673739675FB
  - CLAIM-61445B78B6F47665
semantic_clauses:
  - Kibi initialization must attach the exact Git branch and create infrastructure only.
  - An explicit bootstrap request must perform initial inference and seed through kibi-bootstrap, then seeded repositories must hand off to normal Kibi work.
  - Public interfaces must use canonical plan-bootstrap and kb_plan_bootstrap names without legacy aliases.
  - The planner must return a deterministic read-only hash-bound plan with exact branch, KB, workspace, and source evidence bindings and bounded context questions.
  - Status and next actions must classify thin, seeded, degraded, and repair-required states consistently.
  - Applying bootstrap must require explicit approval, execute dependency-ordered actions sequentially through kb_apply_plan, and never permit direct kb_upsert for bootstrap tasks.
  - Partial application must produce a typed repair journal with action-start and post-action checkpoints, reject original-plan replay, and fail closed on changed state.
  - MCP, Cursor, OpenCode, Codex, and CLI adapters must route to the shared planner and canonical skills rather than duplicate workflows.
  - Generic onboarding must direct agents through typed status and canonical kibi-usage, kibi-freshness, kibi-traceability, and kibi-bootstrap skills without manual .kb edits.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 331a7ffe4627ecc28f3229500631c31628a6301b9e3a97f24fae6bfa954af2b1
semantic_inventory:
  - claim_key: CLAIM-BFD7680847E0AD7D
    claim_text: Kibi initialization must attach the exact Git branch and create infrastructure only
    role: normative
    status: modeled
    span:
      start: 0
      end: 83
  - claim_key: CLAIM-AAD92792B8861C87
    claim_text: An explicit bootstrap request must perform initial inference and seed through kibi-bootstrap, then seeded repositories must hand off to normal Kibi work
    role: normative
    status: modeled
    span:
      start: 85
      end: 237
  - claim_key: CLAIM-5B1AC90906AE403D
    claim_text: Public interfaces must use canonical plan-bootstrap and kb_plan_bootstrap names without legacy aliases
    role: normative
    status: modeled
    span:
      start: 239
      end: 341
  - claim_key: CLAIM-0D02947169FC8F33
    claim_text: The planner must return a deterministic read-only hash-bound plan with exact branch, KB, workspace, and source evidence bindings and bounded context questions
    role: normative
    status: modeled
    span:
      start: 343
      end: 501
  - claim_key: CLAIM-FA953357BC2B9A7B
    claim_text: Status and next actions must classify thin, seeded, degraded, and repair-required states consistently
    role: normative
    status: modeled
    span:
      start: 503
      end: 604
  - claim_key: CLAIM-060359AD8D5787D9
    claim_text: Applying bootstrap must require explicit approval, execute dependency-ordered actions sequentially through kb_apply_plan, and never permit direct kb_upsert for bootstrap tasks
    role: normative
    status: modeled
    span:
      start: 606
      end: 781
  - claim_key: CLAIM-27EF1946F8E11BF8
    claim_text: Partial application must produce a typed repair journal with action-start and post-action checkpoints, reject original-plan replay, and fail closed on changed state
    role: normative
    status: modeled
    span:
      start: 783
      end: 947
  - claim_key: CLAIM-D08D0673739675FB
    claim_text: MCP, Cursor, OpenCode, Codex, and CLI adapters must route to the shared planner and canonical skills rather than duplicate workflows
    role: normative
    status: modeled
    span:
      start: 949
      end: 1081
  - claim_key: CLAIM-61445B78B6F47665
    claim_text: Generic onboarding must direct agents through typed status and canonical kibi-usage, kibi-freshness, kibi-traceability, and kibi-bootstrap skills without manual .kb edits
    role: normative
    status: modeled
    span:
      start: 1083
      end: 1253
id: REQ-KIBI-BOOTSTRAP-PLAN
type: req
---
The bootstrap workflow must produce a read-only deterministic plan and apply only an explicitly approved exact plan through kb_apply_plan.
