---
title: The canonical Kibi knowledge lanes shall be requirements, scenarios, tests, facts, adr, flags and events, by an exhaustive proof
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
    - symbol_id: SYM-proof-canonical-kb-lanes
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-canonical-ENTITY_LANES
  proves:
    - CLAIM-F0379E1995819F07
origin:
  kind: agent
  recorded_at: '2026-10-28T10:10:16.420Z'
id: TEST-proof-canonical-kb-lanes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-464e6e566831c927ffe3ec1a
    test_id: TEST-proof-canonical-kb-lanes
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: ad504b02dedc8d0f16b5fd7c60769cdaab3e2a0787eb457bb59932f2dc4e5518
    binding_hash: d8c4dd03845f551ff6a00efe5e800cad9159517c30bc31861a17670fd50c4df6
    fingerprint: 2f3dfc5262eedfbd4f134b54ea2b6add201461f2444135a9a45d55863d836326
    fingerprint_components:
      contract: ad504b02dedc8d0f16b5fd7c60769cdaab3e2a0787eb457bb59932f2dc4e5518
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
      - symbol_id: SYM-proof-canonical-kb-lanes
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
      test_id: TEST-proof-canonical-kb-lanes
      domain:
        symbol_id: SYM-canonical-ENTITY_LANES
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
    certificate_digest: 6cdf5f91ebb551982fa4baacab70432ea2ba198698cee63ef84fdb4a312602f6
    claim_bindings:
      - claim_key: CLAIM-F0379E1995819F07
        requirement_id: REQ-cli-canonical-kb-lanes
        fact_id: FACT-canonical-kb-lanes
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
Proves that the canonical Kibi knowledge lanes shall be requirements, scenarios, tests, facts, adr, flags and events, against the code Kibi reads at ingest.