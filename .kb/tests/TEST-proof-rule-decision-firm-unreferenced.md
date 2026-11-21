---
title: An unreferenced firm decision shall be reported as decision-firm-unreferenced, by a regex proof
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
    - symbol_id: SYM-proof-rule-decision-firm-unreferenced
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-decision-firmness-firm-unreferenced-rule
  proves:
    - CLAIM-216BC6F5EBF739D9
origin:
  kind: agent
  recorded_at: '2026-10-29T16:38:34.681Z'
id: TEST-proof-rule-decision-firm-unreferenced
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-26d6e99bccb4dd3bec9a7f54
    test_id: TEST-proof-rule-decision-firm-unreferenced
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 576638a337129c9d9999624f92286e5654f8d11ae50aed7019ab32912ca983c8
    binding_hash: 6d66d7fb6a92b89faffde1a35dff4701f2bb6bc8dbd2b33fe6c52aa25d534ab6
    fingerprint: fc63a2b55296e522d835bd03353ab0795da4267ab414d619c46c347c6dd9a740
    fingerprint_components:
      contract: 576638a337129c9d9999624f92286e5654f8d11ae50aed7019ab32912ca983c8
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
      - symbol_id: SYM-proof-rule-decision-firm-unreferenced
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
      test_id: TEST-proof-rule-decision-firm-unreferenced
      pattern:
        symbol_id: SYM-decision-firmness-firm-unreferenced-rule
        type: string
        value: decision-firm-unreferenced
    certificate_digest: 9aedb6a5c84cfdee8240f4f54ce19a343449386214d69328bbcd9c9c473b0122
    claim_bindings:
      - claim_key: CLAIM-216BC6F5EBF739D9
        requirement_id: REQ-kb-decision-firmness-rule-names
        fact_id: FACT-rule-decision-firm-unreferenced
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: decision-firm-unreferenced
---
Proves that an unreferenced firm decision shall be reported as decision-firm-unreferenced, against the code Kibi reads at ingest.