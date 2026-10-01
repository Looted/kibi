---
title: Spike configuration accepts supported pins and rejects unsafe inputs
status: active
tags:
  - prolog
  - spike
  - build
  - validation
id: SCEN-prolog-spike-config-validation
type: scenario
---
Given the pinned SWI-Prolog source manifest and either phase-one spike target, when the configuration check runs outside GitHub Actions, then it reports the pinned versions and required libraries without creating a native build directory. Given malformed source metadata or an unsupported target, when the same check runs, then it exits with a specific error and does not start a build.