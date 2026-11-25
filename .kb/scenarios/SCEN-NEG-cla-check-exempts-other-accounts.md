---
title: The CLA allowlist exempts an outside account
status: active
expects: rejection
tags:
  - negative-path
text_ref: .github/workflows/cla.yml
origin:
  kind: agent
  recorded_at: '2026-11-25T06:12:17.063Z'
id: SCEN-NEG-cla-check-exempts-other-accounts
type: scenario
---
Given the CLA workflow's allowlist names an account other than the maintainer account or a bot pattern, the CLA workflow contract rejects the workflow, because that account could merge contributions without signing the Kibi CLA.