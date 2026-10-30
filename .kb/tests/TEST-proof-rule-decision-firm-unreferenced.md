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
    receipt_id: PR-cdbedbda3286e724e4d24045
    test_id: TEST-proof-rule-decision-firm-unreferenced
    scope: unit
    outcome: passed
    code_snapshot: a29ab0b7ed18b6a171a62094b8cf21f0c4a2013eca287583b5dc35ba5bd319c0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:32:21.348Z'
    finished_at: '2026-10-29T17:32:21.583Z'
    artifact_digest: 2edc039b55174e94d37e470fd0d0360c82d84a5f412f0400d24b58ccfc5bf937
    contract_hash: 576638a337129c9d9999624f92286e5654f8d11ae50aed7019ab32912ca983c8
    binding_hash: 23cb4790ab2d46eacfa549076519b6c6b1e92b676329ef65314af23b518a12e8
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