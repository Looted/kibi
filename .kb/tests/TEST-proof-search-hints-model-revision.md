---
title: The search hints embedding model revision shall be 6fc8051fab2a1e0ee76689cf08c853792ac285e7, by a regex proof
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
    - symbol_id: SYM-proof-search-hints-model-revision
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-906A2E255020711F
  pattern_source:
    symbol_id: SYM-const-search-hints-model-revision
origin:
  kind: agent
  recorded_at: '2026-10-30T19:40:32.148Z'
id: TEST-proof-search-hints-model-revision
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-68c35f3a90e6dcc483edd614
    test_id: TEST-proof-search-hints-model-revision
    scope: unit
    outcome: passed
    code_snapshot: 5cf1f3c42e74e0fb26fa20e3b699037c8ed23ee0c308ebb628690b15abc9ff4c
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-24T18:41:26.508Z'
    finished_at: '2026-11-24T18:41:27.324Z'
    artifact_digest: 3fefa43a3267dd1c7891341d7927aa9a8e9f90d47dfd34f86c7a05455edea05e
    contract_hash: 39ccdb30212e43752f55c8b015881575e58c81c754fd7fe9b1137df8fd96d40d
    binding_hash: 9db51835a59c779809a6134e7e4aa97803aed549ce36a057136a9cd351647c03
    fingerprint: 5d6d1d71a7a1318456a9a2deb18e115136d710848669500af4353617f29d348a
    fingerprint_components:
      contract: 39ccdb30212e43752f55c8b015881575e58c81c754fd7fe9b1137df8fd96d40d
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
      - symbol_id: SYM-proof-search-hints-model-revision
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
      test_id: TEST-proof-search-hints-model-revision
      pattern:
        symbol_id: SYM-const-search-hints-model-revision
        type: string
        value: 6fc8051fab2a1e0ee76689cf08c853792ac285e7
    certificate_digest: 8600661a5c2d23d6793d336adffe2a73413db71af082b7fb96a36022cd35782f
    claim_bindings:
      - claim_key: CLAIM-906A2E255020711F
        requirement_id: REQ-search-hints-model-pin
        fact_id: FACT-search-hints-model-revision
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: 6fc8051fab2a1e0ee76689cf08c853792ac285e7
---
Proves that the search hints embedding model revision shall be 6fc8051fab2a1e0ee76689cf08c853792ac285e7, against the code Kibi reads at ingest.