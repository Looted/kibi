# GitHub badge + report

Publish a continuously updated Kibi requirement-health report on GitHub Pages,
with a clickable `% tested` badge in the repository README.

Badge and report are one feature. Someone who sees `87% tested` needs to open
the report to see what that percentage represents and which requirements are
missing proof. Kibi does not host badges or reports; GitHub Pages is the
expected publisher. Knowledge stays in the repository's `.kb/` directory.

## What the badge means

A badge such as `kibi | 87% tested` is the share of **applicable current**
Kibi requirements that have current proof. Non-current (for example superseded)
requirements are excluded, as are requirements marked not applicable to proof.

The published HTML report is the place to inspect:

- which requirements are tested end to end
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

One `build-report` job generates the report. Pull requests validate that
generation and upload the candidate site as an ordinary workflow artifact.
Only the repository **default branch** (it does not assume the branch is named
`main`) and `workflow_dispatch` may deploy GitHub Pages. A `pull_request` event
never deploys Pages, never replaces the canonical report or badge, and never
receives `pages: write` or `id-token: write`. The workflow uses `pull_request`,
not `pull_request_target`, with repository-level `contents: read`. GitHub
Actions checkouts are detached, so the workflow sets `KIBI_BRANCH` to the
pull-request head ref or the pushed/dispatched branch name before `kibi sync`
and `kibi report`.

The generate job:

1. checks out the candidate GitHub Actions ref (the PR merge commit on pull
   requests, otherwise the pushed or dispatched commit)
2. sets up Node.js
3. installs project dependencies with npm (SWI-Prolog arrives with them as the
   bundled `kibi-swipl-linux-x64-gnu` package, so there is no separate install
   step)
4. runs `kibi sync`
5. runs `kibi report --output kibi-report` (the job fails if this fails)
6. on `pull_request`, uploads the `kibi-report/` directory as the
   `kibi-pr-report` artifact (HTML report plus badge)
7. on the default branch or `workflow_dispatch`, copies that output under
   `pages/kibi-report/` so the public path is `/kibi-report/` and uploads it as
   a GitHub Pages artifact

The `deploy-report` job then deploys that Pages artifact. It does not run for
pull requests. Pushes to non-default branches start the workflow and skip both
jobs. The workflow does not build or test the rest of the application, does not
commit generated files, and does not use an orphan `gh-pages` branch.

### 3. Add the clickable badge

```markdown
[![Kibi requirement health](https://OWNER.github.io/REPOSITORY/kibi-report/badge.svg)](https://OWNER.github.io/REPOSITORY/kibi-report/)
```

Replace `OWNER` with the repository owner (lower case is fine, since the
`*.github.io` host is case-insensitive) and `REPOSITORY` with the repository name
exactly as GitHub spells it. The project-site path is case-sensitive, so
`MyRepo` and `myrepo` are different URLs. Clicking the badge must open the
report. Files are published under `/kibi-report/` so Kibi does not occupy the
Pages site root.

This workflow still **replaces** the GitHub Pages deployment. If the repository
already publishes a site, copy `kibi-report/` into that site's output instead
of using this workflow as the only deploy.

### Expected URLs

| Repository | Report | Badge |
| --- | --- | --- |
| `OWNER/REPOSITORY` | `https://OWNER.github.io/REPOSITORY/kibi-report/` | `https://OWNER.github.io/REPOSITORY/kibi-report/badge.svg` |
| `Owner/MyRepo` (mixed case) | `https://owner.github.io/MyRepo/kibi-report/` | `https://owner.github.io/MyRepo/kibi-report/badge.svg` |
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

That workflow still runs `kibi report` (same snapshot, same `% tested`). Pull
requests upload the generated report directory as `kibi-pr-report` and still
do not deploy Pages. Default-branch and `workflow_dispatch` publishes only
`badge.svg` under `/kibi-report/`. The README link should point at this section
rather than pretending a report exists:

```markdown
[![Kibi requirement health](https://OWNER.github.io/REPOSITORY/kibi-report/badge.svg)](https://looted.github.io/kibi/guide/github-integration.html#what-the-badge-means)
```

`--badge-only` without `--github` is rejected. `--github` by itself always
means badge + full report.

## Merge conflicts in Kibi manifests

Two branches that each add symbols both append to the end of
`.kb/symbols.yaml` (and sometimes to the same `.kb/relationships/*.yaml`
shard), so Git reports a conflict even though the additions are independent.
`kibi merge-driver` is a Git merge driver that merges these manifests by
record id instead of by line:

