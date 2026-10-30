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
    receipt_id: PR-25c4c35a632c372c1f736d82
    test_id: TEST-proof-proof-runs-dir
    scope: unit
    outcome: passed
    code_snapshot: 17256581582f43d83f66f4d6a118fecad7fcd8180df991d47ca9887713e21e82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:52:41.734Z'
    finished_at: '2026-10-28T17:52:41.880Z'
    artifact_digest: 426f12e542a0c705a376037440d07ba3a6e258c5f3644f40918b8271821d7861
    contract_hash: f283d3f0c3e4a17c3b15a928092f5ca616957618b584320e14700b21ed5ee5db
    binding_hash: 2ed6c64475843a04afa79a42e8d7a6da2940bc2f02b68f4db347a7bf54895b3c
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
        requirement_id: REQ-kibi-proof-run-vocabulary
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