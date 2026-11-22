---
title: The GitHub Pages report folder shall be kibi-report, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-github-pages-namespace
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-github-pages-namespace
  proves:
    - CLAIM-084B49566DFE62A9
origin:
  kind: agent
  recorded_at: '2026-10-29T10:19:17.951Z'
id: TEST-proof-github-pages-namespace
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-06ae5cff87bdd0c4b865c348
    test_id: TEST-proof-github-pages-namespace
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: f16db48cbd8b5ecac2c28a068a6423ae123e9131701623900113aa2750b5f3b3
    binding_hash: 39f48c0d21e0912c165726c6bbeb8ef7d5444678a8d03c22f7b0103058063495
    fingerprint: 47c047102730fef3ed59ffa3ba0f00eb6c101944b15cd67fa0bae534db35ad56
    fingerprint_components:
      contract: f16db48cbd8b5ecac2c28a068a6423ae123e9131701623900113aa2750b5f3b3
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
      - symbol_id: SYM-proof-github-pages-namespace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-github-pages-namespace
      pattern:
        symbol_id: SYM-cli-github-pages-namespace
        type: string
        value: kibi-report
    certificate_digest: 22c18da1b40ef0a479f0c5fbde52b42234a3bcd888122e19fd9689d127badbfe
    claim_bindings:
      - claim_key: CLAIM-084B49566DFE62A9
        requirement_id: REQ-kibi-github-report-settings
        fact_id: FACT-github-pages-namespace
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi-report
---
Proves that the GitHub Pages report folder shall be kibi-report, against the code Kibi reads at ingest.