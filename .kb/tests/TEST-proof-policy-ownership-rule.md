---
title: The policy ownership rule shall be policy-ownership, by a regex proof
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
    - symbol_id: SYM-proof-policy-ownership-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-policy-ownership-rule
  proves:
    - CLAIM-07BF06E3E4B8056F
origin:
  kind: agent
  recorded_at: '2026-10-28T20:22:33.916Z'
id: TEST-proof-policy-ownership-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ab2406f5f5ee543a0410196a
    test_id: TEST-proof-policy-ownership-rule
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: d38640e68cc2948480c0b06af68467e2ace613021928d1482a067021e774b03e
    binding_hash: 38d6aaf315a9a0fde87a189cb943550479d6d0fa69ec363fab095276b33396c4
    fingerprint: 95a7d980c81074e669457497fc74bbfca8993ef5f7c1f5efdd993e9991e05e32
    fingerprint_components:
      contract: d38640e68cc2948480c0b06af68467e2ace613021928d1482a067021e774b03e
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
      - symbol_id: SYM-proof-policy-ownership-rule
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
      test_id: TEST-proof-policy-ownership-rule
      pattern:
        symbol_id: SYM-const-policy-ownership-rule
        type: string
        value: policy-ownership
    certificate_digest: 01769df8508e73720c2b51f223f657f72a7d8bf0a1370089ee0cb35d0d93f9f8
    claim_bindings:
      - claim_key: CLAIM-07BF06E3E4B8056F
        requirement_id: REQ-kibi-policy-rule-names
        fact_id: FACT-policy-ownership-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: policy-ownership
---
Proves that the policy ownership rule shall be policy-ownership, against the code Kibi reads at ingest.