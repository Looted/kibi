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
    - CLAIM-8AE72DEF7EF73CAE
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-27c0117a86288a8ea4243955
    test_id: TEST-proof-cursor-agent-plugin-skills
    scope: unit
    outcome: passed
    code_snapshot: 88c2873a38c9e4ea633f3ff0eacfb92e6e29c64fa0f3cc023471f8c6fc0964af
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T10:50:59.857Z'
    finished_at: '2026-11-03T10:51:00.054Z'
    artifact_digest: 12f2f44d5041dddfb5d635996cad38865f2374d97ec52cc0d3c9e5a993f0f551
    contract_hash: 8950e3bda8c3c1d133d700112ac874f1cef145fdb478aebb4067aefe90712f14
    binding_hash: 30fed8462ae1d732398b18618d40be442002d3fe2fe0eb8325bdf4be40fee344
    fingerprint: e0cfcddd9e2c4a19be6e6283e54897287355abf9528769e5e3322e4b4e9177d6
    fingerprint_components:
      contract: 8950e3bda8c3c1d133d700112ac874f1cef145fdb478aebb4067aefe90712f14
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
          - kibi-provable-code
          - kibi-traceability
          - kibi-usage
    certificate_digest: 4f3d12e775654014ec24e70f5f982dc47d869f66f351e06f875e08092cea425c
    claim_bindings:
      - claim_key: CLAIM-8AE72DEF7EF73CAE
        requirement_id: REQ-cursor-agent-plugin-package
        fact_id: FACT-agent-plugin-skills
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
Globs packages/cursor/agent-plugin/skills/*/SKILL.md. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
