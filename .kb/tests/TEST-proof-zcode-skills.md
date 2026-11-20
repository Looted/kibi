---
title: The kibi-zcode plugin bundles the Kibi skills, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:27:34.435Z'
id: TEST-proof-zcode-skills
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-zcode-skills
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/zcode/skills/*/SKILL.md
    capture: true
  proves:
    - CLAIM-5982BDE99889016F
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a40618e2a9eb4629d80e563f
    test_id: TEST-proof-zcode-skills
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 671f35db56ead6718517b9bff00103f92122f3c82fcc40b6b8c07da4dd569d86
    binding_hash: dda4d1d862ff39d4d23eaf7a9e223921a556b9eaabb8d4927fb784968fd14895
    fingerprint: 86a0d5d29fc515eca0fa6f0c2d7473caf051a9c8ba564d839a926a0fa0553c2d
    fingerprint_components:
      contract: 671f35db56ead6718517b9bff00103f92122f3c82fcc40b6b8c07da4dd569d86
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
      - symbol_id: SYM-proof-zcode-skills
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
      test_id: TEST-proof-zcode-skills
      source:
        reader: glob
        pattern: packages/zcode/skills/*/SKILL.md
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
    certificate_digest: 4379a2298003c01e3e8d5f5ed894a8d15ab7623f17c7201f1d75635dad3d27dc
    claim_bindings:
      - claim_key: CLAIM-5982BDE99889016F
        requirement_id: REQ-zcode-plugin-package
        fact_id: FACT-zcode-bundled-skills
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
Proves that kibi-zcode bundles the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills: Kibi lists the skill files itself.