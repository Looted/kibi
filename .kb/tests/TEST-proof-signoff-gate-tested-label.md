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
    receipt_id: PR-87cdbe756acc9c96c89425ba
    test_id: TEST-proof-signoff-gate-tested-label
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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