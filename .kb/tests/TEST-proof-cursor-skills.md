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
    receipt_id: PR-129850064792fe31b8a722da
    test_id: TEST-proof-cursor-skills
    scope: unit
    outcome: passed
    code_snapshot: 88c2873a38c9e4ea633f3ff0eacfb92e6e29c64fa0f3cc023471f8c6fc0964af
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T10:50:55.375Z'
    finished_at: '2026-11-03T10:50:55.560Z'
    artifact_digest: 184f1cfa244087bbf3e403dc570b9e5d36e39e63f4b5a4dca82dba252ca2eac9
    contract_hash: d297e25add6ba7da7e6eb8ca26c129a8781858280f2f7abdcae6befae19c3db0
    binding_hash: 543bcfaae1e064690cbc12f9c08e7769e1b989ef4d3888e5e637706cc02d9fa7
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
