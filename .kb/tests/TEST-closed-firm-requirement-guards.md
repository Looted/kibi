---
title: A closed firm requirement guards its code in hooks and the commit gate
status: passing
priority: must
verification_scope: end_to_end
tags:
  - firmness
  - check-staged
  - hooks
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-closed-firm-requirement-guards
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T19:21:25.930Z'
id: TEST-closed-firm-requirement-guards
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1a56d5e498276dd669c20081
    test_id: TEST-closed-firm-requirement-guards
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 587a3b588af621570aafe4c8d42669c35af5a8cec33133b45303f1c43d2bb49a
    binding_hash: d482cf0b55114f64d2485209ceb4f9968fe6db2b808559cca16e5eb25728a525
    fingerprint: d50b9dbdf26407407523f11e359190a9a7f90c0ba18cd84b4af831ecc35cd565
    fingerprint_components:
      contract: 587a3b588af621570aafe4c8d42669c35af5a8cec33133b45303f1c43d2bb49a
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
      - symbol_id: SYM-test-closed-firm-requirement-guards
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks the shared retired-status test: closed, open and in_progress requirements stay current, superseded, deprecated, retired, archived and removed ones do not, and a closed requirement that a current requirement supersedes guards nothing. The hooks' current firm summary, the snippet, the commit gate's current firm requirement test with the change's successors, and kibi review-firm-edit all agree (packages/agent-core/tests/snippets-contract.test.ts, knowledge-index-contract.test.ts, decision-guard.test.ts, packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts, firm-edit-staged.mutation.test.ts, operations/firm-edit-review.mutation.test.ts).
