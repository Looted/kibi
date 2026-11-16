---
title: Bundled skills keep kibi-usage to its core arc, expect .kb staging and teach a write as one call
status: passing
priority: must
tags:
  - skills
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-skills-core-arc
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T16:00:00.000Z'
id: TEST-kibi-skills-core-arc
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c833e4b0c80c00b44ad2b93c
    test_id: TEST-kibi-skills-core-arc
    scope: end_to_end
    outcome: passed
    code_snapshot: 235e8cf9310275794bf38b70bcce53c60ca88ad0f17682441b1f71cd09642aef
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T17:46:04.402Z'
    finished_at: '2026-11-16T17:46:04.833Z'
    artifact_digest: 4d8bc3fa40c984e245a42d2e8c3bd9c78bd20282d1a22807fea18dbb7ec55b1e
    contract_hash: 4a2b2ccb5d837ac53ec2fd646a5c90f453d5683313d4c9cb9941e702aa6cdb55
    binding_hash: 01132197d4ec56fd912ecfdadcc5879419e55679991aaf68a520096a75a3f0f1
    fingerprint: f020535163a1655c39eb2d91679b8b7c601a37a1cc558bcb5dcc214022e23c8b
    fingerprint_components:
      contract: 4a2b2ccb5d837ac53ec2fd646a5c90f453d5683313d4c9cb9941e702aa6cdb55
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
      - symbol_id: SYM-test-skills-core-arc
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Loads the bundled skills through the same loader kb_skills uses and asserts that the kibi-usage body is under 4,500 characters with only the interface and the five arc steps as sections, that it names the six resources the topic sections moved to, that the eval-tuned paragraphs are gone, that kibi-commit-review forbids hand edits of .kb while expecting it to be staged, and that no skill body except kibi-bootstrap teaches a dry run plus read-back as the default write. Entry points: packages/cli/tests/skills-core-arc.test.ts, and scripts/skillopt-eval/tests/queried-before-write.test.ts for the evaluation signal that credits the read before a write instead of a read-back after it. A false pass would need a skill whose prose keeps the ritual in words the patterns do not match.