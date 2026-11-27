---
title: 'Source proof: kibi-claude bundles the Kibi skills'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:43:37.379Z'
id: TEST-proof-claude-skills
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-claude-skills
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/claude/skills/*/SKILL.md
    capture: true
  proves:
    - CLAIM-356FB1F64A34B134
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-749234528f71a9661911a4bd
    test_id: TEST-proof-claude-skills
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 40c835539a953fdbd23c4de684c81dd4d28a6f6f5590710c44ec8b6d06636671
    binding_hash: 68ce7a72b7e3d91e47b0504bebfcc1ec456ed17a800ccf9ef704e77251f78b08
    fingerprint: 143a3addd3eee08d39aa3e5341a5a1c093e7c3b4da07e8b737d6788e3d9c4d43
    fingerprint_components:
      contract: 40c835539a953fdbd23c4de684c81dd4d28a6f6f5590710c44ec8b6d06636671
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
      - symbol_id: SYM-proof-claude-skills
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
      test_id: TEST-proof-claude-skills
      source:
        reader: glob
        pattern: packages/claude/skills/*/SKILL.md
        capture: true
      model:
        members:
          - kibi-bootstrap
          - kibi-commit-review
          - kibi-decisions
          - kibi-freshness
          - kibi-provable-code
          - kibi-traceability
          - kibi-usage
    certificate_digest: 9278be8e606335c618e3dcb4b50b09d6748507a6da0f5e94d3a9bd828c97c663
    claim_bindings:
      - claim_key: CLAIM-356FB1F64A34B134
        requirement_id: REQ-claude-plugin-package
        fact_id: FACT-claude-bundled-skills
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-bootstrap
            - kibi-commit-review
            - kibi-decisions
            - kibi-freshness
            - kibi-provable-code
            - kibi-traceability
            - kibi-usage
          operator: eq
---
Globs packages/claude/skills/*/SKILL.md and checks the six skill names are present.