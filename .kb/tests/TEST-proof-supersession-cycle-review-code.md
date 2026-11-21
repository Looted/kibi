---
title: The supersession cycle review code shall be review_supersession_cycle, by a regex proof
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
    - symbol_id: SYM-proof-supersession-cycle-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-SUPERSESSION_CYCLE_REVIEW_CODE
  proves:
    - CLAIM-B26CCE9856ABAD66
origin:
  kind: agent
  recorded_at: '2026-10-28T17:27:10.300Z'
id: TEST-proof-supersession-cycle-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cf48f690dddcbf9c3e5bce3b
    test_id: TEST-proof-supersession-cycle-review-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 005ddec32e342e8e141e95036f2e03a0a0f8609f6924689fbfcdb500ba96b518
    binding_hash: 74a8d67e058c0535bfbe3cbf31f268a7ec549b7db063579d049521b1e8a18b19
    fingerprint: 4894c81f3542b57d7538458f57288b86e3ddbb5ec1b89cdc5ad9c4f537a7bf6c
    fingerprint_components:
      contract: 005ddec32e342e8e141e95036f2e03a0a0f8609f6924689fbfcdb500ba96b518
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
      - symbol_id: SYM-proof-supersession-cycle-review-code
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
      test_id: TEST-proof-supersession-cycle-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-SUPERSESSION_CYCLE_REVIEW_CODE
        type: string
        value: review_supersession_cycle
    certificate_digest: 298aca7880a2c6e46690758e582ac5ad502ae168c76fa9ef9d55d6e95c7bb77e
    claim_bindings:
      - claim_key: CLAIM-B26CCE9856ABAD66
        requirement_id: REQ-kibi-lifecycle-review-codes
        fact_id: FACT-supersession-cycle-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_supersession_cycle
---
Proves that the supersession cycle review code shall be review_supersession_cycle, against the code Kibi reads at ingest.