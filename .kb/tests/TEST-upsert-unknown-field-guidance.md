---
title: Upsert unknown field guidance and skill example tests
status: passing
priority: must
tags:
  - upsert
  - validation
  - skills
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-upsert-unknown-field-guidance
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T12:28:27.437Z'
id: TEST-upsert-unknown-field-guidance
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7471fd5af3edf7c245dfbf23
    test_id: TEST-upsert-unknown-field-guidance
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 96b7873c19c7fbe6a61930662f30584de2e4ba6457a823495417caa8b93a0f65
    binding_hash: 253d14d62c93b8fbb933b7215395d70725e1e7f104aafc7cfb461aedfdcde89e
    fingerprint: 025fb1466a1df834b05cc084557c3048895e51a5fcc62a1fecf00adcce5c1fed
    fingerprint_components:
      contract: 96b7873c19c7fbe6a61930662f30584de2e4ba6457a823495417caa8b93a0f65
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
      - symbol_id: SYM-test-upsert-unknown-field-guidance
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the real upsert validator on scenarios and requirements with prose and non-prose unknown properties and checks the error names each one and the document.body hint appears only for prose keys; it then reads the scenario example from the kibi-bootstrap SKILL.md, validates it as an upsert and checks its body passes the entity context rule (packages/cli/tests/operations/upsert-unknown-property-guidance.test.ts).

A false pass would be a test using its own copy of the example; the suite parses the skill file.