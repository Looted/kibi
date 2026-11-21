---
title: The symbols manifest shall be .kb/symbols.yaml, by a regex proof
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
    - symbol_id: SYM-proof-symbols-manifest-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-KIBI-SYMBOLS-MANIFEST-PATH
  proves:
    - CLAIM-41E5DF73D62AB2AA
origin:
  kind: agent
  recorded_at: '2026-10-28T18:57:27.382Z'
id: TEST-proof-symbols-manifest-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4aac30f94725e16d0364f7c1
    test_id: TEST-proof-symbols-manifest-path
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d7c28b293dc2787f70107cdcd536bd1272b0811cec4c6eeccf0ceee6abfec0a6
    binding_hash: a00105c56b55caa716bbc9005f4befddf3dd673334f97d17f284262232e9efba
    fingerprint: 443c94060313413e2173ef3e6d295fed7114b19f8f2c475784eacc648774f2f4
    fingerprint_components:
      contract: d7c28b293dc2787f70107cdcd536bd1272b0811cec4c6eeccf0ceee6abfec0a6
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
      - symbol_id: SYM-proof-symbols-manifest-path
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
      test_id: TEST-proof-symbols-manifest-path
      pattern:
        symbol_id: SYM-KIBI-SYMBOLS-MANIFEST-PATH
        type: string
        value: .kb/symbols.yaml
    certificate_digest: 75f4bfa64b66886d7e5b9e2773b4a24212815f6f4a2c02e1a016efefb1267a89
    claim_bindings:
      - claim_key: CLAIM-41E5DF73D62AB2AA
        requirement_id: REQ-staged-impact-identifiers
        fact_id: FACT-symbols-manifest-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/symbols.yaml
---
Proves that the symbols manifest shall be .kb/symbols.yaml, against the code Kibi reads at ingest.