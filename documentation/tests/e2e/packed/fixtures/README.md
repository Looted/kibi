# Tarball Fixtures

This directory contains tarball artifacts preserved for regression testing.

- `kibi-mcp-0.13.0.tgz` — Regression fixture for stale-path upgrade tests.
  This is NOT a publishable package.

## Usage

These fixtures are used by e2e tests that verify upgrade-path behavior.
They are intentionally committed to the repository so the tests remain
reproducible across CI and local environments.

## Caution

Do NOT treat these as publishable release artifacts. The `*.tgz` pattern
in `.gitignore` excludes tarballs by default; the negation rule
(`!documentation/tests/e2e/packed/fixtures/*.tgz`) explicitly permits only
the fixture directory.
