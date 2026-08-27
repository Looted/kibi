---
id: SCEN-release-automation
title: Changesets release automation is verified before publishing
status: passing
created_at: 2026-05-29T19:40:00Z
updated_at: 2026-05-29T19:40:00Z
source: documentation/scenarios/SCEN-release-automation.md
tags:
  - release
  - automation
  - changesets
links:
  - type: verified_by
    target: TEST-014
---

# Scenario: Release automation is verified before publishing

Given Kibi packages are prepared for release through Changesets
When release automation checks package versions, changelogs, and npm publication state
Then the release workflow uses local fixtureable npm state for tests and publishes only through the automated release path.
