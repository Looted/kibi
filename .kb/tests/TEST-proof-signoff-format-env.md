---
title: The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT, by a regex proof
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
    - symbol_id: SYM-proof-signoff-format-env
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-signoff-format-env
  proves:
    - CLAIM-1B36DD238864E38E
origin:
  kind: agent
  recorded_at: '2026-10-28T11:16:45.170Z'
id: TEST-proof-signoff-format-env
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-66508d898c85fa47d83e1d50
    test_id: TEST-proof-signoff-format-env
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 85cb09d525f1d661fd3cee19c3509f7c1f7dd149500f42863e229fe0db3d0092
    binding_hash: e8c64b4fb11631746fea23dcf3146e8df9342c62f60cf9a3c6855ee353f5455c
    fingerprint: 1c37c5169844aacbf0a0c15cb9890396a5a87a9d44e840de0c7b9a9e43d33658
    fingerprint_components:
      contract: 85cb09d525f1d661fd3cee19c3509f7c1f7dd149500f42863e229fe0db3d0092
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
      - symbol_id: SYM-proof-signoff-format-env
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
      test_id: TEST-proof-signoff-format-env
      pattern:
        symbol_id: SYM-cli-signoff-signoff-format-env
        type: string
        value: KIBI_SIGNOFF_FORMAT
    certificate_digest: 39079dd80217b5f549418bb4d2b2b92c5424d20207f402aa4cf04a07fe3a411a
    claim_bindings:
      - claim_key: CLAIM-1B36DD238864E38E
        requirement_id: REQ-kibi-signoff-format-setting
        fact_id: FACT-signoff-format-env
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: KIBI_SIGNOFF_FORMAT
---
Proves that the kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT, against the code Kibi reads at ingest.