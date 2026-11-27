---
title: Proof runs shall be stored under .kb/proof/runs, by a regex proof
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
    - symbol_id: SYM-proof-proof-runs-dir
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-proof-runs-dir
  proves:
    - CLAIM-0432EB217242A518
origin:
  kind: agent
  recorded_at: '2026-10-28T17:49:48.629Z'
id: TEST-proof-proof-runs-dir
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9dd56040c671e0682ea2490b
    test_id: TEST-proof-proof-runs-dir
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: f283d3f0c3e4a17c3b15a928092f5ca616957618b584320e14700b21ed5ee5db
    binding_hash: b306878dd07d320c7029295301fb5e256c29d4cc9af134a98de72c62f63d7b68
    fingerprint: 0a3c562b733e76094da88c04142560c20c5f7ef8746dffcfbeb725d3398f1d78
    fingerprint_components:
      contract: f283d3f0c3e4a17c3b15a928092f5ca616957618b584320e14700b21ed5ee5db
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
      - symbol_id: SYM-proof-proof-runs-dir
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
      test_id: TEST-proof-proof-runs-dir
      pattern:
        symbol_id: SYM-proof-runs-dir
        type: string
        value: .kb/proof/runs
    certificate_digest: 62cb3818daa60f4eef17587cf2cd33882fcac43243e31d0abb9832c24752a2ad
    claim_bindings:
      - claim_key: CLAIM-0432EB217242A518
        requirement_id: REQ-kibi-proof-producers-and-storage
        fact_id: FACT-proof-runs-dir
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/proof/runs
---
Proves that proof runs shall be stored under .kb/proof/runs, against the code Kibi reads at ingest.