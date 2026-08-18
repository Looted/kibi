# GitHub badge + report

Publish a continuously updated Kibi requirement-health report on GitHub Pages,
with a clickable `% proven` badge in the repository README.

Badge and report are one feature. Someone who sees `87% proven` needs to open
the report to see what that percentage represents and which requirements are
missing proof. Kibi does not host badges or reports; GitHub Pages is the
expected publisher. Knowledge stays in the repository's `.kb/` directory.

The root [README](../README.md) is the discoverable entry point. This document
covers the same integration in more detail.

## What the badge means

A badge such as `kibi | 87% proven` is the share of **applicable current**
Kibi requirements that have current proof. Non-current (for example superseded)
requirements are excluded, as are requirements marked not applicable to proof.

The published HTML report is the place to inspect:

- which requirements are proven
- which are missing proof
- contradictions
- stale verification state
- other requirement-health details already exposed by `kibi report`

The badge and `index.html` always come from **one** `kibi report` coverage
snapshot. Do not compute a separate GitHub-only percentage.

## Recommended flow: badge + full report

### 1. Enable GitHub Pages

In GitHub:

```text
Settings → Pages → Source → GitHub Actions
```

This is the only expected GitHub UI step. Kibi does not change repository
settings for you.

### 2. Add the Kibi workflow

Copy the canonical workflow to:

```text
.github/workflows/kibi-report.yml
```

The file to copy is
[docs/examples/github/kibi-report.yml](examples/github/kibi-report.yml). It is
byte-identical to the template shipped in `kibi-cli`.

The workflow:

1. checks out the repository
2. sets up Node.js
3. installs SWI-Prolog
4. installs project dependencies with npm
5. runs `kibi sync`
6. runs `kibi report --output kibi-report`
7. copies that output under `pages/kibi-report/` so the public path is `/kibi-report/`
8. uploads `pages` as a GitHub Pages artifact
9. deploys it to GitHub Pages

It runs on the repository **default branch** (it does not assume the branch is
named `main`) and on `workflow_dispatch`. It does not build or test the rest of
the application, does not commit generated files, and does not use an orphan
`gh-pages` branch.

### 3. Add the clickable badge

```markdown
[![Kibi requirement health](https://OWNER.github.io/REPOSITORY/kibi-report/badge.svg)](https://OWNER.github.io/REPOSITORY/kibi-report/)
```

Replace `OWNER` and `REPOSITORY` with the lowercase GitHub Pages owner and
repository path. Clicking the badge must open the report. Files are published
under `/kibi-report/` so Kibi does not occupy the Pages site root.

This workflow still **replaces** the GitHub Pages deployment. If the repository
already publishes a site, copy `kibi-report/` into that site's output instead
of using this workflow as the only deploy.

### Expected URLs

| Repository | Report | Badge |
| --- | --- | --- |
| `OWNER/REPOSITORY` | `https://OWNER.github.io/REPOSITORY/kibi-report/` | `https://OWNER.github.io/REPOSITORY/kibi-report/badge.svg` |
| `OWNER/OWNER.github.io` (owner site) | `https://OWNER.github.io/kibi-report/` | `https://OWNER.github.io/kibi-report/badge.svg` |

The image URL must be anonymously reachable for GitHub to render it in a public
README. For a private report, publish both files to an authenticated static
host that your intended audience can access. GitHub Actions artifacts expire
and are not a stable badge URL.

Do not commit generated `kibi-report/` files.

## CLI shortcut

`kibi init --github` performs normal `kibi init` behavior, then scaffolds the
**same** documented integration:

```bash
kibi init --github
```

It:

- writes `.github/workflows/kibi-report.yml` from the packaged template
- adds the clickable badge to an existing root README when a github.com remote
  can be determined
- adds `kibi-report/` to `.gitignore` when missing
- prints the Pages enable instruction

