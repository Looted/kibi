---
title: 'Source proof: kibi-codex bundles the Kibi skills'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:49:05.400Z'
id: TEST-proof-codex-skills
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-codex-skills
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/codex/skills/*/SKILL.md
    capture: true
  proves:
    - CLAIM-3C03F93E59BE963F
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1dd0ec39b31f6ce20349acd5
    test_id: TEST-proof-codex-skills
    scope: unit
    outcome: passed
    code_snapshot: 88c2873a38c9e4ea633f3ff0eacfb92e6e29c64fa0f3cc023471f8c6fc0964af
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T10:50:50.125Z'
    finished_at: '2026-11-03T10:50:50.346Z'
    artifact_digest: 2f1fad614724a700336e9aa118ccd7a1fa5f2c5c2103beac5e4f8dc654d5b1ee
    contract_hash: 12d8554dc021d85eae53c2b7bb5c82e94024a60f425408ab61d248b65dbbfd91
    binding_hash: 2b1d61fd91861328ed10660603d630277636facf9ff4d35a14eedaba0a30c61f
    fingerprint: 46f041ca04a8be8226856a0dbfb0b541d9dab4b372eea5e46bfa723e42058cea
    fingerprint_components:
      contract: 12d8554dc021d85eae53c2b7bb5c82e94024a60f425408ab61d248b65dbbfd91
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
      - symbol_id: SYM-proof-codex-skills
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
      test_id: TEST-proof-codex-skills
      source:
        reader: glob
        pattern: packages/codex/skills/*/SKILL.md
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
    certificate_digest: 5ed5b843dbf09b970e99deb2d135de4aba9e04165e7ce46c146c6b119213cde1
    claim_bindings:
      - claim_key: CLAIM-3C03F93E59BE963F
        requirement_id: REQ-codex-plugin-package
        fact_id: FACT-codex-bundled-skills
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
Globs packages/codex/skills/*/SKILL.md and checks the six skill names are present.