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
    receipt_id: PR-49faa548ff83e2d0f95277e5
    test_id: TEST-kibi-claim-bound-proofs
    scope: end_to_end
    outcome: passed
    code_snapshot: 839947f4dfd1b5f330bc120c4cac1df0359e396c92ae27584b1326241ff4c7e6
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T18:57:23.995Z'
    finished_at: '2026-10-25T18:58:43.563Z'
    artifact_digest: 250fbbca8e8b14cca59cd05935bab3eb1ab6e82ea5b00b7641148e561b0bd006
    contract_hash: 6050cd455db24a896f0fde16796170752eb9e11716e75f5e94fc262b4126be38
    binding_hash: 9f7574c5d6b117f36ae3bb7a2d151888f36ec8a666e5d8537dd2cc9f7b3ea9d8
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
