---
id: TEST-ci-workflow-checkout-contract
title: CI packed jobs run from artifacts without checkout
status: passing
created_at: 2026-04-21T17:11:22Z
updated_at: 2026-04-21T17:11:22Z
source: documentation/tests/TEST-ci-workflow-checkout-contract.md
tags:
  - ci
  - workflow
  - e2e
  - artifacts
  - test
links:
  - FACT-CI-GATING
  - FACT-ci-artifact-only-packed-jobs
---

Contract tests that assert packed CI regression jobs run from downloaded artifacts without performing a repository checkout. The tests simulate `actions/download-artifact` output and validate `kibi` packed jobs can install and execute from those tarballs.
