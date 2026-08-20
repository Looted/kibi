---
id: TEST-ci-workflow-checkout-contract
title: CI packed jobs stay artifact-only behind coverage gates
status: passing
created_at: 2026-04-21T17:11:22.000Z
updated_at: 2026-05-13T00:00:00.000Z
source: documentation/tests/TEST-ci-workflow-checkout-contract.md
tags:
  - ci
  - workflow
  - e2e
  - artifacts
  - test
links:
  - FACT-CI-GATING
type: test
---

Contract tests that assert packed CI regression jobs run from downloaded artifacts without performing a repository checkout, while still waiting on both JavaScript and Prolog coverage gates. The tests validate `build-and-test` keeps unit coverage mandatory on pull requests and pushes, and that packed jobs continue consuming the tarball artifacts emitted upstream.
