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
    receipt_id: PR-917f3e07368efd46e2389a04
    test_id: TEST-proof-codex-lifecycle-hooks
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
