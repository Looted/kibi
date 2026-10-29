---
title: A CI environment variable that silences telemetry shall be one of the 18 names the CI list holds
status: active
fact_kind: property_value
subject_key: kibi.telemetry.automation_keys
claim_key: CLAIM-EBC3527C431863A3
claim_text: A CI environment variable that silences telemetry shall be one of the 18 names the CI list holds
text_ref: REQ-kibi-telemetry-automation-keys
property_key: ci_env_keys
operator: eq
value_type: set
value_set:
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
origin:
  kind: agent
  recorded_at: '2026-10-29T16:26:47.291Z'
id: FACT-telemetry-ci-env-keys
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.