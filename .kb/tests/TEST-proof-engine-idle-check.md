---
title: The engine daemon shall check for idleness every 30000 milliseconds, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-engine-idle-check
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-engine-idle-check-interval-ms
  proves:
    - CLAIM-6F3C9F99EC24CC90
origin:
  kind: agent
  recorded_at: '2026-10-28T20:46:04.853Z'
id: TEST-proof-engine-idle-check
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-59b9eef1aa57b9d6e5e79dc7
    test_id: TEST-proof-engine-idle-check
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: da90902d3df85e9aab168f829db4f7e85c39836639cb230bffa3177e07132f28
    binding_hash: fdf9b25d846b045ff9c6ef5496c49feb1dc6e684bdc7f0699759833d65401ab7
    fingerprint: b581078dd9c71e105c5232741c53d5f9b28c9c6acd0b4397dd19fa422689c6c3
    fingerprint_components:
      contract: da90902d3df85e9aab168f829db4f7e85c39836639cb230bffa3177e07132f28
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
      - symbol_id: SYM-proof-engine-idle-check
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-engine-idle-check
      variable: idle_check_ms
      value_type: int
      assumptions:
        - operator: eq
          value: 30000
      claim:
        operator: eq
        value: 30000
    certificate_digest: 373aab635c8561341e7cd70da77566899c702d23a6d6f7d446974b6fe6866c69
    claim_bindings:
      - claim_key: CLAIM-6F3C9F99EC24CC90
        requirement_id: REQ-engine-timing-settings
        fact_id: FACT-engine-idle-check
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 30000
          value_type: int
          variable: idle_check_ms
---
Proves that the engine daemon shall check for idleness every 30000 milliseconds, against the code Kibi reads at ingest.