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
    receipt_id: PR-fbc7a0da886cb6b5a8bed3e8
    test_id: TEST-proof-jev-alignment-top-k
    scope: unit
    outcome: passed
    code_snapshot: 4015792e45e163c9ef221115c30a79374921664a5f8d7ef4db0f94d2f35e6043
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:58:31.680Z'
    finished_at: '2026-10-29T16:58:31.854Z'
    artifact_digest: 48fa335970f6a8a4170418691c8272b6181e00320dd2a4a3c3102296196ef527
    contract_hash: 197b702d32b18c4d750e7030b6da938cf358770b2d246df02b76bb3d0c5623ef
    binding_hash: f27bcd779366573c3c59c0ab7bbf98e5b3dd595b4b4606fef37f585fd92c898e
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