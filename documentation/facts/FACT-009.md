---
 - deployment
 - github-actions
 - npm
 - ci-cd
id: FACT-009
title: GitHub Actions workflow handles npm publishing
status: active
created_at: 2026-02-25T15:50:00Z
updated_at: 2026-04-21T00:00:00Z
source: documentation/facts/FACT-009.md
tags:
  - deployment
  - github-actions
  - npm
  - ci-cd
fact_kind: observation
---

The GitHub Actions workflow `.github/workflows/publish.yml` is organized into four cooperating phases aimed at minimising CI clone traffic while preserving source-backed verification where needed:

1. Shallow checkout for source-backed release jobs (`check-release`, `build-and-check`, `release-gate`, `create-github-releases`) — these jobs perform minimal git clones with `fetch-depth: 1` to obtain the single commit they need without the full repository history.

2. Build, package, and upload in `build-and-check` — this job builds the monorepo packages, runs test matrices and packed/e2e checks, then uploads package tarballs and VSIX artifacts as job artifacts.

3. Artifact-only npm publish in `publish` — the `publish` job is artifact-driven and does not perform a git checkout. It downloads the package tarballs uploaded by `build-and-check` and publishes them with `npm publish --provenance --access public`. npm publish uses GitHub Actions OIDC and environment metadata; a checked-out git working tree is not required.

4. Source-backed GitHub release creation in `create-github-releases` — this job performs a shallow checkout (`fetch-depth: 1`) pinned to `refs/heads/master` to read `package.json` and `CHANGELOG.md` for each package and create annotated GitHub releases.

The workflow uses npm for publishing (not bun) to ensure compatibility with npm registry requirements. Published packages use the `--provenance --access public` flags for package integrity.