- records added on either side are kept (ours first, then theirs)
- an edit made on only one side wins over the unchanged other side
- a deletion on one side is kept when the other side left the record unchanged
- relationships and links that both sides added to one symbol are unioned
- anything else both sides changed differently (for example two different
  `status` values) is a real conflict: the driver names it, leaves ordinary
  conflict markers, and exits non-zero so the file stays unmerged

`.kb/symbol-coordinates.yaml` is a gitignored local cache derived by every
`kibi sync`, so it never takes part in a merge.

### Locally

Declare the driver in the repository's `.gitattributes`:

```text
.kb/symbols.yaml merge=kibi
.kb/relationships/*.yaml merge=kibi
```

Then each clone opts in once (Git never runs a driver from repository
content alone):

```bash
git config merge.kibi.driver "npm exec --no -- kibi merge-driver %O %A %B"
```

Without that setting Git ignores the attribute and falls back to its normal
line merge, so declaring it is safe for contributors who do not use Kibi.

### Keep pull requests mergeable in CI

GitHub decides whether a pull request can merge with its own merge, which
never runs a custom driver (Git only runs a driver that each clone configures,
and GitHub runs no program from repository content). So as soon as one pull
request that added symbols merges, every other open one that also added
symbols shows a conflict in `.kb/symbols.yaml`, even though `kibi merge-driver`
would merge it cleanly. The **Kibi KB merge** action closes that gap: it does
the merge GitHub cannot do and pushes the result to the pull request branch.

#### Set it up

1. Declare the driver in `.gitattributes` as shown above, and commit a
   `kibi-cli` dependency (any version with `kibi merge-driver`) on the default
   branch.
2. Copy [docs/examples/github/kibi-kb-merge.yml](examples/github/kibi-kb-merge.yml)
   to `.github/workflows/kibi-kb-merge.yml`. Replace `@master` with a full
   commit SHA of `Looted/kibi` so the action only changes when you update it.
