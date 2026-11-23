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
    receipt_id: PR-d5ad077fa7c9a52915fed29b
    test_id: TEST-proof-perf-timings-env
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 5a42fe1cc979c5a66f590c042bb2473396252833a6e3567b5e7310ea3665605c
    binding_hash: 75aa7bb6b4ad8f12b43e0a3f31fc58c4f25dadcf29c5f3b05347afa197fcd516
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