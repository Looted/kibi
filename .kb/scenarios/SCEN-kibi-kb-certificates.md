---
title: A maintainer checks that every knowledge-base verdict re-verifies
status: active
priority: should
tags:
  - proof
  - verify
  - certificates
origin:
  kind: agent
  recorded_at: '2026-10-23T14:07:35.361Z'
id: SCEN-kibi-kb-certificates
type: scenario
---
Given a synced repository whose requirements bound one property with facts that agree, when the maintainer runs kibi verify, then every certificate re-verifies, the property facts read as proved consistent, the run exits 0 and the theorems not certified yet are named. When the maintainer saves the bundle with --write and changes a model value, kibi verify --certificates on that file rejects the certificate, names the fact its value breaks and exits 1. When two more requirements add bounds that only contradict together, so every pair still admits a value, kibi verify reports the property facts as disproved with a contradiction core that lists all four facts and exits 1.