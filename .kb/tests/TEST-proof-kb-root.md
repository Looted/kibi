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
    receipt_id: PR-d05791eb48e0c97b2219fcc4
    test_id: TEST-proof-kb-root
    scope: unit
    outcome: passed
    code_snapshot: 5d36459f22881f6c22e3bac5ea8974c74bd15e1de4958b06df142b9e5eb07350
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:03:12.314Z'
    finished_at: '2026-10-28T19:03:12.437Z'
    artifact_digest: 219a50ba94f730f4c6cbd9b0443aba2b5715bf66047717d2c6917c04d2f4e844
    contract_hash: 64bf1f34501404e6150f58f56d56df001bca96ac21a30bc25b49470e7aecce72
    binding_hash: 4b19973b6ef18230be52a58a5aed0d5181ae68e2cc57d7d0394b5061b27c4b05
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