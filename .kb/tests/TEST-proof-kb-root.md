---
title: The KB folder shall be .kb, by a regex proof
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
    - symbol_id: SYM-proof-kb-root
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-KB_ROOT
  proves:
    - CLAIM-918401B32051F8C1
origin:
  kind: agent
  recorded_at: '2026-10-28T19:01:09.046Z'
id: TEST-proof-kb-root
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2155c4b8fa73aa5224617276
    test_id: TEST-proof-kb-root
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 64bf1f34501404e6150f58f56d56df001bca96ac21a30bc25b49470e7aecce72
    binding_hash: 33075ff2a492f6aa5ea4467ccf80c33d4b831c73f51b6c2bc73aace017259ef9
    fingerprint: 79eef52eef8cc4cd68c09781d2a6f1e9eb0dab5174d3e05b3386bcea8a7b4bfe
    fingerprint_components:
      contract: 64bf1f34501404e6150f58f56d56df001bca96ac21a30bc25b49470e7aecce72
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
      - symbol_id: SYM-proof-kb-root
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
      test_id: TEST-proof-kb-root
      pattern:
        symbol_id: SYM-canonical-KB_ROOT
        type: string
        value: .kb
    certificate_digest: 9de017b6742c8ee92a8dc11ed0bfa5f338f24394d05bb4da29b5f82a8132e934
    claim_bindings:
      - claim_key: CLAIM-918401B32051F8C1
        requirement_id: REQ-cli-kb-layout-paths
        fact_id: FACT-kb-root
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb
---
Proves that the KB folder shall be .kb, against the code Kibi reads at ingest.