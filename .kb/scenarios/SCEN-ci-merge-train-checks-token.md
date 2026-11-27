---
title: A train runs with a fine-grained token and still reads its checks
status: active
expects: success
tags:
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-18T14:19:05.096Z'
id: SCEN-ci-merge-train-checks-token
type: scenario
---
The repository gives the merge train a fine-grained token so its pull requests and pushes start workflows. The train reads the check runs of each boarded pull request with the workflow's own token, which has checks: read, and does everything else with the fine-grained token.