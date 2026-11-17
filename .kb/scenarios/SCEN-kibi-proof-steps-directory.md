---
title: Two branches each add a proof-bearing test without touching the same steps file
status: active
priority: must
expects: success
tags:
  - proof
origin:
  kind: agent
  recorded_at: '2026-11-16T07:29:35.137Z'
id: SCEN-kibi-proof-steps-directory
type: scenario
---
Given a project with a proof/steps directory, when one branch adds proof/steps/TEST-a.json and another adds proof/steps/TEST-b.json, then both merge without a conflict, and kibi proof run-steps reads both tests' steps. A project without the directory keeps reading proof/steps.json. A project that has both the directory and proof/steps.json is refused with a message naming both, instead of running only the directory's tests; dotfiles and entries that are not regular *.json files in the directory are not step files.