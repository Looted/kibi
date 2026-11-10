---
title: kibi doctor asks only for the driver command once .gitattributes routes the manifests
status: active
origin:
  kind: agent
  recorded_at: '2026-11-05T11:47:37.405Z'
id: SCEN-cli-doctor-merge-driver-remediation
type: scenario
---
Steps:

1. In a Kibi repository with symbol records, a pnpm lockfile, no `merge=kibi` lines and no `merge.kibi.driver`, run `kibi doctor`: the "Manifest merge driver" warning names both gaps and its remediation names the two `.gitattributes` lines and then `git config merge.kibi.driver "pnpm exec kibi merge-driver %O %A %B"`.
2. Add both lines to `.gitattributes` and run `kibi doctor` again: the warning names only the unset driver, and the remediation is `Run: git config merge.kibi.driver ...` without any `.gitattributes` step.
3. Set the driver and run `kibi doctor` again: the check reports "Configured".