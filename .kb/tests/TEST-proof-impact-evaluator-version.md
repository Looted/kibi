---
title: The impact evaluator version shall be kibi.impact-evaluator.v1, by a regex proof
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
    - symbol_id: SYM-proof-impact-evaluator-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-impact-stage-e-impact-evaluator-version
  proves:
    - CLAIM-5857985CFA6DB752
origin:
  kind: agent
  recorded_at: '2026-10-28T17:32:55.184Z'
id: TEST-proof-impact-evaluator-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-023189157696004deb79d5e8
    test_id: TEST-proof-impact-evaluator-version
    scope: unit
    outcome: passed
    code_snapshot: 5ed496f2f4162fe5e2f3ba3d9e466d7f9ee6dc45325e320c48977a64f361547b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:35:27.664Z'
    finished_at: '2026-10-28T17:35:27.803Z'
    artifact_digest: b863ae3ac88e2436b5c3f2719a495cc3e2aafe32c4461b815d88e7f676ffb2a4
    contract_hash: 29add23bdf95847b9e614016133ca79e39ef0ab69abd4d0df1d9c4adacfd8c13
    binding_hash: 3bf39facbc4029fab27dfee0ddf6355948bd9b6b65248f3dcccccf13b0a33898
    fingerprint: a5eb94bdc4178e088bbbad4bec042fabfd217e326859f53f85903ed4ff8593d0
    fingerprint_components:
      contract: 29add23bdf95847b9e614016133ca79e39ef0ab69abd4d0df1d9c4adacfd8c13
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
      - symbol_id: SYM-proof-impact-evaluator-version
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
      test_id: TEST-proof-impact-evaluator-version
      pattern:
        symbol_id: SYM-impact-stage-e-impact-evaluator-version
        type: string
        value: kibi.impact-evaluator.v1
    certificate_digest: 80e6fe8194260a515ee33400065796190aa1088d3e38ee913f6c21b49d35dba1
    claim_bindings:
      - claim_key: CLAIM-5857985CFA6DB752
        requirement_id: REQ-impact-review-identifiers
        fact_id: FACT-impact-evaluator-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.impact-evaluator.v1
---
Proves that the impact evaluator version shall be kibi.impact-evaluator.v1, against the code Kibi reads at ingest.