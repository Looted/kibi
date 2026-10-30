---
title: Consumer CLI blocks a quantified claim grounded on a boolean until a count grounds it or a waiver is approved
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-30T12:10:00.000Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-dimension-gap-verifier
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-dimension-gap
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fe550d2c35dbf64a89075fac
    test_id: TEST-kibi-dimension-gap
    scope: end_to_end
    outcome: passed
    code_snapshot: 4fa2ab5cb2a0764fac8b32eab2e79f1056160b4d1b568bdf5ce6ee94a848a7b1
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T12:07:21.325Z'
    finished_at: '2026-10-30T12:07:32.710Z'
    artifact_digest: f3f45544c12fd2c7670a4196c42b8f6a961673bac83089fb2199ee937b55e443
    contract_hash: 3ad29640c07101467489089b206f98a16171170d013bc7327dfb3cc157258b0e
    binding_hash: a4aa8d9ac1b5b6fd8ee6b9ed5f032514ebd5478c0a1466e223ba52dcefb777e4
    fingerprint: 63972b5ffc419da7cdc154867f99b7da37ab79a0e9d49101d684489a788da719
    fingerprint_components:
      contract: 3ad29640c07101467489089b206f98a16171170d013bc7327dfb3cc157258b0e
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
      - symbol_id: SYM-kibi-dimension-gap-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Authors a loader requirement whose claim ranges over every loaded file in a fresh workspace and checks through the built CLI that the semantic advisor marks the clause with its dimension, that a boolean grounding leaves the dimension_unrepresented gap and proof explain names the typed rewrites, that an integer count grounding closes it, and that a dimension waiver counts only once approved (packages/cli/tests/consumer/dimension-gap.test.ts).
