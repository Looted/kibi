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
    receipt_id: PR-c910420efa302190ad637b83
    test_id: TEST-proof-rule-entity-context-acknowledged
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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