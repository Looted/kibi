---
title: A requirement marked accepted shall be migrated as open, by a regex proof
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
    - symbol_id: SYM-proof-legacy-status-accepted
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-suggested-requirement-status
    export: SUGGESTED_REQUIREMENT_STATUS.accepted
  proves:
    - CLAIM-2A2859E538262E84
origin:
  kind: agent
  recorded_at: '2026-10-29T10:40:21.169Z'
id: TEST-proof-legacy-status-accepted
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dae8f3f1fd1eb8ea3481abec
    test_id: TEST-proof-legacy-status-accepted
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: f1e870cf865c3a3691463be1d5223b49402d85a72cf9239bfbda67d0df91799f
    binding_hash: 7b45feb8f5bf7d070bbd3f16016991ccb0afee65a86350e8fecbc2f8cf305053
    fingerprint: 6c553df101dbe74e33e42f70f688244e1d577352a4aaba55559b7a31467dc127
    fingerprint_components:
      contract: f1e870cf865c3a3691463be1d5223b49402d85a72cf9239bfbda67d0df91799f
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
      - symbol_id: SYM-proof-legacy-status-accepted
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
      test_id: TEST-proof-legacy-status-accepted
      pattern:
        symbol_id: SYM-migration-suggested-requirement-status
        type: string
        value: open
    certificate_digest: fc39353e653a30cccabae26bf74ba32cb071c650c3ca61eeb7603add857efa00
    claim_bindings:
      - claim_key: CLAIM-2A2859E538262E84
        requirement_id: REQ-cli-migration-suggested-status
        fact_id: FACT-legacy-status-accepted
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: open
---
Proves that a requirement marked accepted shall be migrated as open, against the code Kibi reads at ingest.