3. Create a token so the merge commits start your checks (see
   [Tokens and permissions](#tokens-and-permissions)) and save it as the
   repository secret `KIBI_MERGE_TOKEN`. Without it the workflow still pushes
   merges with `GITHUB_TOKEN`, but your pull request checks do not re-run on
   them.
4. Optional: change the `check` input to the gate your repository runs before
   merging, for example `npm run kb:gate`. It runs in the merged tree, and the
   merge is pushed only when it exits 0.

For pnpm, Yarn or Bun, change the `setup-node` and `npm ci` steps and point
the `kibi` input at the installed binary (for example
`node_modules/.bin/kibi`, or `bunx kibi`).

#### What it does

The workflow runs on every push. A push to the default branch checks every
open pull request into it; a push to any other branch checks only that
branch's pull request, so a branch that adds records after the default branch
moved is merged at once. (GitHub does not start `pull_request` workflows while
a pull request has conflicts, so `push` is the trigger.) For each candidate
pull request the action:

1. test-merges the default branch into the pull request head with
   `git merge-tree`, exactly as GitHub does, and stops if it merges cleanly;
2. stops and leaves the pull request for a person if any file outside
   `.kb/symbols.yaml` and `.kb/relationships/*.yaml` conflicts;
3. merges the default branch into the head in a scratch worktree with
   `kibi merge-driver`, using the default branch's install of Kibi (never the
   pull request's, so a branch opened before the driver existed still merges);
4. runs `kibi sync` on the merged tree and refuses the merge if sync would
   change a tracked file, then runs the `check` command;
5. pushes the merge commit only when both passed. If someone pushed to the
   branch meanwhile, the push is refused and the action starts again from
   step 1 on the new tip (three attempts by default, see `attempts`).

A branch that still tracks `.kb/symbol-coordinates.yaml` from before KB schema
13 has it removed in that merge. The job summary lists each branch with what
happened, and the action's outputs `merged`, `blocked` and `failed` hold the
same lists as JSON. The job fails only for a branch the driver should have
handled but whose merge failed `kibi sync`, the check, or the push.

#### What it does not resolve

- **Real conflicts inside a manifest.** When both sides changed the same field
  of one record differently (for example two `status` values),
  `kibi merge-driver` leaves conflict markers and the pull request is left for
  a person, with a warning in the job log.
- **Conflicts in any other file**, including requirement, scenario and test
  Markdown under `.kb/`. Those are documents a person should reconcile.
- **Fork pull requests.** A workflow cannot push to a fork's branch, so they
  are skipped. Their authors merge the default branch locally with the driver
  configured (see [Locally](#locally)).
- **Pull requests into other branches.** Only pull requests into the default
  branch are checked; set the `base` input to keep another branch's pull
  requests mergeable instead.
- **Merges that break the check.** A merge that fails `kibi sync` or the check
  is not pushed; the pull request keeps its conflict until a person merges.

#### Tokens and permissions

The workflow needs `contents: write` (to push merge commits) and
`pull-requests: read` (to list pull requests). It pushes with the credentials
of its checkout of the default branch, which is why the example passes
`token: ${{ secrets.KIBI_MERGE_TOKEN || github.token }}` to `actions/checkout`.

Pushes made with the default `GITHUB_TOKEN` do not start other workflows, so
the pull request's checks would not re-run on the merge commit. Use a
fine-grained personal access token or a GitHub App token limited to the
repository, with **Contents** and **Workflows** set to read and write, as
`KIBI_MERGE_TOKEN`. Workflows access is needed because a merge that brings in
changes under `.github/workflows/` is rejected without it; the default
`GITHUB_TOKEN` can never push those merges. An expired secret fails the job
rather than falling back to `GITHUB_TOKEN`, so renew it or delete the secret.
The bot's own merge push starts the workflow again; that run finds the branch
clean and does nothing.

Git hooks installed in the checkout (for example by `npm ci`) do not run for
the action's merge commit or push; the `check` input is the gate.

#### Action reference

`uses: Looted/kibi/actions/kb-merge@<commit SHA>`

| Input | Default | Meaning |
| --- | --- | --- |
| `base` | repository default branch | Branch whose pull requests are kept mergeable. |
| `branches` | every open pull request | Head branches to consider: newline or space separated, or a JSON array. |
| `list-only` | `false` | `true` only lists the branches whose sole conflicts are Kibi manifests (output `branches`) and changes nothing. |
| `kibi` | `node_modules/.bin/kibi` | Command that runs the default branch's Kibi. A relative path resolves from the workspace. |
| `check` | `$KIBI check` | Shell command run in the merged tree before the push. `$KIBI` and `$KIBI_BRANCH` are set. `""` runs none. |
| `attempts` | `3` | Tries per branch when the branch moves while it is being merged. |
| `skip-label` | `""` | Pull requests with this label are left alone. Set it to your merge train's label (`train`): the train merges the manifests itself, and a push to a boarded pull request would restart its checks. |
| `github-token` | `github.token` | Token `gh` uses to list pull requests. |

The action needs `git` 2.38 or newer, `gh` and `jq`, which GitHub-hosted
runners have. Outside GitHub Actions the same logic is
`actions/kb-merge/kb-merge.sh`, configured through `KB_MERGE_*` environment
variables described at the top of the script.

## Land pull requests in a merge train

Merging pull requests one at a time, each re-proven against the latest default
branch, takes one full proof run per pull request. The **Kibi merge train**
action proves a batch once. Every commit it adds to the default branch's
first-parent history is a merge commit whose tree is exactly the tree its
checks passed on.

### How it works

- **Boarding.** A person adds the `train` label to a pull request. A pull
  request boards only when it carries the label, is not a draft, comes from
  this repository, and every check in `checks` passed on its current head.
  Pull requests board in pull request number order, up to `max` per train.
- **Assembly.** From the default branch tip, the action merges each boarded
  head into a `merge-train/<id>` branch with `kibi merge-driver`. After each
  merge it runs `kibi sync`, refuses a sync that rewrites a tracked file, and
  runs the `check` command. A pull request that conflicts or fails is ejected
  with a comment before any expensive run. The branch is opened as a pull
  request into the default branch, so your usual workflows run on it.
- **Landing.** The train merges, as a merge commit, only when every check in
  `checks` and `train-checks` passed on the exact head it assembled and the
  default branch has not moved since. The default branch then has the proven tree, and GitHub
  marks each boarded pull request merged.
- **Failure.** A failed train re-runs its failed jobs once. If it fails again,
  it is closed and each half is proven as its own train. Only a train of one
  pull request that fails twice ejects that pull request, so no pull request
  is removed without evidence that it fails.
- **Moves.** A train is closed and assembled again on the new tip when the
  default branch moves, its branch moves, or a member loses its label or its
  passing checks.

### Run a slow check once per train

A check too slow to run on every pull request, such as a full proof that takes
hours, can run only on train branches: trigger it in your workflow for pull
requests whose head branch starts with `merge-train/`, and name its check in
`train-checks` instead of `checks`. A pull request then boards on its own
checks, and the train lands only after the slow check also passed on its
assembled head. A failed slow check is re-run once and bisected like any other
required check.

Each run takes one step and exits. Run it when your check workflows finish,
when the label is added, and on a schedule as a backstop, as the example does.

### Don't prove a landed train twice

When a train lands, the push to the default branch would start the proof
again on a tree the train already proved. Kibi's own proof workflow skips that
run. On a push, `bun scripts/ci-proof-reuse.ts decide-train` reuses the train's
proof only when all of these hold:

- the pushed commit is a merge whose parents are the previous tip and a
  `merge-train/` head from this repository;
- exactly one successful proof run exists for that head, from a pull request
  in this repository;
- that run's attestation names the same head and base commits; and
- the canonical Kibi snapshot of the pushed commit equals the attested one.

Otherwise the push runs the full proof. A push that reuses the train's proof
publishes the train's report and attests it, naming the train run it came
from, so a later pull request can reuse it in turn.

### Set it up

1. Copy [docs/examples/github/kibi-merge-train.yml](examples/github/kibi-merge-train.yml)
   to `.github/workflows/kibi-merge-train.yml`. Pin the action to a full
   commit SHA of `Looted/kibi`.
2. Set `checks` to the checks your ruleset requires. One aggregate job per
   workflow that needs every other job and fails on a failed, skipped or
   cancelled one is easiest, because a renamed or split job then never leaves
   the ruleset waiting.
3. Save a token as `KIBI_MERGE_TOKEN`: a fine-grained personal access token or
   GitHub App token limited to the repository, with **Contents**,
   **Pull requests**, **Issues**, **Actions** and **Workflows** set to read
   and write. Pull requests and pushes made with the default `GITHUB_TOKEN`
   start no workflows, so the train's checks would never run.
4. In the default branch's ruleset, require the checks, but do not enable
   "Require branches to be up to date before merging": the train already
   proves the exact tree that lands. To make the train the only way in,
   restrict updates to the default branch to the train's token identity.

### Action reference

`uses: Looted/kibi/actions/merge-train@<commit SHA>`

| Input | Default | Meaning |
| --- | --- | --- |
| `base` | repository default branch | Branch the trains merge into. |
| `checks` | required | Required check names, comma or newline separated. |
| `train-checks` | `""` | Checks a train must also pass before it lands, but a pull request does not need to board. |
| `label` | `train` | Label that boards a pull request. |
| `max` | `8` | Most pull requests in one train. |
| `kibi` | `node_modules/.bin/kibi` | Command that runs the default branch's Kibi. `""` skips `kibi sync`. |
| `check` | `$KIBI check` | Shell command run in the train after each merge. `$KIBI` and `$KIBI_BRANCH` are set. `""` runs none. |
| `prefix` | `merge-train/` | Branch prefix of train branches. |
| `github-token` | `github.token` | Token `gh` uses. |

The action needs Node.js 22.6 or newer, `git` and `gh`. Outside GitHub
Actions the same logic is `actions/merge-train/merge-train.mts`, configured
through the `MERGE_TRAIN_*` environment variables described at the top of the
file.

## Troubleshooting

**The workflow succeeds but `https://OWNER.github.io/REPOSITORY/kibi-report/` is 404.**
Enable **Settings → Pages → Source → GitHub Actions**. Until that is set,
Pages deployments do not go live. The report is not at the Pages site root.

**The badge image is a broken picture in the README.**
The SVG URL must be anonymously reachable. Private Pages sites will not render
in public READMEs. Confirm `/kibi-report/badge.svg` loads in a logged-out browser.

**The workflow is skipped on every feature-branch push.**
Report generation runs on `pull_request`, `workflow_dispatch`, or a push to the
repository **default** branch. Pushes to other branches start the workflow and
then skip the jobs. Open a pull request to validate a candidate report, change
the GitHub default branch, or use **Run workflow** for a one-off publish.
GitHub Pages still deploys only from the default branch or `workflow_dispatch`.

**`kibi: command not found` or `npm exec -- kibi` fails.**
Install `kibi-cli` as a project dependency and commit the lockfile. The
workflow does not install Kibi globally.

**`Kibi could not find a usable SWI-Prolog`.**
The workflow relies on the bundled runtime that `npm ci` installs on
`ubuntu-latest` (Linux x64, glibc). It is missing when the install skipped
optional dependencies (`--omit=optional`, `--no-optional`, pnpm
`supportedArchitectures` that excludes the runner's platform) or the lockfile
lacks the platform package. Install with the package manager's defaults, or add
`kibi-swipl-linux-x64-gnu` explicitly. On a runner without a bundled build
(Alpine/musl containers, self-hosted Windows), install SWI-Prolog 9.0+ from the
[SWI-Prolog PPA](install.md#ubuntu-recommended) or your platform package
manager and put `swipl` on `PATH`; see
[Installation](install.md#which-swi-prolog-kibi-uses).

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
