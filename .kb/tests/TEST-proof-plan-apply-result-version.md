---
title: The plan apply result version shall be kibi.plan-apply-result.v1, by a regex proof
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
    - symbol_id: SYM-proof-plan-apply-result-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-kibi-cli-src-operations-planning-apply-plan-ts-plan-apply-result-version
  proves:
    - CLAIM-3CBF895C02EDE2BB
origin:
  kind: agent
  recorded_at: '2026-10-28T17:45:41.302Z'
id: TEST-proof-plan-apply-result-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b9dfc6f305cd1b16fcebfe58
    test_id: TEST-proof-plan-apply-result-version
    scope: unit
    outcome: passed
    code_snapshot: 56eee1707caa78737f9751c722c36d97d6b93523f57a8b6aef7f7bcada87ac9a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:46:50.095Z'
    finished_at: '2026-10-28T17:46:50.277Z'
    artifact_digest: dee662e7ef614595544af7b146c3341e0855513391b88c6730a4e5bd5011197e
    contract_hash: 09d884ebf78eba8f4bc661a48759f1749ffd2e93db6085e0789b6dd5be5a8342
    binding_hash: ec42ed43e4a89158d0874eddfd21a21f6ddd95fb9610813c58268cde8f7b1f5a
    fingerprint: df93d4a531deab2fe4ff3b408d75f2cae2abefeff445e3ab7d4cd3d7be5f0a7c
    fingerprint_components:
      contract: 09d884ebf78eba8f4bc661a48759f1749ffd2e93db6085e0789b6dd5be5a8342
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
      - symbol_id: SYM-proof-plan-apply-result-version
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
      test_id: TEST-proof-plan-apply-result-version
      pattern:
        symbol_id: SYM-kibi-cli-src-operations-planning-apply-plan-ts-plan-apply-result-version
        type: string
        value: kibi.plan-apply-result.v1
    certificate_digest: 5cc1f057a2ed9369176b11b11ce523576ad887f004adb6842c149c54c7bd97f4
    claim_bindings:
      - claim_key: CLAIM-3CBF895C02EDE2BB
        requirement_id: REQ-kibi-plan-document-versions
        fact_id: FACT-plan-apply-result-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.plan-apply-result.v1
---
Proves that the plan apply result version shall be kibi.plan-apply-result.v1, against the code Kibi reads at ingest.