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
    receipt_id: PR-9485de4ca0154ee03e6c0203
    test_id: TEST-kibi-claim-bound-proofs
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ef679be4889b29bbf2035f91775c6f274ff1378dfca354d2d0e2fee8d047f47
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:47:17.973Z'
    finished_at: '2026-10-29T16:49:51.010Z'
    artifact_digest: 43d0088ec56a9763f736e12256d1dd7b6307b0664e99f6d7af5d45d93f5d477b
    contract_hash: 6050cd455db24a896f0fde16796170752eb9e11716e75f5e94fc262b4126be38
    binding_hash: 5ff6b6f0bad80ba2a023cafec647b79f13f915f9b50e1a6debdd20dcadc23da4
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
Runs the installed packed CLI on a sandbox repository where the semantic advisor models "Palette colors must be one of red, green or blue" as a set fact, and exhaustive tests name that claim in proof_contract.proves. After kibi prove --all, the test over a domain that is exactly the set gets a derived claim binding and kibi prove prints it; a domain missing a member and an unknown claim key get rejected bindings with the reason; kibi check --rules proof-contract-claims reports those contracts and the one without proves; and kibi proof explain lists the claim with its bindings.
