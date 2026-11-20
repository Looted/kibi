---
title: An OpenCode Kibi guidance block shall hold at most 5 bullets, by an arithmetic proof
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
    - symbol_id: SYM-proof-opencode-guidance-bullet-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  proves:
    - CLAIM-E09239D150DB56C0
  value_source:
    - symbol_id: SYM-const-opencode-max-bullets
origin:
  kind: agent
  recorded_at: '2026-10-30T19:41:52.952Z'
id: TEST-proof-opencode-guidance-bullet-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e1850f7d0e31919de57414ff
    test_id: TEST-proof-opencode-guidance-bullet-limit
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a4f7dfdd4f7da7571aee653ecc645d8d1566ec7bdb2d99632ba8874f228e4a29
    binding_hash: 464090a9b4da0170cba13d3d6e28d3ad3cbbb7075cc303148f392b8eb66a2d96
    fingerprint: 38af5008907ca9ed4bcc9ce03a1aaac7c06844b59cd15cb5989d522e361087d9
    fingerprint_components:
      contract: a4f7dfdd4f7da7571aee653ecc645d8d1566ec7bdb2d99632ba8874f228e4a29
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
      - symbol_id: SYM-proof-opencode-guidance-bullet-limit
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
      test_id: TEST-proof-opencode-guidance-bullet-limit
      variable: bullet_limit
      value_type: int
      assumptions:
        - operator: eq
          value: 5
      claim:
        operator: eq
        value: 5
    certificate_digest: f0fd9ff69c5c18cbb3bbac96d451798acb8ac2b22f5f8611c12ce549648c3e0c
    claim_bindings:
      - claim_key: CLAIM-E09239D150DB56C0
        requirement_id: REQ-opencode-guidance-bullet-limit
        fact_id: FACT-opencode-guidance-bullet-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 5
          value_type: int
          variable: bullet_limit
---
Proves that an OpenCode Kibi guidance block shall hold at most 5 bullets, against the code Kibi reads at ingest.