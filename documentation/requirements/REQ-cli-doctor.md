---
id: REQ-cli-doctor
title: Diagnose environment and KB health
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-003
priority: must
tags:
  - cli
  - doctor
links:
  - type: supersedes
    target: REQ-003
---

The `kibi doctor` command runs a series of diagnostic checks to verify that the local environment (SWI-Prolog version, git)
and the project KB setup (.kb directory, config, hooks) are correctly configured and healthy.
It provides actionable remediation steps for failed checks.
