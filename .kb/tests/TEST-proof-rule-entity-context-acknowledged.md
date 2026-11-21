---
title: An acknowledged missing context shall be reported as entity-context-acknowledged, by a regex proof
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
    - symbol_id: SYM-proof-rule-entity-context-acknowledged
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-entity-context-acknowledged-rule
  proves:
    - CLAIM-D6F9F25234BCBB15
origin:
  kind: agent
  recorded_at: '2026-10-29T16:43:24.266Z'
id: TEST-proof-rule-entity-context-acknowledged
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0a9b80d306a736c71e25b624
    test_id: TEST-proof-rule-entity-context-acknowledged
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 66dca2ebe252aaaa72f16b130b22978c094e3e6a4577fe1534bdd0badeea623b
    binding_hash: 3986ab205fc6a23b27d6876e2d521e4961aa5b958045f3359795fc4533647935
    fingerprint: 02badf57357dc44c85d063ba2f8668473323a99e6cc6b0aa64c65d786baf06ce
    fingerprint_components:
      contract: 66dca2ebe252aaaa72f16b130b22978c094e3e6a4577fe1534bdd0badeea623b
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
      - symbol_id: SYM-proof-rule-entity-context-acknowledged
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
      test_id: TEST-proof-rule-entity-context-acknowledged
      pattern:
        symbol_id: SYM-const-entity-context-acknowledged-rule
        type: string
        value: entity-context-acknowledged
    certificate_digest: 0d11b0ac4a73a675a31f40c7bf7693b3690e1ce75baeef900d26d3f2076e1dcc
    claim_bindings:
      - claim_key: CLAIM-D6F9F25234BCBB15
        requirement_id: REQ-kb-entity-context-rule-names
        fact_id: FACT-rule-entity-context-acknowledged
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: entity-context-acknowledged
---
Proves that an acknowledged missing context shall be reported as entity-context-acknowledged, against the code Kibi reads at ingest.