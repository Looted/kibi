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
    receipt_id: PR-3d10ed352df65a09134c390e
    test_id: TEST-proof-engine-idle-check
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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