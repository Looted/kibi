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
    - CLAIM-C6B00598CAF98FFB
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-448dc6dafeea802aaece67d0
    test_id: TEST-proof-zcode-skills
    scope: unit
    outcome: passed
    code_snapshot: fb035ebe8ad317f96c2ab68de5a7680a017812416249fe122eef3f4de5e136c9
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:28:39.033Z'
    finished_at: '2026-10-27T07:28:39.223Z'
    artifact_digest: 96388d83a06feaee65aaf3fe99eb430ac634c598c3cb6effe86c09f1e7fd8ff8
    contract_hash: 369ff3d6a66a9dd42754799c3c504cf91b53c793991ddc2a82a39be6531de593
    binding_hash: c74ffdd406637d82d946643d258c8076833233875a4de943e0c1abf89d4ff6cd
    fingerprint: ffe5a935e3f633c5c96537a0347c5ca59e05f39f1fa39b231250a3164cd49e2e
    fingerprint_components:
      contract: 369ff3d6a66a9dd42754799c3c504cf91b53c793991ddc2a82a39be6531de593
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
          - kibi-traceability
          - kibi-usage
    certificate_digest: a0881179da575c9033d4fc20565ae2075608fb53cbac7f07125825eb2cd1a8aa
    claim_bindings:
      - claim_key: CLAIM-C6B00598CAF98FFB
        requirement_id: REQ-zcode-plugin-package
        fact_id: FACT-zcode-bundled-skills
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
Proves that kibi-zcode bundles the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills: Kibi lists the skill files itself.