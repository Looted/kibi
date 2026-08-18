---
id: SCEN-kibi-github-report-integration
title: Publish Kibi requirement health on GitHub Pages
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

Given a GitHub repository with Kibi installed as a project dependency
When a developer copies the documented Kibi GitHub Actions workflow or runs `kibi init --github`
Then the repository has a standalone Pages workflow that runs `kibi report` and publishes both `index.html` and `badge.svg` under `/kibi-report/`
And the README badge image is the generated SVG and the badge link opens the report
And repeating the CLI scaffold does not overwrite a customized workflow or add a second Kibi badge
And `kibi init --badge-only` without `--github` is rejected
