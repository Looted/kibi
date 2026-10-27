---
title: 'Source proof: the portable artifact packages the Kibi skills'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:57:40.257Z'
id: TEST-proof-cursor-agent-plugin-skills
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-agent-plugin-skills
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/cursor/agent-plugin/skills/*/SKILL.md
    capture: true
  proves:
    - CLAIM-C57C6B8C72A91DE0
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0d0d24f40283fa91228fb18c
    test_id: TEST-proof-cursor-agent-plugin-skills
    scope: unit
    outcome: passed
    code_snapshot: e54c836d045ddc66e5300f74cfaff528e05df36605bd9587408dc179d35908ca
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:58:40.259Z'
    finished_at: '2026-10-27T07:58:40.453Z'
    artifact_digest: 7fe29f05598b6f67ed41b1a29feb08385fb9b9e6d35710ecc6b69b3166f5280e
    contract_hash: a28ab9d12cd9cd68b77a216990adfaf8ac6c402427b611fe404113e1fb950442
    binding_hash: 6c29702bf97d9a95417501dd51dc97cd7ab1fef1e35f047d86253120d17f388f
    fingerprint: 9b6f8479f67be976e971925803c118ca702ff3aadf7890ac552670165f5ae7a4
    fingerprint_components:
      contract: a28ab9d12cd9cd68b77a216990adfaf8ac6c402427b611fe404113e1fb950442
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
      - symbol_id: SYM-proof-cursor-agent-plugin-skills
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
      test_id: TEST-proof-cursor-agent-plugin-skills
      source:
        reader: glob
        pattern: packages/cursor/agent-plugin/skills/*/SKILL.md
        capture: true
      model:
        members:
          - kibi-bootstrap
          - kibi-commit-review
          - kibi-decisions
          - kibi-freshness
          - kibi-traceability
          - kibi-usage
    certificate_digest: fc8a4428e585cac198750e04c09a1b55be8462377be1203a65decdf95d8e376f
    claim_bindings:
      - claim_key: CLAIM-C57C6B8C72A91DE0
        requirement_id: REQ-cursor-agent-plugin-package
        fact_id: FACT-agent-plugin-skills
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
Globs packages/cursor/agent-plugin/skills/*/SKILL.md. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
