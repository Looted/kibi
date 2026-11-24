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
    receipt_id: PR-027e67903b4901f15ff0ef89
    test_id: TEST-proof-zcode-skills
    scope: unit
    outcome: passed
    code_snapshot: 9386eaa53daa10f81157166c388a39229b4b1a7e1a8c41b588be3f34652fcf8e
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-23T18:35:16.423Z'
    finished_at: '2026-11-23T18:35:16.656Z'
    artifact_digest: ae3e8d2a71f4a574090583d6f90a64959fcf5d27f5b4db44f6531d82d5dcdf1d
    contract_hash: 671f35db56ead6718517b9bff00103f92122f3c82fcc40b6b8c07da4dd569d86
    binding_hash: 009e9f50b018b2c2ac56e8ef10e87b36854e8378aabe76aaafd363ee6a2c8eb7
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
        requirement_id: REQ-zcode-plugin-package-v2
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