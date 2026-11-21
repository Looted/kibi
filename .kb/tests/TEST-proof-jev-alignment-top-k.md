---
title: The Jev aligner shall rank at most 5 candidates, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-jev-alignment-top-k
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-jev-subject-top-k
  proves:
    - CLAIM-382F0321CFF46157
origin:
  kind: agent
  recorded_at: '2026-10-29T16:55:23.631Z'
id: TEST-proof-jev-alignment-top-k
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b1343b80c957f2dcd481d312
    test_id: TEST-proof-jev-alignment-top-k
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 197b702d32b18c4d750e7030b6da938cf358770b2d246df02b76bb3d0c5623ef
    binding_hash: eed9c5e3a53f8f7c89c0bb107f981a04168c92ce3bc4fa2a1d739cb3b0bd6c6b
    fingerprint: 278a6428e0f9af077d6156e21e509aaf0c7f7ce46835ae1423c035848b6b087e
    fingerprint_components:
      contract: 197b702d32b18c4d750e7030b6da938cf358770b2d246df02b76bb3d0c5623ef
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
      - symbol_id: SYM-proof-jev-alignment-top-k
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-jev-alignment-top-k
      variable: jev_top_k
      value_type: int
      assumptions:
        - operator: eq
          value: 5
      claim:
        operator: eq
        value: 5
    certificate_digest: 406d3db40d730ebfde4f4eb554c379096352ff699ec6a7d7a5bdeebe1e94df0b
    claim_bindings:
      - claim_key: CLAIM-382F0321CFF46157
        requirement_id: REQ-kibi-vocabulary-alignment-limits
        fact_id: FACT-jev-alignment-top-k
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 5
          value_type: int
          variable: jev_top_k
---
Proves that the Jev aligner shall rank at most 5 candidates, against the code Kibi reads at ingest.