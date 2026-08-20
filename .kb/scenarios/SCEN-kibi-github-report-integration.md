---
id: SCEN-kibi-github-report-integration
title: Validate PR reports and publish canonical Pages reports
status: active
tags:
  - cli
  - github
  - report
  - badge
  - init
links:
  - type: verified_by
    target: TEST-kibi-github-report-integration
type: scenario
---
---
id: SCEN-kibi-github-report-integration
type: scenario
title: Validate PR reports and publish canonical Pages reports
status: active
tags:
  - cli
  - github
  - report
  - badge
  - init
---

# Validate PR reports and publish canonical Pages reports

## Given
- A repository uses the documented Kibi GitHub integration from `kibi-report.yml`

## When
- A developer copies the documented workflow or runs `kibi init --github`
- A pull request runs that workflow
- The repository default branch is pushed, or `workflow_dispatch` is used

## Then
- The repository has a standalone workflow that runs one `kibi report` snapshot
- Pull request runs generate the report, fail if generation fails, and upload `kibi-pr-report` containing the HTML report and badge
- Pull request runs do not deploy GitHub Pages, do not replace the canonical report or badge, and do not receive Pages write permissions
- Only the default branch or intentional `workflow_dispatch` deploys the canonical report and badge under `/kibi-report/`
- The workflow uses `pull_request` with `contents: read`, not `pull_request_target`
