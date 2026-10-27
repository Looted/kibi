---
title: 'Source proof: kibi-claude registers its lifecycle hooks'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:43:58.041Z'
id: TEST-proof-claude-lifecycle-hooks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-claude-lifecycle-hooks
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/claude/hooks/hooks.json
    path: /hooks
    select: keys
  proves:
    - CLAIM-CBAE2462F2FAD2EE
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-faa21af629b74c6f05cfe7cd
    test_id: TEST-proof-claude-lifecycle-hooks
    scope: unit
    outcome: passed
    code_snapshot: d2d6cab6dbd3f50aadeb2fd0d2dda459b10875fcef0d6b8408b3f76d0b95066d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:44:45.373Z'
    finished_at: '2026-10-27T07:44:45.563Z'
    artifact_digest: 4ad192451d166889cce98d5d5212969be11110a997b024d64dcf43420a554429
    contract_hash: fead50119030a5b6ae6cbf8062689e4e2e2eec4c00171a93d23792692268e637
    binding_hash: 4c4145f8e7dc3ad8e1eca6a4f49a86577a767fbe135959155924132ffceb81ca
    fingerprint: 05e416552899d98801b9991313b7512e95e9317ed5eef5e66ffb6e00328db6d3
    fingerprint_components:
      contract: fead50119030a5b6ae6cbf8062689e4e2e2eec4c00171a93d23792692268e637
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
      - symbol_id: SYM-proof-claude-lifecycle-hooks
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
      test_id: TEST-proof-claude-lifecycle-hooks
      source:
        reader: json
        file: packages/claude/hooks/hooks.json
        path: /hooks
        select: keys
      model:
        members:
          - MessageDisplay
          - PostToolUse
          - PreToolUse
          - SessionStart
          - Stop
          - UserPromptSubmit
    certificate_digest: 355d5e80d938a0d522402fe7a0a7458511276269ab033908a8bbb7347b8684ce
    claim_bindings:
      - claim_key: CLAIM-CBAE2462F2FAD2EE
        requirement_id: REQ-claude-plugin-package
        fact_id: FACT-claude-lifecycle-hooks
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
Reads the /hooks keys of packages/claude/hooks/hooks.json and checks the five lifecycle events are registered.