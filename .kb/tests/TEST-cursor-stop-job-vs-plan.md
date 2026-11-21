---
id: TEST-cursor-stop-job-vs-plan
title: Cursor stop hook plan-versus-job verification
type: test
status: passing
created_at: 2026-08-18T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
priority: must
verification_scope: end_to_end
tags:
  - test
  - kibi
  - cursor
  - plugin
  - hooks
links:
  - type: validates
    target: SCEN-cursor-stop-job-vs-plan
  - type: relates_to
    target: REQ-cursor-stop-job-vs-plan
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cursor-plugin-launcher
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1c7470b094ab00a29810c08a
    test_id: TEST-cursor-stop-job-vs-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0aac345636937bdd9ce5c4e2aa8db27285162f421f307d69df3fbd66ad5fbe68
    binding_hash: 5a2c0802abb612742e30f5301639acf6cf01bc81724c3561ee532061e4a65260
    fingerprint: 6c65d7222ec22bd95e3fe85dced1940edecb8f0713acff4ec85e019186ac8b29
    fingerprint_components:
      contract: 0aac345636937bdd9ce5c4e2aa8db27285162f421f307d69df3fbd66ad5fbe68
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-cursor-plugin-launcher
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verification for Cursor stop-hook plan-versus-job behavior lives in `packages/cursor` unit tests:

- `packages/cursor/tests/hook-runner.test.ts` covers Read/Grep silence, `CreatePlan` silence, `CreatePlan` plus Write impact follow-up, `CreatePlan` plus `kb_upsert` summary, `SwitchMode` not counting as plan delivery, and aborted stop status.
- `packages/cursor/tests/messages.test.ts` covers `stopFollowupMessage` plan-delivery silence versus remaining follow-ups when dirty paths or KB mutations exist.
- `packages/cursor/tests/hook-input.test.ts` covers `stop.status` parsing.
- `packages/cursor/tests/hook-state.test.ts` covers `planDelivered` persistence.

`packages/cursor/README.md` must state that stop follow-up is for finished implementation turns, not plan delivery, and that reads do not count as edits.
