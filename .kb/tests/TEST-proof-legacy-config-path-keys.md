---
title: A legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-legacy-config-path-keys
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-canonical-LEGACY_CONFIG_PATH_KEYS
  proves:
    - CLAIM-8AED0D5240EEEB02
origin:
  kind: agent
  recorded_at: '2026-10-28T22:34:00.704Z'
id: TEST-proof-legacy-config-path-keys
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f085b8dde0691ebf97c78ff1
    test_id: TEST-proof-legacy-config-path-keys
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 74ca604df2e9ac181717111c577d13e4f2da2b721d6cc02df8151a4f381c1755
    binding_hash: d5178978924a90042294c5975369fb88c5077af8604121eeb7a0e48d94a78ad8
    fingerprint: d23c6d4427b5cc04651f069ddb12da194a4632a295b650cf84e58b7a7b5ba76d
    fingerprint_components:
      contract: 74ca604df2e9ac181717111c577d13e4f2da2b721d6cc02df8151a4f381c1755
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
      - symbol_id: SYM-proof-legacy-config-path-keys
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-legacy-config-path-keys
      domain:
        symbol_id: SYM-canonical-LEGACY_CONFIG_PATH_KEYS
        members:
          - requirements
          - scenarios
          - tests
          - facts
          - adr
          - flags
          - events
      results:
        - member: requirements
          outcome: passed
        - member: scenarios
          outcome: passed
        - member: tests
          outcome: passed
        - member: facts
          outcome: passed
        - member: adr
          outcome: passed
        - member: flags
          outcome: passed
        - member: events
          outcome: passed
    certificate_digest: e5d84595fce0e606a873fd4e616d8c5daa8732e8bb6bd7ac8ba8c10a0712e05a
    claim_bindings:
      - claim_key: CLAIM-8AED0D5240EEEB02
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-legacy-config-path-keys
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - adr
            - events
            - facts
            - flags
            - requirements
            - scenarios
            - tests
---
Proves that a legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events, against the code Kibi reads at ingest.