---
title: A CI environment variable that silences telemetry shall be one of the 18 names the CI list holds, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-telemetry-ci-env-keys
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-ci-env-keys
  proves:
    - CLAIM-EBC3527C431863A3
origin:
  kind: agent
  recorded_at: '2026-10-29T16:27:53.669Z'
id: TEST-proof-telemetry-ci-env-keys
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5a564c348271ba657551ad75
    test_id: TEST-proof-telemetry-ci-env-keys
    scope: unit
    outcome: passed
    code_snapshot: ec09c5c8360bc62374cc96794ed302e6b74770738cb7481a3617e21f01ce4a15
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:29:28.296Z'
    finished_at: '2026-10-29T16:29:28.441Z'
    artifact_digest: 73b172912698854fa9913dd198581eece79941b78cd2d9458e6a87cb15d9c206
    contract_hash: cc821cde2e9d9f62677c101fa5e67a384eb04ee6948786ecb927a7c9fdeda763
    binding_hash: 7365c82b3cbcbf3549597ada2637aedee1bfc00c2d0f611e7e6f558a52a83cb8
    fingerprint: aac8ce6495506c2f330557a50efc4d1a6d2814fc8e181a8d08fe5de702398b3c
    fingerprint_components:
      contract: cc821cde2e9d9f62677c101fa5e67a384eb04ee6948786ecb927a7c9fdeda763
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
      - symbol_id: SYM-proof-telemetry-ci-env-keys
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-telemetry-ci-env-keys
      domain:
        symbol_id: SYM-const-ci-env-keys
        members:
          - CI
          - CONTINUOUS_INTEGRATION
          - GITHUB_ACTIONS
          - GITLAB_CI
          - BUILDKITE
          - CIRCLECI
          - TRAVIS
          - TF_BUILD
          - JENKINS_URL
          - TEAMCITY_VERSION
          - BITBUCKET_BUILD_NUMBER
          - CODEBUILD_BUILD_ID
          - DRONE
          - APPVEYOR
          - SEMAPHORE
          - BUILDKITE_BUILD_ID
          - CF_BUILD_ID
          - HEROKU_TEST_RUN_ID
      results:
        - member: CI
          outcome: passed
        - member: CONTINUOUS_INTEGRATION
          outcome: passed
        - member: GITHUB_ACTIONS
          outcome: passed
        - member: GITLAB_CI
          outcome: passed
        - member: BUILDKITE
          outcome: passed
        - member: CIRCLECI
          outcome: passed
        - member: TRAVIS
          outcome: passed
        - member: TF_BUILD
          outcome: passed
        - member: JENKINS_URL
          outcome: passed
        - member: TEAMCITY_VERSION
          outcome: passed
        - member: BITBUCKET_BUILD_NUMBER
          outcome: passed
        - member: CODEBUILD_BUILD_ID
          outcome: passed
        - member: DRONE
          outcome: passed
        - member: APPVEYOR
          outcome: passed
        - member: SEMAPHORE
          outcome: passed
        - member: BUILDKITE_BUILD_ID
          outcome: passed
        - member: CF_BUILD_ID
          outcome: passed
        - member: HEROKU_TEST_RUN_ID
          outcome: passed
    certificate_digest: a21ef32951247e369ee707051cc904ac2fff6abc5488313134f36a2bd674ccbf
    claim_bindings:
      - claim_key: CLAIM-EBC3527C431863A3
        requirement_id: REQ-kibi-telemetry-automation-keys
        fact_id: FACT-telemetry-ci-env-keys
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - APPVEYOR
            - BITBUCKET_BUILD_NUMBER
            - BUILDKITE
            - BUILDKITE_BUILD_ID
            - CF_BUILD_ID
            - CI
            - CIRCLECI
            - CODEBUILD_BUILD_ID
            - CONTINUOUS_INTEGRATION
            - DRONE
            - GITHUB_ACTIONS
            - GITLAB_CI
            - HEROKU_TEST_RUN_ID
            - JENKINS_URL
            - SEMAPHORE
            - TEAMCITY_VERSION
            - TF_BUILD
            - TRAVIS
---
Proves that a CI environment variable that silences telemetry shall be one of the 18 names the CI list holds, against the code Kibi reads at ingest.