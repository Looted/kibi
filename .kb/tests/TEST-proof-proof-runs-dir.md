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
    receipt_id: PR-1839ddd4e0954c95c6a5dd82
    test_id: TEST-proof-proof-runs-dir
    scope: unit
    outcome: passed
    code_snapshot: 687a75b3c57bd11cbd5b1b79fcfa7589e153fe88b2edd678594f1eb4f347fdda
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:11:44.143Z'
    finished_at: '2026-11-16T11:13:25.311Z'
    artifact_digest: f79044ea9b4e1d539c65f539f226328db9b08c254176cc9b90d70a7f30e8803c
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