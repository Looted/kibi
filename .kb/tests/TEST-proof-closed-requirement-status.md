---
title: A superseded requirement shall close with status closed, by a regex proof
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
    - symbol_id: SYM-proof-closed-requirement-status
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-closed-requirement-status
  proves:
    - CLAIM-DD9D88701148517A
origin:
  kind: agent
  recorded_at: '2026-10-28T20:33:39.460Z'
id: TEST-proof-closed-requirement-status
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7d119652a3845c8528074c41
    test_id: TEST-proof-closed-requirement-status
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 1c221425b531f2bc0c0476ad8d60bff704b4c2589e857219a0dd90aa517419a4
    binding_hash: 07e55775c4c776d1566de3da1dc32148aaf2e30d97bc0534c8fcf5998e06bab5
    fingerprint: 175884d2a066bed1a9e6f0067c7285b58a88f934174323665f97859d65f1c52c
    fingerprint_components:
      contract: 1c221425b531f2bc0c0476ad8d60bff704b4c2589e857219a0dd90aa517419a4
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
      - symbol_id: SYM-proof-closed-requirement-status
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
      test_id: TEST-proof-closed-requirement-status
      pattern:
        symbol_id: SYM-const-closed-requirement-status
        type: string
        value: closed
    certificate_digest: 226cc6702e08f7acc0681e859ad2e16cf87c46fede5a5276caf9418bf85f790d
    claim_bindings:
      - claim_key: CLAIM-DD9D88701148517A
        requirement_id: REQ-cli-migration-supersession-codes
        fact_id: FACT-closed-requirement-status
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: closed
---
Proves that a superseded requirement shall close with status closed, against the code Kibi reads at ingest.