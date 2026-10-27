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
    - CLAIM-5B36379ABF96C3FD
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0a7a151404ea42a14a035270
    test_id: TEST-proof-claude-skills
    scope: unit
    outcome: passed
    code_snapshot: d2d6cab6dbd3f50aadeb2fd0d2dda459b10875fcef0d6b8408b3f76d0b95066d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:44:26.753Z'
    finished_at: '2026-10-27T07:44:26.907Z'
    artifact_digest: dc9a7a5418a55d88e7887f1bf2e843a4e5ef183b71ac9bc8dcd6b464071373b3
    contract_hash: bbb9e3e8c7268852f51aa53f671981cd11d1d18d43088bebbd0af0ac9aa4094e
    binding_hash: 89a580e56cb563af73611635c20d4d8c4d5b6b816edbebc4f25805a93d361569
    fingerprint: c81dbfa044d1d596c98efc3f2da2a676954fef0c63bb795d7cc69d6187eee0e9
    fingerprint_components:
      contract: bbb9e3e8c7268852f51aa53f671981cd11d1d18d43088bebbd0af0ac9aa4094e
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
          - kibi-traceability
          - kibi-usage
    certificate_digest: 7cf186990b0e463f1c0fc3cd0dbafa2b3a18a63a3eec78dd45b1abc2af47fce6
    claim_bindings:
      - claim_key: CLAIM-5B36379ABF96C3FD
        requirement_id: REQ-claude-plugin-package
        fact_id: FACT-claude-bundled-skills
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
Globs packages/claude/skills/*/SKILL.md and checks the six skill names are present.