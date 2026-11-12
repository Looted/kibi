---
title: kibi doctor does not tell a routed repository to add the .gitattributes lines again
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T11:47:38.650Z'
id: SCEN-NEG-cli-doctor-merge-driver-remediation
type: scenario
---
Given a Kibi repository whose `.gitattributes` already routes `.kb/symbols.yaml` and the relationship shards to `merge=kibi` while `merge.kibi.driver` is unset, when `kibi doctor` runs, then its merge driver remediation rejects the stale advice to add the lines: it names only the `git config` command, and asks for the lines only while the attribute is missing.

This is the failure side of the merge driver remediation. packages/cli/tests/commands/doctor-merge-driver-hint.test.ts "kibi doctor asks only for the driver command once .gitattributes routes the manifests" exercises it.