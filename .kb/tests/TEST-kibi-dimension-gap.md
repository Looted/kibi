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
    receipt_id: PR-23afa5e7d96b36f98a366eae
    test_id: TEST-kibi-dimension-gap
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 3ad29640c07101467489089b206f98a16171170d013bc7327dfb3cc157258b0e
    binding_hash: 9547d3c28c8f057b83e72680b2d70d8f90bc1cbd65115de121ae9e9b2758accd
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
