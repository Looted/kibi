---
title: The impact policy version shall be kibi.impact-policy.v1, by a regex proof
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
    - symbol_id: SYM-proof-impact-policy-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-impact-stage-e-impact-policy-version
  proves:
    - CLAIM-66AE03740817D7D3
origin:
  kind: agent
  recorded_at: '2026-10-28T17:32:18.336Z'
id: TEST-proof-impact-policy-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-15b41d55a8f36617a8f99bd3
    test_id: TEST-proof-impact-policy-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: a8fddb363e068127caa1323026cdffcf1f76ba07bfbf643ca009938413479d90
    binding_hash: 23072fcc9e8d548faf154516369cba3304cde2c37405575a9cd85be626a4be24
    fingerprint: e0c75110d2349c250e4e1f587ed8f5ab509bdc7db35b5c556cb72d9462ee17b2
    fingerprint_components:
      contract: a8fddb363e068127caa1323026cdffcf1f76ba07bfbf643ca009938413479d90
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
      - symbol_id: SYM-proof-impact-policy-version
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
      test_id: TEST-proof-impact-policy-version
      pattern:
        symbol_id: SYM-impact-stage-e-impact-policy-version
        type: string
        value: kibi.impact-policy.v1
    certificate_digest: d694c2be4227584192a4674e83c7f79108b0136b36537437e5edff734d67de0e
    claim_bindings:
      - claim_key: CLAIM-66AE03740817D7D3
        requirement_id: REQ-impact-review-identifiers
        fact_id: FACT-impact-policy-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.impact-policy.v1
---
Proves that the impact policy version shall be kibi.impact-policy.v1, against the code Kibi reads at ingest.