---
title: 'Source proof: kibi-codex registers its lifecycle hooks'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:49:15.254Z'
id: TEST-proof-codex-lifecycle-hooks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-codex-lifecycle-hooks
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/codex/hooks/hooks.json
    path: /hooks
    select: keys
  proves:
    - CLAIM-EEAA3048360DABE2
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e9dce6a43565b23ecbb2fb62
    test_id: TEST-proof-codex-lifecycle-hooks
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 76f6e92edd548f73405ce709f28b87181fe4c39d9354a83d8f4e58a373736e7a
    binding_hash: 8c482020cb368f4edd0b3c8c5be8e7ad58f6a7b72cb1572428462259c91aa3b9
    fingerprint: 6002fe1fdd26f9a53f6876fda27569e29838599efa4b886e1789e19a946146bc
    fingerprint_components:
      contract: 76f6e92edd548f73405ce709f28b87181fe4c39d9354a83d8f4e58a373736e7a
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
      - symbol_id: SYM-proof-codex-lifecycle-hooks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-codex-lifecycle-hooks
      source:
        reader: json
        file: packages/codex/hooks/hooks.json
        path: /hooks
        select: keys
      model:
        members:
          - PostToolUse
          - PreToolUse
          - SessionStart
          - Stop
          - UserPromptSubmit
    certificate_digest: b4b29f457828ab8781db0a4502205477147e1148f055bc820aed5f9210261d42
    claim_bindings:
      - claim_key: CLAIM-EEAA3048360DABE2
        requirement_id: REQ-codex-plugin-package
        fact_id: FACT-codex-lifecycle-hooks
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - PostToolUse
            - PreToolUse
            - SessionStart
            - Stop
            - UserPromptSubmit
          operator: includes
---
Reads the hook event names under /hooks in packages/codex/hooks/hooks.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
