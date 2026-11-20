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
    - CLAIM-E0972AB25D5495E5
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9e4bfe3feb78444b5f389b5d
    test_id: TEST-proof-cursor-skills
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d297e25add6ba7da7e6eb8ca26c129a8781858280f2f7abdcae6befae19c3db0
    binding_hash: 8ae0eb76d7bc8462c8f66579d33450fc14c1f091d84e39185e1ef473a8b65ed1
    fingerprint: 559ea900f47933053727d359e47966bb4f07bcf6c74b19013d9b0d2554760a74
    fingerprint_components:
      contract: d297e25add6ba7da7e6eb8ca26c129a8781858280f2f7abdcae6befae19c3db0
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
          - kibi-provable-code
          - kibi-traceability
          - kibi-usage
    certificate_digest: 8ad8c9884208316c41cd9401a56217f8f8e26ea4224efe7230656de7a4ccf415
    claim_bindings:
      - claim_key: CLAIM-E0972AB25D5495E5
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-bundled-skills
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
Globs packages/cursor/skills/*/SKILL.md. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
