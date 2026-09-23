---
title: Env bootstrap precedence and import-free doctor diagnostics
status: active
tags:
  - env
  - bootstrap
  - doctor
id: SCEN-kibi-env-bootstrap
type: scenario
---
# SCEN-kibi-env-bootstrap

Given a harness cwd that differs from `KIBI_WORKSPACE`, when `kibi doctor` runs capability-plugin diagnostics, it reads `package.json` and env files from the resolved workspace and reports secret sources from the actual bootstrap attribution without importing plugin packages.

Given process env and project `.env.kibi` both define a secret, doctor reports `process` and the runtime value remains the process value.

Given a blank project env entry over a user value, the user value remains and is not cleared.
