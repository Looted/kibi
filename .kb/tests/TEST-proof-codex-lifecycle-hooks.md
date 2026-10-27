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
    receipt_id: PR-b375e1c199a93d5059c148d0
    test_id: TEST-proof-codex-lifecycle-hooks
    scope: unit
    outcome: passed
    code_snapshot: 328fc65d0a8f68d784d40380e03d82ed697fd6e20aa7eac41f724a6c4fd7718a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:50:04.018Z'
    finished_at: '2026-10-27T07:50:04.201Z'
    artifact_digest: 6371badbc1e3e4a55801969689daa889a1685b0a683bf3c14d70923a2cb9d362
    contract_hash: 76f6e92edd548f73405ce709f28b87181fe4c39d9354a83d8f4e58a373736e7a
    binding_hash: 32395b0516c8fe2036ce1bc39cf59fb682fd251aec7a8ea05b90acd7aad030e0
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
        scope: code
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
Reads the hook event names under /hooks in packages/codex/hooks/hooks.json.