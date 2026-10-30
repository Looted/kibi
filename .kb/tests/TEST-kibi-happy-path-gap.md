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
    receipt_id: PR-6faa2e7c73353fcbad49230e
    test_id: TEST-kibi-happy-path-gap
    scope: end_to_end
    outcome: passed
    code_snapshot: 89f1c10030cbc3cf91609cbbbfdb6599b03fe8f4117839d02cfc7f7a10f20767
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T21:58:35.904Z'
    finished_at: '2026-10-29T21:58:46.960Z'
    artifact_digest: 2be0d440b4309fc4ac204b28ab33d42f935161dd85887f18f6027e1bdd15f681
    contract_hash: 8dc71ad13b264eefe1a6e8b5c4068560eb04710ed63ccc716481fd2ee0e79245
    binding_hash: 6ba1bca861894927055612ea92da584bb3bf4f98db78edb36fef7a8f0caf39ca
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