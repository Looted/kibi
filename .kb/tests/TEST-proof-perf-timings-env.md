---
title: The performance timings environment variable shall be KIBI_PERF_TIMINGS, by a regex proof
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
    - symbol_id: SYM-proof-perf-timings-env
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-performance-timings-env
  proves:
    - CLAIM-6BEEB64FC7E70756
origin:
  kind: agent
  recorded_at: '2026-10-28T17:35:55.748Z'
id: TEST-proof-perf-timings-env
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ee3e5eeee1b7a153b9f627b4
    test_id: TEST-proof-perf-timings-env
    scope: unit
    outcome: passed
    code_snapshot: c93413e20f2fbe933ea3d5bde3572c88e748564b4d879a842927b272b519ce50
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:39:46.544Z'
    finished_at: '2026-10-28T17:39:46.690Z'
    artifact_digest: b36bb44c13dc6bbca3bbbe603e716dd177d95a8e849549fa75b971df84cfa25d
    contract_hash: 5a42fe1cc979c5a66f590c042bb2473396252833a6e3567b5e7310ea3665605c
    binding_hash: 5247183eccff54770ba8b83a819411e6f119801c53aa6b8969cc54fca1d38053
    fingerprint: bbf34f8baf6cdc747ad0678e1b44321a29126145b417a93f51b3f19ae30d52c8
    fingerprint_components:
      contract: 5a42fe1cc979c5a66f590c042bb2473396252833a6e3567b5e7310ea3665605c
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
      - symbol_id: SYM-proof-perf-timings-env
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
      test_id: TEST-proof-perf-timings-env
      pattern:
        symbol_id: SYM-performance-timings-env
        type: string
        value: KIBI_PERF_TIMINGS
    certificate_digest: 73068cc996109d7768e7cd8a2ad06cc0ebfbc63281cf98f60e7583882d6371c5
    claim_bindings:
      - claim_key: CLAIM-6BEEB64FC7E70756
        requirement_id: REQ-kibi-perf-trace-limits
        fact_id: FACT-perf-timings-env
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: KIBI_PERF_TIMINGS
---
Proves that the performance timings environment variable shall be KIBI_PERF_TIMINGS, against the code Kibi reads at ingest.