---
title: Consumer CLI blocks happy-path-only requirements until a rejection scenario or an approved waiver
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-29T22:35:00.000Z'
id: TEST-kibi-happy-path-gap
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-happy-path-gap-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-38a873f7d9fd5424442279f2
    test_id: TEST-kibi-happy-path-gap
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 8dc71ad13b264eefe1a6e8b5c4068560eb04710ed63ccc716481fd2ee0e79245
    binding_hash: 5259bbacaa581dd7bbc791e630ce9017e158494e3cb9e5a5cfd88e5fbbfcaa41
    fingerprint: d5996db2a13cf2eeca55c8e7a5458bf0558f21de0e3e145c144924142215c527
    fingerprint_components:
      contract: 8dc71ad13b264eefe1a6e8b5c4068560eb04710ed63ccc716481fd2ee0e79245
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
      - symbol_id: SYM-kibi-happy-path-gap-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Authors a quota requirement and its scenarios in a fresh workspace and checks through the built CLI that success scenarios alone leave the happy_path_only gap with a suggested opposing value, that a rejection scenario the requirements permit is reported by scenario-outcome-mismatch and does not count, that a rejection scenario assuming the forbidden value closes the gap, and that a failure-side waiver counts only once approved (packages/cli/tests/consumer/happy-path-gap.test.ts).