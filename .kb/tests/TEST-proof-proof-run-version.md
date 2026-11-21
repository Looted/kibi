---
title: The proof run version shall be kibi.proof-run.v1, by a regex proof
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
    - symbol_id: SYM-proof-proof-run-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-proof-run-version
  proves:
    - CLAIM-BC55CA4697B8540B
origin:
  kind: agent
  recorded_at: '2026-10-28T10:54:49.228Z'
id: TEST-proof-proof-run-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9daa6376f2df15b25be8659f
    test_id: TEST-proof-proof-run-version
    scope: unit
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: c1e675af355feb87f904dae15b1efd6238ca009ff4cf032a59cc60f2dff4c655
    binding_hash: fb1301e0ba6ac47d08ddebcf886d471d76ce30a9a73375c8d6cab5c49304725f
    fingerprint: 5a990ddb4e5a7589f4a4f8054eccede6636c9dd82dc25e72c366be8cb9854e7d
    fingerprint_components:
      contract: c1e675af355feb87f904dae15b1efd6238ca009ff4cf032a59cc60f2dff4c655
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
      - symbol_id: SYM-proof-proof-run-version
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
      test_id: TEST-proof-proof-run-version
      pattern:
        symbol_id: SYM-proof-run-version
        type: string
        value: kibi.proof-run.v1
    certificate_digest: d7c9b9b250c53d5ca4165434892ce5342a37d946d490e5e91b525fc90747eebf
    claim_bindings:
      - claim_key: CLAIM-BC55CA4697B8540B
        requirement_id: REQ-kibi-proof-protocol-versions
        fact_id: FACT-proof-run-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-run.v1
---
Proves that the proof run version shall be kibi.proof-run.v1, against the code Kibi reads at ingest.