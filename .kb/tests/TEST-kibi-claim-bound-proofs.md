---
title: Claim-bound proofs through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - certificate
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-claim-bound-proofs
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-25T18:21:47.435Z'
id: TEST-kibi-claim-bound-proofs
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-49f48c6db2a1e37bb0c36554
    test_id: TEST-kibi-claim-bound-proofs
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 6050cd455db24a896f0fde16796170752eb9e11716e75f5e94fc262b4126be38
    binding_hash: 13d17792dc7dea0cb3db9a34ae06c82a3c1b9394237d132db60978357bd34d9e
    fingerprint: 3aaec151dd9939d667900f2219880079ad655f5b34d6b67d3c3da840c36b593e
    fingerprint_components:
      contract: 6050cd455db24a896f0fde16796170752eb9e11716e75f5e94fc262b4126be38
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
      - symbol_id: SYM-e2e-packed-claim-bound-proofs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the installed packed CLI on a sandbox repository where the semantic advisor models "Palette colors must be one of red, green or blue" as a set fact, and exhaustive tests name that claim in proof_contract.proves. After kibi prove --all, the test over a domain that is exactly the set gets a derived claim binding and kibi prove prints it; a domain missing a member and an unknown claim key get rejected bindings with the reason; kibi check --rules proof-contract-claims reports those contracts and the one without proves; and kibi proof explain lists the claim with its bindings. A requirement with two claims, only one named by a certificate and the other's failure side covered, is tested end to end, yet kibi coverage reports its evidence level as tested rather than proved and lists the uncertified claim as unproved.
