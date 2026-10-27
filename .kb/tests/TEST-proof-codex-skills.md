---
title: 'Source proof: kibi-codex bundles the Kibi skills'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:49:05.400Z'
id: TEST-proof-codex-skills
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-codex-skills
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/codex/skills/*/SKILL.md
    capture: true
  proves:
    - CLAIM-D7E2340FFABCF26E
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c569bc3d8bbf0e8e29afd313
    test_id: TEST-proof-codex-skills
    scope: unit
    outcome: passed
    code_snapshot: 328fc65d0a8f68d784d40380e03d82ed697fd6e20aa7eac41f724a6c4fd7718a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:49:54.798Z'
    finished_at: '2026-10-27T07:49:54.960Z'
    artifact_digest: f0f8478a46a78fbc9741381d80168562b785399b8f1d4059213e487fdae3bdc5
    contract_hash: 789c4b08854a64e5fddfb82d69aa916ac06b11d3c72df9d2a6223190a04b1107
    binding_hash: 7257f82d08d40d5250ef5a381a045d7045d9a20449ec2f5e98339dbcadaccba1
    fingerprint: 51e64f63d35e1aa5db201c8bc943d80b259291a194893694f7fc552275ac79ae
    fingerprint_components:
      contract: 789c4b08854a64e5fddfb82d69aa916ac06b11d3c72df9d2a6223190a04b1107
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
      - symbol_id: SYM-proof-codex-skills
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
      test_id: TEST-proof-codex-skills
      source:
        reader: glob
        pattern: packages/codex/skills/*/SKILL.md
        capture: true
      model:
        members:
          - kibi-bootstrap
          - kibi-commit-review
          - kibi-decisions
          - kibi-freshness
          - kibi-traceability
          - kibi-usage
    certificate_digest: 22d6c848a61019be127b2ee8355ef75cf0fb5495ba8013aa3596489402084f5e
    claim_bindings:
      - claim_key: CLAIM-D7E2340FFABCF26E
        requirement_id: REQ-codex-plugin-package
        fact_id: FACT-codex-bundled-skills
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - kibi-bootstrap
            - kibi-commit-review
            - kibi-decisions
            - kibi-freshness
            - kibi-traceability
            - kibi-usage
          operator: includes
---
Globs packages/codex/skills/*/SKILL.md and checks the six skill names are present.