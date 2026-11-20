---
title: The evidence floor check rule shall be evidence-floor, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-evidence-floor-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-evidence-floor-rule
  proves:
    - CLAIM-C97BCBA32B6056FD
origin:
  kind: agent
  recorded_at: '2026-10-28T20:19:49.254Z'
id: TEST-proof-evidence-floor-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9b611e74cc6ec20393f8d258
    test_id: TEST-proof-evidence-floor-rule
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0ea84581ee708f9a0be26361b4e5bf40fc54581b7851140fd94c90f9ca09ae43
    binding_hash: 4c8311c5abd6f27590768bde86c50795397754dad5e666b7db310d66057959e8
    fingerprint: e76f64f770f2a71a7866c7b84f6cac14bf1421c4782bf3c99fed8132e3647b6d
    fingerprint_components:
      contract: 0ea84581ee708f9a0be26361b4e5bf40fc54581b7851140fd94c90f9ca09ae43
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
      - symbol_id: SYM-proof-evidence-floor-rule
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-evidence-floor-rule
      pattern:
        symbol_id: SYM-const-evidence-floor-rule
        type: string
        value: evidence-floor
    certificate_digest: 0c9752a70d98ba57107a7842955b3bece51323736be9735d9eb3b12801465518
    claim_bindings:
      - claim_key: CLAIM-C97BCBA32B6056FD
        requirement_id: REQ-kibi-evidence-floor-rule-name
        fact_id: FACT-evidence-floor-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: evidence-floor
---
Proves that the evidence floor check rule shall be evidence-floor, against the code Kibi reads at ingest.