It is safe to run more than once. Matching workflows are left as already
configured. Customized workflows are **not** overwritten. An existing Kibi
badge is not duplicated. If no README exists, the workflow is still written and
the badge Markdown is printed. If owner/repository cannot be determined from a
github.com remote, the workflow is still written and placeholder badge Markdown
is printed instead of inventing a URL.

## Package-manager adaptations

The canonical workflow uses npm because that matches the documented Kibi
install (`npm install --save-dev kibi-cli ...` and `npm exec -- kibi`).

Change **only** the Node setup cache and the install/exec commands:

**pnpm**

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: 24
    cache: pnpm
- run: pnpm install --frozen-lockfile
- run: pnpm exec kibi sync
- run: pnpm exec kibi report --output kibi-report
```

Install the pnpm action (`pnpm/action-setup`) before `setup-node` if the runner
does not already have pnpm.

**Yarn**

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: 24
    cache: yarn
- run: yarn install --frozen-lockfile
- run: yarn kibi sync
- run: yarn kibi report --output kibi-report
```

**Bun**

```yaml
- uses: oven-sh/setup-bun@v2
- run: bun install --frozen-lockfile
- run: bunx kibi sync
- run: bunx kibi report --output kibi-report
```

Keep `kibi-cli` as a project dependency so CI uses the version the repository
pinned. Do not add application `build` or `test` steps just to generate the
report.

## Badge-only opt-out

Prefer the full report. To publish only the badge:

```bash
kibi init --github --badge-only
```

Or copy [docs/examples/github/kibi-badge.yml](examples/github/kibi-badge.yml) to
`.github/workflows/kibi-badge.yml`.

That workflow still runs `kibi report` (same snapshot, same `% proven`) and
then publishes only `badge.svg`. The README link should point at this section
rather than pretending a report exists:

```markdown
[![Kibi requirement health](https://OWNER.github.io/REPOSITORY/kibi-report/badge.svg)](https://github.com/Looted/kibi/blob/develop/docs/github-integration.md#what-the-badge-means)
```

`--badge-only` without `--github` is rejected. `--github` by itself always
means badge + full report.

## Troubleshooting

**The workflow succeeds but `https://OWNER.github.io/REPOSITORY/kibi-report/` is 404.**
Enable **Settings → Pages → Source → GitHub Actions**. Until that is set,
Pages deployments do not go live. The report is not at the Pages site root.

**The badge image is a broken picture in the README.**
The SVG URL must be anonymously reachable. Private Pages sites will not render
in public READMEs. Confirm `/kibi-report/badge.svg` loads in a logged-out browser.

**The workflow is skipped on every push.**
Report jobs run on `workflow_dispatch` or the repository **default** branch.
Pushes to other branches start the workflow and then skip the jobs. Change the
GitHub default branch, or use **Run workflow** for a one-off publish.

**`kibi: command not found` or `npm exec -- kibi` fails.**
Install `kibi-cli` as a project dependency and commit the lockfile. The
workflow does not install Kibi globally.

**`swipl: command not found`.**
The workflow installs `swi-prolog` with `apt-get` on `ubuntu-latest`. Kibi
requires SWI-Prolog 9.0+. If the runner image is older, install from the
[SWI-Prolog PPA](https://github.com/Looted/kibi/blob/develop/docs/install.md)
instead.

**Pages published the wrong site / two Kibi workflows.**
A repository can host one Pages site. Keep either `kibi-report.yml` or
`kibi-badge.yml`, not both.

**`kibi init --github` did not overwrite my workflow.**
If `.github/workflows/kibi-report.yml` already exists and differs from the
template, Kibi leaves it in place. Compare it with
[docs/examples/github/kibi-report.yml](examples/github/kibi-report.yml).

**Owner/repository could not be determined.**
`kibi init --github` only parses `github.com` remotes (HTTPS or SSH). GitHub
Enterprise hosts are not auto-filled. The workflow is still written; paste the
printed badge Markdown after replacing `OWNER`/`REPOSITORY`.
