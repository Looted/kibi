---
title: An outside contributor's pull request runs the CLA check, and the contributor signs by comment
status: active
text_ref: .github/workflows/cla.yml
tags:
  - governance
  - contributing
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-25T06:08:19.781Z'
id: SCEN-contributions-require-cla
type: scenario
expects: success
---
Given a pull request to the Kibi repository from someone other than the maintainer account or a bot, when the pull request is opened or updated, then the CLA workflow runs the CLA check from the base branch without checking out the pull request's code, and the check fails until the author signs. When the author comments exactly the CLA sign sentence shown in CONTRIBUTING.md and CLA.md, the workflow records the signature in signatures/cla.json on the cla-signatures branch and the check passes. A recheck comment runs the check again. Pull requests from the maintainer account or a bot are not asked to sign.

## Context

The maintainer opened Kibi to outside contributions on 2026-11-25 under the Kibi CLA, so that Kibi can still be relicensed or sold as a whole.