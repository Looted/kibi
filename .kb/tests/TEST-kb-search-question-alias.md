---
title: kb_search question alias tests
status: passing
priority: must
tags:
  - mcp
  - validation
  - search
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-26T11:04:09.512Z'
id: TEST-kb-search-question-alias
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-input-aliases
      target: default
    - symbol_id: SYM-test-mcp-input-aliases
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6df8f33920671ab2acb0b367
    test_id: TEST-kb-search-question-alias
    scope: end_to_end
    outcome: passed
    code_snapshot: 2a237bf35caf6d414ce68aee8ca482a053ffcefecef5273fb7e15a04584e587f
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-26T11:08:07.704Z'
    finished_at: '2026-11-26T11:08:08.377Z'
    artifact_digest: e7891afef34c62cb7a917573f6a56b0f67102a1e2c15e9ec6d03460aafb79446
    contract_hash: f9efdcfeb3e69cea98080833d11192f1b10af46ca705044511bc1d0a7835d80f
    binding_hash: f7cffe2011760f21070636bac263d5d931920f11fd981dd8dada069068591685
    fingerprint: f7ebb10846f9d3e596814659606a78421746ff599ccddd9fc73c3f444a9d7812
    fingerprint_components:
      contract: f9efdcfeb3e69cea98080833d11192f1b10af46ca705044511bc1d0a7835d80f
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
      - symbol_id: SYM-test-cli-input-aliases
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-mcp-input-aliases
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `packages/cli/tests/operations/input-aliases.test.ts`, which checks that the CLI input preparation renames a declared alias to its field only when the field is absent and given under one name, that kb_search validates and runs a question as its query, refuses a question beside a query, and does not advertise question; and `packages/mcp/tests/server/input-aliases.test.ts`, which calls the MCP kb_search wrapper with a question and checks that the operation receives it as query, and that a question beside a query is refused with VALIDATION_FAILED.