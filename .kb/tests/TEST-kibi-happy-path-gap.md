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
    receipt_id: PR-37a19cb8c28b0646104fb4ca
    test_id: TEST-kibi-happy-path-gap
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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