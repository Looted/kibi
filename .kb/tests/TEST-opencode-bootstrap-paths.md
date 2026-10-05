---
title: OpenCode bootstrap path behavior for canonical .kb/ layout
status: active
tags:
  - opencode
  - kibi
  - test
  - e2e
  - bootstrap
verification_scope: end_to_end
id: TEST-opencode-bootstrap-paths
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-opencode-bootstrap-paths
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-785e77a0865286b98a2e0bc3
    test_id: TEST-opencode-bootstrap-paths
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 5d316fb9fee3e78a7c0e2de08e4edb9de52181b030888114e619ffc08e06f75c
    binding_hash: af1e3bf846d19b7738c38024265aa158501b204bedd437c53497d2ae505d6609
    fingerprint: 042bd112ac5878de71c7ae58c79b901b3ee168519613fd2fae11dbc0933486e4
    fingerprint_components:
      contract: 5d316fb9fee3e78a7c0e2de08e4edb9de52181b030888114e619ffc08e06f75c
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
      - symbol_id: SYM-test-opencode-bootstrap-paths
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies the packed kibi-opencode plugin's bootstrap path behavior against the canonical .kb/ layout through an isolated npm install of the real tarball.

Executable coverage: `documentation/tests/e2e/packed/opencode-bootstrap-paths.test.ts` — a healthy canonical .kb/ layout (all lanes plus manifest.json) must not emit a bootstrap warning, while a lifecycle manifest whose canonical targets are missing must nudge the agent toward `kibi init` and the canonical bootstrap flow.