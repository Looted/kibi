---
id: TEST-skill-cli-load-validate
title: CLI skills commands load and validate the kibi-usage bundle
status: passing
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/tests/skills.test.ts
tags:
  - cli
  - skills
  - unit
links:
  - type: validates
    target: SCEN-reusable-skill-subsystem
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-mcp-cli-help
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0963807b8c6f5a4b7e0ab1e4
    test_id: TEST-skill-cli-load-validate
    scope: end_to_end
    outcome: passed
    code_snapshot: afe4717ae26e459eb037598ba07e1baafb1ceaad241abc1180937328992a9d1e
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T10:52:10.091Z'
    finished_at: '2026-11-03T10:54:02.537Z'
    artifact_digest: 7484441db12c16ef721a10b0a45a2839b7ff528c71656d12bcb25c73f30a7c63
    contract_hash: 25aa7403d93d2882485c7bb8fa74e51424ee950fb2d84ca2c2934b794e714271
    binding_hash: 7069efa4551b461241b9acc0b01238fdb7ad99a53c3ddea039bec503f4183d83
    fingerprint: 0c11bca244dfe5c9af2e5c9b8522204ce11d34549d79e7b43ef707e493b7fa3c
    fingerprint_components:
      contract: 25aa7403d93d2882485c7bb8fa74e51424ee950fb2d84ca2c2934b794e714271
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
      - symbol_id: SYM-e2e-test-skill-cli-load-validate
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies listing, loading, resource reading, validation failures, and CLI command handling for bundled reusable skills.
