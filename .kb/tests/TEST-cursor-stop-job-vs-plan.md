---
id: TEST-cursor-stop-job-vs-plan
title: Cursor stop hook plan-versus-job verification
type: test
status: active
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
    - symbol_id: SYM-e2e-test-cursor-stop-job-vs-plan
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1957af9d8b4131e9ca4896f4
    test_id: TEST-cursor-stop-job-vs-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 1f8045bbd7864441e5c7f721c47d11b40a70655ffe7f083fc1204c4da2ef9436
    binding_hash: 3eb320a81989e0a1e4dc720a992af163a4bfe19d0ab2abd518ad5589a8b9c544
    fingerprint: 82e93963df14d8d90cb1919fa9417821e955c40215f1303bdb44c4762c1e8b57
    fingerprint_components:
      contract: 1f8045bbd7864441e5c7f721c47d11b40a70655ffe7f083fc1204c4da2ef9436
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
      - symbol_id: SYM-e2e-test-cursor-stop-job-vs-plan
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
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
