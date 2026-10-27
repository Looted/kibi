---
title: 'Source proof: kibi-cursor bundles the Kibi skills'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:52:51.299Z'
id: TEST-proof-cursor-skills
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-skills
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/cursor/skills/*/SKILL.md
    capture: true
  proves:
    - CLAIM-930C7BFCB5C43874
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-544470f6b7851b77f34c40d2
    test_id: TEST-proof-cursor-skills
    scope: unit
    outcome: passed
    code_snapshot: 408bad0aae430e34672d3be58afde18487a6a55e7255f14f4c355346f29a8bf1
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:54:14.329Z'
    finished_at: '2026-10-27T07:54:14.493Z'
    artifact_digest: ae078c1eefb0cab28337f6c1c9f961f77db18c3d9b39ea3416f64cf9734cd70c
    contract_hash: e66733657b396b1a5b1bc90f2a6979810131e36bfbb8c81243304a6bd1851d9d
    binding_hash: 0f83ef51453f51df9113846ee82420501f15d9262d5b37f5d4552acf385b2c71
    fingerprint: a838b7748ee647ddade69133d3938684f57e909ae9973a2e8a1a8b9c80d13acf
    fingerprint_components:
      contract: e66733657b396b1a5b1bc90f2a6979810131e36bfbb8c81243304a6bd1851d9d
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
      - symbol_id: SYM-proof-cursor-skills
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
      test_id: TEST-proof-cursor-skills
      source:
        reader: glob
        pattern: packages/cursor/skills/*/SKILL.md
        capture: true
      model:
        members:
          - kibi-bootstrap
          - kibi-commit-review
          - kibi-decisions
          - kibi-freshness
          - kibi-traceability
          - kibi-usage
    certificate_digest: 82b18551718154b88e89e3e9db96d395fc55c732535d3d58f84413160227cc41
    claim_bindings:
      - claim_key: CLAIM-930C7BFCB5C43874
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-bundled-skills
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
Globs packages/cursor/skills/*/SKILL.md.