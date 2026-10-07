---
title: Upsert unknown field guidance and skill example tests
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9a4d28905fae0d8cec5968a8
    test_id: TEST-upsert-unknown-field-guidance
    scope: end_to_end
    outcome: passed
    code_snapshot: cc8892f6b26a6bce333fed4ab83d38c5adac2b6948a74264981d91f29d4edfb0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-07T12:46:03.733Z'
    finished_at: '2026-10-07T12:46:04.080Z'
    artifact_digest: 3916fb7019ecbe69d756b92ecac3f71532f1822a1ab15b21ba84b3a8d27e1a98
    contract_hash: 96b7873c19c7fbe6a61930662f30584de2e4ba6457a823495417caa8b93a0f65
    binding_hash: 8ab9c5313b4fe2a3974068954a03e0d4a8e7bc810542567187ab60e32de9117f
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
---
Runs the real upsert validator on scenarios and requirements with prose and non-prose unknown properties and checks the error names each one and the document.body hint appears only for prose keys; it then reads the scenario example from the kibi-bootstrap SKILL.md, validates it as an upsert and checks its body passes the entity context rule (packages/cli/tests/operations/upsert-unknown-property-guidance.test.ts).

A false pass would be a test using its own copy of the example; the suite parses the skill file.