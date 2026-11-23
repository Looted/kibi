---
title: The signoff label of the tested gate shall be tested, by a regex proof
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
    - symbol_id: SYM-proof-signoff-gate-tested-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-gate-labels
    export: SIGNOFF_GATE_LABELS.tested
  proves:
    - CLAIM-0FCFFD753F3EB91E
origin:
  kind: agent
  recorded_at: '2026-10-28T22:23:55.743Z'
id: TEST-proof-signoff-gate-tested-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2a255ff0cdad9654f93927d9
    test_id: TEST-proof-signoff-gate-tested-label
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: cfa8df7a7d68e78d602c9dd4cd40dd83d804ee2199c56abb2dcd95f1e3cfc825
    binding_hash: 708fe6d073cbae89dd274ca5cf0dbd1ae1fc59403c971b3a0809cd03b2f07ab0
    fingerprint: d762344dce7ca678514ff5be9c1821e0f6d41abce1cdc0ee49d3d1d92d982e39
    fingerprint_components:
      contract: cfa8df7a7d68e78d602c9dd4cd40dd83d804ee2199c56abb2dcd95f1e3cfc825
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
      - symbol_id: SYM-proof-signoff-gate-tested-label
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
      test_id: TEST-proof-signoff-gate-tested-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-gate-labels
        type: string
        value: tested
    certificate_digest: ac4ea0e3351f290d0c5eb14b93e52ef2604483810e2c213597424b117fb7bd5e
    claim_bindings:
      - claim_key: CLAIM-0FCFFD753F3EB91E
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-gate-tested-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: tested
---
Proves that the signoff label of the tested gate shall be tested, against the code Kibi reads at ingest.