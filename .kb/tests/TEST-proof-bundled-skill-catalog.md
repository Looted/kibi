---
title: 'Source proof: the canonical Kibi skill set is exactly the seven bundled skills'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-bundled-skill-catalog
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/cli/src/public/skills/*/SKILL.md
    capture: true
  proves:
    - CLAIM-37BA35FF6FA44A96
origin:
  kind: agent
  recorded_at: '2026-11-03T10:48:37.121Z'
id: TEST-proof-bundled-skill-catalog
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f3a382607c1ade2ab67097f9
    test_id: TEST-proof-bundled-skill-catalog
    scope: unit
    outcome: passed
    code_snapshot: 88c2873a38c9e4ea633f3ff0eacfb92e6e29c64fa0f3cc023471f8c6fc0964af
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T10:50:40.337Z'
    finished_at: '2026-11-03T10:50:40.533Z'
    artifact_digest: 5f09296e93a8fcdb724e288fd9849ce4dc2619b461939cdeccb9785032bdd799
    contract_hash: cf2a6810c9bc560df214ad492a2e00f0285bc94f66fdf18389140e72efd05930
    binding_hash: 27dd12009914dc7410ef50c0ccd36848b8af8c922023a8cebabf3ee9064f11fb
    fingerprint: 5c44b09789e7bafbe8b44c6981170230675318d446fe4137897ad59d456bf730
    fingerprint_components:
      contract: cf2a6810c9bc560df214ad492a2e00f0285bc94f66fdf18389140e72efd05930
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
      - symbol_id: SYM-proof-bundled-skill-catalog
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
      test_id: TEST-proof-bundled-skill-catalog
      source:
        reader: glob
        pattern: packages/cli/src/public/skills/*/SKILL.md
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
    certificate_digest: 97b82b3c8ce1d0f635d0487fdee3f857ea7959c420d1c729c5ef554359d38799
    claim_bindings:
      - claim_key: CLAIM-37BA35FF6FA44A96
        requirement_id: REQ-kibi-bundled-skill-catalog
        fact_id: FACT-kibi-bundled-skill-catalog
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
Proves that the canonical skill folders the CLI ships are exactly the seven named skills, against the folders Kibi reads at ingest.