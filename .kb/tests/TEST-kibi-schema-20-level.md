---
title: 'Schema 20: the upgrade keeps the Kibi level and its notes say how to choose remember'
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-schema-20-level
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:25.235Z'
id: TEST-kibi-schema-20-level
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e8f9e610abbd3328353ad242
    test_id: TEST-kibi-schema-20-level
    scope: end_to_end
    outcome: passed
    code_snapshot: b6649d29181ccab088798d2373ba640e85507f701aca154d615cc7f2c4e9cc6f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:21:54.798Z'
    finished_at: '2026-11-25T10:21:54.926Z'
    artifact_digest: aba156a5f61bae4366ba4fae6e669ae7bc92ec90946ac67d280fa98c91afcc12
    contract_hash: 503a78dfbb1323bc2ee95b58aaf1085459dcf705f8db2b804eff6a61e24e92b5
    binding_hash: 095e222dc9d9791c0284165d42889470cee8300fc368dae76d699b4e664fc36a
    fingerprint: 1150e164b079c603e30cfd5ce0ec46b45afa13b2045e54493439a916cea0a109
    fingerprint_components:
      contract: 503a78dfbb1323bc2ee95b58aaf1085459dcf705f8db2b804eff6a61e24e92b5
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
      - symbol_id: SYM-test-kibi-schema-20-level
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/cli/tests/kibi-levels/schema-20.test.ts`. It checks that schema 20 is the latest, that a project setting no level stays at test and the note says how to choose remember in the dry run and the upgrade, and that a project that sets a level keeps it with nothing written.
